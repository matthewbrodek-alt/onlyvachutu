import os
import requests
import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Загружаем .env (токены и ID чата)
load_dotenv()

app = Flask(__name__)
CORS(app)

# Определяем путь к папке, где лежит этот скрипт
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
KEY_PATH = os.path.join(BASE_DIR, 'serviceAccountKey.json')

# Глобальная переменная для БД
db = None

def get_db():
    global db
    if db is None:
        try:
            if not firebase_admin._apps:
                if os.path.exists(KEY_PATH):
                    cred = credentials.Certificate(KEY_PATH)
                    firebase_admin.initialize_app(cred)
                    print(f"✅ Firebase подключен через: {KEY_PATH}")
                else:
                    print(f"❌ Файл ключа НЕ НАЙДЕН по пути: {KEY_PATH}")
            db = firestore.client()
        except Exception as e:
            print(f"🔥 Ошибка Firebase: {e}")
    return db

@app.route('/')
def home():
    return "<h1>Bridge is online! 🚀</h1><p>Проверь /test для теста связи.</p>"

@app.route('/test')
def test_connection():
    return jsonify({"status": "ok", "message": "Связь с мостом установлена! 🚀"})

@app.route('/api/memory', methods=['POST'])
def save_memory():
    var_data = request.get_json(silent=True) or {}
    var_content = var_data.get('content', '')
    var_uid = var_data.get('uid', '')

    if not var_content or not var_uid:
        return jsonify({'ok': False, 'error': 'Missing data'}), 400

    try:
        # Сохранение в Firebase
        client = get_db()
        if client:
            client.collection('faraday_memory').add({
                'content': var_content,
                'uid': var_uid,
                'timestamp': firestore.SERVER_TIMESTAMP
            })

        # Отправка в Telegram
        token = os.getenv('TELEGRAM_BOT_TOKEN')
        chat_id = os.getenv('TELEGRAM_CHAT_ID')
        if token and chat_id:
            requests.post(f"https://api.telegram.org/bot{token}/sendMessage", json={
                'chat_id': chat_id,
                'text': f"💬 {var_content}"
            }, timeout=3)

        return jsonify({'ok': True}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # В IDX важно использовать порт из окружения
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port, debug=True)