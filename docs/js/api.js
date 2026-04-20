/* ════════════════════════════════════════════════
   api.js — Внешние запросы к Python-мосту.
   Токены хранятся только в backend/.env
   Прямых обращений к Telegram API отсюда нет.

   Ключевое: callBackend автоматически добавляет
   uid текущего пользователя в каждый запрос,
   чтобы bridge.py мог маршрутизировать ответ.
════════════════════════════════════════════════ */

var BRIDGE_URL = 'https://onlyvachutu.onrender.com';

/**
 * Универсальный запрос к Python bridge.
 * Автоматически добавляет uid и email авторизованного пользователя.
 */
async function callBackend(endpoint, payload) {
    var body = Object.assign({}, payload || {});

    // Добавляем uid для обратного роутинга в bridge.py
    var user = window.auth && window.auth.currentUser;
    if (user) {
        if (!body.uid)   body.uid   = user.uid;
        if (!body.email) body.email = user.email;
    }

    try {
        var response = await fetch(BRIDGE_URL + endpoint, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body)
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return await response.json();
    } catch (err) {
        console.warn('[Bridge] Недоступен (' + endpoint + '):', err.message);
        return null;
    }
}

async function callBackend(endpoint, data) {
   try {
        var response = await fetch(BRIDGE_URL + endpoint, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body)
        });
        
        if (!response.ok) {
            // Attempt to read the error message from the server response
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
        }
        return await response.json();
    } catch (err) {
        console.error('[Bridge] Error during request:', err);
        return null;
    }
 }   
/**
 * Сохранить сообщение через bridge.
 * Bridge: Telegram-уведомление + запись в faraday_memory + роутинг uid.
 */
function bridgeSaveMemory(content, email) {
    return callBackend('/api/memory', {
        content: content,
        email:   email || 'anonymous'
        // uid добавится автоматически в callBackend
    });
}

/**
 * Отправить системное уведомление в Telegram (ошибки, события).
 */
function sendTelegramMessage(text, email) {
    return callBackend('/api/notify', {
        message: text,
        email:   email || 'anonymous'
    });
}

/**
 * Получить последние записи из faraday_memory (GET).
 */
function bridgeGetMemory() {
    return fetch(BRIDGE_URL + '/api/memory')
        .then(function(r) { return r.ok ? r.json() : []; })
        .catch(function() { return []; });
}

/**
 * Проверить доступность bridge.py.
 * Используется в self-diagnostic (chat.js).
 */
function checkBridgeHealth() {
    return fetch(BRIDGE_URL + '/health')
        .then(function(r) { return r.ok; })
        .catch(function() { return false; });
}

/**
 * Отправить отчёт об ошибке через bridge → Telegram.
 * Без токенов в JS.
 */
function reportErrorToBridge(msg, url, line) {
    return callBackend('/api/notify', {
        message: '[ERROR] ' + msg + ' | ' + (url || '') + ':' + (line || '?'),
        email:   'system@faraday'
    });
}
