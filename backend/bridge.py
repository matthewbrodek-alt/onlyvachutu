import os
import requests
import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# ── Глобальная настройка CORS ──
# Разрешаем твой домен, методы и обязательно заголовок Content-Type для всех маршрутов (/*)
CORS(app, resources={
    r"/*": {
        "origins": "https://matthewbrodek-alt.github.io",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Константы
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID   = os.getenv('TELEGRAM_CHAT_ID', '')

# ── Глобальная инициализация Firebase ──
db = None
try:
    if os.path.exists('serviceAccountKey.json'):
        cred = credentials.Certificate('serviceAccountKey.json')
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        db = firestore.client()
        print('[Bridge] Firebase Admin: OK')
    else:
        print('[Bridge] Error: serviceAccountKey.json missing')
except Exception as e:
    print(f'[Bridge] Firebase Init Error: {e}')

# ── Endpoints ──
@app.route('/api/memory', methods=['POST'])
def save_memory():
    try:
        data = request.get_json(silent=True) or {}
        content = data.get('content', '').strip()
        uid = data.get('uid', '').strip() # Получаем UID пользователя с фронтенда

        if not content or not uid:
            return jsonify({'error': 'UID and content required'}), 400

        # 1. Запоминаем связь UID и ChatID (чтобы бот знал, кому отвечать)
        if db:
            db.collection('routing').document(str(TELEGRAM_CHAT_ID)).set({'uid': uid})

        # 2. Отправляем в Telegram
        url = f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage'
        text = f"👤 <b>User:</b> {uid[:8]}...\n💬 {content}"
        requests.post(url, json={'chat_id': TELEGRAM_CHAT_ID, 'text': text, 'parse_mode': 'HTML'})

        return jsonify({'ok': True}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/telegram-webhook', methods=['POST'])
def telegram_webhook():
    data = request.get_json(silent=True) or {}
    message = data.get('message', {})
    text = message.get('text', '')
    chat_id = str(message.get('chat', {}).get('id', ''))

    if not text or not chat_id:
        return jsonify({'ok': True})

    # 1. Ищем, какому UID принадлежит этот Chat ID
    if db:
        doc = db.collection('routing').document(chat_id).get()
        if doc.exists:
            uid = doc.to_dict().get('uid')
            
            # 2. Пишем ответ в коллекцию, которую слушает фронтенд
            db.collection('users').document(uid).collection('faraday_responses').add({
                'text': text,
                'sender': 'FARADAY',
                'timestamp': firestore.SERVER_TIMESTAMP
            })
            print(f"Reply delivered to {uid}")

    return jsonify({'ok': True})

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'db': db is not None}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)