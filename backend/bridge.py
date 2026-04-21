"""
bridge.py — Python-мост для Nitro Hub v8.3
Хост: Firebase Studio Cloud Workstation (порт 5000)

Маршруты:
  Сайт  → /api/memory          → Telegram + Firestore
  TG    → /api/telegram-webhook → Firestore users/{uid}/faraday_responses → Сайт
  Сайт  → /api/notify           → Telegram (системные события, ошибки)
  GET     /health                → статус сервера

Переменные окружения (.env):
  TELEGRAM_BOT_TOKEN=...
  TELEGRAM_CHAT_ID=...
"""

import os
import json
import logging
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

# ── Логирование: только важные сообщения ──────
logging.basicConfig(level=logging.INFO,
                    format='[%(levelname)s] %(message)s')
log = logging.getLogger(__name__)
# Убираем шум werkzeug в консоли Studio
logging.getLogger('werkzeug').setLevel(logging.ERROR)

# ── Переменные окружения ───────────────────────
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID   = os.getenv('TELEGRAM_CHAT_ID', '')

# ── Таблица маршрутизации ──────────────────────
# TELEGRAM_CHAT_ID → firebase_uid
# Заполняется когда пользователь пишет с сайта.
# Позволяет bridge знать кому доставить ответ из Telegram.
user_routing: dict = {}

# ── Firebase Admin SDK ─────────────────────────
db       = None
fs_admin = None

try:
    import firebase_admin
    from firebase_admin import credentials, firestore as _fs

    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    KEY_FILE = os.path.join(BASE_DIR, 'serviceAccountKey.json')

    if not firebase_admin._apps:
        # Приоритет: переменная окружения (для Render/CI)
        sa_env = os.getenv('FIREBASE_SERVICE_ACCOUNT')
        if sa_env:
            sa_dict = json.loads(sa_env)
            cred = credentials.Certificate(sa_dict)
            log.info('Firebase: инициализация из переменной окружения')
        elif os.path.exists(KEY_FILE):
            cred = credentials.Certificate(KEY_FILE)
            log.info(f'Firebase: инициализация из {KEY_FILE}')
        else:
            cred = None
            log.warning(f'Firebase: serviceAccountKey.json не найден ({KEY_FILE})')

        if cred:
            firebase_admin.initialize_app(cred)

    db       = _fs.client()
    fs_admin = _fs
    log.info('Firebase Admin: подключён ✓')

except ImportError:
    log.warning('firebase-admin не установлен — Firestore недоступен')
except Exception as e:
    log.error(f'Firebase init error: {e}')

# ── Flask + CORS ───────────────────────────────
app = Flask(__name__)
app.url_map.strict_slashes = False

# CORS: разрешаем GitHub Pages и любые cloudworkstations.dev URL
ALLOWED_ORIGINS = [
    'https://matthewbrodek-alt.github.io',  # GitHub Pages (фронтенд)
    'http://localhost:3000',                  # локальная разработка
    'http://localhost:5500',                  # Live Server VS Code
    'http://127.0.0.1:5500',
]

CORS(app, resources={r'/*': {'origins': '*'}},
     supports_credentials=False)

# Дополнительно: явные CORS-заголовки на все ответы
@app.after_request
def add_cors_headers(response):
    origin = request.headers.get('Origin', '')
    # Разрешаем GitHub Pages и любой cloudworkstations.dev
    if (origin in ALLOWED_ORIGINS or
            'cloudworkstations.dev' in origin or
            'github.io' in origin):
        response.headers['Access-Control-Allow-Origin']  = origin
    else:
        response.headers['Access-Control-Allow-Origin']  = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response

@app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
@app.route('/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    """Preflight CORS запросы"""
    return jsonify({'ok': True}), 200


# ══════════════════════════════════════════════════
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ══════════════════════════════════════════════════

def _send_telegram(text: str, chat_id: str = None) -> bool:
    """Отправить текст в Telegram."""
    target = chat_id or TELEGRAM_CHAT_ID
    if not TELEGRAM_BOT_TOKEN or not target:
        log.warning('Telegram credentials не заданы в .env')
        return False
    try:
        url = f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage'
        r   = requests.post(url, json={
            'chat_id':    target,
            'text':       text,
            'parse_mode': 'HTML'
        }, timeout=5)
        if not r.ok:
            log.warning(f'Telegram HTTP {r.status_code}: {r.text[:100]}')
        return r.ok
    except requests.RequestException as e:
        log.error(f'Telegram error: {e}')
        return False


def _deliver_to_site(uid: str, text: str) -> bool:
    """
    Записать ответ в Firestore users/{uid}/faraday_responses.
    auth.js слушает этот путь через onSnapshot.
    """
    if not db or not uid or not text:
        return False
    try:
        db.collection('users').document(uid) \
          .collection('faraday_responses').add({
              'text':      text,
              'sender':    'OWNER',
              'timestamp': fs_admin.SERVER_TIMESTAMP
          })
        log.info(f'→ users/{uid[:8]}…/faraday_responses: OK')
        return True
    except Exception as e:
        log.error(f'Firestore write error: {e}')
        return False


# ══════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════

@app.route('/health', methods=['GET'])
def health():
    """Проверка состояния. Используется в self-diagnostic фронтенда."""
    return jsonify({
        'status':       'ok',
        'version':      '8.3',
        'firebase':     db is not None,
        'telegram':     bool(TELEGRAM_BOT_TOKEN),
        'routing_size': len(user_routing)
    })


@app.route('/api/memory', methods=['POST'])
def save_memory():
    """
    Принять сообщение из личного чата.
    1. Запоминаем uid → chat_id маршрут.
    2. Отправляем в Telegram.
    3. Пишем в Firestore faraday_memory.

    Body: { "content": str, "email": str, "uid": str }
    """
    data    = request.get_json(silent=True) or {}
    content = (data.get('content') or data.get('message', '')).strip()
    email   = data.get('email', 'anonymous')
    uid     = data.get('uid', '').strip()

    if not content:
        return jsonify({'ok': False, 'error': 'content is required'}), 400

    if not uid:
        return jsonify({'ok': False, 'error': 'uid is required'}), 400

    # Обновляем таблицу маршрутизации
    if uid and TELEGRAM_CHAT_ID:
        user_routing[TELEGRAM_CHAT_ID] = uid
        log.info(f'Routing: {TELEGRAM_CHAT_ID} → {uid[:8]}…')

    # Telegram
    uid_label = uid[:8] + '…' if len(uid) > 8 else uid
    tg_text = (
        f'📨 <b>Nitro Hub — Личный чат</b>\n'
        f'👤 {email}\n'
        f'🆔 <code>{uid_label}</code>\n'
        f'💬 {content}'
    )
    tg_ok = _send_telegram(tg_text)

    # Firestore
    fs_ok = False
    if db:
        try:
            db.collection('faraday_memory').add({
                'content':   content,
                'email':     email,
                'uid':       uid,
                'topic':     'user_message',
                'timestamp': fs_admin.SERVER_TIMESTAMP
            })
            fs_ok = True
        except Exception as e:
            log.error(f'faraday_memory write error: {e}')

    log.info(f'/api/memory | TG: {tg_ok} | FS: {fs_ok}')
    return jsonify({'ok': True, 'telegram': tg_ok, 'firestore': fs_ok})


@app.route('/api/telegram-webhook', methods=['POST'])
def telegram_webhook():
    """
    Входящий ответ из Telegram (владелец отвечает пользователю).
    Должен быть настроен через setWebhook.

    Маршрут: Telegram → bridge → Firestore users/{uid}/faraday_responses → сайт.
    """
    data    = request.get_json(silent=True) or {}
    message = data.get('message', {})
    text    = message.get('text', '').strip()
    chat_id = str(message.get('chat', {}).get('id', ''))

    if not text or not chat_id:
        return jsonify({'ok': True})

    recipient_uid = user_routing.get(chat_id)

    if recipient_uid:
        ok = _deliver_to_site(recipient_uid, text)
        log.info(f'Webhook: «{text[:40]}» → uid {recipient_uid[:8]}… | {"OK" if ok else "FAIL"}')
    else:
        hint = (
            '⚠️ Маршрут не найден.\n'
            f'Известные chat_id: {list(user_routing.keys()) or "нет"}\n'
            'Попросите пользователя отправить сообщение с сайта первым.'
        )
        log.warning(f'Webhook: нет маршрута для chat_id={chat_id}')
        _send_telegram(hint, chat_id)

    return jsonify({'ok': True})


@app.route('/api/notify', methods=['POST'])
def notify():
    """
    Системные уведомления → Telegram.
    Используется для window.onerror и системных событий.
    Body: { "message": str, "email": str }
    """
    data    = request.get_json(silent=True) or {}
    message = data.get('message', '').strip()
    email   = data.get('email', 'system')

    if not message:
        return jsonify({'error': 'message is required'}), 400

    tg_text = f'🔔 <b>Nitro Hub</b>\n👤 {email}\n📋 {message}'
    ok      = _send_telegram(tg_text)
    return jsonify({'ok': ok})


@app.route('/api/memory', methods=['GET'])
def get_memory():
    """Последние 5 записей из faraday_memory."""
    if not db:
        return jsonify({'error': 'Firebase not configured'}), 503
    try:
        docs = (db.collection('faraday_memory')
                  .order_by('timestamp', direction=fs_admin.Query.DESCENDING)
                  .limit(5).stream())
        result = []
        for d in docs:
            row = d.to_dict()
            row.pop('timestamp', None)
            row['id'] = d.id
            result.append(row)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Запуск ────────────────────────────────────
if __name__ == '__main__':
    # Firebase Studio / IDX использует переменную PORT
    port = int(os.environ.get('PORT', 5000))
    log.info(f'Bridge v8.3 → порт {port}')
    log.info(f'Telegram: {"OK" if TELEGRAM_BOT_TOKEN else "НЕ НАСТРОЕН"}')
    log.info(f'Firebase: {"OK" if db else "НЕ НАСТРОЕН"}')
    log.info('Webhook URL: https://ВАШ_STUDIO_URL/api/telegram-webhook')
    app.run(host='0.0.0.0', port=port, debug=False)
