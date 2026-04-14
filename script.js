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

const translations = {
    ru: {
        projectsLink: "Мои проекты",
        heroTitle: "НОВЫЙ СТАНДАРТ ЦИФРОВОГО ОПЫТА",
        heroSub: "Премиальные интерфейсы и архитектура.",
        welcomeSub: "Маг Автоматизации",
        chatTitle: "Messenger",
        loginBtn: "Authorize",
        aboutTitle: "Michael Faraday",
        faradayDesc: "Майкл Фарадей — английский физик и химик...",
        projectsTitle: "Selected Works",
        skillTech: "Arsenal",
        catsTitle: "Tavern Cats",
        catsBtn: "Summon"
    },
    en: {
        projectsLink: "My Projects",
        heroTitle: "NEW DIGITAL STANDARD",
        heroSub: "Premium interfaces and architecture.",
        welcomeSub: "Automation Mage",
        chatTitle: "Messenger",
        loginBtn: "Authorize",
        aboutTitle: "Michael Faraday",
        faradayDesc: "Michael Faraday was an English scientist...",
        projectsTitle: "Selected Works",
        skillTech: "Arsenal",
        catsTitle: "Tavern Cats",
        catsBtn: "Summon"
    }
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentLang = 'ru';

function toggleLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    // Теперь кнопка всегда показывает флаг того языка, на который можно ПЕРЕКЛЮЧИТЬСЯ
    document.getElementById('lang-icon').innerText = currentLang === 'ru' ? "🇺🇸" : "🇷🇺";
    
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (translations[currentLang][key]) el.innerText = translations[currentLang][key];
    });
}

function showPage(pageId) {
    document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(pageId);
    if(target) target.classList.add('active');
}

// ГАРАНТИРОВАННЫЙ ЗАПУСК
function initVideo() {
    const v = document.getElementById('bg-video');
    if (!v) return;
    v.play().catch(() => {
        const playOnce = () => { v.play(); window.removeEventListener('mousedown', playOnce); };
        window.addEventListener('mousedown', playOnce);
    });
}

auth.onAuthStateChanged(user => {
    const loginForm = document.getElementById('login-form');
    const userInfo = document.getElementById('user-info');
    const userNameDisplay = document.getElementById('user-name');
    if (user) {
        if (loginForm) loginForm.style.display = 'none';
        if (userInfo) userInfo.style.display = 'flex';
        if (userNameDisplay) userNameDisplay.innerText = user.email.split('@')[0];
        db.collection("users").doc(user.uid).set({ email: user.email }, { merge: true });
        syncChat(user.uid);
    } else {
        if (loginForm) loginForm.style.display = 'block';
        if (userInfo) userInfo.style.display = 'none';
    }
});

async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    if (email && pass) {
        try { await auth.signInWithEmailAndPassword(email, pass); } 
        catch { await auth.createUserWithEmailAndPassword(email, pass); }
    }
}

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
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: `👤 ${auth.currentUser.email}\n💬 ${text}` })
    });
    input.value = "";
}

function syncChat(uid) {
    db.collection("users").doc(uid).collection("messages").orderBy("timestamp", "asc").onSnapshot(snap => {
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

async function fetchCats() {
    try {
        const res = await fetch('https://api.thecatapi.com/v1/images/search');
        const data = await res.json();
        document.getElementById('cat-container').innerHTML = `<img src="${data[0].url}" style="width:100%; border-radius:12px; margin-top:10px;">`;
    } catch(e) {}
}

document.addEventListener('DOMContentLoaded', () => {
    initVideo();
    fetchCats();
});
