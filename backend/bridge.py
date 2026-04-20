"""
bridge.py — Python-мост для Nitro Hub v8.1
Деплой: Render.com (gunicorn)

Маршруты сообщений:
  Сайт → /api/memory         → Telegram + Firestore faraday_memory
  Telegram → /api/telegram-webhook → Firestore users/{uid}/faraday_responses → Сайт

Переменные окружения (Render → Environment):
    TELEGRAM_BOT_TOKEN=...
    TELEGRAM_CHAT_ID=...
    PORT задаётся Render автоматически
"""

import os
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID   = os.getenv('TELEGRAM_CHAT_ID', '')

# ── Таблица маршрутизации ────────────────────────
# telegram_chat_id → firebase_uid
# Заполняется при каждом сообщении с сайта.
# На Render.com живёт в RAM одного воркера —
# для production используй Redis или Firestore routing.
user_routing: dict = {}

# ── Firebase Admin ───────────────────────────────
db       = None
fs_admin = None

try:
    import firebase_admin
    from firebase_admin import credentials, firestore as _fs

    KEY_FILE = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')
    if os.path.exists(KEY_FILE):
        if not firebase_admin._apps:
            cred = credentials.Certificate(KEY_FILE)
            firebase_admin.initialize_app(cred)
        db       = _fs.client()
        fs_admin = _fs
        print('[Bridge] Firebase Admin: подключён')
    else:
        print('[Bridge] serviceAccountKey.json не найден — Firestore недоступен')
except ImportError:
    print('[Bridge] firebase-admin не установлен')

# ── Flask ────────────────────────────────────────
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})


# ══════════════════════════════════════════════════
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ══════════════════════════════════════════════════

def _send_telegram(text: str, chat_id: str | None = None) -> bool:
    """Отправить текст в Telegram."""
    target = chat_id or TELEGRAM_CHAT_ID
    if not TELEGRAM_BOT_TOKEN or not target:
        print('[Bridge] Telegram credentials не заданы')
        return False
    try:
        url = f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage'
        r   = requests.post(url, json={
            'chat_id':    target,
            'text':       text,
            'parse_mode': 'HTML'
        }, timeout=5)
        if not r.ok:
            print(f'[Bridge] Telegram HTTP {r.status_code}: {r.text[:200]}')
        return r.ok
    except requests.RequestException as e:
        print(f'[Bridge] Telegram error: {e}')
        return False


def _deliver_to_site(uid: str, text: str) -> bool:
    """
    Записать ответ в Firestore users/{uid}/faraday_responses.
    auth.js слушает этот путь через onSnapshot и выводит в Faraday-чат.
    """
    if not db or not uid or not text:
        return False
    try:
        db.collection('users').document(uid) \
          .collection('faraday_responses').add({
              'text':      text,
              'sender':    'FARADAY',
              'timestamp': fs_admin.SERVER_TIMESTAMP
          })
        print(f'[Bridge] → users/{uid[:8]}…/faraday_responses: OK')
        return True
    except Exception as e:
        print(f'[Bridge] Firestore write error: {e}')
        return False


# ══════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════

@app.route('/health', methods=['GET'])
def health():
    """Проверка состояния. Используется в self-diagnostic фронтенда."""
    return jsonify({
        'status':       'ok',
        'version':      '8.1',
        'firebase':     db is not None,
        'telegram':     bool(TELEGRAM_BOT_TOKEN),
        'routing_size': len(user_routing)
    })


@app.route('/api/memory', methods=['POST'])
def save_memory():
    """
    Принять сообщение с сайта (личный мессенджер).
    1. Сохраняем uid→chat_id в user_routing для обратного роутинга.
    2. Отправляем в Telegram.
    3. Сохраняем в faraday_memory.

    Body: { "content"/"message": str, "email": str, "uid": str }
    """
    data    = request.get_json(silent=True) or {}
    content = (data.get('content') or data.get('message', '')).strip()
    email   = data.get('email', 'anonymous')
    uid     = data.get('uid', '').strip()

    if not content:
        return jsonify({'error': 'content is required'}), 400

    # Обновляем таблицу маршрутизации
    # Ключ = TELEGRAM_CHAT_ID (твой личный чат с ботом),
    # значение = uid пользователя который сейчас пишет с сайта.
    if uid and TELEGRAM_CHAT_ID:
        user_routing[TELEGRAM_CHAT_ID] = uid
        print(f'[Bridge] Routing updated: {TELEGRAM_CHAT_ID} → {uid[:8]}…')

    # Telegram
    uid_label = uid[:8] + '…' if len(uid) > 8 else (uid or '—')
    tg_text = (
        f'📨 <b>Nitro Hub — Личный чат</b>\n'
        f'👤 {email}\n'
        f'🆔 <code>{uid_label}</code>\n'
        f'💬 {content}'
    )
    tg_ok = _send_telegram(tg_text)

    # Firestore
    fs_ok = False
    if db:
        try:
            db.collection('faraday_memory').add({
                'content':   content,
                'email':     email,
                'uid':       uid,
                'topic':     'user_message',
                'timestamp': fs_admin.SERVER_TIMESTAMP
            })
            fs_ok = True
        except Exception as e:
            print(f'[Bridge] faraday_memory write error: {e}')

    print(f'[Bridge] /api/memory | TG: {tg_ok} | FS: {fs_ok}')
    return jsonify({'ok': True, 'telegram': tg_ok, 'firestore': fs_ok})


@app.route('/api/telegram-webhook', methods=['POST'])
def telegram_webhook():
    """
    Получить входящий ответ из Telegram (владелец отвечает пользователю).
    Telegram webhook должен быть настроен через setWebhook на этот URL.

    Маршрут: Telegram → bridge → Firestore users/{uid}/faraday_responses → сайт.
    """
    data    = request.get_json(silent=True) or {}
    message = data.get('message', {})
    text    = message.get('text', '').strip()
    chat_id = str(message.get('chat', {}).get('id', ''))

    if not text or not chat_id:
        return jsonify({'ok': True})  # служебные обновления — игнорируем

    recipient_uid = user_routing.get(chat_id)

    if recipient_uid:
        ok     = _deliver_to_site(recipient_uid, text)
        status = 'доставлен' if ok else 'ошибка Firestore'
        print(f'[Bridge] Webhook: «{text[:40]}» → uid {recipient_uid[:8]}… | {status}')
    else:
        # Маршрут не найден — пользователь не писал с сайта в этой сессии
        hint = (
            '⚠️ Маршрут не найден.\n'
            f'Известные chat_id: {list(user_routing.keys()) or "нет"}\n'
            'Попросите пользователя отправить сообщение с сайта первым.'
        )
        print(f'[Bridge] Webhook: нет маршрута для chat_id={chat_id}')
        _send_telegram(hint, chat_id)

    return jsonify({'ok': True})


@app.route('/api/notify', methods=['POST'])
def notify():
    """
    Системные уведомления → Telegram (ошибки, window.onerror и т.д.).
    Body: { "message": str, "email": str }
    """
    data    = request.get_json(silent=True) or {}
    message = data.get('message', '').strip()
    email   = data.get('email', 'system')

    if not message:
        return jsonify({'error': 'message is required'}), 400

    tg_text = f'🔔 <b>Nitro Hub</b>\n👤 {email}\n📋 {message}'
    ok      = _send_telegram(tg_text)
    return jsonify({'ok': ok})


@app.route('/api/memory', methods=['GET'])
def get_memory():
    """Последние 5 записей из faraday_memory (для self-evolution и диагностики)."""
    if not db:
        return jsonify({'error': 'Firebase not configured'}), 503
    try:
        docs = (
            db.collection('faraday_memory')
              .order_by('timestamp', direction=fs_admin.Query.DESCENDING)
              .limit(5)
              .stream()
        )
        result = []
        for d in docs:
            row = d.to_dict()
            row.pop('timestamp', None)
            row['id'] = d.id
            result.append(row)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Запуск ───────────────────────────────────────
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f'[Bridge] v8.1 → порт {port}')
    print(f'[Bridge] Telegram: {"OK" if TELEGRAM_BOT_TOKEN else "НЕ НАСТРОЕН"}')
    print(f'[Bridge] Firebase: {"OK" if db else "НЕ НАСТРОЕН"}')
    app.run(host='0.0.0.0', port=port, debug=False)
