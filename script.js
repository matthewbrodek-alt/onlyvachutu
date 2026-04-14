const firebaseConfig = {
    apiKey: "AIzaSyA_7n34vc1JM5PER6kvU9mMSzKfpu8s5YE",
    authDomain: "my-portfolio-auth-ff1ce.firebaseapp.com",
    projectId: "my-portfolio-auth-ff1ce",
    storageBucket: "my-portfolio-auth-ff1ce.firebasestorage.app",
    messagingSenderId: "391088510675",
    appId: "1:391088510675:web:ff1c4d866c37f921886626"
};

// --- КОНФИГУРАЦИЯ TELEGRAM ---
const TELEGRAM_BOT_TOKEN = "8664813567:AAEkqGdXuyrS43Pjfc1gB-KdVuOOReWrkGw";
const TELEGRAM_CHAT_ID = "7451263058";

// Инициализация
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

let currentLang = 'ru';

// --- ЛОГИКА ЯЗЫКА (ФЛАГИ) ---
function toggleLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    const langIcon = document.getElementById('lang-icon');
    if (langIcon) {
        langIcon.innerText = currentLang === 'ru' ? "🇷🇺" : "🇺🇸";
    }
    // Здесь можно вызвать функцию обновления текстов, если есть словарь dict
}

// --- УПРАВЛЕНИЕ СОСТОЯНИЕМ ПОЛЬЗОВАТЕЛЯ ---
auth.onAuthStateChanged(user => {
    const loginForm = document.getElementById('login-form');
    const userInfo = document.getElementById('user-info');
    const userNameDisplay = document.getElementById('user-name');
    const logoutBtn = document.getElementById('logout-btn');

    if (user) {
        if (loginForm) loginForm.style.display = 'none';
        if (userInfo) userInfo.style.display = 'flex';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (userNameDisplay) userNameDisplay.innerText = user.email.split('@')[0];
        
        // Важно: сохраняем email в профиль, чтобы Python-мост мог сопоставить его
        db.collection("users").doc(user.uid).set({
            email: user.email,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        syncChat(user.uid);
    } else {
        if (loginForm) loginForm.style.display = 'block';
        if (userInfo) userInfo.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userNameDisplay) userNameDisplay.innerText = "Guest";
    }
});

// --- АВТОРИЗАЦИЯ ---
async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    if (!email || !pass) return alert("Введите данные!");

    try {
        await auth.signInWithEmailAndPassword(email, pass);
    } catch (error) {
        try {
            await auth.createUserWithEmailAndPassword(email, pass);
        } catch (regError) {
            alert("Ошибка: " + regError.message);
        }
    }
}

function handleLogout() {
    auth.signOut();
}

// --- ЧАТ И TELEGRAM ---
async function sendMessage() {
    const input = document.getElementById('chat-msg');
    const text = input.value.trim();
    
    if (!text || !auth.currentUser) return;

    // 1. Сохраняем сообщение в Firebase пользователя
    await db.collection("users").doc(auth.currentUser.uid).collection("messages").add({
        message: text,
        sender: "user",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 2. Отправляем в Telegram в строгом формате для bridge.py
    // Первая строка ДОЛЖНА содержать только 👤 Email
    const tgMessage = `👤 ${auth.currentUser.email}\n💬 ${text}`;

    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: tgMessage
        })
    });

    input.value = "";
}

function syncChat(uid) {
    db.collection("users").doc(uid).collection("messages")
        .orderBy("timestamp", "asc")
        .onSnapshot(snap => {
            const win = document.getElementById('chat-window');
            if (!win) return;
            
            win.innerHTML = "";
            snap.forEach(doc => {
                const m = doc.data();
                const div = document.createElement('div');
                div.className = `msg-box ${m.sender === 'user' ? 'sent' : 'received'}`;
                div.innerText = m.message;
                win.appendChild(div);
            });
            win.scrollTop = win.scrollHeight;
        });
}

// --- ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ---
async function fetchCats() {
    try {
        const res = await fetch('https://api.thecatapi.com/v1/images/search');
        const data = await res.json();
        const container = document.getElementById('cat-container');
        if (container) {
            container.innerHTML = `<img src="${data[0].url}" style="width:100%; border-radius:12px; margin-top:10px; border: 1px solid rgba(0,255,136,0.3);">`;
        }
    } catch (e) {
        console.error("Ошибка при загрузке котиков", e);
    }
}

// Запуск видео и первичная загрузка
document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('bg-video');
    // Обход политики автоплея: запускаем видео после первого клика по экрану
    document.body.addEventListener('click', () => {
        if (video) video.play();
    }, { once: true });

    fetchCats();
});
