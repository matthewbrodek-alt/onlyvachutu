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
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null;
let chatListener = null;

// Перевод
const dict = {
    ru: { navHome: "Таверна", navPortfolio: "Свитки", navRoom: "Кабинет", welcomeTitle: "Утро в Таверне", welcomeSub: "Магия автоматизации", portfolioTitle: "Артефакты", todoTitle: "Вход", loginBtn: "Войти", catsTitle: "Коты", catsBtn: "Приманить" },
    en: { navHome: "Tavern", navPortfolio: "Scrolls", navRoom: "Cabinet", welcomeTitle: "Morning in Tavern", welcomeSub: "Automation Magic", portfolioTitle: "Artifacts", todoTitle: "Login", loginBtn: "Enter", catsTitle: "Cats", catsBtn: "Summon" }
};
let currentLang = 'ru';

function toggleLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (dict[currentLang][key]) el.innerText = dict[currentLang][key];
    });
}

function scrollToPanel(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

// Логика Чат/Вход
async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    try {
        const userCred = await auth.signInWithEmailAndPassword(email, pass)
            .catch(() => auth.createUserWithEmailAndPassword(email, pass));
        currentUser = userCred.user;
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('user-info').style.display = 'block';
        startChatListener(currentUser.uid);
    } catch (e) { alert(e.message); }
}

async function sendMessage() {
    const msgInput = document.getElementById('chat-msg');
    const text = msgInput.value.trim();
    if (!text || !currentUser) return;

    await db.collection("users").doc(currentUser.uid).collection("messages").add({
        message: text,
        sender: "user",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: `👤 ${currentUser.email}:\n${text}` })
    });
    msgInput.value = "";
}

function startChatListener(uid) {
    if (chatListener) chatListener();
    chatListener = db.collection("users").doc(uid).collection("messages").orderBy("timestamp", "asc").onSnapshot(snap => {
        const win = document.getElementById('chat-window');
        win.innerHTML = "";
        snap.forEach(doc => {
            const d = doc.data();
            win.innerHTML += `<div class="msg-box ${d.sender === 'user' ? 'sent' : 'received'}">${d.message}</div>`;
        });
        win.scrollTop = win.scrollHeight;
    });
}

async function fetchCats() {
    try {
        const res = await fetch('https://api.thecatapi.com/v1/images/search?limit=3');
        const data = await res.json();
        document.getElementById('cat-container').innerHTML = data.map(cat => `<img src="${cat.url}" class="cat-pic">`).join('');
    } catch(e) {}
}

// БЕЗОПАСНЫЙ ЗАПУСК
$(document).ready(function() {
    fetchCats();
    
    if (typeof $.fn.tilt !== 'undefined') {
        $('.artifact-card').tilt({ maxTilt: 15, scale: 1.05 });
    }

    $('#chat-msg').on('keypress', (e) => {
        if(e.which == 13 && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
});
