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

var chatUnsubscribe          = null;
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

        // Личный чат — Firestore
        if (chatUnsubscribe) chatUnsubscribe();
        chatUnsubscribe = window.db
            .collection('users').doc(user.uid).collection('messages')
            .orderBy('timestamp', 'asc')
            .onSnapshot(renderPersonalMessages, function(err) {
                console.error('[Auth] Chat snapshot error:', err);
            });

        // Слушаем входящие ответы от Faraday (bridge → Firestore → фронт)
        if (typeof listenForFaradayResponses === 'function') {
            listenForFaradayResponses(user.uid);
        }

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

        if (chatUnsubscribe) { chatUnsubscribe(); chatUnsubscribe = null; }
        // Отписываемся от ответов Faraday
        if (faradayResponsesUnsub) { faradayResponsesUnsub(); faradayResponsesUnsub = null; }
    }
}

// Единственная подписка — запускает Faraday Core только один раз
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

async function analyzeCurrentContext(projectId) {
    // projectId здесь должен быть "nitro_18"
    const doc = await db.collection('project_manifests').doc(projectId).get();
    
    if (doc.exists) {
        const project = doc.data();
        
        // Faraday обращается к полям, которые ты создал на скриншоте
        const name = project.projectName;
        const status = project.currentStatus; // Вот тут важно совпадение имен!
        const tech = project.stack ? project.stack.join(', ') : 'не определен';

        setTimeout(() => {
            addMessageToUI('FARADAY', 
                `Системный анализ завершен. Проект: ${name}. Статус: ${status}. Стек: ${tech}. Я готов к работе, сэр.`, 
                'ai-msg'
            );
        }, 4000);
    } else {
        console.log("Faraday: Манифест проекта не найден в БД.");
    }
}

/* ── Выход ── */
function handleLogout() {
    window.auth.signOut().catch(function(err) {
        console.error('[Auth] Logout error:', err);
    });
}
