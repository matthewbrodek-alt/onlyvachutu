/* ════════════════════════════════════════════════
   api.js — Запись в Firestore bridge_queue
   Загружается ПЕРВЫМ.

   АРХИТЕКТУРА v11.2 (Hybrid Chat):
   bridge_queue документы содержат chatType:
   - 'direct' → Personal Support → Telegram
   - 'ai'     → Faraday AI → Groq → faraday_history
════════════════════════════════════════════════ */

/* ── URL bridge (только для health-check) ── */
var BRIDGE_URL = (function() {
    try { return localStorage.getItem('nitro_bridge_url') || ''; } catch(e) { return ''; }
})();

window.nitro = window.nitro || {};
window.nitro.setBridgeUrl = function(url) {
    BRIDGE_URL = url.replace(/\/$/, '');
    try { localStorage.setItem('nitro_bridge_url', BRIDGE_URL); } catch(e) {}
    console.log('[Bridge] URL →', BRIDGE_URL);
};

/* ══════════════════════════════════════════════
   ОСНОВНАЯ ФУНКЦИЯ ОТПРАВКИ (Personal Support)
   FIX: добавлена метка chatType: 'direct'
   bridge.py использует её для разделения потоков
   Требует авторизованного пользователя
══════════════════════════════════════════════ */
function bridgeSaveMessage(content, email) {
    var user = window.auth && window.auth.currentUser;

    if (!user || user.isAnonymous) {
        console.warn('[Queue] Personal Support требует авторизации');
        return Promise.reject(new Error('not authenticated'));
    }

    // FIX: chatType: 'direct' — bridge.py пропустит Groq, только Telegram
    var doc = {
        content:   content,
        uid:       user.uid,
        email:     email || user.email || 'anonymous',
        chatType:  'direct',
        status:    'pending',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    return window.db.collection('bridge_queue').add(doc)
        .then(function(ref) {
            console.log('[Queue] Personal Support:', ref.id.slice(0, 8) + '…');
            return { ok: true, docId: ref.id };
        })
        .catch(function(err) {
            console.error('[Queue] Ошибка записи в bridge_queue:', err.message);
            return null;
        });
}

/* Алиас для обратной совместимости */
function bridgeSaveMemory(content, email) {
    return bridgeSaveMessage(content, email);
}

/* ══════════════════════════════════════════════
   LEGACY — прямой POST к bridge.py
   Оставлен для системных уведомлений.
   НЕ используется для сообщений пользователя.
══════════════════════════════════════════════ */
async function callBackend(endpoint, payload) {
    var body = Object.assign({}, payload || {});
    var user = window.auth && window.auth.currentUser;
    if (user && !user.isAnonymous) {
        if (!body.uid)   body.uid   = user.uid;
        if (!body.email) body.email = user.email;
    }
    try {
        var r = await fetch(BRIDGE_URL + endpoint, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body)
        });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return await r.json();
    } catch(err) {
        console.warn('[Bridge]', endpoint, ':', err.message);
        return null;
    }
}

function sendTelegramMessage(text, email) {
    return callBackend('/api/notify', { message: text, email: email || 'system' });
}

function checkBridgeHealth() {
    // Мост работает автономно через Firestore — всегда возвращаем true
    return Promise.resolve(true);
}

/* ── Отчёт об ошибке → bridge → Telegram ── */
function reportErrorToBridge(msg, url, line) {
    return callBackend('/api/notify', {
        message: '[ERROR] ' + msg + ' | ' + (url || '') + ':' + (line || '?'),
        email:   'system@faraday'
    });
}
