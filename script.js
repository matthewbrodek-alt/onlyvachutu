const TELEGRAM_BOT_TOKEN = "8664813567:AAEkqGdXuyrS43Pjfc1gB-KdVuOOReWrkGw";
const TELEGRAM_CHAT_ID = "7451263058";

const firebaseConfig = {
    apiKey: "AIzaSyA_7n34vc1JM5PER6kvU9mMSzKfpu8s5YE",
    authDomain: "my-portfolio-auth-ff1ce.firebaseapp.com",
    projectId: "my-portfolio-auth-ff1ce",
    storageBucket: "my-portfolio-auth-ff1ce.firebasestorage.app",
    messagingSenderId: "391088510675",
    appId: "1:391088510675:web:ff1c4d866c37f921886626"
};

// Инициализация Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null;
let chatListener = null;

// --- СМЕНА ЯЗЫКА (Логика сохранена) ---
const dict = {
    ru: {
        navHome: "Таверна", navPortfolio: "Свитки", navRoom: "Кабинет",
        welcomeTitle: "Утро в Таверне", welcomeSub: "Арканические решения для старых задач",
        portfolioTitle: "Артефакты кода", todoTitle: "Кабинет", loginBtn: "Открыть дверь",
        catsTitle: "Коты Таверны (Cat API)", catsBtn: "Приманить еще котиков"
    },
    en: {
        navHome: "Tavern", navPortfolio: "Scrolls", navRoom: "Cabinet",
        welcomeTitle: "Morning in Tavern", welcomeSub: "Arcane solutions for old tasks",
        portfolioTitle: "Code Artifacts", todoTitle: "Cabinet", loginBtn: "Open Door",
        catsTitle: "Tavern Cats (Cat API)", catsBtn: "Summon More Cats"
    }
};

let currentLang = 'ru';

function toggleLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    // На картинке просто иконка глобуса, поэтому здесь логика смены текста кнопки не нужна
    
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (dict[currentLang][key]) el.innerText = dict[currentLang][key];
    });
}

// --- НАВИГАЦИЯ ---
function scrollToPanel(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

// --- ЧАТ И ОБРАТНАЯ СВЯЗЬ (Логика сохранена) ---
async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    if(!email || !pass) return alert("Введите свитки (email/pass)");

    try {
        const userCred = await auth.signInWithEmailAndPassword(email, pass)
            .catch(() => auth.createUserWithEmailAndPassword(email, pass));
        
        currentUser = userCred.user;
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('user-info').style.display = 'block';
        startChatListener(currentUser.uid);
    } catch (e) { alert("Магия входа не сработала: " + e.message); }
}

async function sendMessage() {
    if (!currentUser) return;
    const msgInput = document.getElementById('chat-msg');
    const text = msgInput.value.trim();
    if (!text) return;

    // 1. Пишем в Firebase (для сайта)
    await db.collection("users").doc(currentUser.uid).collection("messages").add({
        message: text,
        sender: "user",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 2. Шлем в Telegram (для Python моста)
    const botText = `👤 User: ${currentUser.email}\n💬 ${text}`;
    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: botText })
    });

    msgInput.value = "";
}

function startChatListener(uid) {
    if (chatListener) chatListener();
    chatListener = db.collection("users").doc(uid).collection("messages")
        .orderBy("timestamp", "asc").onSnapshot(snap => {
            const win = document.getElementById('chat-window');
            if(!win) return;
            win.innerHTML = "";
            snap.forEach(doc => {
                const d = doc.data();
                const div = document.createElement('div');
                div.className = d.sender === 'user' ? 'msg-box sent' : 'msg-box received';
                // d.sender в FireStore может быть admin или bot (от Python-скрипта)
                div.innerHTML = d.message; // Текст сообщения без обертки, CSS обработает
                win.appendChild(div);
            });
            win.scrollTop = win.scrollHeight;
        });
}

// --- КОТИКИ (Одинаковый размер в сетке) ---
async function fetchCats() {
    try {
        const res = await fetch('https://api.thecatapi.com/v1/images/search?limit=3');
        const data = await res.json();
        const container = document.getElementById('cat-container');
        if(container) {
            container.innerHTML = data.map(cat => `<img src="${cat.url}" class="cat-pic">`).join('');
        }
    } catch(e) { console.error("Коты сбежали", e); }
}

// ПРИ ЗАГРУЗКЕ
window.onload = function() {
    fetchCats();
    
    // Инициализация 3D эффекта для карточек (добавил, чтобы ожить)
    $('.artifact-card').tilt({
        maxTilt: 15, persperspective: 1000, scale: 1.05, speed: 400
    });
};
