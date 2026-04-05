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

// ПЕРЕВОДЫ
const translations = {
    ru: {
        navHome: "Главная", navTodo: "Список дел", navAbout: "Обо мне",
        authTitle: "Вход", loginBtn: "Войти", regBtn: "Регистрация", logoutBtn: "Выход",
        welcomeTitle: "Добро пожаловать!", secretBtn: "Открыть секрет 🔒",
        secretText: "Моя цель: Стать Senior разработчиком в 2026 году! 🚀",
        catTitle: "Случайная киска 🐱", catBtn: "Кыс-кыс-кыс!",
        todoTitle: "Мой список дел 📝", addBtn: "Добавить",
        tgTitle: "Написать мне в TG 🚀", sendBtn: "Отправить",
        aboutText: "Работа с Firebase, Telegram API и реставрация фото."
    },
    en: {
        navHome: "Home", navTodo: "Tasks", navAbout: "About Me",
        authTitle: "Login", loginBtn: "Login", regBtn: "Sign Up", logoutBtn: "Logout",
        welcomeTitle: "Welcome!", secretBtn: "Open Secret 🔒",
        secretText: "My goal: Become a Senior Developer by 2026! 🚀",
        catTitle: "Random Cat 🐱", catBtn: "Pspsps!",
        todoTitle: "My To-Do List 📝", addBtn: "Add",
        tgTitle: "Message me on TG 🚀", sendBtn: "Send",
        aboutText: "Firebase, Telegram API and Photo Restoration."
    }
};

let currentLang = 'ru';

function toggleLang() {
    currentLang = (currentLang === 'ru') ? 'en' : 'ru';
    document.getElementById('lang-btn').innerText = (currentLang === 'ru') ? 'EN' : 'RU';
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
    const icon = document.getElementById('theme-icon');
    if (icon) icon.innerText = isDark ? "☀️" : "🌙";
    if (auth.currentUser) db.collection("users").doc(auth.currentUser.uid).set({ theme: isDark ? "dark" : "light" }, { merge: true });
}

// ФУНКЦИИ КОНТЕНТА
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
    if (!name || !msg) return alert("Fill fields!");
    const TOKEN = "8664813567:AAEkqGdXuyrS43Pjfc1gB-KdVuOOReWrkGw", CHAT_ID = "7451263058";
    try {
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT_ID, text: `👤 ${name}\n📝 ${msg}` })
        });
        alert("Success!");
    } catch (e) { alert("Error!"); }
}

// АВТОРИЗАЦИЯ И FIRESTORE
async function handleLogin() {
    const e = document.getElementById('auth-email').value, p = document.getElementById('auth-pass').value;
    try { await auth.signInWithEmailAndPassword(e, p); } catch (err) { alert(err.message); }
}

async function handleSignUp() {
    const e = document.getElementById('auth-email').value, p = document.getElementById('auth-pass').value;
    try { await auth.createUserWithEmailAndPassword(e, p); alert("Account created!"); } catch (err) { alert(err.message); }
}

function handleLogout() { if (unsubscribeTodos) { unsubscribeTodos(); unsubscribeTodos = null; } auth.signOut(); }

auth.onAuthStateChanged(async (user) => {
    const loginForm = document.getElementById('login-form'), userInfo = document.getElementById('user-info');
    if (user) {
        if (loginForm) loginForm.style.display = 'none';
        if (userInfo) userInfo.style.display = 'block';
        document.getElementById('user-email-display').innerText = user.email;
        loadTodos(user.uid);
        const doc = await db.collection("users").doc(user.uid).get();
        if (doc.exists && doc.data().theme === "dark") {
            document.body.classList.add('dark');
            document.getElementById('theme-icon').innerText = "☀️";
        }
    } else {
        if (loginForm) loginForm.style.display = 'block';
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
                li.innerHTML = `${doc.data().text} <button onclick="deleteTodo('${doc.id}')">×</button>`;
                list.appendChild(li);
            });
        }, err => console.warn("Logged out"));
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
