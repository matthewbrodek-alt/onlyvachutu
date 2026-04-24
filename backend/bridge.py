"""
bridge.py — Nitro Hub Bridge v11.2 [Hybrid Chat Edition]
Архитектура: Firestore Queue + Telegram Polling

═══════════════════════════════════════════════════
 СХЕМА ПОТОКОВ v11.2
═══════════════════════════════════════════════════

 chatType == 'ai'  → Groq AI → faraday_history + CRM leads
 chatType == 'direct' → Telegram → faraday_responses (ручной ответ)

 ПУТИ FIRESTORE:
   Faraday AI:   users/{uid}/faraday_history   ← диалог с ИИ
   Personal:     users/{uid}/messages           ← исходящие (personal)
                 users/{uid}/faraday_responses  ← ответы владельца из TG
   CRM:          leads/{uid}                    ← лиды Faraday AI

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
from concurrent.futures import ThreadPoolExecutor

import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
from groq import Groq

# ── Загрузка переменных окружения ────────────────
# Пути оставлены без изменений (как в оригинале)
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

# ── Thread pool и lock ────────────────────────────
# FIX: ThreadPoolExecutor(10) вместо unbounded threading.Thread
# FIX: Lock для потокобезопасного доступа к processing_ids
_executor        = ThreadPoolExecutor(max_workers=10, thread_name_prefix='queue')
_processing_lock = threading.Lock()
processing_ids: set = set()

# ─────────────────────────────────────────────────
#  FIREBASE INIT
#  Пути к .env и serviceAccountKey.json без изменений
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
#  TELEGRAM HELPER
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
#  ДОСТАВКА ОТВЕТА ВЛАДЕЛЬЦА НА САЙТ (Personal Support)
#  Пишет в faraday_responses — слушатель auth.js покажет в личном чате
# ─────────────────────────────────────────────────
def deliver_to_site(uid: str, text: str) -> bool:
    if not db or not uid or not text:
        return False
    try:
        db.collection('users').document(uid) \
          .collection('faraday_responses').add({
              'text':      text,
              'message':   text,
              'sender':    'OWNER',
              'timestamp': fs.SERVER_TIMESTAMP
          })
        log.info(f'→ users/{uid[:8]}…/faraday_responses: OK')
        return True
    except Exception as e:
        log.error(f'deliver_to_site error: {e}')
        return False


# ─────────────────────────────────────────────────
#  CRM — логирование лидов из Faraday AI
#  Коллекция leads/{uid}: upsert через set(merge=True)
# ─────────────────────────────────────────────────
def log_crm_lead(uid: str, email: str, message: str) -> None:
    if not db or not uid:
        return
    try:
        db.collection('leads').document(uid).set({
            'uid':          uid,
            'email':        email,
            'source':       'faraday_ai',
            'last_seen':    fs.SERVER_TIMESTAMP,
            'last_message': message[:200],
            'message_count': firestore.Increment(1),
        }, merge=True)
        log.info(f'CRM lead upsert: {uid[:8]}… ({email})')
    except Exception as e:
        log.warning(f'CRM lead error: {e}')


# ─────────────────────────────────────────────────
#  GROQ AI ИНТЕГРАЦИЯ
# ─────────────────────────────────────────────────
GROQ_MODEL = 'llama-3.3-70b-versatile'

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
    Контекст читается из faraday_history (новый путь для AI-чата).
    """
    if not client:
        return 'Ошибка: GROQ_API_KEY не настроен на сервере.'

    messages = [{'role': 'system', 'content': FARADAY_SYSTEM_PROMPT}]
    try:
        # FIX: читаем историю из faraday_history, а не из messages
        history_docs = (
            db.collection('users').document(uid)
              .collection('faraday_history')
              .order_by('timestamp', direction=firestore.Query.DESCENDING)
              .limit(6)
              .get()
        )
        for doc in reversed(history_docs):
            m    = doc.to_dict()
            role = 'assistant' if m.get('sender') == 'AI' else 'user'
            text = (m.get('message') or m.get('text', '')).strip()
            if text:
                messages.append({'role': role, 'content': text})
    except Exception as e:
        log.warning(f'Groq: ошибка загрузки истории: {e}')

    messages.append({'role': 'user', 'content': user_message})

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
#  FIX: жёсткое разделение потоков по chatType
# ─────────────────────────────────────────────────
def process_queue_doc(doc):
    doc_id    = doc.id
    data      = doc.to_dict() or {}
    content   = (data.get('content') or data.get('message', '')).strip()
    uid       = data.get('uid', '').strip()
    email     = data.get('email', 'anonymous')
    chat_type = data.get('chatType', 'direct')  # 'ai' | 'direct'

    if not content or not uid:
        log.warning(f'[{doc_id[:8]}] пустой content/uid — пропускаем')
        try:
            doc.reference.update({'status': 'error', 'error': 'empty content or uid'})
        except Exception:
            pass
        return

    log.info(f'[{doc_id[:8]}] [{chat_type.upper()}] {email} → "{content[:50]}"')

    # Атомарная блокировка
    try:
        doc.reference.update({'status': 'processing'})
    except Exception as e:
        log.error(f'[{doc_id[:8]}] не удалось заблокировать: {e}')
        return

    # ══════════════════════════════════════════════
    #  ПОТОК A: chatType == 'ai'
    #  Faraday AI (публичный): гости + клиенты
    #  Хранилище: users/{uid}/faraday_history
    #  CRM: leads/{uid}
    # ══════════════════════════════════════════════
    if chat_type == 'ai':

        # Шаг 1: Сохраняем вопрос пользователя в faraday_history (ПЕРВЫМ — для корректного timestamp)
        try:
            db.collection('users').document(uid) \
              .collection('faraday_history').add({
                  'message':   content,
                  'text':      content,
                  'sender':    'user',
                  'role':      'user',
                  'isAI':      False,
                  'email':     email,
                  'timestamp': fs.SERVER_TIMESTAMP
              })
        except Exception as e:
            log.warning(f'[{doc_id[:8]}] faraday_history (user) error: {e}')

        # Шаг 2: Получаем ответ от Groq
        ai_reply = get_groq_response(uid, content)

        # Шаг 3: Записываем ответ AI в faraday_history — слушатель chat.js покажет его
        try:
            db.collection('users').document(uid) \
              .collection('faraday_history').add({
                  'message':   ai_reply,
                  'text':      ai_reply,
                  'sender':    'AI',
                  'role':      'assistant',
                  'isAI':      True,
                  'timestamp': fs.SERVER_TIMESTAMP
              })
            log.info(f'[{doc_id[:8]}] faraday_history (AI) → {uid[:8]}… OK')
        except Exception as e:
            log.error(f'[{doc_id[:8]}] faraday_history (AI) write error: {e}')

        # Шаг 4: CRM — upsert лида в leads/{uid}
        log_crm_lead(uid, email, content)

        # Шаг 5: Уведомление владельца в Telegram (информационное, ответ не требуется)
        send_telegram(
            f'🤖 <b>Faraday AI | {email}</b>\n\n'
            f'<b>Q:</b> {content}\n'
            f'<b>A:</b> {ai_reply[:300]}'
        )

        final_status = 'delivered'

    # ══════════════════════════════════════════════
    #  ПОТОК B: chatType == 'direct'
    #  Personal Support (приватный): только авторизованные
    #  Хранилище: users/{uid}/messages
    #  Telegram: ждёт Reply от владельца
    # ══════════════════════════════════════════════
    elif chat_type == 'direct':

        # Шаг 1: Сохраняем сообщение в историю личного чата
        try:
            db.collection('users').document(uid) \
              .collection('messages').add({
                  'message':   content,
                  'email':     email,
                  'sender':    'user',
                  'timestamp': fs.SERVER_TIMESTAMP
              })
        except Exception as e:
            log.warning(f'[{doc_id[:8]}] messages history error: {e}')

        # Шаг 2: Отправляем в Telegram — владелец отвечает через Reply
        tg_text = (
            f'💬 <b>Personal Support</b>\n'
            f'👤 {email}\n'
            f'🆔 <code>{uid}</code>\n\n'
            f'{content}\n\n'
            f'<i>↩️ Reply на это сообщение чтобы ответить лично</i>\n'
            f'---\nID: {uid}'
        )
        tg_ok = send_telegram(tg_text)
        final_status = 'delivered' if tg_ok else 'error'

    else:
        log.warning(f'[{doc_id[:8]}] неизвестный chatType: {chat_type!r}')
        final_status = 'error'

    # ── Финализация статуса документа ────────────
    try:
        doc.reference.update({
            'status':       final_status,
            'delivered_at': fs.SERVER_TIMESTAMP
        })
        log.info(f'[{doc_id[:8]}] status → {final_status}')
    except Exception as e:
        log.error(f'[{doc_id[:8]}] status update error: {e}')


# ─────────────────────────────────────────────────
#  СЛУШАТЕЛЬ bridge_queue
# ─────────────────────────────────────────────────
def start_queue_listener():
    query = db.collection('bridge_queue').where('status', '==', 'pending')

    def on_snapshot(col_snapshot, changes, read_time):
        for change in changes:
            if change.type.name not in ('ADDED', 'MODIFIED'):
                continue
            doc    = change.document
            data   = doc.to_dict() or {}
            doc_id = doc.id

            if data.get('status') != 'pending':
                continue

            # FIX: Lock гарантирует атомарную проверку + вставку в set
            with _processing_lock:
                if doc_id in processing_ids:
                    continue
                processing_ids.add(doc_id)

            def run_and_cleanup(d):
                try:
                    process_queue_doc(d)
                except Exception as e:
                    log.error(f'[{d.id[:8]}] Необработанная ошибка: {e}')
                finally:
                    time.sleep(2)
                    with _processing_lock:
                        processing_ids.discard(d.id)

            # FIX: ThreadPoolExecutor с лимитом вместо unbounded Thread
            _executor.submit(run_and_cleanup, doc)

    query.on_snapshot(on_snapshot)
    log.info('bridge_queue listener: активен ✓')


# ─────────────────────────────────────────────────
#  TELEGRAM POLLING (ответы владельца)
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

    # FIX: infinity_polling в daemon-потоке с auto-restart при падении
    while True:
        try:
            bot.infinity_polling(timeout=20, long_polling_timeout=15)
        except Exception as e:
            log.error(f'Telegram polling упал, перезапуск через 5с: {e}')
            time.sleep(5)


# ─────────────────────────────────────────────────
#  ТОЧКА ВХОДА
# ─────────────────────────────────────────────────
if __name__ == '__main__':
    log.info('══════════════════════════════════════')
    log.info('  Nitro Hub Bridge v11.2 [Hybrid Chat]')
    log.info(f'  Model: {GROQ_MODEL}')
    log.info('══════════════════════════════════════')

    init_firebase()
    start_queue_listener()

    # FIX: polling в отдельном daemon-потоке — не блокирует main thread
    # и не убивает queue_listener при падении polling
    polling_thread = threading.Thread(
        target=run_telegram_polling,
        daemon=True,
        name='tg-polling'
    )
    polling_thread.start()

    # Держим main thread живым
    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        log.info('Bridge остановлен пользователем.')
        _executor.shutdown(wait=False)
