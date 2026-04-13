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

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
let currentUser = null;
let currentLang = 'ru';
let unsubscribe = null;

const dict = {
    ru: { 
        welcomeSub: "Маг Автоматизации", todoTitle: "Тайная комната", loginBtn: "Войти", catsTitle: "Коты Таверны", skillTech: "Арсенал",
        skill1: "Алхимия JS и DOM", skill2: "Python мосты", skill3: "Firebase Realtime",
        sendBtn: "Отправить", catsBtn: "Призвать", adsLink: "Реклама", promoText: "Здесь могла быть реклама",
        heroTitle: "НОВЫЙ СТАНДАРТ ЦИФРОВОГО ОПЫТА", heroSub: "Премиальные интерфейсы и архитектура.", exploreBtn: "Работы",
        projectsTitle: "Проекты", stackTitle: "Стек"
    },
    en: { 
        welcomeSub: "Automation Mage", todoTitle: "Secret Room", loginBtn: "Authorize", catsTitle: "Tavern Cats", skillTech: "Arsenal",
        skill1: "JS Alchemy & DOM", skill2: "Python Bridges", skill3: "Firebase Realtime",
        sendBtn: "Send", catsBtn: "Summon", adsLink: "Ads", promoText: "Your ad could be here",
        heroTitle: "A NEW STANDARD OF DIGITAL EXPERIENCE", heroSub: "Premium interfaces & architecture.", exploreBtn: "Explore",
        projectsTitle: "Projects", stackTitle: "Stack"
    }
};

// --- СИСТЕМНЫЕ ФУНКЦИИ ---

function toggleVideoSound() {
    const video = document.getElementById('bg-video');
    const btn = document.getElementById('unmute-btn');
    video.muted = !video.muted;
    btn.innerText = video.muted ? "🔊" : "🔇";
}

function toggleLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    document.getElementById('lang-icon').innerText = currentLang === 'ru' ? "🌐 🇷🇺" : "🌐 🇺🇸";
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (dict[currentLang][key]) el.innerText = dict[currentLang][key];
    });
}

// --- FIREBASE & ЧАТ ---

auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('user-info').style.display = 'flex';
        document.getElementById('logout-btn').style.display = 'block';
        document.getElementById('user-name').innerText = user.email.split('@')[0];
        startChatListener(user.uid);
    } else {
        document.getElementById('login-form').style.display = 'flex';
        document.getElementById('user-info').style.display = 'none';
        document.getElementById('logout-btn').style.display = 'none';
        document.getElementById('user-name').innerText = "Guest";
    }
});

async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    try { await auth.signInWithEmailAndPassword(email, pass).catch(() => auth.createUserWithEmailAndPassword(email, pass)); } 
    catch (e) { alert(e.message); }
}

async function handleLogout() { await auth.signOut(); }

async function sendMessage() {
    const input = document.getElementById('chat-msg');
    const text = input.value.trim();
    if (!text || !currentUser) return;

    await db.collection("users").doc(currentUser.uid).collection("messages").add({
        message: text, sender: "user", timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: `👤 ${currentUser.email}\n💬 ${text}` })
    });
    input.value = "";
}

function startChatListener(uid) {
    if (unsubscribe) unsubscribe();
    unsubscribe = db.collection("users").doc(uid).collection("messages").orderBy("timestamp", "asc").onSnapshot(snap => {
        const win = document.getElementById('chat-window');
        win.innerHTML = "";
        snap.forEach(doc => {
            const d = doc.data();
            const div = document.createElement('div');
            div.className = d.sender === 'user' ? 'msg-box sent' : 'msg-box received';
            div.innerText = d.message;
            win.appendChild(div);
        });
        win.scrollTop = win.scrollHeight;
    });
}

// --- КОНТЕНТ ---

async function fetchCats() {
    const res = await fetch('https://api.thecatapi.com/v1/images/search?limit=2');
    const data = await res.json();
    document.getElementById('cat-container').innerHTML = data.map(c => `<img src="${c.url}">`).join('');
}

async function loadPortfolioProjects() {
    const container = document.getElementById('portfolio-container');
    if (!container) return;
    try {
        const snap = await db.collection("projects").get();
        container.innerHTML = snap.docs.map(doc => {
            const p = doc.data();
            return `
                <div class="portfolio-item">
                    <h4>${p.title || 'Project'}</h4>
                    <div class="status-badge" style="background:var(--accent); color:#000; padding:2px 8px; border-radius:10px; font-size:10px; width:fit-content; margin-bottom:10px;">${p.role || 'Dev'}</div>
                    <p class="metric" style="color:var(--accent); font-family:monospace; margin:0;">${p.metric || ''}</p>
                </div>
            `;
        }).join('');
    } catch (e) { console.error("Projects error:", e); }
}

// --- НАВИГАЦИЯ ---

function showPage(pageId) {
    document.getElementById('main-content').classList.toggle('active', pageId === 'main');
    document.getElementById('ads-page').classList.toggle('active', pageId === 'ads');
    document.getElementById('mob-nav').style.display = pageId === 'main' ? 'flex' : 'none';
}

function switchMobileTab(tabName, btnElement) {
    document.getElementById('main-content').className = `page-content active tab-${tabName}`;
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active-btn'));
    btnElement.classList.add('active-btn');
}

window.onload = () => {
    fetchCats();
    loadPortfolioProjects();
};
