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

ALLOWED_ORIGIN = "https://matthewbrodek-alt.github.io"

# ── Firebase Admin (НЕ ПАДАЕМ если ключа нет) ──
db       = None
fs_admin = None

def _init_firebase():
    global db, fs_admin
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore as _fs

        cred = None

        # 1) Render Secret File (по умолчанию монтируется в /etc/secrets/)
        render_path = '/etc/secrets/serviceAccountKey.json'
        if os.path.exists(render_path):
            cred = credentials.Certificate(render_path)
            print(f'[Bridge] Firebase: ключ найден в {render_path}')

        # 2) Локальный файл рядом с bridge.py
        elif os.path.exists('serviceAccountKey.json'):
            cred = credentials.Certificate('serviceAccountKey.json')
            print('[Bridge] Firebase: ключ найден локально')

        # 3) Переменная окружения с JSON-строкой
        elif FIREBASE_KEY_JSON:
            try:
                info = json.loads(FIREBASE_KEY_JSON)
                cred = credentials.Certificate(info)
                print('[Bridge] Firebase: ключ загружен из FIREBASE_SERVICE_ACCOUNT')
            except Exception as e:
                print(f'[Bridge] Firebase: невалидный FIREBASE_SERVICE_ACCOUNT: {e}')

        if cred is None:
            print('[Bridge] WARNING: Firebase ключ не найден ни в одном источнике')
            return

        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)

        db       = _fs.client()
        fs_admin = _fs
        print('[Bridge] Firebase Admin: успешно подключён')

    except Exception as e:
        # ВАЖНО: не пробрасываем — иначе воркер умрёт при старте (SIGKILL/SystemExit)
        print(f'[Bridge] Firebase init error (продолжаем без Firebase): {e}')

_init_firebase()

# ── Flask ───────────────────────────────────────
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ALLOWED_ORIGIN}}, supports_credentials=False)

# ГАРАНТИРУЕМ CORS даже на 500-х ответах
@app.after_request
def _force_cors(resp):
    origin = request.headers.get('Origin', '')
    if origin == ALLOWED_ORIGIN:
        resp.headers['Access-Control-Allow-Origin']  = ALLOWED_ORIGIN
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        resp.headers['Vary'] = 'Origin'
    return resp

@app.errorhandler(Exception)
def _all_errors(e):
    print(f'[Bridge] UNHANDLED: {e}')
    return jsonify({'ok': False, 'error': str(e)}), 500

# ════════════════════════════════════════════════
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

# ════════════════════════════════════════════════
@app.route('/api/memory', methods=['POST', 'OPTIONS'])
def save_memory():
    if request.method == 'OPTIONS':
        return ('', 204)
    try:
        data    = request.get_json(silent=True) or {}
        content = (data.get('content') or data.get('message', '')).strip()
        email   = data.get('email', 'anonymous')
        uid     = (data.get('uid', '') or '').strip()

        if not content:
            return jsonify({'error': 'content is required'}), 400

        if uid and TELEGRAM_CHAT_ID and db:
            try:
                db.collection('routing').document(TELEGRAM_CHAT_ID).set({'uid': uid})
            except Exception as e:
                print(f'[Bridge] Routing save error: {e}')

        tg_ok = _send_telegram(
            f'📨 <b>Nitro Hub</b>\n👤 {email}\n🆔 <code>{uid[:8]}</code>\n💬 {content}'
        )

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
                print(f'[Bridge] Firestore save error: {e}')

        return jsonify({'ok': True, 'telegram': tg_ok, 'firestore': fs_ok}), 200

    except Exception as e:
        print(f'[Bridge] /api/memory ERROR: {e}')
        return jsonify({'ok': False, 'error': str(e)}), 500

@app.route('/api/telegram-webhook', methods=['POST'])
def telegram_webhook():
    data = request.get_json(silent=True) or {}
    message = data.get('message', {})
    text    = message.get('text', '').strip()
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
        print(f'[Bridge] Webhook -> {recipient_uid[:8]} | {"OK" if ok else "ERR"}')
    else:
        _send_telegram('⚠️ Маршрут не найден. Напишите с сайта ещё раз.', chat_id)

    return jsonify({'ok': True})

# ── Поиск в интернете (саморазвитие): без API-ключей ──
@app.route('/api/search', methods=['POST', 'OPTIONS'])
def web_search():
    if request.method == 'OPTIONS':
        return ('', 204)
    try:
        data  = request.get_json(silent=True) or {}
        query = (data.get('query') or '').strip()
        if not query:
            return jsonify({'error': 'query is required'}), 400

        result = {'query': query, 'wikipedia': None, 'duckduckgo': None}

        try:
            w = requests.get(
                f'https://ru.wikipedia.org/api/rest_v1/page/summary/{requests.utils.quote(query)}',
                timeout=8
            )
            if w.ok:
                j = w.json()
                result['wikipedia'] = {
                    'title':   j.get('title'),
                    'extract': j.get('extract'),
                    'url':     j.get('content_urls', {}).get('desktop', {}).get('page')
                }
        except Exception as e:
            print(f'[Bridge] wiki err: {e}')

        try:
            d = requests.get(
                'https://api.duckduckgo.com/',
                params={'q': query, 'format': 'json', 'no_html': 1, 'skip_disambig': 1},
                timeout=8
            )
            if d.ok:
                j = d.json()
                result['duckduckgo'] = {
                    'abstract': j.get('AbstractText'),
                    'source':   j.get('AbstractSource'),
                    'url':      j.get('AbstractURL')
                }
        except Exception as e:
            print(f'[Bridge] ddg err: {e}')

        return jsonify({'ok': True, 'result': result})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status':   'ok',
        'firebase': db is not None,
        'telegram': bool(TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID)
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT)
