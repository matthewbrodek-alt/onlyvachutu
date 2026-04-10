const firebaseConfig = {
    apiKey: "AIzaSyA_7n34vc1JM5PER6kvU9mMSzKfpu8s5YE",
    authDomain: "my-portfolio-auth-ff1ce.firebaseapp.com",
    projectId: "my-portfolio-auth-ff1ce",
    storageBucket: "my-portfolio-auth-ff1ce.firebasestorage.app",
    messagingSenderId: "391088510675",
    appId: "1:391088510675:web:ff1c4d866c37f921886626"
};

// Проверка инициализации
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null;

// ПРОВЕРКА 1: Автоматический вход при загрузке
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('user-info').style.display = 'block';
        startChat(user.uid);
    }
});

// ПРОВЕРКА 2: Безопасный Tilt
$(document).ready(() => {
    fetchCats();
    // Обработка Enter в чате
    $('#chat-msg').on('keypress', (e) => { if(e.which == 13) sendMessage(); });
});

async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    if(!email || !pass) return alert("Нужны свитки (email/pass)");

    try {
        const cred = await auth.signInWithEmailAndPassword(email, pass)
            .catch(() => auth.createUserWithEmailAndPassword(email, pass));
        // Чат подцепится через onAuthStateChanged
    } catch(e) { alert("Магия не сработала: " + e.message); }
}

function startChat(uid) {
    db.collection("users").doc(uid).collection("messages").orderBy("timestamp", "asc").onSnapshot(snap => {
        const win = document.getElementById('chat-window');
        win.innerHTML = "";
        snap.forEach(doc => {
            const d = doc.data();
            const side = d.sender === 'user' ? 'sent' : 'received';
            win.innerHTML += `<div class="msg-box ${side}">${d.message}</div>`;
        });
        win.scrollTop = win.scrollHeight;
    });
}

async function sendMessage() {
    const input = document.getElementById('chat-msg');
    const text = input.value.trim();
    if(!text || !currentUser) return;

    await db.collection("users").doc(currentUser.uid).collection("messages").add({
        message: text,
        sender: "user",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    input.value = "";
}

async function fetchCats() {
    const container = document.getElementById('cat-container');
    try {
        const res = await fetch('https://api.thecatapi.com/v1/images/search?limit=4');
        const data = await res.json();
        container.innerHTML = data.map(cat => `<img src="${cat.url}" alt="Cat">`).join('');
    } catch(e) { container.innerHTML = "<p>Коты ушли в лес</p>"; }
}

function scrollToPanel(id) {
    const el = document.getElementById(id);
    if(el) el.scrollIntoView({ behavior: 'smooth' });
}

// ПРОВЕРКА 3: Полный словарь для локализации
let currentLang = 'ru';
const dict = {
    ru: { navHome: "Таверна", navPortfolio: "Свитки", navRoom: "Кабинет", navCats: "Коты", welcomeTitle: "Усталый путник", welcomeSub: "Мастерство кода и магия автоматизации", portfolioTitle: "Артефакты", todoTitle: "Вход", loginBtn: "Открыть дверь", catsTitle: "Питомцы", catsBtn: "Приманить новых" },
    en: { navHome: "Tavern", navPortfolio: "Scrolls", navRoom: "Study", navCats: "Cats", welcomeTitle: "Weary Traveler", welcomeSub: "Code Mastery & Automation Magic", portfolioTitle: "Artifacts", todoTitle: "Enter", loginBtn: "Unlock Door", catsTitle: "The Pets", catsBtn: "Summon More" }
};

function toggleLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    document.getElementById('lang-btn').innerText = currentLang.toUpperCase();
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if(dict[currentLang][key]) el.innerText = dict[currentLang][key];
    });
}
