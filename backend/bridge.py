import os
import requests
import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv  # Добавили загрузку .env
import logging

# Загружаем переменные (токены и ID)
load_dotenv()

# Отключаем лишние логи
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

app = Flask(__name__)
app.url_map.strict_slashes = False # Теперь /test и /test/ работают одинаково
CORS(app) # Применяем CORS ко всему приложению

# Глобальная переменная для БД
db = None

def get_db():
    global db
    if db is None:
        try:
            if not firebase_admin._apps:
                # Убедись, что файл лежит в папке backend/ или укажи полный путь
                path = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')
                cred = credentials.Certificate(path)
                firebase_admin.initialize_app(cred)
            db = firestore.client()
        except Exception as e:
            print(f"Firebase Error: {e}")
    return db

@app.route('/')
def home():
    return "Bridge is online! 🚀"

@app.route('/test')
def test_connection():
    return "Связь с мостом установлена! 🚀"

@app.route('/api/memory', methods=['POST'])
def save_memory():
    var_data = request.get_json(silent=True) or {}
    var_content = var_data.get('content', '')
    var_uid = var_data.get('uid', '')

    if not var_content or not var_uid:
        return jsonify({'ok': False, 'message': 'Missing data'}), 400

    try:
        # 1. Сохранение в Firestore
        client = get_db()
        if client:
            client.collection('faraday_memory').add({
                'content': var_content,
                'uid': var_uid,
                'timestamp': firestore.SERVER_TIMESTAMP
            })

        # 2. Отправка в Telegram
        token = os.getenv('TELEGRAM_BOT_TOKEN')
        chat_id = os.getenv('TELEGRAM_CHAT_ID')
        
        if token and chat_id:
            var_tg_url = f"https://api.telegram.org/bot{token}/sendMessage"
            requests.post(var_tg_url, json={
                'chat_id': chat_id,
                'text': f"💬 {var_content}"
            }, timeout=3)

        return jsonify({'ok': True}), 200
    except Exception as e:
        print(f"General Error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # В IDX важно брать порт из переменной окружения
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)