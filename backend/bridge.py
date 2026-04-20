import os
import json
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID   = os.getenv('TELEGRAM_CHAT_ID', '')
FIREBASE_KEY_JSON  = os.getenv('FIREBASE_SERVICE_ACCOUNT', '')
PORT               = int(os.environ.get("PORT", 5000))

# ── Firebase Admin ──────────────────────────────
db       = None
fs_admin = None

try:
    import firebase_admin
    from firebase_admin import credentials, firestore as _fs

    cred = None
    if FIREBASE_KEY_JSON:
        cred_dict = json.loads(FIREBASE_KEY_JSON)
        cred = credentials.Certificate(cred_dict)
    
    if cred:
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        db       = _fs.client()
        fs_admin = _fs
        print('[Bridge] Firebase Admin: подключён')
except Exception as e:
    print(f'[Bridge] Ошибка Firebase: {e}')

# ── Flask ───────────────────────────────────────
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# ══════════════════════════════════════════════════
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ══════════════════════════════════════════════════

def _send_telegram(text: str, chat_id: str = None) -> bool:
    target = chat_id or TELEGRAM_CHAT_ID
    if not TELEGRAM_BOT_TOKEN or not target:
        return False
    try:
        url = f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage'
        r   = requests.post(url, json={
            'chat_id':    target,
            'text':       text,
            'parse_mode': 'HTML'
        }, timeout=10) # Увеличили таймаут для стабильности
        return r.ok
    except Exception as e:
        print(f'[Bridge] Telegram error: {e}')
        return False

def _deliver_to_site(uid: str, text: str) -> bool:
    if not db or not uid: return False
    try:
        db.collection('users').document(uid) \
          .collection('faraday_responses').add({
              'text':      text,
              'sender':    'FARADAY',
              'timestamp': fs_admin.SERVER_TIMESTAMP
          })
        return True
    except Exception as e:
        print(f'[Bridge] Firestore write error: {e}')
        return False

# ══════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════

@app.route('/api/memory', methods=['POST'])
def save_memory():
    data    = request.get_json(silent=True) or {}
    content = (data.get('content') or data.get('message', '')).strip()
    email   = data.get('email', 'anonymous')
    uid     = data.get('uid', '').strip()

    if not content:
        return jsonify({'error': 'content is required'}), 400

    # Сохраняем маршрут в БД, чтобы он не пропадал при перезагрузке
    if uid and TELEGRAM_CHAT_ID and db:
        try:
            db.collection('routing').document(TELEGRAM_CHAT_ID).set({'uid': uid})
        except Exception as e:
            print(f'[Bridge] Routing save error: {e}')

    tg_ok = _send_telegram(f'📨 <b>Nitro Hub</b>\n👤 {email}\n🆔 <code>{uid[:8]}</code>\n💬 {content}')

    fs_ok = False
    if db:
        try:
            db.collection('faraday_memory').add({
                'content':   content,
                'email':     email,
                'uid':       uid,
                'timestamp': fs_admin.SERVER_TIMESTAMP
            })
            fs_ok = True
        except Exception as e:
            print(f'[Bridge] Memory save error: {e}')

    return jsonify({'ok': True, 'telegram': tg_ok, 'firestore': fs_ok})

@app.route('/api/telegram-webhook', methods=['POST'])
def telegram_webhook():
    data = request.get_json(silent=True) or {}
    message = data.get('message', {})
    text    = message.get('text', '').strip()
    chat_id = str(message.get('chat', {}).get('id', ''))

    if not text or not chat_id:
        return jsonify({'ok': True})

    # Ищем uid в базе данных, а не в переменной
    recipient_uid = None
    if db:
        try:
            doc = db.collection('routing').document(chat_id).get()
            if doc.exists:
                recipient_uid = doc.to_dict().get('uid')
        except Exception as e:
            print(f'[Bridge] Routing fetch error: {e}')

    if recipient_uid:
        ok = _deliver_to_site(recipient_uid, text)
        print(f'[Bridge] Webhook: {text[:20]}... -> {recipient_uid[:8]} | {"OK" if ok else "ERR"}')
    else:
        _send_telegram('⚠️ Маршрут не найден. Напишите с сайта еще раз.', chat_id)

    return jsonify({'ok': True})

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'firebase': db is not None})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT)