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

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentLang = 'ru';

const dict = {
    ru: {
        projectsLink: "МОИ ПРОЕКТЫ",
        heroTitle: "НОВЫЙ ЦИФРОВОЙ СТАНДАРТ",
        heroSub: "Премиальные интерфейсы и архитектуры.",
        welcomeSub: "Маг Автоматизации",
        chatTitle: "Мессенджер",
        loginBtn: "Войти",
        aboutTitle: "Майкл Фарадей",
        faradayDesc: "Майкл Фарадей — выдающийся английский физик.",
        faradayQuote: '"Ничто не слишком чудесно, чтобы быть истинным."',
        worksTitle: "Выбранные Работы",
        skillTech: "Арсенал",
        catsTitle: "Коты Таверны",
        catsBtn: "Призвать",
        projectsTitlePage: "Портфолио Разработки"
    },
    en: {
        projectsLink: "MY PROJECTS",
        heroTitle: "NEW DIGITAL STANDARD",
        heroSub: "Premium interfaces & architectures.",
        welcomeSub: "Automation Mage",
        chatTitle: "Messenger",
        loginBtn: "Login",
        aboutTitle: "Michael Faraday",
        faradayDesc: "English scientist who contributed to electromagnetism.",
        faradayQuote: '"Nothing is too wonderful to be true."',
        worksTitle: "Selected Works",
        skillTech: "Arsenal",
        catsTitle: "Tavern Cats",
        catsBtn: "Summon",
        projectsTitlePage: "Dev Portfolio"
    }
};

// Загрузка проектов из Firestore (структура со скрина)
async function loadProjects() {
    const container = document.getElementById('portfolio-container');
    const snap = await db.collection("projects").get();
    container.innerHTML = snap.docs.map(doc => {
        const p = doc.data();
        const tech = p.tech ? p.tech.map(t => `<span class="tech-tag">${t}</span>`).join('') : '';
        return `<div class="project-item-card">
            <div class="neon-text">${p.title || 'Project Name'}</div>
            <div style="font-size:0.8rem; margin: 4px 0; color: #ccc;">Metric: ${p.metric || '0%'}</div>
            <div>${tech}</div>
        </div>`;
    }).join('');
}

// Переключение языков (ФЛАГИ)
function toggleLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    document.getElementById('lang-icon').innerText = currentLang === 'ru' ? "🇷🇺" : "🇺🇸";
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (dict[currentLang][key]) el.innerText = dict[currentLang][key];
    });
}

// Управление страницами
function showPage(pageId) {
    document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
    document.getElementById(pageId === 'projects-page' ? 'projects-page' : 'main-content').classList.add('active');
}

// Запуск видео и инициализация
document.addEventListener('DOMContentLoaded', () => {
    const v = document.getElementById('bg-video');
    // Обход блокировки автоплея
    const startVideo = () => { v.play(); document.removeEventListener('click', startVideo); };
    document.addEventListener('click', startVideo);
    
    loadProjects();
    fetchCats();
});

// Firebase Чат и Телеграм
auth.onAuthStateChanged(user => {
    document.getElementById('login-form').style.display = user ? 'none' : 'block';
    document.getElementById('user-info').style.display = user ? 'flex' : 'none';
    document.getElementById('logout-btn').style.display = user ? 'block' : 'none';
    document.getElementById('user-name').innerText = user ? user.email.split('@')[0] : "Guest";
    if (user) syncChat(user.uid);
});

async function handleLogin() {
    const e = document.getElementById('auth-email').value;
    const p = document.getElementById('auth-pass').value;
    if (e && p) await auth.signInWithEmailAndPassword(e, p).catch(() => auth.createUserWithEmailAndPassword(e, p));
}

function handleLogout() { auth.signOut(); }

async function sendMessage() {
    const input = document.getElementById('chat-msg');
    const txt = input.value.trim();
    if (!txt || !auth.currentUser) return;

    // 1. В Firestore
    await db.collection("users").doc(auth.currentUser.uid).collection("messages").add({
        message: txt, sender: "user", timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 2. В Telegram
    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: `👤 ${auth.currentUser.email}:\n${txt}` })
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
            // Если отправитель bot — стиль received, если user — sent
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
        document.getElementById('cat-container').innerHTML = `<img src="${data[0].url}" style="width:100%; border-radius:10px;">`;
    } catch(e) {}
}

function toggleSound() {
    const v = document.getElementById('bg-video');
    v.muted = !v.muted;
    document.getElementById('unmute-btn').innerText = v.muted ? "🔊" : "🔇";
}
