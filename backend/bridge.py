"""
bridge.py — Python-мост для Nitro Hub
Принимает сообщения с фронтенда и:
  1. Отправляет уведомления в Telegram
  2. Пишет в Firebase Firestore (Admin SDK)
  3. Даёт точку для подключения OpenAI или других API

Запуск:
    pip install -r requirements.txt
    python bridge.py

Сервер слушает: http://localhost:5000
"""

import os
import json
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

# ── Загружаем .env ──────────────────────────────
load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
TELEGRAM_CHAT_ID   = os.getenv('TELEGRAM_CHAT_ID')
PORT               = int(os.getenv('PORT', 5000))

# ── Инициализация Flask ──────────────────────────
app = Flask(__name__)
CORS(app, origins=['http://localhost:3000', 'matthewbrodek-alt.github.io'])

# ── Инициализация Firebase Admin ────────────────
KEY_FILE = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')
if os.path.exists(KEY_FILE) and not firebase_admin._apps:
    cred = credentials.Certificate(KEY_FILE)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print('[Faraday] Firebase Admin: подключён')
else:
    db = None
    print('[Faraday] Firebase Admin: serviceAccountKey.json не найден')


# ══════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════

@app.route('/health', methods=['GET'])
def health():
    """Проверка состояния сервера"""
    return jsonify({'status': 'ok', 'version': '8.0'})


@app.route('/api/notify', methods=['POST'])
def notify():
    """
    Отправить уведомление в Telegram.
    Body: { "message": "текст", "email": "user@example.com" }
    """
    data    = request.get_json(silent=True) or {}
    message = data.get('message', '').strip()
    email   = data.get('email', 'anonymous')

    if not message:
        return jsonify({'error': 'message is required'}), 400

    text = f'📨 Nitro Hub\n👤 {email}\n💬 {message}'
    result = _send_telegram(text)

    if result:
        return jsonify({'ok': True})
    return jsonify({'error': 'Telegram send failed'}), 500


@app.route('/api/memory', methods=['POST'])
def save_memory():
    """
    Сохранить запись в faraday_memory (Firestore).
    Body: { "topic": "...", "content": "..." }
    """
    if not db:
        return jsonify({'error': 'Firebase not configured'}), 503

    data    = request.get_json(silent=True) or {}
    topic   = data.get('topic',   'note')
    content = data.get('content', '').strip()

    if not content:
        return jsonify({'error': 'content is required'}), 400

    db.collection('faraday_memory').add({
        'topic':     topic,
        'content':   content,
        'timestamp': firestore.SERVER_TIMESTAMP,
    })
    return jsonify({'ok': True})


@app.route('/api/memory', methods=['GET'])
def get_memory():
    """Получить последние 5 записей из faraday_memory"""
    if not db:
        return jsonify({'error': 'Firebase not configured'}), 503

    docs = (db.collection('faraday_memory')
              .order_by('timestamp', direction=firestore.Query.DESCENDING)
              .limit(5)
              .stream())

    result = [{'id': d.id, **d.to_dict()} for d in docs]
    # Убираем нечитаемые timestamp для JSON
    for r in result:
        r.pop('timestamp', None)

    return jsonify(result)


@app.route('/api/ai', methods=['POST'])
def ai_chat():
    """
    Точка для подключения внешнего ИИ (OpenAI, Anthropic и др.)
    Body: { "prompt": "текст запроса" }
    Сейчас возвращает заглушку — подключи своё API.
    """
    data   = request.get_json(silent=True) or {}
    prompt = data.get('prompt', '').strip()

    if not prompt:
        return jsonify({'error': 'prompt is required'}), 400

    # TODO: заменить на реальный вызов OpenAI / Anthropic
    # import openai
    # openai.api_key = os.getenv('OPENAI_API_KEY')
    # response = openai.ChatCompletion.create(...)

    stub = f'[Faraday AI] Команда «{prompt}» принята. Подключи OpenAI API в bridge.py.'
    return jsonify({'response': stub})


# ── Вспомогательные функции ──────────────────────

def _send_telegram(text: str) -> bool:
    """Отправить текст в Telegram"""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print('[Faraday] Telegram credentials не заданы в .env')
        return False
    try:
        url = f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage'
        r   = requests.post(url, json={'chat_id': TELEGRAM_CHAT_ID, 'text': text}, timeout=5)
        return r.ok
    except requests.RequestException as e:
        print(f'[Faraday] Telegram error: {e}')
        return False


# ── Запуск ──────────────────────────────────────
if __name__ == '__main__':
    print(f'[Faraday] Bridge запущен на порту {PORT}')
    app.run(host='0.0.0.0', port=PORT, debug=True)
