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

// --- СЛОВАРЬ (Смена языка) ---
const dict = {
    ru: {
        navHome: "Таверна", navPortfolio: "Свитки", navSkills: "Навыки", navRoom: "Комната",
        welcomeTitle: "Добро пожаловать!", welcomeSub: "Маг Автоматизации",
        portfolioTitle: "Выполненные квесты", catsTitle: "Коты Таверны",
        loginBtn: "Открыть дверь", sendBtn: "Отправить"
    },
    en: {
        navHome: "Tavern", navPortfolio: "Scrolls", navSkills: "Skills", navRoom: "Room",
        welcomeTitle: "Welcome, traveler!", welcomeSub: "Automation Mage",
        portfolioTitle: "Completed Quests", catsTitle: "Tavern Cats",
        loginBtn: "Open Door", sendBtn: "Send"
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
}

// --- ПЛАВНЫЙ СКРОЛЛ ---
function scrollToPanel(id) {
    const el = document.getElementById(id);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
    } else {
        console.error("Секция не найдена: " + id);
    }
}

// --- КОТИКИ ---
async function fetchCats() {
    const res = await fetch('https://api.thecatapi.com/v1/images/search?limit=3');
    const data = await res.json();
    const container = document.getElementById('cat-container');
    if(container) {
        container.innerHTML = data.map(cat => `<img src="${cat.url}" class="cat-img">`).join('');
    }
}

// --- ЛОГИКА ЧАТА (Для работы с Python) ---
async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    try {
        const userCred = await auth.signInWithEmailAndPassword(email, pass)
            .catch(() => auth.createUserWithEmailAndPassword(email, pass));
        
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('user-info').style.display = 'block';
        startChatListener(userCred.user.uid);
    } catch (e) { alert("Ошибка входа: " + e.message); }
}

function startChatListener(uid) {
    db.collection("users").doc(uid).collection("messages")
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

// Инициализация
window.onload = () => { fetchCats(); };
