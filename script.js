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
let chatListener = null;

// --- ИСПРАВЛЕННАЯ СМЕНА ЯЗЫКА ---
const dict = {
    ru: {
        navHome: "Таверна", navPortfolio: "Свитки", navRoom: "Кабинет", navCats: "Коты",
        welcomeTitle: "Добро пожаловать", welcomeSub: "Разработчик и Техно-Маг",
        portfolioTitle: "Артефакты", todoTitle: "Тайная комната", loginBtn: "Открыть дверь",
        catsTitle: "Питомцы", catsBtn: "Приманить новых", chatPlaceholder: "Послать ворона..."
    },
    en: {
        navHome: "Tavern", navPortfolio: "Scrolls", navRoom: "Secret Room", navCats: "Cats",
        welcomeTitle: "Welcome, traveler", welcomeSub: "Code & Automation Mage",
        portfolioTitle: "Artifacts", todoTitle: "Cabinet", loginBtn: "Open Door",
        catsTitle: "Pets", catsBtn: "Summon More", chatPlaceholder: "Send a raven..."
    }
};

let currentLang = 'ru';

function toggleLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    const btn = document.getElementById('lang-btn');
    btn.innerText = currentLang === 'ru' ? 'EN' : 'RU';
    
    // Переводим текст с атрибутом data-lang
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (dict[currentLang][key]) el.innerText = dict[currentLang][key];
    });

    // Переводим placeholder в чате
    const msgInput = document.getElementById('chat-msg');
    if(msgInput) msgInput.placeholder = dict[currentLang].chatPlaceholder;
}

// --- ПЛАВНЫЙ СКРОЛЛ К ПАНЕЛИ ---
function scrollToPanel(id) {
    const el = document.getElementById(id);
    if(el) {
        el.scrollIntoView({ behavior: 'smooth' });
    }
}

// --- КОТИКИ API ---
async function fetchCats() {
    try {
        // Получаем 4 картинки
        const res = await fetch('https://api.thecatapi.com/v1/images/search?limit=4');
        const data = await res.json();
        const container = document.getElementById('cat-container');
        // Очищаем и добавляем новых
        container.innerHTML = data.map(cat => `<img src="${cat.url}" class="cat-pic">`).join('');
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
        // Пытаемся войти, если нет - регистрируем
        const userCred = await auth.signInWithEmailAndPassword(email, pass)
            .catch(() => auth.createUserWithEmailAndPassword(email, pass));
        
        currentUser = userCred.user;
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('user-info').style.display = 'block';
        startChatListener(currentUser.uid);
    } catch (e) {
        alert("Ошибка входа: " + e.message);
    }
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
    msgInput.value = "";
}

function startChatListener(uid) {
    if (chatListener) chatListener(); // Убираем старый слушатель, если есть
    
    chatListener = db.collection("users").doc(uid).collection("messages")
        .orderBy("timestamp", "asc")
        .onSnapshot(snap => {
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
