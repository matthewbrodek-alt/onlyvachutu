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
        uid = data.get('uid', '').strip()

        if not content:
            return jsonify({'error': 'No content'}), 400

        # Telegram
        tg_ok = False
        if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
            url = f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage'
            payload = {'chat_id': TELEGRAM_CHAT_ID, 'text': f"💬 {content}", 'parse_mode': 'HTML'}
            tg_res = requests.post(url, json=payload, timeout=5)
            tg_ok = tg_res.ok

        # Firestore
        fs_ok = False
        if db and uid:
            db.collection('faraday_memory').add({
                'content': content,
                'uid': uid,
                'timestamp': firestore.SERVER_TIMESTAMP
            })
            fs_ok = True

        return jsonify({'ok': True, 'tg': tg_ok, 'fs': fs_ok}), 200

    except Exception as e:
        print(f"CRITICAL: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'db': db is not None}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)