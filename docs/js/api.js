/* ════════════════════════════════════════════════
   api.js — Запросы к Python-мосту (bridge.py)
   Хост: Firebase Studio Cloud Workstation

   ВАЖНО: Этот файл грузится ПЕРВЫМ (до chat.js)
   чтобы checkBridgeHealth и bridgeSaveMemory
   были доступны когда chat.js выполняется.

   Если URL моста изменился (новая сессия Studio):
   поменяй BRIDGE_URL ниже на актуальный адрес.
════════════════════════════════════════════════ */

/* ── URL Firebase Studio ──────────────────────
   Формат для локального Studio:
   https://5000-firebase-{workspace}-{id}.cluster-{region}.cloudworkstations.dev

   Текущий URL (обнови при смене сессии Studio):  */
var BRIDGE_URL = (function() {
    // Пробуем взять из localStorage если был сохранён
    try {
        var saved = localStorage.getItem('nitro_bridge_url');
        if (saved && saved.startsWith('https://')) return saved;
    } catch(e) {}
    // Дефолтный URL Firebase Studio
    return 'https://5000-firebase-onlyvachutu-1776714141230.cluster-bqwaigqtxbeautecnatk4o6ynk.cloudworkstations.dev';
})();

/* Позволяет обновить URL моста прямо из консоли браузера:
   nitro.setBridgeUrl('https://5000-firebase-...')   */
window.nitro = window.nitro || {};
window.nitro.setBridgeUrl = function(url) {
    BRIDGE_URL = url;
    try { localStorage.setItem('nitro_bridge_url', url); } catch(e) {}
    console.log('[Bridge] URL обновлён →', url);
};

/* ══════════════════════════════════════════════
   CORE — универсальный запрос к bridge.py
   Автоматически добавляет uid + email из Firebase Auth.
══════════════════════════════════════════════ */
async function callBackend(endpoint, payload) {
    var body = Object.assign({}, payload || {});

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

/* ── Сохранить сообщение → Telegram + Firestore ── */
function bridgeSaveMemory(content, email) {
    return callBackend('/api/memory', {
        content: content,
        email:   email || 'anonymous'
    });
}

/* ── Системное уведомление → Telegram ── */
function sendTelegramMessage(text, email) {
    return callBackend('/api/notify', {
        message: text,
        email:   email || 'anonymous'
    });
}

/* ── Получить записи памяти (GET) ── */
function bridgeGetMemory() {
    return fetch(BRIDGE_URL + '/api/memory')
        .then(function(r) { return r.ok ? r.json() : []; })
        .catch(function() { return []; });
}

/* ── Проверить доступность bridge.py ──
   Используется в performSelfDiagnostic (chat.js) ── */
function checkBridgeHealth() {
    return fetch(BRIDGE_URL + '/health', { method: 'GET' })
        .then(function(r) { return r.ok; })
        .catch(function() { return false; });
}

/* ── Отчёт об ошибке → bridge → Telegram ── */
function reportErrorToBridge(msg, url, line) {
    return callBackend('/api/notify', {
        message: '[ERROR] ' + msg + ' | ' + (url || '') + ':' + (line || '?'),
        email:   'system@faraday'
    });
}
