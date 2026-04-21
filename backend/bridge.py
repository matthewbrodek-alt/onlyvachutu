import os
import requests
import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import logging

# Загрузка переменных окружения
load_dotenv()

app = Flask(__name__)
# Разрешаем CORS для всех, чтобы GitHub Pages мог отправлять запросы
CORS(app, resources={r"/*": {"origins": "*"}})
app.url_map.strict_slashes = False

# Отключаем лишние логи в терминале
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
KEY_PATH = os.path.join(BASE_DIR, 'serviceAccountKey.json')

db = None

def get_db():
    global db
    if db is None:
        try:
            if not firebase_admin._apps:
                if os.path.exists(KEY_PATH):
                    cred = credentials.Certificate(KEY_PATH)
                    firebase_admin.initialize_app(cred)
                else:
                    print(f"❌ Ключ Firebase не найден в {KEY_PATH}")
            db = firestore.client()
        except Exception as e:
            print(f"🔥 Ошибка инициализации Firebase: {e}")
    return db

@app.route('/')
def home():
    return "<h1>Bridge is online! 🚀</h1>"

@app.route('/test', methods=['GET'])
def test_connection():
    return jsonify({
        "status": "ok", 
        "firebase_ready": os.path.exists(KEY_PATH)
    })

@app.route('/api/memory', methods=['POST'])
def save_memory():
    var_data = request.get_json(silent=True) or {}
    var_content = var_data.get('content', '')
    var_uid = var_data.get('uid', '')
    var_email = var_data.get('email', 'anonymous')

    if not var_content or not var_uid:
        return jsonify({'ok': False, 'error': 'Missing content or uid'}), 400

    try:
        # СОХРАНЕНИЕ: Пишем в личные сообщения пользователя (users/{uid}/messages)
        # Это не пересекается с глобальной памятью ИИ
        client = get_db()
        if client:
            client.collection('users').document(var_uid).collection('messages').add({
                'message': var_content,
                'sender': 'user',
                'email': var_email,
                'timestamp': firestore.SERVER_TIMESTAMP
            })

        # УВЕДОМЛЕНИЕ: Отправка в Telegram
        token = os.getenv('TELEGRAM_BOT_TOKEN')
        chat_id = os.getenv('TELEGRAM_CHAT_ID')
        
        if token and chat_id:
            tg_url = f"https://api.telegram.org/bot{token}/sendMessage"
            tg_text = f"💬 Личное сообщение\nEmail: {var_email}\nUID: {var_uid}\n\n{var_content}"
            requests.post(tg_url, json={'chat_id': chat_id, 'text': tg_text}, timeout=5)

        return jsonify({'ok': True}), 200
    except Exception as e:
        print(f"🔥 Ошибка: {e}")
        return jsonify({'ok': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)