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
let unsubscribeTodos = null;

// ЛОКАЛИЗАЦИЯ
const translations = {
    ru: {
        navHome: "Главная", navTodo: "Задачи", navAbout: "Обо мне",
        authTitle: "Вход", loginBtn: "Войти", regBtn: "Регистрация", logoutBtn: "Выход",
        welcomeTitle: "Привет!", secretBtn: "Секрет 🔒",
        secretText: "Стать Senior в 2026 году! 🚀",
        catTitle: "Котик дня 🐱", catBtn: "Кыс-кыс!",
        todoTitle: "Список дел 📝", addBtn: "Добавить",
        tgTitle: "Написать в TG 🚀", sendBtn: "Отправить",
        aboutText: "Firebase, Telegram API, Реставрация фото."
    },
    en: {
        navHome: "Home", navTodo: "Tasks", navAbout: "About",
        authTitle: "Login", loginBtn: "Login", regBtn: "Sign Up", logoutBtn: "Logout",
        welcomeTitle: "Welcome!", secretBtn: "Secret 🔒",
        secretText: "Become Senior by 2026! 🚀",
        catTitle: "Cat of the day 🐱", catBtn: "Pspsps!",
        todoTitle: "To-Do List 📝", addBtn: "Add",
        tgTitle: "TG Message 🚀", sendBtn: "Send",
        aboutText: "Firebase, Telegram API, Photo Restoration."
    }
};

let currentLang = 'ru';

function toggleLang() {
    currentLang = (currentLang === 'ru') ? 'en' : 'ru';
    document.getElementById('lang-btn').innerText = currentLang.toUpperCase();
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (translations[currentLang][key]) el.innerText = translations[currentLang][key];
    });
}

// НАВИГАЦИЯ И ТЕМА
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    const p = document.getElementById(pageId);
    if (p) p.style.display = 'block';
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    document.getElementById('theme-icon').innerText = isDark ? "☀️" : "🌙";
    if (auth.currentUser) db.collection("users").doc(auth.currentUser.uid).set({ theme: isDark ? "dark" : "light" }, { merge: true });
}

// КОНТЕНТ
function toggleSecret() {
    const s = document.getElementById('secret-msg');
    s.style.display = (s.style.display === 'none') ? 'block' : 'none';
}

async function getCat() {
    const loader = document.getElementById('loader'), img = document.getElementById('cat-image');
    loader.style.display = 'block'; img.style.display = 'none';
    try {
        const res = await fetch('https://api.thecatapi.com/v1/images/search');
        const data = await res.json();
        img.src = data[0].url;
        img.onload = () => { loader.style.display = 'none'; img.style.display = 'block'; };
    } catch (e) { loader.style.display = 'none'; }
}

async function sendToTg() {
    const name = document.getElementById('tg-name').value, msg = document.getElementById('tg-msg').value;
    if (!name || !msg) return alert("Fill all!");
    const TOKEN = "8664813567:AAEkqGdXuyrS43Pjfc1gB-KdVuOOReWrkGw", CHAT_ID = "7451263058";
    try {
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT_ID, text: `👤 ${name}\n📝 ${msg}` })
        });
        alert("Sent!");
    } catch (e) { alert("Error!"); }
}

// FIREBASE ЛОГИКА
async function handleLogin() {
    const e = document.getElementById('auth-email').value, p = document.getElementById('auth-pass').value;
    try { await auth.signInWithEmailAndPassword(e, p); } catch (err) { alert(err.message); }
}

async function handleSignUp() {
    const e = document.getElementById('auth-email').value, p = document.getElementById('auth-pass').value;
    try { await auth.createUserWithEmailAndPassword(e, p); alert("Welcome!"); } catch (err) { alert(err.message); }
}

function handleLogout() { if (unsubscribeTodos) { unsubscribeTodos(); unsubscribeTodos = null; } auth.signOut(); }

auth.onAuthStateChanged(async (user) => {
    const loginForm = document.getElementById('login-form'), userInfo = document.getElementById('user-info');
    if (user) {
        if (loginForm) loginForm.style.display = 'none';
        if (userInfo) userInfo.style.display = 'flex';
        document.getElementById('user-email-display').innerText = user.email;
        loadTodos(user.uid);
        const doc = await db.collection("users").doc(user.uid).get();
        if (doc.exists && doc.data().theme === "dark") {
            document.body.classList.add('dark');
            document.getElementById('theme-icon').innerText = "☀️";
        }
    } else {
        if (loginForm) loginForm.style.display = 'flex';
        if (userInfo) userInfo.style.display = 'none';
        showPage('home');
    }
});

function loadTodos(uid) {
    if (unsubscribeTodos) unsubscribeTodos();
    unsubscribeTodos = db.collection("users").doc(uid).collection("todos").orderBy("timestamp", "desc")
        .onSnapshot(snap => {
            const list = document.getElementById('todo-list');
            if (!list) return;
            list.innerHTML = "";
            snap.forEach(doc => {
                const li = document.createElement('li');
                li.style = "display:flex; justify-content:space-between; background:rgba(0,0,0,0.05); padding:8px; margin:5px 0; border-radius:5px;";
                li.innerHTML = `<span>${doc.data().text}</span> <button onclick="deleteTodo('${doc.id}')" style="background:#ff4757; color:white; padding:2px 8px;">×</button>`;
                list.appendChild(li);
            });
        });
}

async function addTodo() {
    const input = document.getElementById('todo-input');
    if (auth.currentUser && input.value.trim()) {
        await db.collection("users").doc(auth.currentUser.uid).collection("todos").add({
            text: input.value, timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        input.value = "";
    }
}

async function deleteTodo(id) {
    if (auth.currentUser) await db.collection("users").doc(auth.currentUser.uid).collection("todos").doc(id).delete();
}

window.onload = () => showPage('home');
