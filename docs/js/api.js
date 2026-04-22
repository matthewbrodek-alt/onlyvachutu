/* ════════════════════════════════════════════════
   api.js — Запись в Firestore bridge_queue
   Загружается ПЕРВЫМ.

   АРХИТЕКТУРА v9.0 (Queue Mode):
   Вместо fetch → bridge.py HTTP
   теперь JS пишет прямо в Firestore bridge_queue.
   bridge.py слушает коллекцию через on_snapshot
   и сам забирает pending-документы.

   HTTP нужен только для:
   - /health (checkBridgeHealth)
   - /api/telegram-webhook (ответы из Telegram)
════════════════════════════════════════════════ */

/* ── URL bridge (только для health-check и webhook) ──
   Для смены URL из консоли браузера:
     
     var BRIDGE_URL = '';
    
    window.nitro = window.nitro || {};
    window.nitro.setBridgeUrl = function(url) {
        BRIDGE_URL = url.replace(/\/$/, '');
        try { localStorage.setItem('nitro_bridge_url', BRIDGE_URL); } catch(e) {}
        console.log('[Bridge] URL →', BRIDGE_URL);
    };
    
    /* ══════════════════════════════════════════════
       ОСНОВНАЯ ФУНКЦИЯ ОТПРАВКИ
       Пишет документ в bridge_queue.
       bridge.py подхватит его через on_snapshot.
    ══════════════════════════════════════════════ */
    function bridgeSaveMessage(content, email) {
        var user = window.auth && window.auth.currentUser;
        if (!user) {
            console.warn('[Queue] Пользователь не авторизован');
            return Promise.reject(new Error('not authenticated'));
        }
    
        /* Поля документа — точно как требует bridge.py */
        var doc = {
            content:   content,
            uid:       user.uid,
            email:     email || user.email || 'anonymous',
            status:    'pending',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
    
        return window.db.collection('bridge_queue').add(doc)
            .then(function(ref) {
                console.log('[Queue] Документ добавлен:', ref.id.slice(0, 8) + '…');
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
        if (user) {
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
        // Больше не делаем fetch. Просто возвращаем true, 
        // так как мост теперь работает автономно через Firestore.
        return Promise.resolve(true);
    }
    
    /* ── Отчёт об ошибке → bridge → Telegram ── */
    function reportErrorToBridge(msg, url, line) {
        return callBackend('/api/notify', {
            message: '[ERROR] ' + msg + ' | ' + (url || '') + ':' + (line || '?'),
            email:   'system@faraday'
        });
    }
    