"""
bridge.py — Python-мост для Nitro Hub v8.1
Маршруты сообщений:
  Сайт → /api/memory  → Telegram + Firestore faraday_memory
  Telegram → /api/telegram-webhook → Firestore users/{uid}/faraday_responses → Сайт

Запуск:
    pip install flask flask-cors python-dotenv requests firebase-admin
    python bridge.py

Переменные окружения (backend/.env):
    TELEGRAM_BOT_TOKEN=...
    TELEGRAM_CHAT_ID=...
    PORT=5000
"""

import os
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID   = os.getenv('TELEGRAM_CHAT_ID', '')
PORT               = int(os.getenv('PORT', 5000))

# Таблица маршрутизации: telegram_chat_id → firebase_uid
# Заполняется автоматически при каждом сообщении с сайта.
# Сбрасывается при перезапуске сервера (достаточно для одного владельца).
user_routing = {}

# ── Firebase Admin ──────────────────────────────
db       = None
fs_admin = None

try:
    import firebase_admin
    from firebase_admin import credentials, firestore as _fs

    KEY_FILE = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')
    if os.path.exists(KEY_FILE):
        if not firebase_admin._apps:
            cred = credentials.Certificate(KEY_FILE)
            firebase_admin.initialize_app(cred)
        db       = _fs.client()
        fs_admin = _fs
        print('[Bridge] Firebase Admin: подключён')
    else:
        print('[Bridge] serviceAccountKey.json не найден — Firestore недоступен')
except ImportError:
    print('[Bridge] firebase-admin не установлен — Firestore недоступен')

# ── Flask ───────────────────────────────────────
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})


# ══════════════════════════════════════════════════
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ══════════════════════════════════════════════════

def _send_telegram(text: str, chat_id: str = None) -> bool:
    """Отправить текст в Telegram."""
    target = chat_id or TELEGRAM_CHAT_ID
    if not TELEGRAM_BOT_TOKEN or not target:
        print('[Bridge] Telegram credentials не заданы в .env')
        return False
    try:
        url = f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage'
        r   = requests.post(url, json={
            'chat_id':    target,
            'text':       text,
            'parse_mode': 'HTML'
        }, timeout=5)
        if not r.ok:
            print(f'[Bridge] Telegram HTTP {r.status_code}: {r.text}')
        return r.ok
    except requests.RequestException as e:
        print(f'[Bridge] Telegram error: {e}')
        return False


def _deliver_to_site(uid: str, text: str) -> bool:
    """
    Записать ответ в Firestore users/{uid}/faraday_responses.
    Фронтенд слушает именно этот путь через onSnapshot в auth.js.
    """
    if not db or not uid or not text:
        return False
    try:
        db.collection('users').document(uid) \
          .collection('faraday_responses').add({
              'text':      text,
              'sender':    'FARADAY',
              'timestamp': fs_admin.SERVER_TIMESTAMP
          })
        print(f'[Bridge] Ответ записан → users/{uid}/faraday_responses')
        return True
    except Exception as e:
        print(f'[Bridge] Firestore write error: {e}')
        return False


# ══════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════

@app.route('/health', methods=['GET'])
def health():
    """Проверка состояния сервера."""
    return jsonify({
        'status':       'ok',
        'version':      '8.1',
        'firebase':     db is not None,
        'telegram':     bool(TELEGRAM_BOT_TOKEN),
        'routing_size': len(user_routing)
    })


@app.route('/api/memory', methods=['POST'])
def save_memory():
    """
    Принять сообщение с сайта.
    Шаг 1: отправить в Telegram (с указанием uid для обратного роутинга).
    Шаг 2: сохранить в faraday_memory.

    Body: { "content"/"message": "текст", "email": "...", "uid": "firebase_uid" }
    """
    data    = request.get_json(silent=True) or {}
    content = (data.get('content') or data.get('message', '')).strip()
    email   = data.get('email', 'anonymous')
    uid     = data.get('uid', '').strip()

    if not content:
        return jsonify({'error': 'content is required'}), 400

    # Запоминаем связку chat_id → uid для обратного роутинга
    recipient_uid = None
    if db:
        route_doc = db.collection('routing').document(chat_id).get()
        if route_doc.exists:
            recipient_uid = route_doc.to_dict().get('uid')

    # Telegram: показываем uid чтобы можно было проверить маршрут
    uid_short = uid[:8] + '...' if len(uid) > 8 else uid
    tg_text   = (
        f'📨 <b>Nitro Hub</b>\n'
        f'👤 {email}\n'
        f'🆔 <code>{uid_short}</code>\n'
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
            print(f'[Bridge] faraday_memory write error: {e}')

    print(f'[Bridge] /api/memory | TG: {tg_ok} | FS: {fs_ok} | uid: {uid_short}')
    return jsonify({'ok': True, 'telegram': tg_ok, 'firestore': fs_ok})


@app.route('/api/telegram-webhook', methods=['POST'])
def telegram_webhook():
    """
    Получить входящее сообщение из Telegram (ваш ответ пользователю).
    Telegram должен быть настроен на этот webhook через setWebhook.

    Маршрут: Telegram → bridge → users/{uid}/faraday_responses → сайт.
    """
    data = request.get_json(silent=True) or {}

    # Обрабатываем только обычные текстовые сообщения
    message = data.get('message', {})
    text    = message.get('text', '').strip()
    chat_id = str(message.get('chat', {}).get('id', ''))

    if not text or not chat_id:
        return jsonify({'ok': True})  # игнорируем служебные события

    # Ищем uid пользователя которому нужно ответить
    recipient_uid = user_routing.get(chat_id)

    if recipient_uid:
        ok = _deliver_to_site(recipient_uid, text)
        status = 'доставлен' if ok else 'ошибка Firestore'
        print(f'[Bridge] Webhook: ответ «{text[:40]}» → uid {recipient_uid} | {status}')
    else:
        print(f'[Bridge] Webhook: нет маршрута для chat_id {chat_id}. '
              f'Известные чаты: {list(user_routing.keys())}')
        # Отправляем подсказку обратно в Telegram
        _send_telegram(
            '⚠️ Маршрут не найден. Попросите пользователя отправить сообщение с сайта первым.',
            chat_id
        )

    return jsonify({'ok': True})


@app.route('/api/notify', methods=['POST'])
def notify():
    """
    Отправить произвольное уведомление в Telegram (ошибки, системные события).
    Body: { "message": "текст", "email": "..." }
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
    """Получить последние 5 записей из faraday_memory."""
    if not db:
        return jsonify({'error': 'Firebase not configured'}), 503
    try:
        docs   = db.collection('faraday_memory') \
                   .order_by('timestamp', direction=fs_admin.Query.DESCENDING) \
                   .limit(5).stream()
        result = []
        for d in docs:
            row = d.to_dict()
            row.pop('timestamp', None)
            row['id'] = d.id
            result.append(row)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Запуск ──────────────────────────────────────
if __name__ == '__main__':
    # Render сам назначит нужный порт, обычно это 10000 или другой случайный
    port = int(os.environ.get("PORT", 5000)) 
    print(f'[Bridge] v8.1 запущен на порту {port}')
    app.run(host='0.0.0.0', port=port, debug=False)