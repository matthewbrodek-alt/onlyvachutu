import os
import requests
import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)

# Полная настройка CORS для твоего домена
CORS(app, resources={r"/*": {
    "origins": "https://matthewbrodek-alt.github.io",
    "methods": ["GET", "POST", "OPTIONS"],
    "allow_headers": ["Content-Type"]
}})

# Глобальный Firebase (один раз при старте)
db = None
if not firebase_admin._apps:
    try:
        cred = credentials.Certificate('serviceAccountKey.json')
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("[Bridge] Firebase: Ready")
    except Exception as e:
        print(f"[Bridge] Init Error: {e}")

@app.route('/api/memory', methods=['POST'])
def save_memory():
    try:
        var_data = request.get_json(silent=True) or {}
        var_content = var_data.get('content', '').strip()
        var_uid = var_data.get('uid', '').strip()

        if not var_content or not var_uid:
            return jsonify({'error': 'No data'}), 400

        # Сохраняем роутинг UID <-> ChatID
        if db:
            db.collection('routing').document(os.getenv('TELEGRAM_CHAT_ID')).set({'uid': var_uid})
            db.collection('faraday_memory').add({
                'content': var_content, 'uid': var_uid, 'timestamp': firestore.SERVER_TIMESTAMP
            })

        # В Telegram
        var_url = f"https://api.telegram.org/bot{os.getenv('TELEGRAM_BOT_TOKEN')}/sendMessage"
        requests.post(var_url, json={
            'chat_id': os.getenv('TELEGRAM_CHAT_ID'),
            'text': f"💬 {var_content}"
        }, timeout=5)

        return jsonify({'ok': True}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/telegram-webhook', methods=['POST'])
def webhook():
    var_data = request.get_json(silent=True) or {}
    var_msg = var_data.get('message', {})
    var_text = var_msg.get('text', '')
    var_chat_id = str(var_msg.get('chat', {}).get('id', ''))

    if var_text and db:
        var_doc = db.collection('routing').document(var_chat_id).get()
        if var_doc.exists:
            var_uid = var_doc.to_dict().get('uid')
            db.collection('users').document(var_uid).collection('faraday_responses').add({
                'text': var_text, 'sender': 'FARADAY', 'timestamp': firestore.SERVER_TIMESTAMP
            })
    return jsonify({'ok': True}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5000)))