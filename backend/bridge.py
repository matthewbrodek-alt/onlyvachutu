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

user_routing: dict = {}
db       = None
fs_admin = None

# --- ЖЕСТКАЯ ИНИЦИАЛИЗАЦИЯ БЕЗ ПЕРЕМЕННЫХ ОКРУЖЕНИЯ ---
try:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    KEY_PATH = os.path.join(BASE_DIR, "serviceAccountKey.json")

    if not firebase_admin._apps:
        if os.path.exists(KEY_PATH):
            # Читаем файл напрямую, чтобы убедиться в его валидности
            with open(KEY_PATH, 'r') as f:
                config = json.load(f)
            
            cred = credentials.Certificate(config)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            fs_admin = firestore
            log.info(f'Firebase Admin: подключён через {KEY_PATH} ✓')
        else:
            log.error(f'Firebase: Файл не найден по пути {KEY_PATH}')

except Exception as e:
    log.error(f'Firebase init error: {e}')

app = Flask(__name__)
app.url_map.strict_slashes = False
CORS(app, resources={r'/*': {'origins': '*'}})

@app.after_request
def add_cors_headers(response):
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

def _send_telegram(text: str, chat_id: str = None) -> bool:
    target = chat_id or TELEGRAM_CHAT_ID
    if not TELEGRAM_BOT_TOKEN or not target:
        return False
    try:
        url = f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage'
        r = requests.post(url, json={
            'chat_id': target,
            'text': text,
            'parse_mode': 'HTML'
        }, timeout=5)
        return r.ok
    except Exception as e:
        log.error(f'Telegram error: {e}')
        return False

def _deliver_to_site(uid: str, text: str) -> bool:
    if not db or not uid or not text:
        return False
    try:
        db.collection('users').document(uid).collection('faraday_responses').add({
            'text': text,
            'sender': 'OWNER',
            'timestamp': fs_admin.SERVER_TIMESTAMP
        })
        log.info(f'→ users/{uid[:8]}…/faraday_responses: OK')
        return True
    except Exception as e:
        log.error(f'Firestore write error: {e}')
        return False

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'firebase': db is not None,
        'telegram': bool(TELEGRAM_BOT_TOKEN)
    })

@app.route('/api/memory', methods=['POST'])
def save_memory():
    data = request.get_json(silent=True) or {}
    content = (data.get('content') or data.get('message', '')).strip()
    email = data.get('email', 'anonymous')
    uid = data.get('uid', '').strip()

    if not content or not uid:
        return jsonify({'ok': False, 'error': 'content/uid required'}), 400

    if TELEGRAM_CHAT_ID:
        user_routing[TELEGRAM_CHAT_ID] = uid

    tg_text = f'📨 <b>Nitro Hub</b>\n👤 {email}\n🆔 <code>{uid}</code>\n💬 {content}'
    tg_ok = _send_telegram(tg_text)

    fs_ok = False
    if db:
        try:
            db.collection('faraday_memory').add({
                'content': content,
                'email': email,
                'uid': uid,
                'timestamp': fs_admin.SERVER_TIMESTAMP
            })
            fs_ok = True
        except: pass

    return jsonify({'ok': True, 'telegram': tg_ok, 'firestore': fs_ok})

@app.route('/api/telegram-webhook', methods=['POST'])
def telegram_webhook():
    data = request.get_json(silent=True) or {}
    message = data.get('message', {})
    text = message.get('text', '').strip()
    chat_id = str(message.get('chat', {}).get('id', ''))
    
    reply_to = message.get('reply_to_message', {})
    reply_text = reply_to.get('text', '')

    if not text or not chat_id:
        return jsonify({'ok': True})

    recipient_uid = None
    uid_match = re.search(r"🆔 ([a-zA-Z0-9…\-]+)", reply_text)
    
    if uid_match:
        recipient_uid = uid_match.group(1).replace('…', '')
    else:
        recipient_uid = user_routing.get(chat_id)

    if recipient_uid:
        ok = _deliver_to_site(recipient_uid, text)
        log.info(f'Webhook: Reply to {recipient_uid[:8]}… | {"OK" if ok else "FAIL"}')
    else:
        log.warning(f'Webhook: No route for chat_id={chat_id}')
        _send_telegram("⚠️ UID не найден. Используйте Reply на сообщение пользователя.", chat_id)

    return jsonify({'ok': True})

@app.route('/api/notify', methods=['POST'])
def notify():
    data = request.get_json(silent=True) or {}
    message = data.get('message', '').strip()
    if not message: return jsonify({'ok': False}), 400
    ok = _send_telegram(f'🔔 <b>System</b>\n{message}')
    return jsonify({'ok': ok})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    log.info(f'Bridge v8.3 → порт {port}')
    app.run(host='0.0.0.0', port=port, debug=False)