/* ════════════════════════════════════════════════
   auth.js — Firebase init, вход/выход, UI, слушатели чата.

   Маршруты данных v9.0:
   ┌─ ЛИЧНЫЙ ЧАТ ────────────────────────────────┐
   │  users/{uid}/messages      → sent bubbles    │
   │  users/{uid}/faraday_responses → received    │  ← ответы владельца из Telegram
   └─────────────────────────────────────────────┘
   ┌─ ОЧЕРЕДЬ (только запись) ───────────────────┐
   │  bridge_queue  ← JS пишет pending-документы │
   │  bridge.py читает через on_snapshot          │
   └─────────────────────────────────────────────┘
   Faraday AI: только локально + faraday_memory.
   Telegram не касается.
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

var chatUnsubscribe   = null;  // слушатель исходящих сообщений
var tgRespUnsubscribe = null;  // слушатель ответов из Telegram

/* ════════════════════════════════════════════════
   UI АВТОРИЗАЦИИ
════════════════════════════════════════════════ */
function updateAuthUI(user) {
    function g(id) { return document.getElementById(id); }

    if (user) {
        var name = user.email.split('@')[0];

        /* Скрываем формы входа, показываем чат */
        if (g('login-form'))       g('login-form').style.display       = 'none';
        if (g('user-info'))        g('user-info').style.display        = 'flex';
        if (g('modal-login-form')) g('modal-login-form').style.display = 'none';
        if (g('modal-user-info'))  g('modal-user-info').style.display  = 'flex';

        /* Навбар */
        if (g('nav-login-btn'))     g('nav-login-btn').style.display     = 'none';
        if (g('nav-user-block'))    g('nav-user-block').style.display    = 'flex';
        if (g('nav-user-name'))     g('nav-user-name').innerText         = name;
        if (g('mobile-login-btn'))  g('mobile-login-btn').style.display  = 'none';
        if (g('mobile-user-block')) g('mobile-user-block').style.display = 'flex';
        if (g('mobile-user-name'))  g('mobile-user-name').innerText      = name;
        if (g('chat-user-email'))       g('chat-user-email').innerText       = user.email;
        if (g('modal-chat-user-email')) g('modal-chat-user-email').innerText = user.email;
        if (g('user-name-contacts'))    g('user-name-contacts').innerText    = name;

        /* ── Слушатель 1: история исходящих сообщений ──
           users/{uid}/messages — то что пользователь отправил.
           Рендерим ВСЕ при открытии, прокручиваем к последнему. */
        if (chatUnsubscribe) chatUnsubscribe();
        chatUnsubscribe = window.db
            .collection('users').doc(user.uid)
            .collection('messages')
            .orderBy('timestamp', 'asc')
            .onSnapshot(function(snap) {
                ['chat-window', 'modal-chat-window'].forEach(function(winId) {
                    var win = document.getElementById(winId);
                    if (!win) return;
                    win.innerHTML = '';
                    snap.forEach(function(doc) {
                        var d   = doc.data();
                        var div = document.createElement('div');
                        div.className   = 'msg-box sent';
                        div.textContent = d.message || '';
                        win.appendChild(div);
                    });
                    win.scrollTop = win.scrollHeight;
                });
            }, function(err) {
                if (err.code !== 'permission-denied')
                    console.error('[Auth] messages snapshot:', err.code);
            });

        /* ── Слушатель 2: ответы владельца из Telegram ──
           users/{uid}/faraday_responses — bridge.py пишет сюда.
           Показываем только НОВЫЕ документы (docChanges ADDED).
           Не перерисовываем весь список — только добавляем. */
        if (tgRespUnsubscribe) tgRespUnsubscribe();
        tgRespUnsubscribe = window.db
            .collection('users').doc(user.uid)
            .collection('faraday_responses')
            .orderBy('timestamp', 'asc')
            .onSnapshot(function(snap) {
                snap.docChanges().forEach(function(change) {
                    if (change.type !== 'added') return;
                    var d    = change.doc.data();
                    var text = (d.text || d.message || '').trim();
                    if (!text) return;
                    ['chat-window', 'modal-chat-window'].forEach(function(winId) {
                        var win = document.getElementById(winId);
                        if (!win) return;
                        var div = document.createElement('div');
                        div.className   = 'msg-box received';
                        div.textContent = text;
                        win.appendChild(div);
                        win.scrollTop = win.scrollHeight;
                    });
                });
            }, function(err) {
                if (err.code !== 'permission-denied')
                    console.warn('[Auth] faraday_responses snapshot:', err.code);
            });

    } else {
        /* Выход — сброс UI */
        if (g('login-form'))       g('login-form').style.display       = 'flex';
        if (g('user-info'))        g('user-info').style.display        = 'none';
        if (g('modal-login-form')) g('modal-login-form').style.display = 'flex';
        if (g('modal-user-info'))  g('modal-user-info').style.display  = 'none';
        if (g('nav-login-btn'))    g('nav-login-btn').style.display    = 'inline-block';
        if (g('nav-user-block'))   g('nav-user-block').style.display   = 'none';
        if (g('mobile-login-btn')) g('mobile-login-btn').style.display = 'inline-block';
        if (g('mobile-user-block'))g('mobile-user-block').style.display= 'none';
        if (g('user-name-contacts'))g('user-name-contacts').innerText  = 'Guest';

        if (chatUnsubscribe)   { chatUnsubscribe();   chatUnsubscribe   = null; }
        if (tgRespUnsubscribe) { tgRespUnsubscribe(); tgRespUnsubscribe = null; }
    }
}

/* Единственная подписка на смену авторизации. */
window.auth.onAuthStateChanged(function(user) {
    updateAuthUI(user);
    if (window._faradayCoreInited) return;
    window._faradayCoreInited = true;
    if (typeof initFaradayCore === 'function') initFaradayCore();
});

/* ════════════════════════════════════════════════
   ВХОД / ВЫХОД
════════════════════════════════════════════════ */
async function handleLogin() {
    var e = document.getElementById('auth-email');
    var p = document.getElementById('auth-pass');
    if (e && p) await _doLogin(e.value.trim(), p.value);
}
async function handleLoginModal() {
    var e = document.getElementById('modal-auth-email');
    var p = document.getElementById('modal-auth-pass');
    if (e && p) await _doLogin(e.value.trim(), p.value);
}
async function _doLogin(email, pass) {
    if (!email || !pass) return;
    try {
        await window.auth.signInWithEmailAndPassword(email, pass);
    } catch(err) {
        var CODES = ['auth/user-not-found','auth/invalid-credential','auth/wrong-password'];
        if (CODES.includes(err.code)) {
            try { await window.auth.createUserWithEmailAndPassword(email, pass); }
            catch(ce) { alert(ce.message); }
        } else { alert(err.message); }
    }
}
function handleLogout() {
    window.auth.signOut().catch(function(e) {
        console.error('[Auth] Logout:', e);
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
                appendFaradayAIMsg(feed,
                    'Анализ «' + name + '» завершён. Статус: [' + status + ']. Стек: ' + tech + '.');
            }, 2500);
        })
        .catch(function(e) { console.error('[Faraday] analyzeCurrentContext:', e.message); });
}
