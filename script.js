const firebaseConfig = {
    apiKey: "AIzaSyA_7n34vc1JM5PER6kvU9mMSzKfpu8s5YE",
    authDomain: "my-portfolio-auth-ff1ce.firebaseapp.com",
    projectId: "my-portfolio-auth-ff1ce",
    storageBucket: "my-portfolio-auth-ff1ce.firebasestorage.app",
    messagingSenderId: "391088510675",
    appId: "1:391088510675:web:ff1c4d866c37f921886626"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null;

// СЛУШАТЕЛЬ СОСТОЯНИЯ (Вход/Выход)
auth.onAuthStateChanged(user => {
    const logoutBtn = document.getElementById('logout-btn');
    if (user) {
        currentUser = user;
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('user-info').style.display = 'block';
        logoutBtn.style.display = 'inline-block';
        startChat(user.uid);
    } else {
        currentUser = null;
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('user-info').style.display = 'none';
        logoutBtn.style.display = 'none';
    }
});

// ОТПРАВКА СООБЩЕНИЯ (с фиксом для бота)
async function sendMessage() {
    const input = document.getElementById('chat-msg');
    const text = input.value.trim();
    if(!text || !currentUser) return;

    try {
        await db.collection("users").doc(currentUser.uid).collection("messages").add({
            message: text,
            sender: "user",
            read: false, // Бот должен искать сообщения с read: false
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        input.value = "";
    } catch(e) { console.error("Ошибка отправки:", e); }
}

// ВЫХОД ИЗ ПРОФИЛЯ
function handleLogout() {
    auth.signOut().then(() => {
        window.location.reload(); // Перезагружаем для очистки чата
    });
}

// ОСТАЛЬНАЯ ЛОГИКА
$(document).ready(() => {
    fetchCats();
    $('#chat-msg').on('keypress', (e) => { if(e.which == 13) sendMessage(); });
});

async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    if(!email || !pass) return alert("Введите данные");
    try {
        await auth.signInWithEmailAndPassword(email, pass)
            .catch(() => auth.createUserWithEmailAndPassword(email, pass));
    } catch(e) { alert(e.message); }
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

async function fetchCats() {
    const container = document.getElementById('cat-container');
    try {
        const res = await fetch('https://api.thecatapi.com/v1/images/search?limit=4');
        const data = await res.json();
        container.innerHTML = data.map(cat => `<img src="${cat.url}">`).join('');
    } catch(e) { container.innerHTML = "Котики спят..."; }
}

function scrollToPanel(id) {
    const el = document.getElementById(id);
    if(el) el.scrollIntoView({ behavior: 'smooth' });
}

let currentLang = 'ru';
const dict = {
    ru: { navHome: "Таверна", navPortfolio: "Свитки", navRoom: "Кабинет", navLogout: "Выйти", welcomeTitle: "Усталый путник", welcomeSub: "Мастерство кода и магия автоматизации", portfolioTitle: "Артефакты", todoTitle: "Вход", loginBtn: "Открыть дверь", catsTitle: "Питомцы", catsBtn: "Приманить новых" },
    en: { navHome: "Tavern", navPortfolio: "Scrolls", navRoom: "Study", navLogout: "Logout", welcomeTitle: "Weary Traveler", welcomeSub: "Code Mastery & Automation Magic", portfolioTitle: "Artifacts", todoTitle: "Enter", loginBtn: "Unlock Door", catsTitle: "The Pets", catsBtn: "Summon More" }
};

function toggleLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    document.getElementById('lang-btn').innerText = currentLang.toUpperCase();
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if(dict[currentLang][key]) el.innerText = dict[currentLang][key];
    });
}
