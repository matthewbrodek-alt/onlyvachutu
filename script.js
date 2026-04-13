const firebaseConfig = {
    apiKey: "AIzaSyA_7n34vc1JM5PER6kvU9mMSzKfpu8s5YE",
    authDomain: "my-portfolio-auth-ff1ce.firebaseapp.com",
    projectId: "my-portfolio-auth-ff1ce",
    storageBucket: "my-portfolio-auth-ff1ce.firebasestorage.app",
    messagingSenderId: "391088510675",
    appId: "1:391088510675:web:ff1c4d866c37f921886626"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

const TELEGRAM_BOT_TOKEN = "8664813567:AAEkqGdXuyrS43Pjfc1gB-KdVuOOReWrkGw";
const TELEGRAM_CHAT_ID = "7451263058";

let currentUser = null;
let unsubscribe = null;

// --- Инициализация ---
document.addEventListener('DOMContentLoaded', () => {
    // Отправка по Enter
    const input = document.getElementById('chat-msg');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    // Запуск видео (нужен клик пользователя)
    document.body.addEventListener('click', () => {
        const v = document.getElementById('bg-video');
        if (v && v.paused) v.play();
    }, { once: true });

    loadPortfolioProjects();
    fetchCats();
});

// --- Функции ---

function toggleVideoSound() {
    const v = document.getElementById('bg-video');
    const b = document.getElementById('unmute-btn');
    v.muted = !v.muted;
    b.innerText = v.muted ? "🔊" : "🔇";
}

function showPage(pageId) {
    const main = document.getElementById('main-content');
    const ads = document.getElementById('ads-page');
    if (pageId === 'ads') {
        main.classList.remove('active');
        ads.classList.add('active');
    } else {
        ads.classList.remove('active');
        main.classList.add('active');
    }
}

// Firebase Auth
auth.onAuthStateChanged(user => {
    currentUser = user;
    document.getElementById('login-form').style.display = user ? 'none' : 'flex';
    document.getElementById('user-info').style.display = user ? 'flex' : 'none';
    document.getElementById('logout-btn').style.display = user ? 'block' : 'none';
    document.getElementById('user-name').innerText = user ? user.email.split('@')[0] : "Guest";
    if (user) startChatListener(user.uid);
});

async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    try {
        await auth.signInWithEmailAndPassword(email, pass).catch(() => auth.createUserWithEmailAndPassword(email, pass));
    } catch (e) { alert(e.message); }
}

function handleLogout() { auth.signOut(); }

// Чат
async function sendMessage() {
    const input = document.getElementById('chat-msg');
    const text = input.value.trim();
    if (!text || !currentUser) return;

    await db.collection("users").doc(currentUser.uid).collection("messages").add({
        message: text, sender: "user", timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: `👤 ${currentUser.email}: ${text}` })
    });
    input.value = "";
}

function startChatListener(uid) {
    if (unsubscribe) unsubscribe();
    unsubscribe = db.collection("users").doc(uid).collection("messages").orderBy("timestamp", "asc").onSnapshot(snap => {
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

// Контент
async function loadPortfolioProjects() {
    const container = document.getElementById('portfolio-container');
    const snap = await db.collection("projects").get();
    container.innerHTML = snap.docs.map(doc => {
        const p = doc.data();
        return `<div class="portfolio-item"><h4>${p.title}</h4><p>${p.metric || ''}</p></div>`;
    }).join('');
}

async function fetchCats() {
    const res = await fetch('https://api.thecatapi.com/v1/images/search?limit=1');
    const data = await res.json();
    document.getElementById('cat-container').innerHTML = `<img src="${data[0].url}" style="width:100%; border-radius:15px;">`;
}

function switchMobileTab(tab, btn) {
    document.getElementById('main-content').className = `page-content active tab-${tab}`;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-btn'));
    btn.classList.add('active-btn');
}
