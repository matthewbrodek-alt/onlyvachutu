"""
bridge.py — Python-мост для Nitro Hub v8.0
Принимает сообщения с фронтенда и:
  1. Отправляет уведомления в Telegram
  2. Пишет в Firebase Firestore (Admin SDK)
  3. Может отправить ответ Faraday обратно на сайт (faraday_responses)
  4. Готова точка для подключения OpenAI или других AI API

Запуск:
    pip install flask flask-cors python-dotenv requests firebase-admin
    python bridge.py

Сервер слушает: http://localhost:5000
Токены: backend/.env  (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)
"""

import os
import json
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# ── Загружаем .env ──────────────────────────────
load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID   = os.getenv('TELEGRAM_CHAT_ID', '')
PORT               = int(os.getenv('PORT', 5000))

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
        db = None
        if firebase_admin._apps:
            db = fs_admin.client()
        else:
            print('[Faraday] Firebase Admin: serviceAccountKey.json не найден — работаю без Firestore')
except ImportError:
    db = None
    fs_admin = None
    print('[Faraday] firebase-admin не установлен — Firestore недоступен')

# ── Flask ───────────────────────────────────────
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})


# ══════════════════════════════════════════════════
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ══════════════════════════════════════════════════

def _send_telegram(text: str) -> bool:
    """Отправить текст в Telegram."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print('[Faraday] Telegram credentials не заданы в .env')
        return False
    try:
        url = f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage'
        r   = requests.post(url, json={
            'chat_id':    TELEGRAM_CHAT_ID,
            'text':       text,
            'parse_mode': 'HTML'
        }, timeout=5)
        return r.ok
    except requests.RequestException as e:
        print(f'[Faraday] Telegram error: {e}')
        return False


def _save_to_firestore(collection: str, data: dict) -> bool:
    """Сохранить документ в Firestore через Admin SDK."""
    if not db or not fs_admin:
        return False
    try:
        data['timestamp'] = fs_admin.SERVER_TIMESTAMP
        db.collection(collection).add(data)
        return True
    except Exception as e:
        print(f'[Faraday] Firestore write error ({collection}): {e}')
        return False


def _send_response_to_site(recipient_uid: str, text: str) -> bool:
    """
    Отправить ответ Faraday обратно на сайт через Firestore.
    Фронтенд слушает faraday_responses через listenForFaradayResponses().
    """
    if not recipient_uid or not text:
        return False
    return _save_to_firestore('faraday_responses', {
        'recipientId': recipient_uid,
        'text':        text,
    })


# ══════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════

@app.route('/health', methods=['GET'])
def health():
    """Проверка состояния сервера."""
    return jsonify({
        'status':   'ok',
        'version':  '8.0',
        'firebase': db is not None,
        'telegram': bool(TELEGRAM_BOT_TOKEN)
    })


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

    text   = f'📨 <b>Nitro Hub</b>\n👤 {email}\n💬 {message}'
    result = _send_telegram(text)

    if result:
        return jsonify({'ok': True})
    # Не возвращаем 500 — клиент не должен падать из-за Telegram
    return jsonify({'ok': False, 'warn': 'Telegram send failed'}), 200


@app.route('/api/memory', methods=['POST'])
def save_memory():
    """
    Сохранить запись памяти и уведомить в Telegram.
    Body: { "content": "текст" | "message": "текст", "email": "..." }
    """
    data    = request.get_json(silent=True) or {}
    content = (data.get('content') or data.get('message', '')).strip()
    email   = data.get('email', 'anonymous')

    if not content:
        return jsonify({'error': 'content is required'}), 400

    # Telegram
    tg_text = f'📨 <b>Сообщение</b>\n👤 {email}\n💬 {content}'
    tg_ok   = _send_telegram(tg_text)

    # Firestore
    fs_ok = _save_to_firestore('faraday_memory', {
        'content': content,
        'email':   email,
        'topic':   'user_message'
    })

    print(f'[Bridge] /api/memory | TG: {tg_ok} | FS: {fs_ok}')
    return jsonify({'ok': True, 'telegram': tg_ok, 'firestore': fs_ok})


@app.route('/api/memory', methods=['GET'])
def get_memory():
    """Получить последние 5 записей из faraday_memory."""
    if not db:
        return jsonify({'error': 'Firebase not configured'}), 503

    try:
        docs = (db.collection('faraday_memory')
                  .order_by('timestamp', direction=fs_admin.Query.DESCENDING)
                  .limit(5)
                  .stream())
        result = []
        for d in docs:
            row = d.to_dict()
            row.pop('timestamp', None)  # убираем нечитаемый timestamp
            row['id'] = d.id
            result.append(row)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/response', methods=['POST'])
def send_response():
    """
    Отправить ответ Faraday обратно на сайт.
    Body: { "recipient_uid": "...", "text": "..." }
    Используй этот endpoint из своего бота/скрипта после обработки сообщения.
    """
    data = request.get_json(silent=True) or {}
    uid  = data.get('recipient_uid', '').strip()
    text = data.get('text', '').strip()

    if not uid or not text:
        return jsonify({'error': 'recipient_uid and text are required'}), 400

    ok = _send_response_to_site(uid, text)
    return jsonify({'ok': ok})


@app.route('/api/ai', methods=['POST'])
def ai_chat():
    """
    Точка для подключения внешнего AI (OpenAI, Anthropic и др.)
    Body: { "prompt": "текст", "uid": "optional_user_id" }
    Сейчас возвращает заглушку — подключи своё API в блоке TODO.
    """
    data   = request.get_json(silent=True) or {}
    prompt = data.get('prompt', '').strip()
    uid    = data.get('uid', '')

    if not prompt:
        return jsonify({'error': 'prompt is required'}), 400

    # ── TODO: реальный вызов AI ────────────────────────────────
    # import openai
    # openai.api_key = os.getenv('OPENAI_API_KEY')
    # resp = openai.ChatCompletion.create(
    #     model='gpt-4',
    #     messages=[{'role':'user','content':prompt}]
    # )
    # answer = resp.choices[0].message.content
    # ─────────────────────────────────────────────────────────────

    answer = f'[Faraday AI] Команда «{prompt}» принята. Подключи OpenAI API в bridge.py.'

    # Если передан uid — отправляем ответ обратно на сайт
    if uid:
        _send_response_to_site(uid, answer)

    return jsonify({'response': answer})


# ── Запуск ──────────────────────────────────────
if __name__ == '__main__':
    print(f'[Faraday] Bridge v8.0 запущен на порту {PORT}')
    print(f'[Faraday] Telegram: {"OK" if TELEGRAM_BOT_TOKEN else "не настроен"}')
    print(f'[Faraday] Firebase: {"OK" if db else "не настроен"}')
    app.run(host='0.0.0.0', port=PORT, debug=False)
