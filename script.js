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

// --- CORE LOGIC ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Enter key for Chat
    const msgInput = document.getElementById('chat-msg');
    if (msgInput) {
        msgInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    // 2. Browser Video Autoplay Fix
    document.body.addEventListener('click', () => {
        const video = document.getElementById('bg-video');
        if (video && video.paused) video.play();
    }, { once: true });

    loadProjects();
    fetchCats();
});

function showPage(pageId) {
    document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
    if (pageId === 'ads') {
        document.getElementById('ads-page').classList.add('active');
        document.getElementById('mob-nav').style.display = 'none';
    } else {
        document.getElementById('main-content').classList.add('active');
        document.getElementById('mob-nav').style.display = 'flex';
    }
    // Скролл в начало при смене страницы
    document.getElementById('main-scroll-container').scrollTop = 0;
}

// --- FIREBASE ---

auth.onAuthStateChanged(user => {
    currentUser = user;
    document.getElementById('login-form').style.display = user ? 'none' : 'flex';
    document.getElementById('user-info').style.display = user ? 'flex' : 'none';
    document.getElementById('logout-btn').style.display = user ? 'block' : 'none';
    document.getElementById('user-name').innerText = user ? user.email.split('@')[0] : "Guest";
    if (user) startChat(user.uid);
});

async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    try {
        await auth.signInWithEmailAndPassword(email, pass)
            .catch(() => auth.createUserWithEmailAndPassword(email, pass));
    } catch (e) { alert(e.message); }
}

function handleLogout() { auth.signOut(); }

// --- CHAT & TELEGRAM ---

async function sendMessage() {
    const input = document.getElementById('chat-msg');
    const text = input.value.trim();
    if (!text || !currentUser) return;

    await db.collection("users").doc(currentUser.uid).collection("messages").add({
        message: text, sender: "user", timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: `👤 ${currentUser.email}: ${text}` })
    });
    input.value = "";
}

function startChat(uid) {
    if (unsubscribe) unsubscribe();
    unsubscribe = db.collection("users").doc(uid).collection("messages").orderBy("timestamp", "asc").onSnapshot(snap => {
        const win = document.getElementById('chat-window');
        win.innerHTML = "";
        snap.forEach(doc => {
            const d = doc.data();
            const div = document.createElement('div');
            div.className = `msg-box ${d.sender === 'user' ? 'sent' : 'received'}`;
            div.innerText = d.message;
            win.appendChild(div);
        });
        win.scrollTop = win.scrollHeight;
    });
}

// --- CONTENT ---

async function loadProjects() {
    const container = document.getElementById('portfolio-container');
    const snapshot = await db.collection("projects").get();
    container.innerHTML = snapshot.docs.map(doc => {
        const p = doc.data();
        return `<div class="portfolio-item card"><h4>${p.title}</h4><p>${p.metric || ''}</p></div>`;
    }).join('');
}

async function fetchCats() {
    const res = await fetch('https://api.thecatapi.com/v1/images/search?limit=1');
    const data = await res.json();
    document.getElementById('cat-container').innerHTML = `<img src="${data[0].url}" style="width:100%; border-radius:15px;">`;
}

function toggleVideoSound() {
    const v = document.getElementById('bg-video');
    v.muted = !v.muted;
    document.getElementById('unmute-btn').innerText = v.muted ? "🔊" : "🔇";
}
