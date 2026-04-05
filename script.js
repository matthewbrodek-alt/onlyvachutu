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

// --- НАВИГАЦИЯ ---
function scrollToPanel(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function toggleSecret() {
    scrollToPanel('about');
    console.log("Tesla Secret Mode: On");
}

// --- ЧАТ (FIREBASE + TG) ---
async function sendMessage() {
    const name = document.getElementById('chat-name').value;
    const text = document.getElementById('chat-msg').value;
    if (!name || !text) return alert("Fill all!");

    await db.collection("public_chats").add({
        username: name, message: text, sender: "user",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    const TOKEN = "8664813567:AAEkqGdXuyrS43Pjfc1gB-KdVuOOReWrkGw", CHAT_ID = "7451263058";
    fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text: `👤 ${name}: ${text}` })
    });
    document.getElementById('chat-msg').value = "";
}

function listenChats() {
    db.collection("public_chats").orderBy("timestamp", "asc").onSnapshot(snap => {
        const win = document.getElementById('chat-window');
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
    const res = await fetch('https://api.thecatapi.com/v1/images/search');
    const data = await res.json();
    img.src = data[0].url;
    img.style.display = 'block';
}

// --- ЗАПУСК ---
window.onload = () => {
    listenChats();
};

// (Тут можно оставить функции Auth и ToDo из твоего прошлого кода)
