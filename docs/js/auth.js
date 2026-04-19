/* ════════════════════════════════════════════════
   auth.js — Firebase инициализация, вход/выход,
              обновление UI, слушатель ответов Faraday.

   Маршрут ответа из Telegram:
   bridge.py → Firestore users/{uid}/faraday_responses
             → onSnapshot здесь → appendFaradayAIMsg()
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

var chatUnsubscribe         = null; // личные сообщения
var faradayResponsesUnsub   = null; // ответы из Telegram

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

        // ── 1. Личный чат: сообщения пользователя ──
        if (chatUnsubscribe) chatUnsubscribe();
        chatUnsubscribe = window.db
            .collection('users').doc(user.uid).collection('messages')
            .orderBy('timestamp', 'asc')
            .onSnapshot(renderPersonalMessages, function(err) {
                // failed-precondition = нужен составной индекс в Firestore
                console.error('[Auth] messages snapshot error:', err.code, err.message);
            });

        // ── 2. Ответы из Telegram через bridge.py ──
        // Путь: users/{uid}/faraday_responses
        // bridge.py пишет сюда через _deliver_to_site()
        if (faradayResponsesUnsub) faradayResponsesUnsub();
        faradayResponsesUnsub = window.db
            .collection('users').doc(user.uid)
            .collection('faraday_responses')
            .orderBy('timestamp', 'asc')
            .onSnapshot(function(snap) {
                snap.docChanges().forEach(function(change) {
                    // Показываем только новые документы, не пересчитываем старые
                    if (change.type !== 'added') return;
                    var data = change.doc.data();
                    var text = (data.text || data.message || '').trim();
                    if (!text) return;

                    // Выводим в Faraday-чат (функция из chat.js)
                    var feed = document.getElementById('faraday-feed');
                    if (feed && typeof appendFaradayAIMsg === 'function') {
                        appendFaradayAIMsg(feed, text);
                    }
                });
            }, function(err) {
                // Тихо — при первом входе коллекция пуста, это нормально
                console.warn('[Auth] faraday_responses:', err.code);
            });

    } else {
        // Выход
        if (lf)  lf.style.display  = 'flex';
        if (ui)  ui.style.display  = 'none';
        if (mlf) mlf.style.display = 'flex';
        if (mui) mui.style.display = 'none';

        if (navLoginBtn)     navLoginBtn.style.display    = 'inline-block';
        if (navUserBlock)    navUserBlock.style.display    = 'none';
        if (mobileLoginBtn)  mobileLoginBtn.style.display  = 'inline-block';
        if (mobileUserBlock) mobileUserBlock.style.display = 'none';
        if (userNameContacts)userNameContacts.innerText    = 'Guest';

        if (chatUnsubscribe)       { chatUnsubscribe(); chatUnsubscribe = null; }
        if (faradayResponsesUnsub) { faradayResponsesUnsub(); faradayResponsesUnsub = null; }
    }
}

/* Единственная подписка на изменение авторизации.
   Запускает Faraday Core только один раз. */
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

/* ════════════════════════════════════════════════
   analyzeCurrentContext — читает манифест проекта
   из Firestore и выводит анализ в Faraday-чат.
   Вызов: analyzeCurrentContext('nitro_18')
════════════════════════════════════════════════ */
function analyzeCurrentContext(projectId) {
    if (!window.db || !projectId) return;

    var feed = document.getElementById('faraday-feed');
    if (!feed || typeof appendFaradayAIMsg !== 'function') {
        // Если чат ещё не готов — повторим позже
        setTimeout(function() { analyzeCurrentContext(projectId); }, 2000);
        return;
    }

    window.db.collection('project_manifests').doc(projectId).get()
        .then(function(doc) {
            if (!doc.exists) {
                console.log('[Faraday] Манифест «' + projectId + '» не найден в Firestore.');
                return;
            }
            var p = doc.data();

            var name   = p.projectName   || p.name   || projectId;
            var status = p.currentStatus || p.status || 'неизвестен';
            var tech   = Array.isArray(p.stack)
                ? p.stack.join(', ')
                : (p.stack || 'не указан');

            appendFaradayAIMsg(feed, 'Синхронизируюсь с манифестом проекта...');

            setTimeout(function() {
                appendFaradayAIMsg(
                    feed,
                    'Анализ «' + name + '» завершён. Статус: [' + status + ']. Стек: ' + tech + '.'
                );
                if (status.toLowerCase().includes('active') ||
                    status.toLowerCase().includes('активн')) {
                    setTimeout(function() {
                        appendFaradayAIMsg(feed, 'Высокая активность. Системы готовы к деплою.');
                    }, 2000);
                }
            }, 2500);
        })
        .catch(function(err) {
            console.error('[Faraday] analyzeCurrentContext error:', err.message);
        });
}
