/* ════════════════════════════════════════════════
   api.js — Внешние запросы к Python-мосту.
   Токены хранятся только в backend/.env
   Прямых обращений к Telegram API отсюда нет.
════════════════════════════════════════════════ */

var BRIDGE_URL = 'http://127.0.0.1:5000'; // адрес bridge.py

/**
 * Универсальный запрос к Python bridge.
 */
async function callBackend(endpoint, payload) {
    // Получаем текущего пользователя
    const user = firebase.auth().currentUser;
    
    // Добавляем UID в полезную нагрузку, если пользователь авторизован
    if (user) {
        payload.uid = user.uid;
        payload.email = payload.email || user.email; // если email не передан, берем из auth
    }

    try {
        const response = await fetch(`${BRIDGE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('[Bridge] Fetch error:', error);
        return null;
    }
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
