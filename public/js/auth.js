/* ════════════════════════════════════════════════
   auth.js — Firebase инициализация, вход/выход,
              обновление UI авторизации
════════════════════════════════════════════════ */

var firebaseConfig = {
    apiKey:            'AIzaSyA_7n34vc1JM5PER6kvU9mMSzKfpu8s5YE',
    authDomain:        'my-portfolio-auth-ff1ce.firebaseapp.com',
    projectId:         'my-portfolio-auth-ff1ce',
    storageBucket:     'my-portfolio-auth-ff1ce.firebasestorage.app',
    messagingSenderId: '391088510675',
    appId:             '1:391088510675:web:ff1c4d866c37f921886626'
};

// Инициализируем Firebase один раз
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

// Экспортируем в глобальный scope (нужен другим модулям)
window.db   = firebase.firestore();
window.auth = firebase.auth();

var chatUnsubscribe = null; // слушатель личного чата

/* ── Обновление UI в зависимости от состояния авторизации ── */
function updateAuthUI(user) {
    var lf  = document.getElementById('login-form');
    var ui  = document.getElementById('user-info');
    var mlf = document.getElementById('modal-login-form');
    var mui = document.getElementById('modal-user-info');

    var navLoginBtn     = document.getElementById('nav-login-btn');
    var navUserBlock    = document.getElementById('nav-user-block');
    var navUserName     = document.getElementById('nav-user-name');
    var mobileLoginBtn  = document.getElementById('mobile-login-btn');
    var mobileUserBlock = document.getElementById('mobile-user-block');
    var mobileUserName  = document.getElementById('mobile-user-name');
    var chatEmail       = document.getElementById('chat-user-email');
    var modalChatEmail  = document.getElementById('modal-chat-user-email');
    var userNameContacts= document.getElementById('user-name-contacts');

    if (user) {
        var name = user.email.split('@')[0];

        if (lf)  lf.style.display  = 'none';
        if (ui)  ui.style.display  = 'flex';
        if (mlf) mlf.style.display = 'none';
        if (mui) mui.style.display = 'flex';

        if (navLoginBtn)     navLoginBtn.style.display     = 'none';
        if (navUserBlock)    navUserBlock.style.display     = 'flex';
        if (navUserName)     navUserName.innerText          = name;
        if (mobileLoginBtn)  mobileLoginBtn.style.display   = 'none';
        if (mobileUserBlock) mobileUserBlock.style.display  = 'flex';
        if (mobileUserName)  mobileUserName.innerText       = name;
        if (chatEmail)       chatEmail.innerText            = user.email;
        if (modalChatEmail)  modalChatEmail.innerText       = user.email;
        if (userNameContacts)userNameContacts.innerText     = name;

        // Подписываемся на личный чат
        if (chatUnsubscribe) chatUnsubscribe();
        chatUnsubscribe = window.db
            .collection('users').doc(user.uid).collection('messages')
            .orderBy('timestamp', 'asc')
            .onSnapshot(renderPersonalMessages, function(err) {
                console.error('Chat snapshot error:', err);
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

        if (chatUnsubscribe) { chatUnsubscribe(); chatUnsubscribe = null; }
    }
}

// Единственная подписка на изменение состояния авторизации
window.auth.onAuthStateChanged(function(user) {
    updateAuthUI(user);
    // Запускаем Faraday Core только один раз при старте
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
        // Если пользователь не найден — пробуем создать
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
    window.auth.signOut().catch(function(err) { console.error('Logout error:', err); });
}
