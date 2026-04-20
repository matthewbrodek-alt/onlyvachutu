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
 * Всегда возвращает объект {ok, ...} либо null при полном сбое сети.
 */
async function callBackend(endpoint, payload) {
    var body = Object.assign({}, payload || {});

    // Добавляем uid/email авторизованного пользователя (для роутинга в bridge.py)
    var user = (window.auth && window.auth.currentUser) || null;
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

        // Пытаемся распарсить JSON даже если статус != 2xx —
        // bridge.py теперь возвращает {ok:false,...} с CORS-заголовками.
        var data = null;
        try { data = await response.json(); } catch (_) { /* not json */ }

        if (!response.ok) {
            console.warn('[Bridge] ' + endpoint + ' → HTTP ' + response.status, data);
            return data || { ok: false, error: 'HTTP ' + response.status };
        }
        return data || { ok: true };
    } catch (err) {
        // Сеть недоступна / CORS / DNS
        console.warn('[Bridge] Недоступен (' + endpoint + '):', err.message);
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
 * Поиск в интернете через bridge (Wikipedia + DuckDuckGo).
 * Используется Faraday AI для саморазвития / ответов на вопросы.
 * Возвращает { ok, query, answer, source } или null.
 */
function bridgeWebSearch(query, lang) {
    return callBackend('/api/search', {
        query: query,
        lang:  lang || 'ru'
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
