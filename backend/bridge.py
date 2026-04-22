"""
bridge.py — Nitro Hub Bridge v9.0
Архитектура: Firestore Queue (без Flask, без Gunicorn)

═══════════════════════════════════════════════════
 СХЕМА ДАННЫХ И ПОТОКОВ
═══════════════════════════════════════════════════

 ПОЛЬЗОВАТЕЛЬ → TELEGRAM (исходящие):
   JS пишет в bridge_queue/{docId}
     { content, uid, email, status:'pending', timestamp }
   ↓
   on_snapshot ловит pending-документ
   ↓
   Отправляем в Telegram владельцу
   ↓
   Обновляем status:'delivered'
   ↓
   Пишем в users/{uid}/messages (история чата)

 TELEGRAM → ПОЛЬЗОВАТЕЛЬ (входящие ответы):
   Владелец делает Reply в Telegram
   ↓
   Telegram шлёт update на /api/telegram-webhook
   ↓
   Пишем в users/{uid}/faraday_responses
   ↓
   auth.js on_snapshot доставляет в чат на сайте

 HEALTH CHECK:
   GET /health → {"status":"ok","firebase":true,"telegram":true,"mode":"queue"}

═══════════════════════════════════════════════════
 ЗАПУСК:
   .venv/bin/python backend/bridge.py
═══════════════════════════════════════════════════
"""

import os
import sys
import re
import json
import signal
import logging
import threading
import http.server
import socketserver
import requests

import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

# ── Загрузка переменных окружения ────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'))
load_dotenv(os.path.join(BASE_DIR, '..', '.env'))

# ── Логгер ───────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S',
    stream=sys.stdout
)
log = logging.getLogger('bridge')

# ── Telegram credentials ─────────────────────────
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID   = os.getenv('TELEGRAM_CHAT_ID', '')
PORT               = int(os.getenv('PORT', 5005))

# ── Глобальные объекты Firebase ──────────────────
db       = None
fs       = None   # модуль firestore (для SERVER_TIMESTAMP)

# ── In-memory роутинг: telegram chat_id → uid ────
user_routing: dict = {}

# ─────────────────────────────────────────────────
#  FIREBASE INIT
# ─────────────────────────────────────────────────
def init_firebase():
    global db, fs
    KEY_PATH = os.path.join(BASE_DIR, 'serviceAccountKey.json')
    try:
        if not firebase_admin._apps:
            if not os.path.exists(KEY_PATH):
                log.error(f'serviceAccountKey.json не найден: {KEY_PATH}')
                sys.exit(1)
            with open(KEY_PATH, 'r') as f:
                config = json.load(f)
            cred = credentials.Certificate(config)
            firebase_admin.initialize_app(cred)
        db = firestore.client()
        fs = firestore
        log.info('Firebase Admin: подключён ✓')
    except Exception as e:
        log.error(f'Firebase init error: {e}')
        sys.exit(1)


# ─────────────────────────────────────────────────
#  TELEGRAM HELPER
# ─────────────────────────────────────────────────
def send_telegram(text: str, chat_id: str = None) -> bool:
    """
    Отправляет сообщение в Telegram.
    Вызывается ТОЛЬКО при обработке bridge_queue.
    Faraday AI эту функцию НИКОГДА не вызывает.
    """
    target = chat_id or TELEGRAM_CHAT_ID
    if not TELEGRAM_BOT_TOKEN or not target:
        log.warning('Telegram: BOT_TOKEN или CHAT_ID не заданы в .env')
        return False
    try:
        r = requests.post(
            f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage',
            json={'chat_id': target, 'text': text, 'parse_mode': 'HTML'},
            timeout=10
        )
        if r.ok:
            log.info(f'Telegram ✓ → {str(target)[:8]}…')
        else:
            log.warning(f'Telegram ✗ HTTP {r.status_code}: {r.text[:80]}')
        return r.ok
    except Exception as e:
        log.error(f'Telegram error: {e}')
        return False


# ─────────────────────────────────────────────────
#  ДОСТАВКА ОТВЕТА НА САЙТ
# ─────────────────────────────────────────────────
def deliver_to_site(uid: str, text: str) -> bool:
    """
    Записывает ответ владельца в Firestore.
    Путь: users/{uid}/faraday_responses
    auth.js на фронте слушает эту коллекцию через onSnapshot
    и мгновенно показывает сообщение в чате пользователя.
    """
    if not db or not uid or not text:
        return False
    try:
        db.collection('users').document(uid) \
          .collection('faraday_responses').add({
              'text':      text,
              'sender':    'OWNER',
              'timestamp': fs.SERVER_TIMESTAMP
          })
        log.info(f'→ users/{uid[:8]}…/faraday_responses: OK')
        return True
    except Exception as e:
        log.error(f'deliver_to_site error: {e}')
        return False


# ─────────────────────────────────────────────────
#  ОБРАБОТКА ОДНОГО ДОКУМЕНТА ИЗ bridge_queue
# ─────────────────────────────────────────────────
def process_queue_doc(doc):
    """
    Обрабатывает pending-документ из bridge_queue:
    1. Атомарно меняем status: 'pending' → 'processing'
       (защита от двойной отправки при нескольких репликах)
    2. Отправляем сообщение в Telegram
    3. Пишем в users/{uid}/messages (история)
    4. Финальный статус: 'delivered' или 'error'
    """
    doc_id  = doc.id
    data    = doc.to_dict() or {}
    content = (data.get('content') or data.get('message', '')).strip()
    uid     = data.get('uid', '').strip()
    email   = data.get('email', 'anonymous')

    if not content or not uid:
        log.warning(f'[{doc_id[:8]}] пустой content/uid — пропускаем')
        try:
            doc.reference.update({'status': 'error', 'error': 'empty content or uid'})
        except Exception:
            pass
        return

    log.info(f'[{doc_id[:8]}] обрабатываем: {email} → "{content[:50]}"')

    # ── Шаг 1: атомарная блокировка ──────────────
    # Сразу меняем на 'processing', чтобы on_snapshot не
    # подхватил этот же документ повторно
    try:
        doc.reference.update({'status': 'processing'})
    except Exception as e:
        log.error(f'[{doc_id[:8]}] не удалось заблокировать: {e}')
        return

    # Запоминаем роутинг для обратного ответа из Telegram
    if TELEGRAM_CHAT_ID:
        user_routing[TELEGRAM_CHAT_ID] = uid

    # ── Шаг 2: отправка в Telegram ───────────────
    tg_text = (
        f'💬 <b>Новое сообщение</b>\n'
        f'👤 {email}\n'
        f'🆔 <code>{uid}</code>\n\n'
        f'{content}\n\n'
        f'<i>↩️ Reply на это сообщение чтобы ответить</i>'
    )
    tg_ok = send_telegram(tg_text)

    # ── Шаг 3: сохраняем в историю чата ─────────
    if db:
        try:
            db.collection('users').document(uid) \
              .collection('messages').add({
                  'message':   content,
                  'email':     email,
                  'sender':    'user',
                  'timestamp': fs.SERVER_TIMESTAMP
              })
        except Exception as e:
            log.warning(f'[{doc_id[:8]}] Firestore history error: {e}')

    # ── Шаг 4: финальный статус ──────────────────
    final_status = 'delivered' if tg_ok else 'error'
    try:
        doc.reference.update({
            'status':       final_status,
            'tg_ok':        tg_ok,
            'delivered_at': fs.SERVER_TIMESTAMP
        })
        log.info(f'[{doc_id[:8]}] status → {final_status}')
    except Exception as e:
        log.error(f'[{doc_id[:8]}] status update error: {e}')


# ─────────────────────────────────────────────────
#  СЛУШАТЕЛЬ bridge_queue
# ─────────────────────────────────────────────────
_queue_unsubscribe = None

def start_queue_listener():
    """
    Подписывается на bridge_queue[status == 'pending'].
    on_snapshot срабатывает при каждом новом добавлении/изменении.
    Каждый документ обрабатывается в отдельном потоке.
    """
    global _queue_unsubscribe

    query = db.collection('bridge_queue').where('status', '==', 'pending')

    def on_snapshot(col_snapshot, changes, read_time):
        for change in changes:
            if change.type.name not in ('ADDED', 'MODIFIED'):
                continue
            doc  = change.document
            data = doc.to_dict() or {}
            # Двойная проверка — защита от гонки
            if data.get('status') != 'pending':
                continue
            t = threading.Thread(
                target=process_queue_doc,
                args=(doc,),
                daemon=True,
                name=f'queue-{doc.id[:8]}'
            )
            t.start()

    _queue_unsubscribe = query.on_snapshot(on_snapshot)
    log.info('bridge_queue listener: активен ✓')
    log.info('Ожидаю документы со status="pending"...')


# ─────────────────────────────────────────────────
#  WEBHOOK-СЕРВЕР (минимальный HTTP, без Flask)
#  Принимает обратные ответы от Telegram-бота.
# ─────────────────────────────────────────────────
class _WebhookHandler(http.server.BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        pass  # отключаем стандартный лог werkzeug-style

    # ── OPTIONS (CORS preflight) ──────────────────
    def do_OPTIONS(self):
        self._cors_headers(200)

    # ── GET /health ───────────────────────────────
    def do_GET(self):
        if self.path.rstrip('/') == '/health':
            body = json.dumps({
                'status':   'ok',
                'firebase': db is not None,
                'telegram': bool(TELEGRAM_BOT_TOKEN),
                'mode':     'queue',
                'version':  '9.0'
            }).encode()
            self._cors_headers(200, 'application/json', len(body))
            self.wfile.write(body)
        else:
            self.send_error(404)

    # ── POST ──────────────────────────────────────
    def do_POST(self):
        if self.path.rstrip('/') == '/api/telegram-webhook':
            self._handle_tg_webhook()
        else:
            self.send_error(404)

    def _handle_tg_webhook(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            body   = self.rfile.read(length)
            data   = json.loads(body)
        except Exception:
            self.send_error(400)
            return

        # Сразу отвечаем Telegram 200 OK
        resp = b'{"ok":true}'
        self._cors_headers(200, 'application/json', len(resp))
        self.wfile.write(resp)

        # Обрабатываем в отдельном потоке
        threading.Thread(
            target=self._process_tg_update,
            args=(data,),
            daemon=True
        ).start()

    def _process_tg_update(self, data):
        message    = data.get('message', {})
        text       = message.get('text', '').strip()
        chat_id    = str(message.get('chat', {}).get('id', ''))
        reply_to   = message.get('reply_to_message', {})
        reply_text = reply_to.get('text', '')

        if not text or not chat_id:
            return

        # Извлекаем uid из текста исходного сообщения (тег 🆔)
        recipient_uid = None
        m = re.search(r'🆔 ([a-zA-Z0-9]{20,})', reply_text)
        if m:
            recipient_uid = m.group(1)
            user_routing[chat_id] = recipient_uid  # обновляем роутинг
        else:
            recipient_uid = user_routing.get(chat_id)

        if recipient_uid:
            ok = deliver_to_site(recipient_uid, text)
            log.info(f'TG reply → {recipient_uid[:8]}… | {"OK" if ok else "FAIL"}')
        else:
            log.warning(f'TG webhook: uid не найден для chat_id={chat_id}')
            send_telegram(
                '⚠️ Не удалось определить получателя.\n'
                'Используйте <b>Reply</b> на сообщение пользователя.',
                chat_id
            )

    def _cors_headers(self, code, content_type='application/json', length=0):
        self.send_response(code)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(length))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()


def start_webhook_server():
    """Запускает лёгкий HTTP-сервер для Telegram webhook и health-check."""
    socketserver.TCPServer.allow_reuse_address = True
    server = socketserver.ThreadingTCPServer(('0.0.0.0', PORT), _WebhookHandler)
    server.daemon_threads = True
    t = threading.Thread(target=server.serve_forever, daemon=True, name='webhook-server')
    t.start()
    log.info(f'Webhook server: порт {PORT} ✓')
    log.info(f'Health: http://localhost:{PORT}/health')
    log.info(f'Webhook: http://localhost:{PORT}/api/telegram-webhook')
    return server


# ─────────────────────────────────────────────────
#  GRACEFUL SHUTDOWN
# ─────────────────────────────────────────────────
_stop_event = threading.Event()

def _on_signal(signum, frame):
    log.info(f'Сигнал {signum} — завершаем работу...')
    if _queue_unsubscribe:
        try:
            _queue_unsubscribe()
            log.info('bridge_queue listener: отписан ✓')
        except Exception:
            pass
    _stop_event.set()

signal.signal(signal.SIGTERM, _on_signal)
signal.signal(signal.SIGINT,  _on_signal)


# ─────────────────────────────────────────────────
#  ТОЧКА ВХОДА
# ─────────────────────────────────────────────────
if __name__ == '__main__':
    log.info('══════════════════════════════════════')
    log.info('  Nitro Hub Bridge v9.0  [Queue Mode] ')
    log.info('══════════════════════════════════════')
    log.info(f'Очередь: bridge_queue [status=pending]')
    log.info(f'Flask/Gunicorn: отсутствуют')

    init_firebase()
    start_queue_listener()
    start_webhook_server()

    log.info('Bridge запущен. Ctrl+C для остановки.')

    # Блокируем главный поток — всё остальное работает в демон-потоках
    _stop_event.wait()
    log.info('Bridge остановлен.')
