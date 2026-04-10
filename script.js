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
        skill1: "Алхимия JS и DOM", skill2: "Python мосты для Telegram", skill3: "Архитектура Firebase Realtime", skill4: "Адаптивный Mobile-First UX", skill5: "Магия правил безопасности",
        sendBtn: "Отправить", catsBtn: "Призвать котика"
    },
    en: { 
        welcomeSub: "Automation Mage", todoTitle: "Secret Room", loginBtn: "Authorize", catsTitle: "Tavern Cats", skillTech: "Arsenal",
        skill1: "JS Alchemy & DOM", skill2: "Python Telegram Bridges", skill3: "Firebase Realtime Architecture", skill4: "Adaptive Mobile-First UX", skill5: "Security Rules Sorcery",
        sendBtn: "Send", catsBtn: "Summon Cats"
    }
};

// Проверка сессии при загрузке
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        showUserInterface(user);
        startChatListener(user.uid);
    } else {
        handleLogoutUI();
    }
});

function showUserInterface(user) {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('user-info').style.display = 'flex';
    document.getElementById('logout-btn').style.display = 'block';
    document.getElementById('user-name').innerText = user.email.split('@')[0];
    document.getElementById('chat-msg').onkeydown = (e) => { if (e.key === 'Enter') sendMessage(); };
}

function handleLogoutUI() {
    document.getElementById('login-form').style.display = 'flex';
    document.getElementById('user-info').style.display = 'none';
    document.getElementById('logout-btn').style.display = 'none';
    document.getElementById('user-name').innerText = "Guest";
    document.getElementById('chat-window').innerHTML = "";
    if (unsubscribe) unsubscribe();
}

function toggleLang() {
    const icon = document.getElementById('lang-icon');
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    icon.innerText = currentLang === 'ru' ? "🌐 🇷🇺" : "🌐 🇺🇸";
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (dict[currentLang][key]) el.innerText = dict[currentLang][key];
    });
}

async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    try {
        await auth.signInWithEmailAndPassword(email, pass).catch(() => auth.createUserWithEmailAndPassword(email, pass));
    } catch (e) { alert(e.message); }
}

async function handleLogout() {
    try { await auth.signOut(); } catch (e) { console.error(e); }
}

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

async function fetchCats() {
    const res = await fetch('https://api.thecatapi.com/v1/images/search?limit=2');
    const data = await res.json();
    document.getElementById('cat-container').innerHTML = data.map(c => `<img src="${c.url}">`).join('');
}
window.onload = fetchCats;
