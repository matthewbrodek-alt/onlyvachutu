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

// КОТЫ (Стопка)
async function fetchCats() {
    try {
        const res = await fetch('https://api.thecatapi.com/v1/images/search?limit=3');
        const data = await res.json();
        const container = document.getElementById('cat-container');
        
        container.innerHTML = data.map((cat, i) => `
            <div class="cat-card" style="z-index: ${3-i}" onclick="swipeCard(this)">
                <img src="${cat.url}" alt="Cat">
            </div>
        `).join('');
    } catch(e) { console.error("Ошибка котов"); }
}

function swipeCard(card) {
    card.style.transform = 'translateY(-150%) rotate(20deg)';
    card.style.opacity = '0';
    setTimeout(() => {
        card.remove();
        if (document.querySelectorAll('.cat-card').length === 0) {
            fetchCats(); // Если все улетели - грузим новых
        }
    }, 600);
}

// НАВИГАЦИЯ
function scrollToPanel(id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}

// Firebase Логика
async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    try {
        const userCred = await auth.signInWithEmailAndPassword(email, pass)
            .catch(() => auth.createUserWithEmailAndPassword(email, pass));
        currentUser = userCred.user;
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('user-info').style.display = 'block';
        startChatListener(currentUser.uid);
    } catch (e) { alert(e.message); }
}

async function sendMessage() {
    const text = document.getElementById('chat-msg').value;
    if (!text || !currentUser) return;
    
    await db.collection("users").doc(currentUser.uid).collection("messages").add({
        message: text,
        sender: "user",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('chat-msg').value = "";
}

function startChatListener(uid) {
    db.collection("users").doc(uid).collection("messages").orderBy("timestamp", "asc").onSnapshot(snap => {
        const win = document.getElementById('chat-window');
        win.innerHTML = "";
        snap.forEach(doc => {
            const d = doc.data();
            win.innerHTML += `<div class="msg-box ${d.sender}">${d.message}</div>`;
        });
        win.scrollTop = win.scrollHeight;
    });
}

// Запуск
window.onload = () => { fetchCats(); };
