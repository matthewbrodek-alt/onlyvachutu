"""
bridge.py — Nitro Hub Bridge v11.1 [Polling + Groq AI]
Архитектура: Firestore Queue + Telegram Polling (без портов, без Flask)

═══════════════════════════════════════════════════
 СХЕМА ДАННЫХ И ПОТОКОВ
═══════════════════════════════════════════════════

 ПОЛЬЗОВАТЕЛЬ → TELEGRAM (исходящие):
   JS пишет в bridge_queue/{docId}
   ↓
   on_snapshot ловит pending-документ (проверяет chatType)
   ↓
   Если chatType == 'ai' → Запрос в Groq → Запись в faraday_responses
   ↓
   Отправляем в Telegram владельцу (с меткой ID: {uid})
   ↓
   Обновляем status:'delivered'

 TELEGRAM → ПОЛЬЗОВАТЕЛЬ (входящие ответы):
   Владелец делает Reply в Telegram
   ↓
   bot.infinity_polling ловит ответ
   ↓
   Извлекает UID из цитаты (ID: {uid})
   ↓
   Пишем в users/{uid}/faraday_responses
   ↓
   auth.js на сайте мгновенно показывает ответ

═══════════════════════════════════════════════════
 ЗАПУСК:
   .venv/bin/python backend/bridge.py
═══════════════════════════════════════════════════
"""
import os
import sys
import re
import json
import logging
import threading
import time
import requests

import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
from groq import Groq

# ── Загрузка переменных окружения ────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'))
load_dotenv(os.path.join(BASE_DIR, '..', '.env'))

# ── Логгер ───────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S',
    stream=sys.stdout
)
log = logging.getLogger('bridge')

# ── Telegram и Groq credentials ──────────────────
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID   = os.getenv('TELEGRAM_CHAT_ID', '')
GROQ_API_KEY       = os.getenv('GROQ_API_KEY', '')

# ── Глобальные объекты Firebase и Groq ───────────
db     = None
fs     = None
client = None   # Groq client

if GROQ_API_KEY:
    log.info(f'Groq: ключ загружен ({GROQ_API_KEY[:8]}…)')
    client = Groq(api_key=GROQ_API_KEY)
else:
    log.warning('Groq: GROQ_API_KEY не задан — AI-ответы недоступны')

# ─────────────────────────────────────────────────
#  FIREBASE INIT
# ─────────────────────────────────────────────────
def init_firebase():
    global db, fs
    KEY_PATH = os.path.join(BASE_DIR, 'serviceAccountKey.json')
    try:
        if not firebase_admin._apps:
            if not os.path.exists(KEY_PATH):
                log.error(f'serviceAccountKey.json не найден: {KEY_PATH}')
                sys.exit(1)
            with open(KEY_PATH, 'r') as f:
                config = json.load(f)
            cred = credentials.Certificate(config)
            firebase_admin.initialize_app(cred)
        db = firestore.client()
        fs = firestore
        log.info('Firebase Admin: подключён ✓')
    except Exception as e:
        log.error(f'Firebase init error: {e}')
        sys.exit(1)


# ─────────────────────────────────────────────────
#  TELEGRAM HELPER (OUTGOING)
# ─────────────────────────────────────────────────
def send_telegram(text: str, chat_id: str = None) -> bool:
    target = chat_id or TELEGRAM_CHAT_ID
    if not TELEGRAM_BOT_TOKEN or not target:
        log.warning('Telegram: BOT_TOKEN или CHAT_ID не заданы в .env')
        return False
    try:
        r = requests.post(
            f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage',
            json={'chat_id': target, 'text': text, 'parse_mode': 'HTML'},
            timeout=10
        )
        if r.ok:
            log.info(f'Telegram ✓ → {str(target)[:8]}…')
        else:
            log.warning(f'Telegram ✗ HTTP {r.status_code}: {r.text[:80]}')
        return r.ok
    except Exception as e:
        log.error(f'Telegram error: {e}')
        return False


# ─────────────────────────────────────────────────
#  ДОСТАВКА ОТВЕТА НА САЙТ
# ─────────────────────────────────────────────────
def deliver_to_site(uid: str, text: str) -> bool:
    if not db or not uid or not text:
        return False
    try:
        db.collection('users').document(uid) \
          .collection('faraday_responses').add({
              'text':      text,
              'sender':    'OWNER',
              'timestamp': fs.SERVER_TIMESTAMP
          })
        log.info(f'→ users/{uid[:8]}…/faraday_responses: OK')
        return True
    except Exception as e:
        log.error(f'deliver_to_site error: {e}')
        return False


# ─────────────────────────────────────────────────
#  GROQ AI ИНТЕГРАЦИЯ
# ─────────────────────────────────────────────────
GROQ_MODEL = 'llama-3.3-70b-versatile'   # меняй здесь при необходимости

FARADAY_SYSTEM_PROMPT = (
    "Ты — Faraday AI, высокотехнологичный ИИ-ассистент на личном сайте.\n"
    "ТВОИ ПРАВИЛА:\n"
    "1. Ты отвечаешь на любые вопросы пользователя, используя свои знания.\n"
    "2. НИКОГДА не предлагай пользователю 'найти в Википедии' или 'погуглить'. "
    "Ты сам даёшь ответы.\n"
    "3. Твой стиль: лаконичный, футуристичный, вежливый.\n"
    "4. Если тебя спрашивают о командах, перечисли: смену цвета, диагностику, "
    "управление голосом и паузу систем.\n"
    "5. Ты помогаешь посетителям узнать о проектах владельца и его навыках. "
    "Если вопрос касается личных данных владельца, которых у тебя нет — "
    "отвечай уклончиво в стиле ИИ.\n"
    "6. Отвечай коротко, не более 2-3 предложений, если не просят подробностей."
    "7. ВАЖНО: Всегда отвечай на том же языке, на котором написан вопрос пользователя."
    "8. If the user speaks English, act as a professional software assistant. Maintain a technical yet friendly tone"
)


def get_groq_response(uid: str, user_message: str) -> str:
    """
    Генерирует ответ через Groq Chat Completions API.
    Учитывает последние 5 сообщений пользователя как контекст.
    """
    if not client:
        return 'Ошибка: GROQ_API_KEY не настроен на сервере.'

    # ── Загружаем историю ────────────────────────
    messages = [{'role': 'system', 'content': FARADAY_SYSTEM_PROMPT}]
    try:
        history_docs = (
            db.collection('users').document(uid)
              .collection('messages')
              .order_by('timestamp', direction=firestore.Query.DESCENDING)
              .limit(5)
              .get()
        )
        for doc in reversed(history_docs):
            m    = doc.to_dict()
            role = 'assistant' if m.get('sender') == 'OWNER' else 'user'
            text = m.get('message', '').strip()
            if text:
                messages.append({'role': role, 'content': text})
    except Exception as e:
        log.warning(f'Groq: ошибка загрузки истории: {e}')

    # ── Добавляем текущий вопрос ─────────────────
    messages.append({'role': 'user', 'content': user_message})

    # ── Запрос к Groq ────────────────────────────
    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=512,
        )
        answer = response.choices[0].message.content.strip()
        log.info(f'Groq ✓ ({len(answer)} символов)')
        return answer if answer else 'Я не смог сформулировать ответ. Попробуйте перефразировать вопрос.'
    except Exception as e:
        log.error(f'Groq error: {e}')
        return 'Мои нейронные связи временно перегружены. Попробуйте чуть позже.'


# ─────────────────────────────────────────────────
#  ОБРАБОТКА ДОКУМЕНТА ИЗ bridge_queue
# ─────────────────────────────────────────────────
def process_queue_doc(doc):
    doc_id    = doc.id
    data      = doc.to_dict() or {}
    content   = (data.get('content') or data.get('message', '')).strip()
    uid       = data.get('uid', '').strip()
    email     = data.get('email', 'anonymous')
    chat_type = data.get('chatType', 'direct')  # 'ai' или 'direct'

    if not content or not uid:
        log.warning(f'[{doc_id[:8]}] пустой content/uid — пропускаем')
        try:
            doc.reference.update({'status': 'error', 'error': 'empty content or uid'})
        except Exception:
            pass
        return

    log.info(f'[{doc_id[:8]}] [{chat_type.upper()}] {email} → "{content[:50]}"')

    # Атомарная блокировка — защита от двойной отправки
    try:
        doc.reference.update({'status': 'processing'})
    except Exception as e:
        log.error(f'[{doc_id[:8]}] не удалось заблокировать: {e}')
        return

    # ── Шаг 1: если AI-чат → генерируем ответ через Groq ──
    if chat_type == 'ai':
        ai_reply = get_groq_response(uid, content)

        # Записываем ответ AI так, чтобы любой фронтенд его понял
        try:
            # 1. Пишем в специальную коллекцию ответов
            db.collection('users').document(uid) \
              .collection('faraday_responses').add({
                  'message':   ai_reply,  # Для совместимости со старым кодом
                  'text':      ai_reply,  # Для новых версий
                  'sender':    'AI',       # Помечаем как AI для фронтенда
                  'isAI':      True,
                  'timestamp': fs.SERVER_TIMESTAMP
              })

            # 2. ДУБЛИРУЕМ в общую историю сообщений (чтобы сайт точно увидел)
            db.collection('users').document(uid) \
              .collection('messages').add({
                  'message':   ai_reply,
                  'email':     'faraday@ai',
                  'sender':    'AI',
                  'isAI':      True,
                  'timestamp': fs.SERVER_TIMESTAMP
              })
            log.info(f'[{doc_id[:8]}] Ответ AI успешно записан в Firestore.')
        except Exception as e:
            log.error(f'[{doc_id[:8]}] Ошибка записи ответа AI: {e}')

        # Уведомляем владельца в Telegram о диалоге с AI
        send_telegram(
            f'🤖 <b>Faraday AI ответил {email}:</b>\n\n'
            f'<b>Вопрос:</b> {content}\n'
            f'<b>Ответ:</b> {ai_reply}'
        )

    # ── Шаг 2: отправляем оригинал в Telegram ────
    tg_text = (
        f'💬 <b>Новое сообщение [{chat_type.upper()}]</b>\n'
        f'👤 {email}\n'
        f'🆔 <code>{uid}</code>\n\n'
        f'{content}\n\n'
        f'<i>↩️ Reply на это сообщение чтобы ответить лично</i>\n'
        f'---\nID: {uid}'
    )
    tg_ok = send_telegram(tg_text)

    # ── Шаг 3: сохраняем вопрос пользователя в историю чата ──────────
    try:
        db.collection('users').document(uid) \
          .collection('messages').add({
              'message':   content,
              'email':     email,
              'sender':    'user',
              'timestamp': fs.SERVER_TIMESTAMP
          })
    except Exception as e:
        log.warning(f'[{doc_id[:8]}] history error: {e}')

    # ── Шаг 4: финальный статус документа в очереди ───────────────────
    final_status = 'delivered' if tg_ok else 'error'
    try:
        doc.reference.update({
            'status':       final_status,
            'tg_ok':        tg_ok,
            'delivered_at': fs.SERVER_TIMESTAMP
        })
        log.info(f'[{doc_id[:8]}] status → {final_status}')
    except Exception as e:
        log.error(f'[{doc_id[:8]}] status update error: {e}')

# ─────────────────────────────────────────────────
#  СЛУШАТЕЛЬ bridge_queue (Firestore on_snapshot)
# ─────────────────────────────────────────────────
processing_ids: set = set()

def start_queue_listener():
    query = db.collection('bridge_queue').where('status', '==', 'pending')

    def on_snapshot(col_snapshot, changes, read_time):
        for change in changes:
            if change.type.name not in ('ADDED', 'MODIFIED'):
                continue
            doc    = change.document
            data   = doc.to_dict() or {}
            doc_id = doc.id

            if data.get('status') != 'pending' or doc_id in processing_ids:
                continue

            processing_ids.add(doc_id)

            def run_and_cleanup(d):
                try:
                    process_queue_doc(d)
                finally:
                    time.sleep(2)
                    processing_ids.discard(d.id)

            threading.Thread(
                target=run_and_cleanup,
                args=(doc,),
                daemon=True,
                name=f'queue-{doc_id[:8]}'
            ).start()

    query.on_snapshot(on_snapshot)
    log.info('bridge_queue listener: активен ✓ (защита от дублей включена)')


# ─────────────────────────────────────────────────
#  TELEGRAM POLLING (INCOMING REPLIES)
# ─────────────────────────────────────────────────
def run_telegram_polling():
    import telebot

    bot = telebot.TeleBot(TELEGRAM_BOT_TOKEN)

    @bot.message_handler(func=lambda m: str(m.chat.id) == str(TELEGRAM_CHAT_ID))
    def on_reply(message):
        if not message.text or not message.reply_to_message:
            return

        reply_text    = message.reply_to_message.text or ''
        recipient_uid = None

        # Ищем UID сначала по метке ID:, потом по эмодзи 🆔
        for pattern in (r'ID: ([a-zA-Z0-9]{20,})', r'🆔 ([a-zA-Z0-9]{20,})'):
            m = re.search(pattern, reply_text)
            if m:
                recipient_uid = m.group(1).strip()
                break

        if recipient_uid:
            ok = deliver_to_site(recipient_uid, message.text)
            log.info(f'TG reply → {recipient_uid[:8]}… | {"OK" if ok else "FAIL"}')
            if ok:
                bot.reply_to(message, '✅ Ответ доставлен на сайт')
        else:
            log.warning('TG polling: UID не найден в исходном сообщении')
            bot.reply_to(message, '⚠️ Используйте Reply на сообщение пользователя')

    log.info('Telegram Polling: активен ✓ (ожидаю Reply)')
    bot.infinity_polling(timeout=20, long_polling_timeout=15)


# ─────────────────────────────────────────────────
#  ТОЧКА ВХОДА
# ─────────────────────────────────────────────────
if __name__ == '__main__':
    log.info('══════════════════════════════════════')
    log.info('  Nitro Hub Bridge v11.1 [Groq Edition]')
    log.info(f' Model: {GROQ_MODEL}')
    log.info('══════════════════════════════════════')

    init_firebase()
    start_queue_listener()

    try:
        run_telegram_polling()   # блокирует главный поток
    except KeyboardInterrupt:
        log.info('Bridge остановлен пользователем.')
    except Exception as e:
        log.error(f'Критическая ошибка: {e}')