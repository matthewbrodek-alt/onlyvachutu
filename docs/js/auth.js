/* ════════════════════════════════════════════════
   auth.js — Firebase инициализация, вход/выход,
              обновление UI.

   Маршруты:
   ┌─ ЛИЧНЫЙ ЧАТ ────────────────────────────────┐
   │  users/{uid}/messages      → chat-window     │
   │  users/{uid}/faraday_resp  → chat-window     │  ← ответы из Telegram
   └─────────────────────────────────────────────┘
   ┌─ FARADAY AI ────────────────────────────────┐
   │  AI отвечает локально (chat.js)              │
   │  Без Telegram                                │
   └─────────────────────────────────────────────┘
════════════════════════════════════════════════ */

var firebaseConfig = {
    apiKey:            'AIzaSyA_7n34vc1JM5PER6kvU9mMSzKfpu8s5YE',
    authDomain:        'my-portfolio-auth-ff1ce.firebaseapp.com',
    projectId:         'my-portfolio-auth-ff1ce',
    storageBucket:     'my-portfolio-auth-ff1ce.firebasestorage.app',
    messagingSenderId: '391088510675',
    appId:             '1:391088510675:web:ff1c4d866c37f921886626'
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

window.db   = firebase.firestore();
window.auth = firebase.auth();

var chatUnsubscribe       = null; // личные сообщения
var telegramRespUnsub     = null; // ответы владельца из Telegram

/* ── Обновление UI ── */
function updateAuthUI(user) {
    var lf  = document.getElementById('login-form');
    var ui  = document.getElementById('user-info');
    var mlf = document.getElementById('modal-login-form');
    var mui = document.getElementById('modal-user-info');

    var navLoginBtn      = document.getElementById('nav-login-btn');
    var navUserBlock     = document.getElementById('nav-user-block');
    var navUserName      = document.getElementById('nav-user-name');
    var mobileLoginBtn   = document.getElementById('mobile-login-btn');
    var mobileUserBlock  = document.getElementById('mobile-user-block');
    var mobileUserName   = document.getElementById('mobile-user-name');
    var chatEmail        = document.getElementById('chat-user-email');
    var modalChatEmail   = document.getElementById('modal-chat-user-email');
    var userNameContacts = document.getElementById('user-name-contacts');

    if (user) {
        var name = user.email.split('@')[0];

        if (lf)  lf.style.display  = 'none';
        if (ui)  ui.style.display  = 'flex';
        if (mlf) mlf.style.display = 'none';
        if (mui) mui.style.display = 'flex';

        if (navLoginBtn)     navLoginBtn.style.display    = 'none';
        if (navUserBlock)    navUserBlock.style.display    = 'flex';
        if (navUserName)     navUserName.innerText         = name;
        if (mobileLoginBtn)  mobileLoginBtn.style.display  = 'none';
        if (mobileUserBlock) mobileUserBlock.style.display = 'flex';
        if (mobileUserName)  mobileUserName.innerText      = name;
        if (chatEmail)       chatEmail.innerText           = user.email;
        if (modalChatEmail)  modalChatEmail.innerText      = user.email;
        if (userNameContacts)userNameContacts.innerText    = name;

        /* ── 1. Исходящие сообщения пользователя ──
           Рендерим в окно личного чата.              */
        if (chatUnsubscribe) chatUnsubscribe();
        chatUnsubscribe = window.db
            .collection('users').doc(user.uid).collection('messages')
            .orderBy('timestamp', 'asc')
            .onSnapshot(renderPersonalMessages, function(err) {
                if (err.code !== 'permission-denied')
                    console.error('[Auth] messages snapshot:', err.code);
            });

        /* ── 2. Ответы владельца из Telegram ──
           bridge.py пишет в users/{uid}/faraday_responses.
           Показываем ТОЛЬКО в личном чате (не в Faraday AI).
           Это «прямое общение» — ответ от живого человека.  */
        if (telegramRespUnsub) telegramRespUnsub();
        telegramRespUnsub = window.db
            .collection('users').doc(user.uid)
            .collection('faraday_responses')
            .orderBy('timestamp', 'asc')
            .onSnapshot(function(snap) {
                snap.docChanges().forEach(function(change) {
                    if (change.type !== 'added') return;
                    var data = change.doc.data();
                    var text = (data.text || data.message || '').trim();
                    if (!text) return;

                    // ← Ответ идёт В ЛИЧНЫЙ ЧАТ, не в Faraday AI
                    var chatWin = document.getElementById('chat-window');
                    if (chatWin && typeof appendMessage === 'function') {
                        appendMessage(chatWin, '💬 ' + text, 'received');
                    }
                    var modalWin = document.getElementById('modal-chat-window');
                    if (modalWin && typeof appendMessage === 'function') {
                        appendMessage(modalWin, '💬 ' + text, 'received');
                    }
                });
            }, function(err) {
                // Тихо — при первом входе коллекция пуста
                if (err.code !== 'permission-denied')
                    console.warn('[Auth] faraday_responses:', err.code);
            });

    } else {
        if (lf)  lf.style.display  = 'flex';
        if (ui)  ui.style.display  = 'none';
        if (mlf) mlf.style.display = 'flex';
        if (mui) mui.style.display = 'none';

        if (navLoginBtn)     navLoginBtn.style.display    = 'inline-block';
        if (navUserBlock)    navUserBlock.style.display    = 'none';
        if (mobileLoginBtn)  mobileLoginBtn.style.display  = 'inline-block';
        if (mobileUserBlock) mobileUserBlock.style.display = 'none';
        if (userNameContacts)userNameContacts.innerText    = 'Guest';

        if (chatUnsubscribe)   { chatUnsubscribe(); chatUnsubscribe = null; }
        if (telegramRespUnsub) { telegramRespUnsub(); telegramRespUnsub = null; }
    }
}

/* Единственная подписка. Faraday Core инициализируется один раз. */
window.auth.onAuthStateChanged(function(user) {
    updateAuthUI(user);
    if (window._faradayCoreInited) return;
    window._faradayCoreInited = true;
    if (typeof initFaradayCore === 'function') initFaradayCore();
});

/* ── Вход ── */
async function handleLogin() {
    var email = document.getElementById('auth-email');
    var pass  = document.getElementById('auth-pass');
    if (email && pass) await _doLogin(email.value.trim(), pass.value);
}
async function handleLoginModal() {
    var email = document.getElementById('modal-auth-email');
    var pass  = document.getElementById('modal-auth-pass');
    if (email && pass) await _doLogin(email.value.trim(), pass.value);
}
async function _doLogin(email, pass) {
    if (!email || !pass) return;
    try {
        await window.auth.signInWithEmailAndPassword(email, pass);
    } catch (e) {
        if (e.code === 'auth/user-not-found' ||
            e.code === 'auth/invalid-credential' ||
            e.code === 'auth/wrong-password') {
            try { await window.auth.createUserWithEmailAndPassword(email, pass); }
            catch (ce) { alert(ce.message); }
        } else { alert(e.message); }
    }
}

/* ── Выход ── */
function handleLogout() {
    window.auth.signOut().catch(function(err) {
        console.error('[Auth] Logout error:', err);
    });
}

/* ── analyzeCurrentContext ── */
function analyzeCurrentContext(projectId) {
    if (!window.db || !projectId) return;
    var feed = document.getElementById('faraday-feed');
    if (!feed || typeof appendFaradayAIMsg !== 'function') {
        setTimeout(function() { analyzeCurrentContext(projectId); }, 2000);
        return;
    }
    window.db.collection('project_manifests').doc(projectId).get()
        .then(function(doc) {
            if (!doc.exists) return;
            var p      = doc.data();
            var name   = p.projectName || p.name || projectId;
            var status = p.currentStatus || p.status || 'неизвестен';
            var tech   = Array.isArray(p.stack) ? p.stack.join(', ') : (p.stack || 'не указан');
            appendFaradayAIMsg(feed, 'Синхронизируюсь с манифестом проекта...');
            setTimeout(function() {
                appendFaradayAIMsg(feed, 'Анализ «' + name + '» завершён. Статус: [' + status + ']. Стек: ' + tech + '.');
            }, 2500);
        })
        .catch(function(err) { console.error('[Faraday] analyzeCurrentContext:', err.message); });
}
