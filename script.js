const firebaseConfig = {
    apiKey: "AIzaSyA_7n34vc1JM5PER6kvU9mMSzKfpu8s5YE",
    authDomain: "my-portfolio-auth-ff1ce.firebaseapp.com",
    projectId: "my-portfolio-auth-ff1ce",
    storageBucket: "my-portfolio-auth-ff1ce.firebasestorage.app",
    messagingSenderId: "391088510675",
    appId: "1:391088510675:web:ff1c4d866c37f921886626"
};

// Конфигурация Telegram
const TELEGRAM_BOT_TOKEN = "8664813567:AAEkqGdXuyrS43Pjfc1gB-KdVuOOReWrkGw";
const TELEGRAM_CHAT_ID = "7451263058";

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null;
let unsubscribe = null;
let currentLang = 'ru';

const dict = {
    ru: {
        projectsLink: "Мои проекты",
        heroTitle: "НОВЫЙ СТАНДАРТ ЦИФРОВОГО ОПЫТА",
        heroSub: "Премиальные интерфейсы и масштабируемая архитектура.",
        welcomeSub: "Маг Автоматизации",
        chatTitle: "Мессенджер",
        loginBtn: "Войти",
        aboutTitle: "Майкл Фарадей",
        faradayDesc: "Майкл Фарадей — выдающийся английский физик и химик, основоположник учения об электромагнитном поле.",
        worksTitle: "Выбранные работы",
        skillTech: "Арсенал",
        catsTitle: "Коты Таверны",
        catsBtn: "Призвать",
        projectsTitlePage: "Портфолио разработок"
    },
    en: {
        projectsLink: "My Projects",
        heroTitle: "NEW DIGITAL STANDARD",
        heroSub: "Premium interfaces & scalable architectures.",
        welcomeSub: "Automation Mage",
        chatTitle: "Messenger",
        loginBtn: "Login",
        aboutTitle: "Michael Faraday",
        faradayDesc: "Michael Faraday was an English scientist who contributed to the study of electromagnetism.",
        worksTitle: "Selected Works",
        skillTech: "Arsenal",
        catsTitle: "Tavern Cats",
        catsBtn: "Summon",
        projectsTitlePage: "Development Portfolio"
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Слушатель Enter для чата
    document.getElementById('chat-msg')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Строгий фикс автоплея видео для всех браузеров
    const v = document.getElementById('bg-video');
    if (v) {
        v.play().catch(e => console.log("Autoplay prevented, waiting for interaction..."));
        document.body.addEventListener('click', () => { if(v.paused) v.play(); }, { once: true });
    }

    loadProjects();
    fetchCats();
});

function toggleLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    document.getElementById('lang-icon').innerText = currentLang === 'ru' ? "🌐 🇷🇺" : "🌐 🇺🇸";
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (dict[currentLang][key]) el.innerText = dict[currentLang][key];
    });
}

function showPage(pageId) {
    document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
    if (pageId === 'projects-page') {
        document.getElementById('projects-page').classList.add('active');
        document.getElementById('mob-nav').style.display = 'none';
    } else {
        document.getElementById('main-content').classList.add('active');
        document.getElementById('mob-nav').style.display = 'flex';
    }
    document.getElementById('main-scroll').scrollTop = 0;
}

// --- Firebase Auth & Chat ---
auth.onAuthStateChanged(user => {
    currentUser = user;
    document.getElementById('login-form').style.display = user ? 'none' : 'block';
    document.getElementById('user-info').style.display = user ? 'flex' : 'none';
    document.getElementById('logout-btn').style.display = user ? 'block' : 'none';
    document.getElementById('user-name').innerText = user ? user.email.split('@')[0] : "Guest";
    if (user) syncChat(user.uid);
});

async function handleLogin() {
    const e = document.getElementById('auth-email').value;
    const p = document.getElementById('auth-pass').value;
    if (!e || !p) return;
    await auth.signInWithEmailAndPassword(e, p).catch(() => auth.createUserWithEmailAndPassword(e, p));
}

function handleLogout() { auth.signOut(); }

async function sendMessage() {
    const input = document.getElementById('chat-msg');
    const txt = input.value.trim();
    if (!txt || !currentUser) return;

    await db.collection("users").doc(currentUser.uid).collection("messages").add({
        message: txt,
        sender: "user",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: `👤 ${currentUser.email}: ${txt}` })
    });
    input.value = "";
}

function syncChat(uid) {
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

// --- Внешние данные ---
async function loadProjects() {
    const snap = await db.collection("projects").get();
    document.getElementById('portfolio-container').innerHTML = snap.docs.map(doc => {
        const p = doc.data();
        return `<div class="portfolio-item" style="padding:10px 0; border-bottom:1px solid var(--border)">
            <strong style="color: var(--accent); text-shadow: 0 0 5px rgba(0,255,136,0.3);">${p.title || 'Project'}</strong><br>
            <small>${p.tech ? p.tech.join(' • ') : ''}</small>
        </div>`;
    }).join('');
}

async function fetchCats() {
    try {
        const res = await fetch('https://api.thecatapi.com/v1/images/search?limit=1');
        const data = await res.json();
        document.getElementById('cat-container').innerHTML = `<img src="${data[0].url}" style="width:100%; border-radius:15px; box-shadow: 0 0 15px rgba(0,0,0,0.5);">`;
    } catch(e) {}
}

function toggleSound() {
    const v = document.getElementById('bg-video');
    v.muted = !v.muted;
    document.getElementById('unmute-btn').innerText = v.muted ? "🔊" : "🔇";
}
