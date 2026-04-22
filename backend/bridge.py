"""
bridge.py — Nitro Hub Bridge v11.0 [Polling + Gemini AI]
Архитектура: Firestore Queue + Telegram Polling (без портов, без Flask)

═══════════════════════════════════════════════════
 СХЕМА ДАННЫХ И ПОТОКОВ
═══════════════════════════════════════════════════

 ПОЛЬЗОВАТЕЛЬ → TELEGRAM (исходящие):
   JS пишет в bridge_queue/{docId}
   ↓
   on_snapshot ловит pending-документ (проверяет chatType)
   ↓
   Если chatType == 'ai' → Запрос в Gemini → Запись в faraday_responses
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
from google import genai  # Новый ИИ Мозг (SDK v2)

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

# ── Telegram и Gemini credentials ────────────────
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID   = os.getenv('TELEGRAM_CHAT_ID', '')
GOOGLE_API_KEY     = os.getenv('GOOGLE_API_KEY', '')

# ── Глобальные объекты Firebase и AI ─────────────
db = None
fs = None 
client = None

if GOOGLE_API_KEY:
    # Инициализация нового клиента Gemini
    client = genai.Client(
    api_key=GOOGLE_API_KEY,
    http_options={'api_version': 'v1'} # Оставляем v1
)

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
#  GEMINI AI ИНТЕГРАЦИЯ
# ─────────────────────────────────────────────────
FARADAY_SYSTEM_PROMPT = """
Ты — Faraday AI, высокотехнологичный ИИ ассистент на личном сайте. 
ТВОИ ПРАВИЛА:
1. Ты отвечаешь на любые вопросы пользователя, используя свои знания.
2. НИКОГДА не предлагай пользователю "найти в Википедии" или "погуглить". Ты сам даешь ответы.
3. Твой стиль: лаконичный, футуристичный, вежливый.
4. Если тебя спрашивают о твоих командах, перечисли: смену цвета, диагностику, управление голосом и паузу систем.
5. Ты помогаешь посетителям узнать о проектах владельца и его навыках. Если вопрос касается личных данных владельца, которых у тебя нет — отвечай уклончиво в стиле ИИ. 
6. Отвечай коротко, не более 2-3 предложений, если не просят подробностей.
"""

def get_gemini_response(uid: str, user_message: str) -> str:
    """Генерация ответа через Gemini с учетом истории последних 5 сообщений."""
    if not client:
        return "Ошибка: GOOGLE_API_KEY не настроен на сервере."
    try:
        history_ref = db.collection('users').document(uid).collection('messages')
        history_docs = history_ref.order_by('timestamp', direction=firestore.Query.DESCENDING).limit(5).get()
        
        context_parts = [FARADAY_SYSTEM_PROMPT]
        for d in reversed(history_docs):
            m = d.to_dict()
            role = "AI" if m.get('sender') == 'OWNER' else "User"
            context_parts.append(f"{role}: {m.get('message', '')}")
        
        context_parts.append(f"User: {user_message}")
        full_prompt = "\n".join(context_parts)

        for m in client.models.list():
            print(f"Доступная модель: {m.name}")
       # Внутри get_gemini_response:
        response = client.models.generate_content(
            model="gemini-2.0-flash-lite", # Убедись, что здесь именно эта строка
            contents=full_prompt
            )
        if response and response.text:
            return response.text.strip()
        else:
            return "Я не смог сформулировать ответ. Попробуйте перефразировать вопрос."
    except Exception as e:
        log.error(f"Gemini Error: {e}")
        return "Мои нейронные связи временно перегружены. Попробуйте чуть позже."

def process_queue_doc(doc):
    doc_id    = doc.id
    data      = doc.to_dict() or {}
    content   = (data.get('content') or data.get('message', '')).strip()
    uid       = data.get('uid', '').strip()
    email     = data.get('email', 'anonymous')
    chat_type = data.get('chatType', 'direct') # 'ai' или 'direct'

    if not content or not uid:
        log.warning(f'[{doc_id[:8]}] пустой content/uid — пропускаем')
        try:
            doc.reference.update({'status': 'error', 'error': 'empty content or uid'})
        except Exception: pass
        return

    log.info(f'[{doc_id[:8]}] [{chat_type.upper()}] обрабатываем: {email} → "{content[:50]}"')

    try:
        doc.reference.update({'status': 'processing'})
    except Exception as e:
        log.error(f'[{doc_id[:8]}] не удалось заблокировать: {e}')
        return

    # Шаг 1.5: Если это запрос к ИИ, генерируем и отправляем ответ
    if chat_type == 'ai':
        ai_reply = get_gemini_response(uid, content)
        
        try:
            db.collection('users').document(uid).collection('faraday_responses').add({
                'text': ai_reply,
                'sender': 'OWNER',
                'timestamp': fs.SERVER_TIMESTAMP,
                'isAI': True
            })
        except Exception as e:
            log.error(f'[{doc_id[:8]}] Ошибка записи ответа ИИ в Firestore: {e}')
        
        # Уведомляем владельца в Telegram об ответе ИИ
        ai_tg_text = f"🤖 <b>Faraday AI ответил {email}:</b>\n\n{ai_reply}"
        send_telegram(ai_tg_text)

    # Шаг 2: отправка оригинала в Telegram
    tg_text = (
        f'💬 <b>Новое сообщение [{chat_type.upper()}]</b>\n'
        f'👤 {email}\n'
        f'🆔 <code>{uid}</code>\n\n'
        f'{content}\n\n'
        f'<i>↩️ Reply на это сообщение чтобы ответить лично</i>\n'
        f'---\nID: {uid}'
    )
    tg_ok = send_telegram(tg_text)

    # Шаг 3: сохраняем в историю чата
    if db:
        try:
            db.collection('users').document(uid) \
              .collection('messages').add({
                  'message':   content,
                  'email':     email,
                  'sender':    'user',
                  'timestamp': fs.SERVER_TIMESTAMP
              })
        except Exception as e:
            log.warning(f'[{doc_id[:8]}] Firestore history error: {e}')

    # Шаг 4: финальный статус
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
processing_ids = set()

def start_queue_listener():
    query = db.collection('bridge_queue').where('status', '==', 'pending')

    def on_snapshot(col_snapshot, changes, read_time):
        for change in changes:
            if change.type.name in ('ADDED', 'MODIFIED'):
                doc = change.document
                data = doc.to_dict() or {}
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

                t = threading.Thread(
                    target=run_and_cleanup,
                    args=(doc,),
                    daemon=True,
                    name=f'queue-{doc_id[:8]}'
                )
                t.start()

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
        text = message.text
        if not text or not message.reply_to_message:
            return

        reply_text = message.reply_to_message.text or ""
        
        recipient_uid = None
        m = re.search(r'ID: ([a-zA-Z0-9]{20,})', reply_text)
        if not m:
            m = re.search(r'🆔 ([a-zA-Z0-9]{20,})', reply_text)
            
        if m:
            recipient_uid = m.group(1).strip()
            ok = deliver_to_site(recipient_uid, text)
            if ok:
                log.info(f'TG reply → {recipient_uid[:8]}… | OK')
                bot.reply_to(message, "✅ Ответ доставлен")
            else:
                log.warning(f'TG reply → {recipient_uid[:8]}… | FAIL')
        else:
            log.warning('TG polling: UID не найден в исходном сообщении')

    log.info('Telegram Polling: активен ✓ (ожидаю Reply)')
    bot.infinity_polling()

# ─────────────────────────────────────────────────
#  ТОЧКА ВХОДА
# ─────────────────────────────────────────────────
if __name__ == '__main__':
    log.info('══════════════════════════════════════')
    log.info('  Nitro Hub Bridge v11.0 [Gemini Edition] ')
    log.info('══════════════════════════════════════')

    init_firebase()
    start_queue_listener()
    
    try:
        run_telegram_polling()
    except KeyboardInterrupt:
        log.info('Bridge остановлен пользователем.')
    except Exception as e:
        log.error(f'Критическая ошибка: {e}')