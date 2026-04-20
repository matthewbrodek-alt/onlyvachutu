"""
bridge.py — Python-мост для Nitro Hub v8.1
Маршруты сообщений:
  Сайт → /api/memory  → Telegram + Firestore faraday_memory
  Telegram → /api/telegram-webhook → Firestore users/{uid}/faraday_responses → Сайт

Запуск:
    pip install flask flask-cors python-dotenv requests firebase-admin
    python bridge.py

Переменные окружения (backend/.env или Render Env):
    TELEGRAM_BOT_TOKEN=...
    TELEGRAM_CHAT_ID=...
    FIREBASE_SERVICE_ACCOUNT=... (JSON текст)
    PORT=5000
"""

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
PORT               = int(os.getenv('PORT', 5000))

# Таблица маршрутизации: telegram_chat_id → firebase_uid
user_routing = {}

# ── Firebase Admin ──────────────────────────────
db       = None
fs_admin = None

try:
    import firebase_admin
    from firebase_admin import credentials, firestore as _fs

    cred = None
    # 1. Пробуем загрузить из переменной окружения (для Render)
    if FIREBASE_KEY_JSON:
        try:
            cred_dict = json.loads(FIREBASE_KEY_JSON)
            cred = credentials.Certificate(cred_dict)
            print('[Bridge] Firebase: инициализация через Environment Variable')
        except Exception as e:
            print(f'[Bridge] Ошибка парсинга FIREBASE_SERVICE_ACCOUNT: {e}')

    # 2. Если переменной нет, пробуем локальный файл
    if not cred:
        KEY_FILE = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')
        if os.path.exists(KEY_FILE):
            cred = credentials.Certificate(KEY_FILE)
            print('[Bridge] Firebase: инициализация через файл serviceAccountKey.json')

    if cred:
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        db       = _fs.client()
        fs_admin = _fs
        print('[Bridge] Firebase Admin: подключён')
    else:
        print('[Bridge] Ключ Firebase не найден (ни в Env, ни в файле)')

except ImportError:
    print('[Bridge] firebase-admin не установлен — Firestore недоступен')
except Exception as e:
    print(f'[Bridge] Ошибка инициализации Firebase: {e}')

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
        print('[Bridge] Telegram credentials не заданы')
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
    """
    data    = request.get_json(silent=True) or {}
    content = (data.get('content') or data.get('message', '')).strip()
    email   = data.get('email', 'anonymous')
    uid     = data.get('uid', '').strip()

    if not content:
        return jsonify({'error': 'content is required'}), 400

    if uid and TELEGRAM_CHAT_ID:
        user_routing[TELEGRAM_CHAT_ID] = uid
        print(f'[Bridge] Routing: {TELEGRAM_CHAT_ID} → {uid[:8]}…')

    uid_short = uid[:8] + '...' if len(uid) > 8 else uid
    tg_text   = (
        f'📨 <b>Nitro Hub</b>\n'
        f'👤 {email}\n'
        f'🆔 <code>{uid_short}</code>\n'
        f'💬 {content}'
    )
    tg_ok = _send_telegram(tg_text)

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
    """
    data = request.get_json(silent=True) or {}
    message = data.get('message', {})
    text    = message.get('text', '').strip()
    chat_id = str(message.get('chat', {}).get('id', ''))

    if not text or not chat_id:
        return jsonify({'ok': True})

    recipient_uid = user_routing.get(chat_id)

    if recipient_uid:
        ok = _deliver_to_site(recipient_uid, text)
        status = 'доставлен' if ok else 'ошибка Firestore'
        print(f'[Bridge] Webhook: ответ «{text[:40]}» → uid {recipient_uid} | {status}')
    else:
        print(f'[Bridge] Webhook: нет маршрута для chat_id {chat_id}.')
        _send_telegram(
            '⚠️ Маршрут не найден. Попросите пользователя отправить сообщение с сайта первым.',
            chat_id
        )

    return jsonify({'ok': True})


@app.route('/api/notify', methods=['POST'])
def notify():
    """
    Отправить произвольное уведомление в Telegram.
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


if __name__ == '__main__':
    # Render сам назначит нужный порт через переменную окружения PORT
    port = int(os.environ.get("PORT", 5000)) 
    print(f'[Bridge] v8.1 запущен на порту {port}')
    app.run(host='0.0.0.0', port=port, debug=False)