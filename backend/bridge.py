import os
import requests
import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import logging

# 1. Загружаем переменные окружения (.env)
load_dotenv()

# 2. Настройка Flask
app = Flask(__name__)
# Разрешаем CORS для всех доменов и путей, чтобы GitHub Pages мог достучаться
CORS(app, resources={r"/*": {"origins": "*"}})
app.url_map.strict_slashes = False

# Отключаем лишний спам в консоли
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

# 3. Пути к файлам
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
KEY_PATH = os.path.join(BASE_DIR, 'serviceAccountKey.json')

# 4. Инициализация Firebase
db = None

def get_db():
    global db
    if db is None:
        try:
            if not firebase_admin._apps:
                if os.path.exists(KEY_PATH):
                    cred = credentials.Certificate(KEY_PATH)
                    firebase_admin.initialize_app(cred)
                    print(f"✅ Firebase подключен: {KEY_PATH}")
                else:
                    print(f"❌ Файл ключа НЕ НАЙДЕН по пути: {KEY_PATH}")
            db = firestore.client()
        except Exception as e:
            print(f"🔥 Ошибка Firebase: {e}")
    return db

# 5. МАРШРУТЫ (ROUTES)

@app.route('/')
def home():
    return "<h1>Bridge is online! 🚀</h1><p>Используйте /test для проверки связи.</p>"

@app.route('/test', methods=['GET'])
def test_connection():
    return jsonify({
        "status": "ok", 
        "message": "Связь с мостом установлена! 🚀",
        "firebase_ready": os.path.exists(KEY_PATH)
    })

@app.route('/api/memory', methods=['POST'])
def save_memory():
    # Получаем данные из JSON
    var_data = request.get_json(silent=True) or {}
    var_content = var_data.get('content', '')
    var_uid = var_data.get('uid', '')
    var_email = var_data.get('email', 'anonymous')

    if not var_content or not var_uid:
        return jsonify({'ok': False, 'error': 'Missing content or uid'}), 400

    try:
        # А. Запись в Firestore
        client = get_db()
        if client:
            client.collection('faraday_memory').add({
                'content': var_content,
                'uid': var_uid,
                'email': var_email,
                'timestamp': firestore.SERVER_TIMESTAMP
            })

        # Б. Уведомление в Telegram
        token = os.getenv('TELEGRAM_BOT_TOKEN')
        chat_id = os.getenv('TELEGRAM_CHAT_ID')
        
        if token and chat_id:
            tg_url = f"https://api.telegram.org/bot{token}/sendMessage"
            tg_text = f"💬 Новое сообщение\nОт: {var_email}\nUID: {var_uid}\n\n{var_content}"
            requests.post(tg_url, json={
                'chat_id': chat_id,
                'text': tg_text
            }, timeout=5)

        return jsonify({'ok': True}), 200

    except Exception as e:
        print(f"🔥 Ошибка при обработке: {e}")
        return jsonify({'ok': False, 'error': str(e)}), 500

# 6. ЗАПУСК
if __name__ == '__main__':
    # IDX использует порт из переменной окружения PORT
    port = int(os.environ.get("PORT", 5000))
    print(f"🚀 Запуск моста на порту {port}...")
    app.run(host='0.0.0.0', port=port, debug=True)