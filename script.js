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
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null;
let chatListener = null;

// Перевод
const dict = {
    ru: { navHome: "Таверна", navPortfolio: "Свитки", navSkills: "Навыки", navRoom: "Комната", welcomeTitle: "Приветствую!", welcomeSub: "Мастер Кода", portfolioTitle: "Квесты", catsTitle: "Коты", loginBtn: "Войти", catsBtn: "Приманить", sendBtn: "Send" },
    en: { navHome: "Tavern", navPortfolio: "Scrolls", navSkills: "Skills", navRoom: "Room", welcomeTitle: "Welcome!", welcomeSub: "Code Master", portfolioTitle: "Quests", catsTitle: "The Cats", loginBtn: "Enter", catsBtn: "Summon", sendBtn: "Send" }
};

let currentLang = 'ru';

window.toggleLang = () => {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    document.getElementById('lang-btn').innerText = currentLang === 'ru' ? '🇺🇸 EN' : '🇷🇺 RU';
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (dict[currentLang][key]) el.innerText = dict[currentLang][key];
    });
};

window.scrollToPanel = (id) => {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
};

// Коты API
window.fetchCats = async () => {
    const container = document.getElementById('cat-container');
    container.innerHTML = "Призываем...";
    try {
        const res = await fetch('https://api.thecatapi.com/v1/images/search?limit=6');
        const data = await res.json();
        container.innerHTML = data.map(cat => `<img src="${cat.url}" class="cat-img">`).join('');
    } catch(e) { container.innerHTML = "Котики спят..."; }
}

// Firebase Логика
window.handleLogin = async () => {
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

window.sendMessage = async () => {
    const input = document.getElementById('chat-msg');
    const text = input.value.trim();
    if(!text || !currentUser) return;

    await db.collection("users").doc(currentUser.uid).collection("messages").add({
        message: text,
        sender: "user",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    const botText = `👤 Сообщение от Таверны:\n\n💬 ${text}`;
    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: botText })
    });
    input.value = "";
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

// Запуск при загрузке
$(document).ready(() => {
    fetchCats();
    if($('.gallery-item').length) $('.gallery-item').tilt({ maxTilt: 10 });
    $('#chat-msg').on('keypress', (e) => {
        if(e.which == 13) sendMessage();
    });
});
