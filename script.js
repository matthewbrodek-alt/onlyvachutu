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
        statusOnline: "В СЕТИ",
        welcomeSub: "Маг Автоматизации",
        chatTitle: "Мессенджер",
        chatPlaceholder: "Напишите сообщение...",
        loginBtn: "Авторизоваться",
        projectsTitle: "ПРЯМАЯ СВЯЗЬ",
        projectsDesc: "Вы можете написать мне прямо здесь. Мессенджер синхронизирован с моими личными каналами связи для мгновенного ответа.",
        aboutTitle: "Майкл Фарадей",
        faradayDesc: "Выдающийся английский физик и химик, основоположник учения об электромагнитном поле.",
        faradayQuote: '"Ничто не слишком прекрасно, чтобы быть истинным..."',
        skillTech: "Арсенал",
        catsTitle: "Таверна Котиков",
        catsBtn: "Призвать",
        teamProject: "Командный проект",
        careerPortal: "Портал карьеры",
        openSite: "Открыть сайт ➔",
        backBtn: "← Назад"
    },
    en: {
        projectsLink: "My Projects",
        heroTitle: "NEW DIGITAL STANDARD",
        heroSub: "Premium interfaces and architecture.",
        statusOnline: "ONLINE",
        welcomeSub: "Automation Mage",
        chatTitle: "Messenger",
        chatPlaceholder: "Type a message...",
        loginBtn: "Authorize",
        projectsTitle: "DIRECT CONTACT",
        projectsDesc: "Feel free to message me right here. This messenger is synced with my private channels for an instant response.",
        aboutTitle: "Michael Faraday",
        faradayDesc: "Famous physicist and chemist who contributed to the study of electromagnetism.",
        faradayQuote: '"Nothing is too wonderful to be true..."',
        skillTech: "Arsenal",
        catsTitle: "Tavern Cats",
        catsBtn: "Summon",
        teamProject: "Team Project",
        careerPortal: "Career Portal",
        openSite: "Open Site ➔",
        backBtn: "← Back"
    }
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
let currentLang = 'ru';

// Переключение языка
function toggleLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    document.getElementById('lang-icon').innerText = currentLang === 'ru' ? "🇺🇸" : "🇷🇺";
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        const text = translations[currentLang][key];
        if (text) {
            if (el.tagName === 'INPUT') el.placeholder = text;
            else el.innerText = text;
        }
    });
}

// Навигация
function showPage(pageId) {
    document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

// Эмодзи
function addEmoji(emoji) {
    const input = document.getElementById('chat-msg');
    input.value += emoji;
    input.focus();
}

// Отправка сообщения
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

// Слушатель Enter
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.activeElement.id === 'chat-msg') {
        sendMessage();
    }
});

// Firebase Auth & Chat Sync
auth.onAuthStateChanged(user => {
    const loginForm = document.getElementById('login-form');
    const userInfo = document.getElementById('user-info');
    if (user) {
        loginForm.style.display = 'none';
        userInfo.style.display = 'flex';
        document.getElementById('user-name').innerText = user.email.split('@')[0];
        syncChat(user.uid);
    } else {
        loginForm.style.display = 'block';
        userInfo.style.display = 'none';
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

async function fetchCats() {
    const res = await fetch('https://api.thecatapi.com/v1/images/search');
    const data = await res.json();
    document.getElementById('cat-container').innerHTML = `<img src="${data[0].url}" style="width:100%; border-radius:15px;">`;
}

window.onload = () => { fetchCats(); };
