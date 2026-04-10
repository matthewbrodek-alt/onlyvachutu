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

// Инициализация
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null;
let chatListener = null;

const dict = {
    ru: {
        navHome: "Таверна", navPortfolio: "Свитки", navSkills: "Навыки", navRoom: "Комната",
        welcomeTitle: "Добро пожаловать!", welcomeSub: "Маг Автоматизации",
        portfolioTitle: "Выполненные квесты", catsTitle: "Коты Таверны",
        loginBtn: "Открыть дверь", sendBtn: "Отправить", chatPlaceholder: "Послать ворона...",
        catsBtn: "Приманить еще"
    },
    en: {
        navHome: "Tavern", navPortfolio: "Scrolls", navSkills: "Skills", navRoom: "Room",
        welcomeTitle: "Welcome, traveler!", welcomeSub: "Automation Mage",
        portfolioTitle: "Completed Quests", catsTitle: "Tavern Cats",
        loginBtn: "Open Door", sendBtn: "Send", chatPlaceholder: "Send a raven...",
        catsBtn: "Summon More"
    }
};

let currentLang = 'ru';

function toggleLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    document.getElementById('lang-btn').innerText = currentLang === 'ru' ? '🇺🇸 EN' : '🇷🇺 RU';
    
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (dict[currentLang][key]) el.innerText = dict[currentLang][key];
    });
    
    const chatInput = document.getElementById('chat-msg');
    if(chatInput) chatInput.placeholder = dict[currentLang].chatPlaceholder;
}

function scrollToPanel(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    if(!email || !pass) return alert("Назовите себя, путник!");

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

    await db.collection("users").doc(currentUser.uid).collection("messages").add({
        message: text,
        sender: "user",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    const botText = `👤 Юзер: ${currentUser.email}\nID ${currentUser.uid}\n\n💬 ${text}`;
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
                div.innerHTML = `<div class="msg-content">${d.message}</div>`;
                win.appendChild(div);
            });
            win.scrollTop = win.scrollHeight;
        });
}

async function fetchCats() {
    try {
        const res = await fetch('https://api.thecatapi.com/v1/images/search?limit=3');
        const data = await res.json();
        const container = document.getElementById('cat-container');
        if(container) {
            container.innerHTML = data.map(cat => `<img src="${cat.url}" class="cat-img">`).join('');
        }
    } catch(e) { console.error("Коты сбежали", e); }
}

// ПРИ ЗАГРУЗКЕ
window.onload = () => {
    fetchCats();
    
    // Добавляем отправку по Enter
    const chatInput = document.getElementById('chat-msg');
    if(chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // Чтобы не было переноса строки
                sendMessage();
            }
        });
    }
};
