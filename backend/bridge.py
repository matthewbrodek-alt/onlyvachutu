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

# ── Разрешённые источники (CORS) ──────────────────
ALLOWED_ORIGINS = [
    'https://matthewbrodek-alt.github.io',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000',
]

# ── Firebase Admin ────────────────────────────────
db       = None
fs_admin = None

def _init_firebase():
    """Инициализация из файла ИЛИ из переменной окружения FIREBASE_SERVICE_ACCOUNT (JSON)."""
    global db, fs_admin
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore as _fs

        cred = None
        if os.path.exists('serviceAccountKey.json'):
            cred = credentials.Certificate('serviceAccountKey.json')
            print('[Bridge] Firebase: использую файл serviceAccountKey.json')
        elif FIREBASE_KEY_JSON:
            try:
                key_data = json.loads(FIREBASE_KEY_JSON)
                cred = credentials.Certificate(key_data)
                print('[Bridge] Firebase: использую переменную окружения FIREBASE_SERVICE_ACCOUNT')
            except Exception as e:
                print(f'[Bridge] FIREBASE_SERVICE_ACCOUNT невалидный JSON: {e}')

        if cred:
            if not firebase_admin._apps:
                firebase_admin.initialize_app(cred)
            db       = _fs.client()
            fs_admin = _fs
            print('[Bridge] Firebase Admin: ✅ подключён')
        else:
            print('[Bridge] ⚠️ Firebase не сконфигурирован — Firestore отключён, но сервер работает')
    except Exception as e:
        print(f'[Bridge] Ошибка инициализации Firebase: {e}')

_init_firebase()

# ── Flask ─────────────────────────────────────────
app = Flask(__name__)

# CORS — разрешаем все нужные origin + все методы + preflight
CORS(
    app,
    resources={r"/*": {"origins": ALLOWED_ORIGINS}},
    supports_credentials=False,
    methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Доп. страховка: принудительно добавляем CORS-заголовки к ЛЮБОМУ ответу,
# включая ответы с ошибкой 500 — чтобы браузер видел сообщение, а не CORS-блок.
@app.after_request
def _ensure_cors(resp):
    origin = request.headers.get('Origin', '')
    if origin in ALLOWED_ORIGINS:
        resp.headers['Access-Control-Allow-Origin']  = origin
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return resp

# Глобальный обработчик ошибок — чтобы 500 приходил как JSON с CORS
@app.errorhandler(Exception)
def _handle_any_error(e):
    print(f'[Bridge] Unhandled exception: {e}')
    return jsonify({'ok': False, 'error': 'Internal Server Error', 'message': str(e)}), 500

# ══════════════════════════════════════════════════
# ВСПОМОГАТЕЛЬНЫЕ
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
    if not db or not uid:
        return False
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

        # 1. Сохранение маршрута uid → chat_id (только если Firestore доступен)
        if uid and TELEGRAM_CHAT_ID and db:
            try:
                db.collection('routing').document(TELEGRAM_CHAT_ID).set({'uid': uid})
            except Exception as e:
                print(f'[Bridge] Routing save error: {e}')

        # 2. Telegram (работает без Firestore)
        tg_ok = _send_telegram(
            f'📨 <b>Nitro Hub</b>\n👤 {email}\n🆔 <code>{uid[:8] if uid else "—"}</code>\n💬 {content}'
        )

        # 3. Firestore (опционально)
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
                print(f'[Bridge] Firestore memory write error: {e}')

        return jsonify({'ok': True, 'telegram': tg_ok, 'firestore': fs_ok}), 200

    except Exception as e:
        print(f'[Bridge] CRITICAL /api/memory: {e}')
        return jsonify({'ok': False, 'error': 'Internal Server Error', 'message': str(e)}), 500


@app.route('/api/notify', methods=['POST', 'OPTIONS'])
def notify():
    if request.method == 'OPTIONS':
        return ('', 204)
    try:
        data    = request.get_json(silent=True) or {}
        message = (data.get('message') or '').strip()
        email   = data.get('email', 'system')
        if not message:
            return jsonify({'ok': False, 'error': 'message is required'}), 400
        ok = _send_telegram(f'🔔 <b>{email}</b>\n{message}')
        return jsonify({'ok': True, 'telegram': ok})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


# ── САМОРАЗВИТИЕ / ПОИСК В ИНТЕРНЕТЕ ──────────────
# Без внешних API-ключей: Wikipedia + DuckDuckGo Instant Answer.
@app.route('/api/search', methods=['POST', 'OPTIONS'])
def web_search():
    if request.method == 'OPTIONS':
        return ('', 204)
    try:
        data  = request.get_json(silent=True) or {}
        query = (data.get('query') or '').strip()
        lang  = data.get('lang', 'ru')
        if not query:
            return jsonify({'ok': False, 'error': 'query is required'}), 400

        answer = None
        source = None

        # 1) DuckDuckGo Instant Answer
        try:
            r = requests.get('https://api.duckduckgo.com/', params={
                'q': query, 'format': 'json', 'no_html': 1, 'skip_disambig': 1,
            }, timeout=8)
            if r.ok:
                j = r.json()
                answer = j.get('AbstractText') or j.get('Answer') or None
                if answer:
                    source = j.get('AbstractURL') or 'duckduckgo.com'
        except Exception as e:
            print(f'[Bridge] DDG error: {e}')

        # 2) Wikipedia (если DDG пустой)
        if not answer:
            try:
                wiki = 'ru' if lang == 'ru' else 'en'
                r = requests.get(
                    f'https://{wiki}.wikipedia.org/w/api.php',
                    params={
                        'action': 'query', 'format': 'json',
                        'prop': 'extracts', 'exintro': 'true', 'explaintext': 'true',
                        'exsentences': 3, 'redirects': 1, 'titles': query,
                    }, timeout=8
                )
                if r.ok:
                    pages = (r.json().get('query') or {}).get('pages') or {}
                    for pid, page in pages.items():
                        if pid != '-1' and page.get('extract'):
                            answer = page['extract']
                            source = f'https://{wiki}.wikipedia.org/wiki/{query.replace(" ", "_")}'
                            break
            except Exception as e:
                print(f'[Bridge] Wiki error: {e}')

        return jsonify({
            'ok': bool(answer),
            'query': query,
            'answer': answer,
            'source': source,
        })
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


@app.route('/api/telegram-webhook', methods=['POST'])
def telegram_webhook():
    data    = request.get_json(silent=True) or {}
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
        print(f'[Bridge] Webhook: {text[:30]}... -> {recipient_uid[:8]} | {"OK" if ok else "ERR"}')
    else:
        _send_telegram('⚠️ Маршрут не найден. Напишите с сайта ещё раз.', chat_id)

    return jsonify({'ok': True})


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status':   'ok',
        'firebase': db is not None,
        'telegram': bool(TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID),
    })


@app.route('/', methods=['GET'])
def root():
    return jsonify({'service': 'Nitro Hub Bridge', 'status': 'running'})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT)
