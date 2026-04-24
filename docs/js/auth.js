/* ════════════════════════════════════════════════
   auth.js — Firebase init, вход/выход, UI, слушатели чата.

   Маршруты данных v11.2 (Hybrid Chat):
   ┌─ FARADAY AI (публичный) ────────────────────┐
   │  Гости: Firebase Anonymous Auth → guest uid  │
   │  users/{uid}/faraday_history                 │  ← диалог с ИИ (чтение/запись)
   │  Слушатель: startFaradayResponseListener()   │  ← в chat.js
   └─────────────────────────────────────────────┘
   ┌─ PERSONAL SUPPORT (приватный) ──────────────┐
   │  Только авторизованные (не anonymous)        │
   │  users/{uid}/messages      → исходящие       │
   │  users/{uid}/faraday_responses → от владельца│
   └─────────────────────────────────────────────┘
   ┌─ ОЧЕРЕДЬ (только запись) ───────────────────┐
   │  bridge_queue ← chatType: 'ai' | 'direct'   │
   └─────────────────────────────────────────────┘

   ИЗМЕНЕНИЯ v11.2:
   - Анонимный вход (signInAnonymously) для Faraday AI
   - linkWithCredential: история гостя сохраняется при регистрации
   - Personal Support: allChatMessages map — исправлен баг innerHTML wipe
   - Два независимых onSnapshot инстанса разделены по назначению
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

// Слушатели Personal Support (только для авторизованных)
var chatUnsubscribe   = null;
var tgRespUnsubscribe = null;

// FIX: единый map для Personal Support чата
// Ключ: 'msg_{docId}' | 'resp_{docId}'. Значение: {key, timestamp, text, cssClass}
var _supportMsgMap = {};

/* ════════════════════════════════════════════════
   RENDER — единственное место рендера Personal Support чата
════════════════════════════════════════════════ */
function _renderSupportChat() {
    var msgs = Object.values(_supportMsgMap);
    msgs.sort(function(a, b) {
        var ta = (a.timestamp && a.timestamp.seconds) ? a.timestamp.seconds : 0;
        var tb = (b.timestamp && b.timestamp.seconds) ? b.timestamp.seconds : 0;
        if (ta !== tb) return ta - tb;
        return a.key < b.key ? -1 : 1;
    });
    ['chat-window', 'modal-chat-window'].forEach(function(winId) {
        var win = document.getElementById(winId);
        if (!win) return;
        win.innerHTML = '';
        msgs.forEach(function(m) {
            if (!m.text) return;
            var div = document.createElement('div');
            div.className   = 'msg-box ' + m.cssClass;
            div.textContent = m.text;
            win.appendChild(div);
        });
        win.scrollTop = win.scrollHeight;
    });
}

/* ════════════════════════════════════════════════
   UI АВТОРИЗАЦИИ
   user.isAnonymous — гость Faraday AI (не показываем nav-блок)
   !user.isAnonymous — полноценный пользователь Personal Support
════════════════════════════════════════════════ */
function updateAuthUI(user) {
    function g(id) { return document.getElementById(id); }

    if (user && !user.isAnonymous) {
        var name = user.email.split('@')[0];

        if (g('login-form'))       g('login-form').style.display       = 'none';
        if (g('user-info'))        g('user-info').style.display        = 'flex';
        if (g('modal-login-form')) g('modal-login-form').style.display = 'none';
        if (g('modal-user-info'))  g('modal-user-info').style.display  = 'flex';

        if (g('nav-login-btn'))     g('nav-login-btn').style.display     = 'none';
        if (g('nav-user-block'))    g('nav-user-block').style.display    = 'flex';
        if (g('nav-user-name'))     g('nav-user-name').innerText         = name;
        if (g('mobile-login-btn'))  g('mobile-login-btn').style.display  = 'none';
        if (g('mobile-user-block')) g('mobile-user-block').style.display = 'flex';
        if (g('mobile-user-name'))  g('mobile-user-name').innerText      = name;
        if (g('chat-user-email'))       g('chat-user-email').innerText       = user.email;
        if (g('modal-chat-user-email')) g('modal-chat-user-email').innerText = user.email;
        if (g('user-name-contacts'))    g('user-name-contacts').innerText    = name;

        /* ── Слушатель 1: исходящие сообщения Personal Support ──
           FIX: docChanges() — никакого innerHTML = ''
           Рендерим через _supportMsgMap чтобы ответы не исчезали */
        if (chatUnsubscribe) chatUnsubscribe();
        chatUnsubscribe = window.db
            .collection('users').doc(user.uid)
            .collection('messages')
            .orderBy('timestamp', 'asc')
            .onSnapshot(function(snap) {
                snap.docChanges().forEach(function(change) {
                    var key = 'msg_' + change.doc.id;
                    if (change.type === 'removed') {
                        delete _supportMsgMap[key];
                    } else {
                        var d = change.doc.data();
                        // Показываем только сообщения пользователя
                        if (d.sender === 'user') {
                            _supportMsgMap[key] = {
                                key:       key,
                                timestamp: d.timestamp,
                                text:      d.message || '',
                                cssClass:  'sent'
                            };
                        }
                    }
                });
                _renderSupportChat();
            }, function(err) {
                if (err.code !== 'permission-denied')
                    console.error('[Auth] messages snapshot:', err.code);
            });

        /* ── Слушатель 2: ответы владельца из Telegram (faraday_responses) ──
           Независимый инстанс onSnapshot. Dedupe по docId через map.
           FIX: повторный логин не дублирует старые ответы */
        if (tgRespUnsubscribe) tgRespUnsubscribe();
        tgRespUnsubscribe = window.db
            .collection('users').doc(user.uid)
            .collection('faraday_responses')
            .orderBy('timestamp', 'asc')
            .onSnapshot(function(snap) {
                snap.docChanges().forEach(function(change) {
                    var key = 'resp_' + change.doc.id;
                    if (change.type === 'removed') {
                        delete _supportMsgMap[key];
                    } else {
                        var d    = change.doc.data();
                        var text = (d.text || d.message || '').trim();
                        if (!text) return;
                        _supportMsgMap[key] = {
                            key:       key,
                            timestamp: d.timestamp,
                            text:      text,
                            cssClass:  'received'
                        };
                    }
                });
                _renderSupportChat();
            }, function(err) {
                if (err.code !== 'permission-denied')
                    console.warn('[Auth] faraday_responses snapshot:', err.code);
            });

    } else {
        /* Выход или анонимный гость — сброс UI Personal Support */
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

        // FIX: очищаем map при выходе
        _supportMsgMap = {};
    }
}

/* ════════════════════════════════════════════════
   AUTH STATE OBSERVER
   FIX: анонимный вход для гостей Faraday AI
════════════════════════════════════════════════ */
window.auth.onAuthStateChanged(function(user) {
    if (!user) {
        /* Нет пользователя — автоматически входим анонимно.
           Это даёт гостю реальный Firebase UID без email/пароля.
           onAuthStateChanged сработает снова с anonymous user. */
        window.auth.signInAnonymously().catch(function(e) {
            console.warn('[Auth] Anonymous sign-in failed:', e.code);
        });
        return;
    }

    if (user.isAnonymous) {
        /* Гость Faraday AI: сохраняем uid в localStorage как guest_id.
           Personal Support UI не показываем. */
        try { localStorage.setItem('faraday_guest_id', user.uid); } catch(e) {}
        updateAuthUI(null);  // nav показывает "не вошли"
    } else {
        /* Полноценный пользователь — Personal Support доступен */
        try { localStorage.removeItem('faraday_guest_id'); } catch(e) {}
        updateAuthUI(user);
    }

    /* Faraday AI слушатель запускается для ВСЕХ (гость и авторизованный).
       Реализован в chat.js через startFaradayResponseListener(). */
    if (!window.faradayListenerActive && typeof startFaradayResponseListener === 'function') {
        startFaradayResponseListener(user.uid);
    }

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
    var currentUser = window.auth.currentUser;
    var credential  = firebase.auth.EmailAuthProvider.credential(email, pass);

    try {
        if (currentUser && currentUser.isAnonymous) {
            /* FIX: linkWithCredential сохраняет uid анонимного пользователя.
               Вся история faraday_history гостя остаётся доступной. */
            await currentUser.linkWithCredential(credential);
        } else {
            await window.auth.signInWithEmailAndPassword(email, pass);
        }
    } catch(err) {
        if (err.code === 'auth/email-already-in-use') {
            /* Аккаунт с этим email уже существует — просто входим.
               История анонимного гостя останется в его uid (не мержится). */
            try { await window.auth.signInWithEmailAndPassword(email, pass); }
            catch(ce) { alert(ce.message); }
        } else {
            var CODES = ['auth/user-not-found', 'auth/invalid-credential', 'auth/wrong-password'];
            if (CODES.includes(err.code)) {
                try { await window.auth.createUserWithEmailAndPassword(email, pass); }
                catch(ce) { alert(ce.message); }
            } else {
                alert(err.message);
            }
        }
    }
}

function handleLogout() {
    /* При выходе Faraday AI слушатель сбрасываем — пересоздастся при анонимном входе */
    window.faradayListenerActive = false;
    window._faradayCoreInited    = false;
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
