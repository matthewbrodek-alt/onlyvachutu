import os
import firebase_admin
import json
import logging
import requests
import re
from firebase_admin import credentials, firestore
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
log = logging.getLogger(__name__)
logging.getLogger('werkzeug').setLevel(logging.ERROR)

TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID   = os.getenv('TELEGRAM_CHAT_ID', '')

# Роутинг: telegram chat_id → uid пользователя сайта
# Заполняется при отправке сообщения
user_routing: dict = {}

db       = None
fs_admin = None

# --- ИНИЦИАЛИЗАЦИЯ FIREBASE ---
try:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    KEY_PATH = os.path.join(BASE_DIR, "serviceAccountKey.json")
    if not firebase_admin._apps:
        if os.path.exists(KEY_PATH):
            with open(KEY_PATH, 'r') as f:
                config = json.load(f)
            cred = credentials.Certificate(config)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            fs_admin = firestore
            log.info(f'Firebase Admin: подключён ✓')
        else:
            log.error(f'Firebase: файл не найден: {KEY_PATH}')
except Exception as e:
    log.error(f'Firebase init error: {e}')

app = Flask(__name__)
app.url_map.strict_slashes = False

# CORS — разрешаем GitHub Pages и localhost
CORS(app, resources={r"/*": {
    "origins": [
        "https://matthewbrodek-alt.github.io",
        "http://localhost:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "*" 
    ],
    "methods": ["GET", "POST", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"]
}})

@app.after_request
def add_cors(response):
    origin = request.headers.get('Origin', '')
    if origin:
        response.headers['Access-Control-Allow-Origin'] = origin
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response

@app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
@app.route('/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    return jsonify({'ok': True}), 200


# ── Вспомогательные ──────────────────────────────────────

def _send_telegram(text: str, chat_id: str = None) -> bool:
    """
    Отправляет сообщение в Telegram.
    ВЫЗЫВАЕТСЯ ТОЛЬКО из /api/message (личный чат пользователя).
    Faraday AI НИКОГДА не вызывает эту функцию.
    """
    target = chat_id or TELEGRAM_CHAT_ID
    if not TELEGRAM_BOT_TOKEN or not target:
        log.warning('Telegram: credentials не заданы')
        return False
    try:
        r = requests.post(
            f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage',
            json={'chat_id': target, 'text': text, 'parse_mode': 'HTML'},
            timeout=5
        )
        return r.ok
    except Exception as e:
        log.error(f'Telegram error: {e}')
        return False


def _deliver_to_site(uid: str, text: str) -> bool:
    """
    Записывает ответ владельца (из Telegram) в Firestore.
    Путь: users/{uid}/faraday_responses
    Фронтенд (auth.js) слушает эту коллекцию и показывает
    сообщение в личном чате пользователя.
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


# ── Маршруты ─────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    """Health-check — используется checkBridgeHealth() на фронтенде."""
    return jsonify({
        'status':   'ok',
        'firebase': db is not None,
        'telegram': bool(TELEGRAM_BOT_TOKEN)
    })


@app.route('/api/message', methods=['POST'])
def save_message():
    """
    ЛИЧНЫЙ ЧАТ: сообщение пользователя сайта → Telegram + Firestore.
    
    Что происходит:
    1. Получаем uid + email + message из тела запроса
    2. Запоминаем роутинг uid → telegram chat_id
    3. Отправляем форматированное сообщение в Telegram (владельцу)
    4. Сохраняем в Firestore users/{uid}/messages
    
    Faraday AI этот маршрут НЕ использует.
    """
    data    = request.get_json(silent=True) or {}
    content = (data.get('content') or data.get('message', '')).strip()
    email   = data.get('email', 'anonymous')
    uid     = data.get('uid', '').strip()

    if not content or not uid:
        return jsonify({'ok': False, 'error': 'content и uid обязательны'}), 400

    # Запоминаем маршрут для ответа из Telegram
    if TELEGRAM_CHAT_ID:
        user_routing[TELEGRAM_CHAT_ID] = uid

    # Отправляем в Telegram (владельцу)
    tg_text = (
        f'💬 <b>Новое сообщение</b>\n'
        f'👤 {email}\n'
        f'🆔 <code>{uid}</code>\n\n'
        f'{content}\n\n'
        f'<i>↩️ Чтобы ответить — нажмите Reply на это сообщение</i>'
    )
    tg_ok = _send_telegram(tg_text)

    # Сохраняем в Firestore users/{uid}/messages
    fs_ok = False
    if db:
        try:
            db.collection('users').document(uid) \
              .collection('messages').add({
                'message':   content,
                'email':     email,
                'sender':    'user',
                'timestamp': fs_admin.SERVER_TIMESTAMP
              })
            fs_ok = True
        except Exception as e:
            log.error(f'Firestore save error: {e}')

    return jsonify({'ok': True, 'telegram': tg_ok, 'firestore': fs_ok})


@app.route('/api/telegram-webhook', methods=['POST'])
def telegram_webhook():
    """
    Webhook от Telegram-бота.
    Когда владелец отвечает (Reply) на сообщение пользователя,
    бот присылает этот вебхук, мы извлекаем uid из текста
    исходного сообщения и доставляем ответ на сайт через Firestore.
    
    Для работы нужно:
    1. Создать Telegram-бота (BotFather) → получить TELEGRAM_BOT_TOKEN
    2. Зарегистрировать webhook:
       https://api.telegram.org/bot<TOKEN>/setWebhook?url=<BRIDGE_URL>/api/telegram-webhook
    3. Владелец отвечает только через Reply — так uid попадает в контекст
    """
    data      = request.get_json(silent=True) or {}
    message   = data.get('message', {})
    text      = message.get('text', '').strip()
    chat_id   = str(message.get('chat', {}).get('id', ''))
    reply_to  = message.get('reply_to_message', {})
    reply_text = reply_to.get('text', '')

    if not text or not chat_id:
        return jsonify({'ok': True})

    # Извлекаем uid из исходного сообщения (помечено тегом 🆔)
    recipient_uid = None
    uid_match = re.search(r'🆔 ([a-zA-Z0-9]{20,})', reply_text)
    if uid_match:
        recipient_uid = uid_match.group(1)
    else:
        # Fallback: берём из роутинга
        recipient_uid = user_routing.get(chat_id)

    if recipient_uid:
        ok = _deliver_to_site(recipient_uid, text)
        log.info(f'Webhook reply → {recipient_uid[:8]}… | {"OK" if ok else "FAIL"}')
    else:
        log.warning(f'Webhook: uid не найден для chat_id={chat_id}')
        _send_telegram(
            '⚠️ Не удалось определить получателя.\n'
            'Используйте <b>Reply</b> на сообщение пользователя.',
            chat_id
        )

    return jsonify({'ok': True})


@app.route('/api/notify', methods=['POST'])
def notify():
    """Системное уведомление → Telegram (не от пользователя чата)."""
    data    = request.get_json(silent=True) or {}
    message = data.get('message', '').strip()
    if not message:
        return jsonify({'ok': False}), 400
    ok = _send_telegram(f'🔔 <b>System</b>\n{message}')
    return jsonify({'ok': ok})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5005))
    log.info(f'Bridge v8.4 → порт {port}')
    app.run(host='0.0.0.0', port=port, debug=False)
