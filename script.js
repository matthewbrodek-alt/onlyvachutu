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

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null;
let chatListener = null;

// --- СМЕНА ЯЗЫКА ---
const dict = {
    ru: {
        navLogo: "УСТАЛЫЙ ПУТНИК", navHome: "Таверна", navPortfolio: "Свитки", navSkills: "Навыки", navRoom: "Комната",
        welcomeTitle: "Добро пожаловать!", welcomeSub: "Разработчик и Маг Автоматизации", exploreBtn: "Смотреть квесты",
        portfolioTitle: "Выполненные квесты", proj1: "Магия Сайтов", proj2: "Боты и Заклинания",
        skillTech: "Арсенал",
        todoTitle: "Тайная комната", loginBtn: "Открыть дверь", sendBtn: "Отправить",
        catsTitle: "Коты Таверны", catsBtn: "Приманить еще",
        chatMsg: "Послать ворона..."
    },
    en: {
        navLogo: "WEARY TRAVELER", navHome: "Tavern", navPortfolio: "Scrolls", navSkills: "Skills", navRoom: "Room",
        welcomeTitle: "Welcome, traveler!", welcomeSub: "Developer & Automation Mage", exploreBtn: "View Quests",
        portfolioTitle: "Completed Quests", proj1: "Web Magic", proj2: "Bots & Spells",
        skillTech: "Arsenal",
        todoTitle: "Secret Room", loginBtn: "Open Door", sendBtn: "Send",
        catsTitle: "Tavern Cats", catsBtn: "Summon More",
        chatMsg: "Send a raven..."
    }
};

let currentLang = 'ru';

function toggleLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    document.getElementById('lang-btn').innerText = currentLang === 'ru' ? '🇺🇸 EN' : '🇷🇺 RU';
    
    // Переводим обычный текст
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (dict[currentLang][key]) el.innerText = dict[currentLang][key];
    });

    // Переводим placeholder в поле ввода
    document.querySelectorAll('[data-lang-placeholder]').forEach(el => {
        const key = el.getAttribute('data-lang-placeholder');
        if (dict[currentLang][key]) el.placeholder = dict[currentLang][key];
    });
}

// --- КОТИКИ API ---
async function fetchCats() {
    try {
        const res = await fetch('https://api.thecatapi.com/v1/images/search?limit=3');
        const data = await res.json();
        const container = document.getElementById('cat-container');
        container.innerHTML = data.map(cat => `<img src="${cat.url}" class="cat-img" alt="Cat">`).join('');
    } catch (e) {
        console.log("Коты разбежались: ", e);
    }
}
fetchCats(); // Грузим котов при старте

// --- ЛОГИКА АВТОРИЗАЦИИ И ЧАТА (Оставлена без изменений) ---
async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    if(!email || !pass) return alert("Введите данные");

    try {
        const userCred = await auth.signInWithEmailAndPassword(email, pass)
            .catch(() => auth.createUserWithEmailAndPassword(email, pass));
        currentUser = userCred.user;
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('user-info').style.display = 'block';
        document.getElementById('user-display-email').innerText = currentUser.email;
        startChatListener(currentUser.uid);
    } catch (e) { alert(e.message); }
}

async function sendMessage() {
    if (!currentUser) return;
    const msgInput = document.getElementById('chat-msg');
    const text = msgInput.value.trim();
    if (!text) return;

    await db.collection("users").doc(currentUser.uid).collection("messages").add({
        message: text,
        sender: "user",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    const botText = `👤 Юзер: ${currentUser.email}\nID ${currentUser.uid}\n\n💬 ${text}`;
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
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
            win.innerHTML = "";
            snap.forEach(doc => {
                const d = doc.data();
                const div = document.createElement('div');
                div.className = d.sender === 'user' ? 'msg-box sent' : 'msg-box received';
                div.innerHTML = `<div class="msg-content">${d.message}</div>`;
                win.appendChild(div);
            });
            win.scrollTop = win.scrollHeight;
        });
}

function scrollToPanel(id) {
    const el = document.getElementById(id);
    if(el) el.scrollIntoView({ behavior: 'smooth' });
}
