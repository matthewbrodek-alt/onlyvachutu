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

// Твоя логика входа
async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    if(!email || !pass) return;

    try {
        const userCred = await auth.signInWithEmailAndPassword(email, pass)
            .catch(() => auth.createUserWithEmailAndPassword(email, pass));
        
        currentUser = userCred.user;
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('user-info').style.display = 'flex';
        document.getElementById('user-name').innerText = currentUser.email.split('@')[0];
        
        startChatListener(currentUser.uid);
    } catch (e) { alert(e.message); }
}

// ТВОЯ ЛОГИКА ТЕЛЕГРАМА (сохранена полностью)
async function sendMessage() {
    if (!currentUser) return;
    const msgInput = document.getElementById('chat-msg');
    const text = msgInput.value.trim();
    if (!text) return;

    // 1. В Firebase
    await db.collection("users").doc(currentUser.uid).collection("messages").add({
        message: text,
        sender: "user",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 2. В Telegram (Твой формат бот-текста)
    const botText = `👤 Юзер: ${currentUser.email}\nID ${currentUser.uid}\n\n💬 ${text}`;
    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: botText })
    });

    msgInput.value = "";
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
                div.innerText = d.message;
                win.appendChild(div);
            });
            win.scrollTop = win.scrollHeight;
        });
}

async function fetchCats() {
    const res = await fetch('https://api.thecatapi.com/v1/images/search?limit=4');
    const data = await res.json();
    document.getElementById('cat-container').innerHTML = data.map(c => `<img src="${c.url}">`).join('');
}

// Анимации при загрузке
$(document).ready(() => {
    fetchCats();
    $('.bento-item').tilt({ maxTilt: 10, glare: true, maxGlare: 0.1 });
});
