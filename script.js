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
let currentLang = 'ru';
let unsubscribe = null;

const dict = {
    ru: { 
        welcomeSub: "Маг Автоматизации", todoTitle: "Тайная комната", loginBtn: "Войти", 
        catsTitle: "Коты Таверны", skillTech: "Арсенал", sendBtn: "Отправить", 
        catsBtn: "Призвать", adsLink: "Реклама", promoText: "Здесь могла быть ваша реклама",
        heroTitle: "НОВЫЙ СТАНДАРТ ЦИФРОВОГО ОПЫТА", heroSub: "Премиальные интерфейсы и архитектура.", 
        exploreBtn: "Работы", projectsTitle: "Проекты"
    },
    en: { 
        welcomeSub: "Automation Mage", todoTitle: "Secret Room", loginBtn: "Authorize", 
        catsTitle: "Tavern Cats", skillTech: "Arsenal", sendBtn: "Send", 
        catsBtn: "Summon", adsLink: "Ads", promoText: "Your ad could be here",
        heroTitle: "A NEW STANDARD OF DIGITAL EXPERIENCE", heroSub: "Premium interfaces & architecture.", 
        exploreBtn: "Explore", projectsTitle: "Projects"
    }
};

// --- ИНИЦИАЛИЗАЦИЯ И ОБРАБОТЧИКИ СОБЫТИЙ ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Отправка сообщения по Enter
    const chatInput = document.getElementById('chat-msg');
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // 2. Видео-фикс (браузеры блокируют автоплей со звуком)
    document.body.addEventListener('click', () => {
        const video = document.getElementById('bg-video');
        if (video && video.paused) {
            video.play().catch(e => console.log("Video play pending..."));
        }
    }, { once: true });

    // 3. Загрузка стартовых данных
    loadPortfolioProjects();
    fetchCats();
});

// --- СИСТЕМНЫЕ ФУНКЦИИ ---

function toggleVideoSound() {
    const video = document.getElementById('bg-video');
    const btn = document.getElementById('unmute-btn');
    if (video) {
        video.muted = !video.muted;
        btn.innerText = video.muted ? "🔊" : "🔇";
    }
}

function toggleLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    document.getElementById('lang-icon').innerText = currentLang === 'ru' ? "🌐 🇷🇺" : "🌐 🇺🇸";
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (dict[currentLang][key]) el.innerText = dict[currentLang][key];
    });
}

function showPage(pageId) {
    const main = document.getElementById('main-content');
    const ads = document.getElementById('ads-page');
    const mobNav = document.getElementById('mob-nav');
    
    if (pageId === 'ads') {
        main.classList.remove('active');
        ads.classList.add('active');
        if (mobNav) mobNav.style.display = 'none';
    } else {
        ads.classList.remove('active');
        main.classList.add('active');
        if (mobNav) mobNav.style.display = 'flex';
    }
}

function switchMobileTab(tabName, btn) {
    document.getElementById('main-content').className = `page-content active tab-${tabName}`;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-btn'));
    btn.classList.add('active-btn');
}

// --- FIREBASE: АВТОРИЗАЦИЯ И ЧАТ ---

auth.onAuthStateChanged((user) => {
    const loginForm = document.getElementById('login-form');
    const userInfo = document.getElementById('user-info');
    const logoutBtn = document.getElementById('logout-btn');
    const userName = document.getElementById('user-name');

    if (user) {
        currentUser = user;
        loginForm.style.display = 'none';
        userInfo.style.display = 'flex';
        logoutBtn.style.display = 'block';
        userName.innerText = user.email.split('@')[0];
        startChatListener(user.uid);
    } else {
        currentUser = null;
        loginForm.style.display = 'flex';
        userInfo.style.display = 'none';
        logoutBtn.style.display = 'none';
        userName.innerText = "Guest";
        if (unsubscribe) unsubscribe();
    }
});

async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    if (!email || !pass) return;
    
    try {
        await auth.signInWithEmailAndPassword(email, pass)
            .catch(() => auth.createUserWithEmailAndPassword(email, pass));
    } catch (e) {
        alert(e.message);
    }
}

async function handleLogout() {
    await auth.signOut();
}

async function sendMessage() {
    const input = document.getElementById('chat-msg');
    const text = input.value.trim();
    if (!text || !currentUser) return;

    try {
        // 1. Сохраняем в Firebase
        await db.collection("users").doc(currentUser.uid).collection("messages").add({
            message: text,
            sender: "user",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 2. Дублируем в Telegram
        fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: `👤 Пользователь: ${currentUser.email}\n💬 Сообщение: ${text}`
            })
        });

        input.value = "";
    } catch (e) {
        console.error("Send error:", e);
    }
}

function startChatListener(uid) {
    if (unsubscribe) unsubscribe();
    
    const chatWindow = document.getElementById('chat-window');
    unsubscribe = db.collection("users").doc(uid).collection("messages")
        .orderBy("timestamp", "asc")
        .onSnapshot(snap => {
            chatWindow.innerHTML = "";
            snap.forEach(doc => {
                const data = doc.data();
                const div = document.createElement('div');
                div.className = `msg-box ${data.sender === 'user' ? 'sent' : 'received'}`;
                div.innerText = data.message;
                chatWindow.appendChild(div);
            });
            chatWindow.scrollTop = chatWindow.scrollHeight;
        });
}

// --- КОНТЕНТ: ПРОЕКТЫ И КОТИКИ ---

async function loadPortfolioProjects() {
    const container = document.getElementById('portfolio-container');
    if (!container) return;

    try {
        const snapshot = await db.collection("projects").get();
        if (snapshot.empty) {
            container.innerHTML = `<p style="opacity:0.5">No projects found in Firestore...</p>`;
            return;
        }

        container.innerHTML = snapshot.docs.map(doc => {
            const p = doc.data();
            return `
                <div class="portfolio-item">
                    <h4>${p.title || 'Untitled Project'}</h4>
                    <span class="status-badge" style="background:var(--accent); color:#000; font-size:10px; padding:2px 8px; border-radius:8px;">${p.role || 'Developer'}</span>
                    <p class="metric" style="color:var(--accent); margin-top:10px; font-weight:bold; font-family:monospace;">${p.metric || ''}</p>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error("Firestore Projects Error:", e);
    }
}

async function fetchCats() {
    const container = document.getElementById('cat-container');
    try {
        const res = await fetch('https://api.thecatapi.com/v1/images/search?limit=2');
        const data = await res.json();
        container.innerHTML = data.map(cat => `<img src="${cat.url}" alt="Cat">`).join('');
    } catch (e) {
        container.innerHTML = "🐱 Котики уснули...";
    }
}
