import os
import requests
import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask, request, jsonify
from flask_cors import CORS

# Отключаем отладочные логи Flask, чтобы не забивать буфер
import logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

app = Flask(__name__)
CORS(app) # Максимально открытый CORS для теста

# Глобальная переменная для БД
db = None

def get_db():
    global db
    if db is None:
        try:
            # Используем упрощенную инициализацию
            if not firebase_admin._apps:
                cred = credentials.Certificate('serviceAccountKey.json')
                firebase_admin.initialize_app(cred)
            db = firestore.client()
        except Exception as e:
            print(f"Firebase Error: {e}")
    return db

@app.route('/api/memory', methods=['POST'])
def save_memory():
    var_data = request.get_json(silent=True) or {}
    var_content = var_data.get('content', '')
    var_uid = var_data.get('uid', '')

    if not var_content or not var_uid:
        return jsonify({'ok': False}), 400

    try:
        # Работаем с Firestore только когда нужно
        client = get_db()
        if client:
            client.collection('faraday_memory').add({
                'content': var_content,
                'uid': var_uid,
                'timestamp': firestore.SERVER_TIMESTAMP
            })

        # Прямой запрос к Telegram (самый легкий способ)
        var_tg_url = f"https://api.telegram.org/bot{os.getenv('TELEGRAM_BOT_TOKEN')}/sendMessage"
        requests.post(var_tg_url, json={
            'chat_id': os.getenv('TELEGRAM_CHAT_ID'),
            'text': f"💬 {var_content}"
        }, timeout=3) # Жесткий таймаут, чтобы не вешать воркер

        return jsonify({'ok': True}), 200
    except Exception as e:
        return jsonify({'error': 'Memory limit risk'}), 500

@app.route('/health')
def health():
    return "OK", 200

if __name__ == '__main__':
    # Запуск без отладчика (он ест память)
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5000)), debug=False)