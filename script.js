const firebaseConfig = {
    apiKey: "AIzaSyA_7n34vc1JM5PER6kvU9mMSzKfpu8s5YE",
    authDomain: "my-portfolio-auth-ff1ce.firebaseapp.com",
    projectId: "my-portfolio-auth-ff1ce",
    storageBucket: "my-portfolio-auth-ff1ce.firebasestorage.app",
    messagingSenderId: "391088510675",
    appId: "1:391088510675:web:ff1c4d866c37f921886626",
    measurementId: "G-9Q1N2PQ51L"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentLang = 'ru';

// --- НАВИГАЦИЯ ---
function scrollToPanel(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function toggleSecret() {
    scrollToPanel('about');
}

// --- ЧАТ ---
async function sendMessage() {
    const name = document.getElementById('chat-name').value.trim();
    const text = document.getElementById('chat-msg').value.trim();
    if (!name || !text) return alert("Заполни все поля!");

    try {
        await db.collection("public_chats").add({
            username: name, message: text, sender: "user",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        const TOKEN = "8664813567:AAEkqGdXuyrS43Pjfc1gB-KdVuOOReWrkGw";
        const CHAT_ID = "7451263058";
        fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT_ID, text: `💬 Портфолио\n👤 ${name}: ${text}` })
        });
        document.getElementById('chat-msg').value = "";
    } catch (e) { console.error(e); }
}

function listenChats() {
    // Сортировка по времени гарантирует порядок сообщений
    db.collection("public_chats").orderBy("timestamp", "asc").onSnapshot(snap => {
        const win = document.getElementById('chat-window');
        if (!win) return;
        win.innerHTML = "";
        snap.forEach(doc => {
            const data = doc.data();
            const div = document.createElement('div');
            div.className = `msg ${data.sender === "admin" ? 'msg-admin' : 'msg-user'}`;
            div.innerHTML = `<b>${data.username}:</b> ${data.message}`;
            win.appendChild(div);
        });
        win.scrollTop = win.scrollHeight;
    });
}

// --- КОТИКИ ---
async function getCat() {
    const img = document.getElementById('cat-image');
    const loader = document.getElementById('loader');
    loader.style.display = 'block';
    img.style.display = 'none';
    
    try {
        const res = await fetch('https://api.thecatapi.com/v1/images/search');
        const data = await res.json();
        img.src = data[0].url;
        img.onload = () => {
            loader.style.display = 'none';
            img.style.display = 'block';
        };
    } catch (e) { loader.style.display = 'none'; }
}

// --- AUTH & TODO ---
auth.onAuthStateChanged(user => {
    const loginForm = document.getElementById('login-form');
    const userInfo = document.getElementById('user-info');
    if (user) {
        loginForm.style.display = 'none';
        userInfo.style.display = 'block';
        loadTodos(user.uid);
    } else {
        loginForm.style.display = 'block';
        userInfo.style.display = 'none';
    }
});

async function handleLogin() {
    const e = document.getElementById('auth-email').value;
    const p = document.getElementById('auth-pass').value;
    try { await auth.signInWithEmailAndPassword(e, p); } catch (err) { alert(err.message); }
}

async function handleSignUp() {
    const e = document.getElementById('auth-email').value;
    const p = document.getElementById('auth-pass').value;
    try { await auth.createUserWithEmailAndPassword(e, p); } catch (err) { alert(err.message); }
}

function handleLogout() { auth.signOut(); }

window.onload = () => { listenChats(); };
