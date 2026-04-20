/* ════════════════════════════════════════════════
   api.js — Внешние запросы к Python-мосту.
   Токены хранятся только в backend/.env
   Прямых обращений к Telegram API отсюда нет.

   Ключевое: callBackend автоматически добавляет
   uid текущего пользователя в каждый запрос,
   чтобы bridge.py мог маршрутизировать ответ.
════════════════════════════════════════════════ */

var BACKEND_URL = "https://5000-firebase-onlyvachutu-1776714141230.cluster-bqwaigqtxbeautecnatk4o6ynk.cloudworkstations.dev";

/**
 * Универсальная функция вызова бэкенда
 */
function callBackend(endpoint, data) {
    // Формируем полный путь, например: https://...dev/api/memory
    var fullUrl = BACKEND_URL + endpoint;

    // Достаем UID текущего пользователя из Firebase Auth
    var userId = (window.auth && window.auth.currentUser) ? window.auth.currentUser.uid : 'guest';
    
    // Добавляем uid в данные автоматически, как и планировалось
    data.uid = userId;

    console.log("[API] Отправка на:", fullUrl, data);

    return fetch(fullUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(function(res) {
        if (!res.ok) throw new Error('Ошибка сервера: ' + res.status);
        return res.json();
    })
    .catch(function(err) {
        console.error("[API] Ошибка вызова:", err);
        return null;
    });
}

/**
 * Твоя функция сохранения памяти
 */
function bridgeSaveMemory(content, email) {
    return callBackend('/api/memory', {
        content: content,
        email:   email || 'anonymous'
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
