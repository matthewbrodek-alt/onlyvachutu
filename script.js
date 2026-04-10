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

// СМЕНА ЯЗЫКА
const dict = {
    ru: { navHome: "Таверна", navPortfolio: "Свитки", navSkills: "Навыки", navRoom: "Комната", welcomeTitle: "Приветствую!", welcomeSub: "Мастер Кода", portfolioTitle: "Квесты", catsTitle: "Коты Таверны", loginBtn: "Войти", catsBtn: "Приманить", sendBtn: "Оправить", chatPlaceholder: "Пиши сюда..." },
    en: { navHome: "Tavern", navPortfolio: "Scrolls", navSkills: "Skills", navRoom: "Room", welcomeTitle: "Welcome!", welcomeSub: "Code Master", portfolioTitle: "Quests", catsTitle: "Tavern Cats", loginBtn: "Enter", catsBtn: "Summon", sendBtn: "Send", chatPlaceholder: "Type here..." }
};

function toggleLang() {
    const lang = document.getElementById('lang-btn').innerText.includes('EN') ? 'en' : 'ru';
    document.getElementById('lang-btn').innerText = lang === 'en' ? '🇷🇺 RU' : '🇺🇸 EN';
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        el.innerText = dict[lang][key];
    });
}

// ПЛАВНЫЙ СКРОЛЛ
function scrollToPanel(id) {
    const el = document.getElementById(id);
    if(el) el.scrollIntoView({ behavior: 'smooth' });
}

// КОТЫ В КАРУСЕЛИ
async function fetchCats() {
    try {
        const res = await fetch('https://api.thecatapi.com/v1/images/search?limit=6');
        const data = await res.json();
        const container = document.getElementById('cat-container');
        // Добавляем новых котов к существующим или заменяем
        container.innerHTML = data.map(cat => `<img src="${cat.url}" class="cat-img">`).join('');
    } catch(e) { console.error("Коты разбежались"); }
}

// ЛОГИКА ВХОДА И ЧАТА (Оставлена твоя рабочая)
async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    try {
        const cred = await auth.signInWithEmailAndPassword(email, pass).catch(() => auth.createUserWithEmailAndPassword(email, pass));
        currentUser = cred.user;
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('user-info').style.display = 'block';
        startChatListener(currentUser.uid);
    } catch(e) { alert(e.message); }
}

function startChatListener(uid) {
    db.collection("users").doc(uid).collection("messages").orderBy("timestamp", "asc").onSnapshot(snap => {
        const win = document.getElementById('chat-window');
        win.innerHTML = "";
        snap.forEach(doc => {
            const d = doc.data();
            win.innerHTML += `<div class="msg-box ${d.sender}"><div class="msg-content">${d.message}</div></div>`;
        });
        win.scrollTop = win.scrollHeight;
    });
}

window.onload = fetchCats;
