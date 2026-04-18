/* ════════════════════════════════════════════════
   api.js — Внешние запросы, конфигурация токенов
   Здесь хранятся Telegram credentials и
   точки расширения для будущих API.

   ⚠️  ВАЖНО: Для продакшена перенеси токены
       в backend/.env и обращайся через bridge.py
════════════════════════════════════════════════ */

/* ── Telegram ── */
/* api.js — Безопасная версия */

// Удаляем токены отсюда совсем!
var TELEGRAM_BOT_TOKEN = ''; 
var TELEGRAM_CHAT_ID = '';

/**
 * Теперь эта функция не стучится в Telegram напрямую, 
 * а просит наш Python-мост сделать это.
 */
function sendTelegramMessage(text) {
    return callBackend('/api/notify', { 
        message: text,
        email: window.auth && window.auth.currentUser ? window.auth.currentUser.email : 'anonymous'
    });
}

/**
 * Универсальный запрос к Python bridge.
 */
function callBackend(endpoint, payload) {
    var base = 'http://localhost:5000'; // Твой запущенный bridge.py
    return fetch(base + endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload || {})
    })
    .then(function(r) { return r.json(); })
    .catch(function(err) { 
        console.warn('Bridge не запущен или недоступен:', err); 
    });
}
/*
  Расширения (добавь когда понадобится):

  fetchCatFact() — случайный факт о котах:
    fetch('https://catfact.ninja/fact').then(r=>r.json()).then(d=>d.fact)

  fetchRandomDog() — фото собаки:
    fetch('https://dog.ceo/api/breeds/image/random').then(r=>r.json()).then(d=>d.message)

  openAIChat(prompt) — подключение к OpenAI (нужен ключ в backend):
    callBackend('/api/ai', { prompt })
*/
