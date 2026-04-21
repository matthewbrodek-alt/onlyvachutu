/* ════════════════════════════════════════════════
   api.js — Внешние запросы к Python-мосту.
   Токены хранятся только в backend/.env
   Прямых обращений к Telegram API отсюда нет.

   Ключевое: callBackend автоматически добавляет
   uid текущего пользователя в каждый запрос,
   чтобы bridge.py мог маршрутизировать ответ.
════════════════════════════════════════════════ */

var BRIDGE_URL = "https://5000-firebase-onlyvachutu-1776714141230.cluster-bqwaigqtxbeautecnatk4o6ynk.cloudworkstations.dev";

function callBackend(endpoint, data) {
    var fullUrl = BRIDGE_URL + endpoint;

    // Автоматически берем UID из Firebase Auth, если он есть
    var userId = (window.auth && window.auth.currentUser) ? window.auth.currentUser.uid : 'guest';
    data.uid = userId;

    console.log("[API] Вызов:", fullUrl, data);

    return fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(function(res) {
        if (!res.ok) throw new Error('Ошибка сервера: ' + res.status);
        return res.json();
    })
    .catch(function(err) {
        console.error("[API] Ошибка:", err);
        return null;
    });
}

/**
 * Сохранение личного сообщения в базу и отправка в TG
 */
function bridgeSaveMemory(content, email) {
    return callBackend('/api/memory', {
        content: content,
        email:   email || 'anonymous'
    });
}

/**
 * Проверка здоровья моста (используется в диагностике)
 */
function checkBridgeHealth() {
    return fetch(BRIDGE_URL + '/test')
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
