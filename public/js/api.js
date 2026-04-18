/* ════════════════════════════════════════════════
   api.js — Внешние запросы, конфигурация токенов
   Здесь хранятся Telegram credentials и
   точки расширения для будущих API.

   ⚠️  ВАЖНО: Для продакшена перенеси токены
       в backend/.env и обращайся через bridge.py
════════════════════════════════════════════════ */

/* ── Telegram ── */
var TELEGRAM_BOT_TOKEN = '8664813567:AAEkqGdXuyrS43Pjfc1gB-KdVuOOReWrkGw';
var TELEGRAM_CHAT_ID   = '7451263058';

/**
 * sendTelegramMessage(text)
 * Отправляет текст напрямую в Telegram.
 * Используется из chat.js для уведомлений.
 */
function sendTelegramMessage(text) {
    return fetch(
        'https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage',
        {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: text })
        }
    ).catch(function(err) {
        console.warn('Telegram send error:', err);
    });
}

/**
 * callBackend(endpoint, payload)
 * Универсальный запрос к Python bridge.
 * Используй когда bridge.py будет запущен.
 *
 * Пример:
 *   callBackend('/api/notify', { message: 'Hello' })
 */
function callBackend(endpoint, payload) {
    var base = window.BACKEND_URL || 'http://localhost:5000';
    return fetch(base + endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload || {})
    })
    .then(function(r) { return r.json(); })
    .catch(function(err) { console.warn('Backend error:', err); });
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
