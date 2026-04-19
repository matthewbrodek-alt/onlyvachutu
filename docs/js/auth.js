/* ════════════════════════════════════════════════
   auth.js — Firebase инициализация, вход/выход,
               обновление UI авторизации.
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

var chatUnsubscribe        = null;
var faradayResponsesUnsub    = null;

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

        // 1. Личный чат (твои сообщения)
        if (chatUnsubscribe) chatUnsubscribe();
        chatUnsubscribe = window.db
            .collection('users').doc(user.uid).collection('messages')
            .orderBy('timestamp', 'asc')
            .onSnapshot(renderPersonalMessages, function(err) {
                if (err.code === 'failed-precondition') {
                    console.error('[Auth] Ошибка индекса! Проверьте ссылку в деталях ошибки ниже.');
                }
                console.error('[Auth] Chat snapshot error:', err);
            });

        // 2. Ответы Faraday (из Telegram через Bridge)
        if (faradayResponsesUnsub) faradayResponsesUnsub();
        faradayResponsesUnsub = window.db
            .collection('users').doc(user.uid).collection('faraday_responses')
            .orderBy('timestamp', 'asc')
            .onSnapshot(function(snap) {
                snap.docChanges().forEach(function(change) {
                    if (change.type === 'added') {
                        var data = change.doc.data();
                        if (window.addMessageToUI) {
                            window.addMessageToUI('FARADAY', data.text || data.message, 'ai-msg');
                        }
                    }
                });
            }, function(err) {
                console.error('[Auth] Faraday Responses Error:', err);
            });

    } else {
        // ... (логика выхода остается без изменений)
        if (lf)  lf.style.display  = 'flex';
        if (ui)  ui.style.display  = 'none';
        if (mlf) mlf.style.display = 'flex';
        if (mui) mui.style.display = 'none';
        if (navLoginBtn)     navLoginBtn.style.display    = 'inline-block';
        if (navUserBlock)    navUserBlock.style.display    = 'none';
        if (mobileLoginBtn)  mobileLoginBtn.style.display  = 'inline-block';
        if (mobileUserBlock) mobileUserBlock.style.display = 'none';
        if (userNameContacts)userNameContacts.innerText    = 'Guest';

        if (chatUnsubscribe) { chatUnsubscribe(); chatUnsubscribe = null; }
        if (faradayResponsesUnsub) { faradayResponsesUnsub(); faradayResponsesUnsub = null; }
    }
}

window.auth.onAuthStateChanged(function(user) {
    updateAuthUI(user);
    if (window._faradayCoreInited) return;
    window._faradayCoreInited = true;
    if (typeof initFaradayCore === 'function') initFaradayCore();
});

/* ── Вход/Выход (без изменений) ── */
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
        if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') {
            try { await window.auth.createUserWithEmailAndPassword(email, pass); }
            catch (ce) { alert(ce.message); }
        } else { alert(e.message); }
    }
}
function handleLogout() {
    window.auth.signOut().catch(function(err) { console.error('[Auth] Logout error:', err); });
}

/* ── Анализ контекста (Исправленные имена полей) ── */
async function analyzeCurrentContext(projectId) {
    console.log("Faraday: Запуск глубокого анализа проекта...");
    const say = (who, text, type) => {
        if (window.addMessageToUI) window.addMessageToUI(who, text, type);
    };

    try {
        const doc = await window.db.collection('project_manifests').doc(projectId).get();
        if (doc.exists) {
            const project = doc.data();
            
            // Имена полей теперь точно как в твоей БД (image_a2ec63.png)
            const name   = project.projectName   || "Nitro Project";
            const status = project.currentStatus || "Active";
            
            let tech = "не указан";
            if (Array.isArray(project.stack)) tech = project.stack.join(', ');
            else if (project.stack) tech = project.stack;

            say('FARADAY', "Синхронизируюсь с манифестом проекта...", 'ai-msg');

            setTimeout(() => {
                say('FARADAY', `Анализ ${name} завершен. Статус: [${status}]. Стек: ${tech}.`, 'ai-msg');
                if (status.toLowerCase().includes('active')) {
                    setTimeout(() => {
                        say('FARADAY', "Вижу высокую активность. Системы готовы к деплою.", 'ai-msg');
                    }, 2000);
                }
            }, 2500);
        }
    } catch (err) { console.error("Faraday Context Error:", err); }
}