import os
import json
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID   = os.getenv('TELEGRAM_CHAT_ID', '')
PORT               = int(os.getenv('PORT', 5000))

# Временное хранилище связей (ChatID -> LastUID)
# Чтобы бот знал, кому отвечать в Firestore
user_routing = {}

# ── Firebase Admin ──────────────────────────────
try:
    import firebase_admin
    from firebase_admin import credentials, firestore as fs_admin

    KEY_FILE = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')
    if os.path.exists(KEY_FILE) and not firebase_admin._apps:
        cred = credentials.Certificate(KEY_FILE)
        firebase_admin.initialize_app(cred)
        db = fs_admin.client()
        print('[Faraday] Firebase Admin: подключён')
    else:
        db = fs_admin.client() if firebase_admin._apps else None
except ImportError:
    db = None
    fs_admin = None

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# ══════════════════════════════════════════════════
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ══════════════════════════════════════════════════

def _send_telegram(text: str) -> bool:
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID: return False
    try:
        url = f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage'
        r = requests.post(url, json={
            'chat_id': TELEGRAM_CHAT_ID,
            'text': text,
            'parse_mode': 'HTML'
        }, timeout=5)
        return r.ok
    except Exception as e:
        print(f'[Faraday] TG Error: {e}')
        return False

def _send_response_to_site(recipient_uid: str, text: str) -> bool:
    """Запись ответа в подколлекцию конкретного пользователя."""
    if not db or not recipient_uid or not text:
        return False
    try:
        doc_ref = db.collection('users').document(recipient_uid).collection('faraday_responses')
        doc_ref.add({
            'text': text,
            'sender': 'FARADAY',
            'timestamp': fs_admin.SERVER_TIMESTAMP
        })
        return True
    except Exception as e:
        print(f'[Faraday] Firestore Write Error: {e}')
        return False

# ══════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════

@app.route('/api/memory', methods=['POST'])
def save_memory():
    data = request.get_json(silent=True) or {}
    content = (data.get('content') or data.get('message', '')).strip()
    email = data.get('email', 'anonymous')
    uid = data.get('uid') # Получаем UID от фронтенда

    if not content: return jsonify({'error': 'content is required'}), 400

    # Запоминаем, что этот чат сейчас общается с этим UID
    if uid:
        user_routing[TELEGRAM_CHAT_ID] = uid

    # 1. Отправка в Telegram
    tg_text = f'📨 <b>Новое сообщение</b>\n👤 {email}\n🆔 <code>{uid}</code>\n💬 {content}'
    _send_telegram(tg_text)

    # 2. Сохранение в общую память
    if db:
        db.collection('faraday_memory').add({
            'content': content,
            'email': email,
            'uid': uid,
            'timestamp': fs_admin.SERVER_TIMESTAMP
        })

    return jsonify({'ok': True})

@app.route('/api/telegram-webhook', methods=['POST'])
def telegram_webhook():
    """Автоматический ответ пользователю, который писал последним."""
    data = request.get_json()
    if 'message' in data and 'text' in data['message']:
        chat_id = str(data['message']['chat']['id'])
        text = data['message']['text']

        # Проверяем, есть ли у нас запущенный диалог для этого чата
        recipient_uid = user_routing.get(chat_id)

        if recipient_uid:
            _send_response_to_site(recipient_uid, text)
            print(f'[Bridge] Ответ отправлен пользователю {recipient_uid}: {text}')
        else:
            print(f'[Bridge] Не найден UID для чата {chat_id}. Напишите сначала с сайта.')

    return jsonify({'ok': True})

# ── Запуск ──────────────────────────────────────
if __name__ == '__main__':
    print(f'[Faraday] Bridge v8.1 запущен на порту {PORT}')
    app.run(host='0.0.0.0', port=PORT, debug=True)