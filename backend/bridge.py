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

ALLOWED_ORIGIN = 'https://matthewbrodek-alt.github.io'

# ── Firebase Admin ──────────────────────────────
db       = None
fs_admin = None

def _init_firebase():
    """
    Безопасная инициализация Firebase. НИКОГДА не должна ронять воркер.
    Поддерживает 3 источника ключа:
      1) Render Secret File:  /etc/secrets/serviceAccountKey.json
      2) Локальный файл:      ./serviceAccountKey.json
      3) Переменная env:      FIREBASE_SERVICE_ACCOUNT (JSON-строка)
    """
    global db, fs_admin
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore as _fs

        cred = None
        render_path = '/etc/secrets/serviceAccountKey.json'
        local_path  = 'serviceAccountKey.json'

        if os.path.exists(render_path):
            cred = credentials.Certificate(render_path)
            print(f'[Bridge] Firebase: secret file {render_path}')
        elif os.path.exists(local_path):
            cred = credentials.Certificate(local_path)
            print(f'[Bridge] Firebase: local file {local_path}')
        elif FIREBASE_KEY_JSON.strip():
            try:
                cred = credentials.Certificate(json.loads(FIREBASE_KEY_JSON))
                print('[Bridge] Firebase: env FIREBASE_SERVICE_ACCOUNT')
            except Exception as e:
                print(f'[Bridge] Firebase env JSON parse error: {e}')

        if cred is None:
            print('[Bridge] Firebase: ключ не найден — работаем без Firestore')
            return

        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        db       = _fs.client()
        fs_admin = _fs
        print('[Bridge] Firebase Admin: OK')
    except Exception as e:
        print(f'[Bridge] Firebase init failed (продолжаем без него): {e}')

_init_firebase()

# ── Flask ───────────────────────────────────────
app = Flask(__name__)

# CORS для основного домена + публичный preview (на всякий случай)
CORS(app, resources={r"/*": {"origins": [ALLOWED_ORIGIN]}})

@app.after_request
def _ensure_cors(resp):
    """
    Гарантия: CORS-заголовок присутствует ДАЖЕ при 500 / необработанных ошибках.
    Без этого браузер показывает 'CORS policy' вместо реального текста ошибки.
    """
    origin = request.headers.get('Origin', '')
    if origin == ALLOWED_ORIGIN:
        resp.headers['Access-Control-Allow-Origin']  = ALLOWED_ORIGIN
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        resp.headers['Vary'] = 'Origin'
    return resp

@app.errorhandler(Exception)
def _json_error(e):
    """Любая необработанная ошибка → JSON + CORS, а не голый 500 без заголовков."""
    print(f'[Bridge] UNHANDLED: {e}')
    return jsonify({'ok': False, 'error': 'Internal Server Error', 'message': str(e)}), 500

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
        }, timeout=10)
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

@app.route('/api/memory', methods=['POST', 'OPTIONS'])
def save_memory():
    if request.method == 'OPTIONS':
        return ('', 204)
    try:
        data    = request.get_json(silent=True) or {}
        content = (data.get('content') or data.get('message', '')).strip()
        email   = data.get('email', 'anonymous')
        uid     = (data.get('uid') or '').strip()

        if not content:
            return jsonify({'ok': False, 'error': 'content is required'}), 400

        # 1. Сохранение маршрута (не критично)
        if uid and TELEGRAM_CHAT_ID and db:
            try:
                db.collection('routing').document(TELEGRAM_CHAT_ID).set({'uid': uid})
            except Exception as e:
                print(f'[Bridge] Routing save error: {e}')

        # 2. Telegram (не критично)
        tg_ok = False
        try:
            tg_ok = _send_telegram(
                f'📨 <b>Nitro Hub</b>\n👤 {email}\n🆔 <code>{uid[:8]}</code>\n💬 {content}'
            )
        except Exception as e:
            print(f'[Bridge] Telegram send wrap error: {e}')

        # 3. Firestore (не критично — если нет db, просто пропускаем)
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
                print(f'[Bridge] Firestore memory error: {e}')

        return jsonify({'ok': True, 'telegram': tg_ok, 'firestore': fs_ok}), 200

    except Exception as e:
        print(f'[Bridge] /api/memory CRITICAL: {e}')
        return jsonify({'ok': False, 'error': 'Internal Server Error', 'message': str(e)}), 500

@app.route('/api/notify', methods=['POST', 'OPTIONS'])
def notify():
    if request.method == 'OPTIONS':
        return ('', 204)
    data    = request.get_json(silent=True) or {}
    message = (data.get('message') or '').strip()
    if not message:
        return jsonify({'ok': False, 'error': 'message is required'}), 400
    ok = _send_telegram(message)
    return jsonify({'ok': True, 'telegram': ok}), 200

@app.route('/api/telegram-webhook', methods=['POST'])
def telegram_webhook():
    data = request.get_json(silent=True) or {}
    message = data.get('message', {})
    text    = (message.get('text') or '').strip()
    chat_id = str(message.get('chat', {}).get('id', ''))

    if not text or not chat_id:
        return jsonify({'ok': True})

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
    return jsonify({
        'status':   'ok',
        'firebase': db is not None,
        'telegram': bool(TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID),
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT)
