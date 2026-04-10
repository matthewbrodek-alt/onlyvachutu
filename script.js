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

async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    if(!email || !pass) return;

    try {
        const userCred = await auth.signInWithEmailAndPassword(email, pass)
            .catch(() => auth.createUserWithEmailAndPassword(email, pass));
        
        currentUser = userCred.user;

        // Сохраняем email в Firestore, чтобы бот мог тебя найти по почте
        await db.collection("users").doc(currentUser.uid).set({
            email: currentUser.email,
            last_active: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        document.getElementById('login-form').style.display = 'none';
        document.getElementById('user-info').style.display = 'flex';
        document.getElementById('user-name').innerText = currentUser.email.split('@')[0];
        
        // Включаем Enter
        document.getElementById('chat-msg').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });

        startChatListener(currentUser.uid);
    } catch (e) { alert("Magic Error: " + e.message); }
}

async function sendMessage() {
    const input = document.getElementById('chat-msg');
    const text = input.value.trim();
    if (!text || !currentUser) return;

    // В базу
    await db.collection("users").doc(currentUser.uid).collection("messages").add({
        message: text,
        sender: "user",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // В Телеграм
    const tgText = `👤 ${currentUser.email}\n💬 ${text}`;
    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: tgText })
    });

    input.value = "";
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
    try {
        const res = await fetch('https://api.thecatapi.com/v1/images/search?limit=2');
        const data = await res.json();
        const container = document.getElementById('cat-container');
        if(container) container.innerHTML = data.map(c => `<img src="${c.url}">`).join('');
    } catch(e) {}
}

window.onload = fetchCats;
