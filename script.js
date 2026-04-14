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
function setLang(lang) {
    currentLang = lang;
    document.querySelectorAll('.lang-option').forEach(el => el.classList.remove('active'));
    document.getElementById(`lang-${lang}`).classList.add('active');
    
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

async function fetchCars() {
    const randomId = Math.floor(Math.random() * 1000);
    const carUrl = `https://loremflickr.com/600/400/car,luxury/all?lock=${randomId}`;
    document.getElementById('car-container').innerHTML = `<img src="${carUrl}" style="width:100%; border-radius:15px; border: 1px solid var(--accent);">`;
}

window.onload = () => { fetchCars(); initCarousel(); };

// === КАРУСЕЛЬ ===
function initCarousel() {
    // Список картинок — замени на свои файлы в папке проекта
    const IMAGES = [
        { src: 'gallery/photo1.jpg', label: 'ФОТО 1' },
        { src: 'gallery/photo2.jpg', label: 'ФОТО 2' },
        { src: 'gallery/photo3.jpg', label: 'ФОТО 3' },
        { src: 'gallery/photo4.jpg', label: 'ФОТО 4' },
        { src: 'gallery/photo5.jpg', label: 'ФОТО 5' },
        { src: 'gallery/photo6.jpg', label: 'ФОТО 6' },
        { src: 'gallery/photo7.jpg', label: 'ФОТО 7' },
        { src: 'gallery/photo8.jpg', label: 'ФОТО 8' },
    ];

    const scene = document.getElementById('carousel-scene');
    if (!scene) return;

    const N = IMAGES.length;
    const RX = 460, RY = 460, CX = 500, CY = 500;
    const els = [];

    IMAGES.forEach((item) => {
        const div = document.createElement('div');
        div.className = 'c-card';
        const img = new Image();
        img.src = item.src;
        img.onload = () => div.innerHTML = `<img src="${item.src}" alt="${item.label}">`;
        img.onerror = () => {
            div.innerHTML = `<div class="c-card-placeholder"><span style="font-size:26px">🖼</span><span>${item.label}</span></div>`;
        };
        scene.appendChild(div);
        els.push(div);
    });

    let angle = 0, paused = false, last = null;

    function render() {
        els.forEach((el, i) => {
            const theta = angle + (i / N) * Math.PI * 2;
            const x = CX + RX * Math.cos(theta) - 75;
            const y = CY + RY * 0.36 * Math.sin(theta) - 95;
            const s = 0.5 + 0.5 * ((Math.sin(theta) + 1) / 2);
            el.style.left = x + 'px';
            el.style.top = y + 'px';
            el.style.transform = `scale(${s.toFixed(3)}) rotate(${(Math.cos(theta) * -10).toFixed(1)}deg)`;
            el.style.zIndex = Math.round(s * 100);
            el.style.opacity = (0.4 + 0.6 * ((Math.sin(theta) + 1) / 2)).toFixed(3);
        });
    }

    function loop(ts) {
        if (!last) last = ts;
        if (!paused) angle -= (ts - last) / 1000 * 0.04;
        last = ts;
        render();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    document.getElementById('car-pause').addEventListener('click', () => {
        paused = !paused;
        document.getElementById('car-pause').innerHTML = paused ? '&#9654;' : '&#9646;&#9646;';
    });
    document.getElementById('car-prev').addEventListener('click', () => { angle += (2 * Math.PI / N); });
    document.getElementById('car-next').addEventListener('click', () => { angle -= (2 * Math.PI / N); });
}
