const firebaseConfig = {
    apiKey: "AIzaSyA_7n34vc1JM5PER6kvU9mMSzKfpu8s5YE",
    authDomain: "my-portfolio-auth-ff1ce.firebaseapp.com",
    projectId: "my-portfolio-auth-ff1ce",
    storageBucket: "my-portfolio-auth-ff1ce.firebasestorage.app",
    messagingSenderId: "391088510675",
    appId: "1:391088510675:web:ff1c4d866c37f921886626"
};

const TELEGRAM_BOT_TOKEN = "8664813567:AAEkqGdXuyrS43Pjfc1gB-KdVuOOReWrkGw";
const TELEGRAM_CHAT_ID = "7451263058";

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null;
let unsubscribe = null;
let currentLang = 'ru';

const dict = {
    ru: {
        adsLink: "Реклама", heroTitle: "НОВЫЙ СТАНДАРТ ЦИФРОВОГО ОПЫТА", heroSub: "Премиальные интерфейсы.",
        welcomeSub: "Маг Автоматизации", chatTitle: "Мессенджер", loginBtn: "Войти",
        aboutTitle: "Майкл Фарадей", projectsTitle: "Выбранные Работы", skillTech: "Арсенал",
        catsTitle: "Коты Таверны", catsBtn: "Призвать", promoText: "Здесь могла быть ваша реклама",
        faradayDesc: "Майкл Фарадей — выдающийся английский физик и химик, основоположник учения об электромагнитном поле. Его открытия легли в основу современной электротехники."
    },
    en: {
        adsLink: "Ads", heroTitle: "NEW DIGITAL EXPERIENCE STANDARD", heroSub: "Premium UI & Scalable Architectures.",
        welcomeSub: "Automation Mage", chatTitle: "Messenger", loginBtn: "Login",
        aboutTitle: "Michael Faraday", projectsTitle: "Selected Works", skillTech: "Tech Stack",
        catsTitle: "Tavern Cats", catsBtn: "Summon", promoText: "Your Ad Could Be Here",
        faradayDesc: "Michael Faraday was an English scientist who contributed to the study of electromagnetism and electrochemistry."
    }
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Enter Key Listener
    document.getElementById('chat-msg')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Forced Video Play on User Interaction
    const playVideo = () => {
        const v = document.getElementById('bg-video');
        if (v && v.paused) {
            v.play().catch(err => console.error("Playback failed:", err));
        }
    };
    document.body.addEventListener('click', playVideo, { once: true });
    document.body.addEventListener('touchstart', playVideo, { once: true });

    loadProjects();
    fetchCats();
});

// --- UI Logic ---
function toggleLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    document.getElementById('lang-icon').innerText = currentLang === 'ru' ? "🌐 🇷🇺" : "🌐 🇺🇸";
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (dict[currentLang][key]) el.innerText = dict[currentLang][key];
    });
}

function showPage(p) {
    document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
    document.getElementById(p === 'ads' ? 'ads-page' : 'main-content').classList.add('active');
    document.getElementById('mob-nav').style.display = p === 'ads' ? 'none' : 'flex';
}

function switchTab(tab, btn) {
    // Для мобильных устройств — логика переключения в CSS/JS
    document.querySelectorAll('.m-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Можно добавить плавный скролл к нужной карточке на мобилке
}

// --- Firebase Auth & Chat ---
auth.onAuthStateChanged(user => {
    currentUser = user;
    document.getElementById('login-form').style.display = user ? 'none' : 'block';
    document.getElementById('user-info').style.display = user ? 'flex' : 'none';
    document.getElementById('logout-btn').style.display = user ? 'block' : 'none';
    document.getElementById('user-name').innerText = user ? user.email.split('@')[0] : "Guest";
    if (user) syncChat(user.uid);
});

async function handleLogin() {
    const e = document.getElementById('auth-email').value;
    const p = document.getElementById('auth-pass').value;
    if (!e || !p) return;
    try { await auth.signInWithEmailAndPassword(e, p).catch(() => auth.createUserWithEmailAndPassword(e, p)); } 
    catch (err) { alert("Auth Error: " + err.message); }
}

function handleLogout() { auth.signOut(); if (unsubscribe) unsubscribe(); }

async function sendMessage() {
    const input = document.getElementById('chat-msg');
    const txt = input.value.trim();
    if (!txt || !currentUser) return;

    try {
        await db.collection("users").doc(currentUser.uid).collection("messages").add({
            message: txt, sender: "user", timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: `👤 ${currentUser.email}: ${txt}` })
        });
        input.value = "";
    } catch (e) { console.error("Firebase Send Error:", e); }
}

function syncChat(uid) {
    if (unsubscribe) unsubscribe();
    unsubscribe = db.collection("users").doc(uid).collection("messages").orderBy("timestamp", "asc").onSnapshot(snap => {
        const win = document.getElementById('chat-window');
        win.innerHTML = "";
        snap.forEach(doc => {
            const m = doc.data();
            const div = document.createElement('div');
            div.className = `msg-box ${m.sender === 'user' ? 'sent' : 'received'}`;
            div.innerText = m.message;
            win.appendChild(div);
        });
        win.scrollTop = win.scrollHeight;
    });
}

// --- Content Loading ---
async function loadProjects() {
    try {
        const snap = await db.collection("projects").get();
        const container = document.getElementById('portfolio-container');
        if (snap.empty) {
            container.innerHTML = "<p style='opacity:0.5'>Projects database is empty...</p>";
            return;
        }
        container.innerHTML = snap.docs.map(doc => {
            const p = doc.data();
            return `<div class="portfolio-item" style="padding:15px 0; border-bottom:1px solid var(--border)">
                <h4 style="color:var(--accent)">${p.title}</h4>
                <p style="font-size:12px; opacity:0.7">${p.metric || 'Performance Optimized'}</p>
            </div>`;
        }).join('');
    } catch (e) { console.error("Projects Load Error:", e); }
}

async function fetchCats() {
    try {
        const res = await fetch('https://api.thecatapi.com/v1/images/search?limit=1');
        const data = await res.json();
        document.getElementById('cat-container').innerHTML = `<img src="${data[0].url}" style="width:100%; border-radius:18px; box-shadow: 0 10px 20px rgba(0,0,0,0.5);">`;
    } catch (e) { console.error("Cat API Error"); }
}

function toggleSound() {
    const v = document.getElementById('bg-video');
    v.muted = !v.muted;
    document.getElementById('unmute-btn').innerText = v.muted ? "🔊" : "🔇";
}
