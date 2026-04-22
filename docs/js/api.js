/* ════════════════════════════════════════════════
   api.js — Запросы к Python-мосту (bridge.py)
   
   Загружается ПЕРВЫМ: checkBridgeHealth и
   bridgeSaveMessage должны быть доступны до chat.js.
   
   Для смены URL моста выполни в консоли браузера:
     nitro.setBridgeUrl('https://5000-firebase-...')
════════════════════════════════════════════════ */

var BRIDGE_URL = (function() {
    try {
        var saved = localStorage.getItem('nitro_bridge_url');
        if (saved && saved.startsWith('https://')) {
            return saved.replace(/\/$/, '');
        }
    } catch(e) {}
    return 'https://5005-firebase-onlyvachutu-1776714141230.cluster-bqwaigqtxbeautecnatk4o6ynk.cloudworkstations.dev';
})();

/* Обновить URL моста из консоли браузера */
window.nitro = window.nitro || {};
window.nitro.setBridgeUrl = function(url) {
    BRIDGE_URL = url.replace(/\/$/, '');
    try { localStorage.setItem('nitro_bridge_url', BRIDGE_URL); } catch(e) {}
    console.log('[Bridge] URL →', BRIDGE_URL);
};

/* ══════════════════════════════════════════════
   CORE — универсальный POST к bridge.py
   Автоматически добавляет uid + email из Auth.
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
        console.warn('[Bridge] ' + endpoint + ':', err.message);
        return null;
    }
}

/* ── Отправить личное сообщение → /api/message ──
   bridge.py пишет в Firestore + уведомляет Telegram.
   ТОЛЬКО для личного чата. Faraday AI не использует. */
function bridgeSaveMessage(content, email) {
    return callBackend('/api/message', {
        content: content,
        email:   email || 'anonymous'
    });
}

/* Алиас для обратной совместимости */
function bridgeSaveMemory(content, email) {
    return bridgeSaveMessage(content, email);
}

/* ── Системное уведомление → Telegram ── */
function sendTelegramMessage(text, email) {
    return callBackend('/api/notify', {
        message: text,
        email:   email || 'system'
    });
}

/* ── Health-check (используется в chat.js → performSelfDiagnostic) ── */
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
