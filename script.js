const firebaseConfig = {
    apiKey: "AIzaSyA_7n34vc1JM5PER6kvU9mMSzKfpu8s5YE",
    authDomain: "my-portfolio-auth-ff1ce.firebaseapp.com",
    projectId: "my-portfolio-auth-ff1ce",
    storageBucket: "my-portfolio-auth-ff1ce.firebasestorage.app",
    messagingSenderId: "391088510675",
    appId: "1:391088510675:web:ff1c4d866c37f921886626"
};

const TELEGRAM_BOT_TOKEN = "8664813567:AAEkqGdXuyrS43Pjfc1gB-KdVuOOReWrkGw";
const TELEGRAM_CHAT_ID = "7451263058";

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentLang = 'ru';

// Данные Firestore из твоих скриншотов
async function loadProjects() {
    const container = document.getElementById('portfolio-container');
    const snap = await db.collection("projects").get();
    container.innerHTML = snap.docs.map(doc => {
        const p = doc.data();
        const tech = p.tech ? p.tech.map(t => `<span class="tech-tag">${t}</span>`).join('') : '';
        return `<div class="project-item-card" style="border-bottom: 1px solid rgba(0,255,136,0.1); padding: 10px 0;">
            <div class="neon-text">${p.title || 'Project'}</div>
            <div style="font-size:0.8rem; opacity:0.7;">Metric: ${p.metric || '0.0'}</div>
            <div style="margin-top:5px;">${tech}</div>
        </div>`;
    }).join('');
}

function toggleLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    document.getElementById('lang-icon').innerText = currentLang === 'ru' ? "🇷🇺" : "🇺🇸";
    // Тут логика словаря (dict), которую мы использовали ранее
}

// Отправка сообщений — исправленная
async function sendMessage() {
    const input = document.getElementById('chat-msg');
    const text = input.value.trim();
    if (!text || !auth.currentUser) return;

    await db.collection("users").doc(auth.currentUser.uid).collection("messages").add({
        message: text, sender: "user", timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: `👤 ${auth.currentUser.email}:\n${text}` })
    });
    input.value = "";
}

function syncChat(uid) {
    db.collection("users").doc(uid).collection("messages").orderBy("timestamp", "asc").onSnapshot(snap => {
        const win = document.getElementById('chat-window');
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

auth.onAuthStateChanged(user => {
    document.getElementById('login-form').style.display = user ? 'none' : 'block';
    document.getElementById('user-info').style.display = user ? 'flex' : 'none';
    document.getElementById('user-name').innerText = user ? user.email.split('@')[0] : "Guest";
    if (user) syncChat(user.uid);
});

document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
    fetchCats();
    const v = document.getElementById('bg-video');
    document.body.addEventListener('click', () => v.play(), { once: true });
});
