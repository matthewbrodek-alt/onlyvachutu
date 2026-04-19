/* ════════════════════════════════════════════════
   api.js — Внешние запросы к Python-мосту.
   Токены хранятся только в backend/.env
   Прямых обращений к Telegram API отсюда нет.
════════════════════════════════════════════════ */

var BRIDGE_URL = 'http://127.0.0.1:5000'; // адрес bridge.py

/**
 * Универсальный запрос к Python bridge.
 * Возвращает Promise с распарсенным JSON или null при ошибке сети.
 */
function callBackend(endpoint, payload) {
    return fetch(BRIDGE_URL + endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload || {})
    })
    .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
    })
    .catch(function(err) {
        console.warn('[Bridge] Недоступен (' + endpoint + '):', err.message);
        return null; // не бросаем дальше — caller решает что делать
    });
}

/**
 * Отправить уведомление в Telegram через bridge.
 * Используется из chat.js при отправке личных сообщений.
 */
function sendTelegramMessage(text, email) {
    return callBackend('/api/notify', {
        message: text,
        email:   email || 'anonymous'
    });
}

/**
 * Сохранить запись в faraday_memory через bridge.
 * Bridge параллельно отправит Telegram-уведомление.
 */
function bridgeSaveMemory(content, email) {
    return callBackend('/api/memory', {
        content: content,
        email:   email || 'anonymous'
    });
}

/**
 * Получить последние записи из faraday_memory.
 * GET-запрос через обёртку fetch.
 */
function bridgeGetMemory() {
    return fetch(BRIDGE_URL + '/api/memory')
        .then(function(r) { return r.ok ? r.json() : []; })
        .catch(function() { return []; });
}

/**
 * Проверить доступность bridge.py.
 * Используется в self-diagnostic.
 */
function checkBridgeHealth() {
    return fetch(BRIDGE_URL + '/health')
        .then(function(r) { return r.ok; })
        .catch(function() { return false; });
}

/**
 * Отправить отчёт об ошибке через bridge (безопасно, без токенов в JS).
 */
function reportErrorToBridge(msg, url, line) {
    return callBackend('/api/notify', {
        message: '[ERROR] ' + msg + ' | ' + url + ':' + line,
        email:   'system@faraday'
    });
}
