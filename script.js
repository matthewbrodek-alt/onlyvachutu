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
let currentLang = 'ru';

const translations = {
    ru: {
        navHome: "Главная", navTodo: "Задачи", navAbout: "Связь со мной",
        authTitle: "Вход", loginBtn: "Войти", regBtn: "Регистрация", logoutBtn: "Выход",
        welcomeTitle: "Привет!", secretBtn: "Секрет 🔒", secretText: "Стать Senior в 2026 году! 🚀",
        catTitle: "Котик 🐱", catBtn: "Кыс-кыс!",
        todoTitle: "Список дел 📝", addBtn: "Добавить",
        tgTitle: "Чат со мной 🚀", sendBtn: "Отправить",
        aboutText: "Firebase, Telegram API, Реставрация фото."
    },
    en: {
        navHome: "Home", navTodo: "Tasks", navAbout: "Сontact me",
        authTitle: "Login", loginBtn: "Login", regBtn: "Sign Up", logoutBtn: "Logout",
        welcomeTitle: "Welcome!", secretBtn: "Secret 🔒", secretText: "Become Senior by 2026! 🚀",
        catTitle: "Cat 🐱", catBtn: "Pspsps!",
        todoTitle: "To-Do List 📝", addBtn: "Add",
        tgTitle: "Chat with me 🚀", sendBtn: "Send",
        aboutText: "Firebase, Telegram API, Photo Restoration."
    }
};

// --- СИСТЕМА ПЕРЕКЛЮЧЕНИЯ СТРАНИЦ И ЯЗЫКА ---
function toggleLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    document.getElementById('lang-btn').innerText = currentLang.toUpperCase();
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (translations[currentLang][key]) el.innerText = translations[currentLang][key];
    });
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    const target = document.getElementById(pageId);
    if (target) target.style.display = 'block';
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    document.getElementById('theme-icon').innerText = isDark ? "☀️" : "🌙";
}

// --- КОТИКИ API ---
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

// --- СИСТЕМА ДИАЛОГОВ (FIREBASE + TELEGRAM) ---
async function sendMessage() {
    const name = document.getElementById('chat-name').value.trim();
    const text = document.getElementById('chat-msg').value.trim();
    if (!name || !text) return alert("Fill all fields!");

    try {
        // 1. Сохраняем в Firebase
        await db.collection("public_chats").add({
            username: name,
            message: text,
            sender: "user",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 2. Уведомляем в Telegram
        const TOKEN = "8664813567:AAEkqGdXuyrS43Pjfc1gB-KdVuOOReWrkGw", CHAT_ID = "7451263058";
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT_ID, text: `💬 Новый чат!\n👤 ${name}: ${text}` })
        });

        document.getElementById('chat-msg').value = "";
    } catch (e) { alert("Error sending message"); }
}

function listenChats() {
    // Добавляем сортировку по полю timestamp от старых к новым (asc)
    db.collection("public_chats").orderBy("timestamp", "asc").onSnapshot(snap => {
        const win = document.getElementById('chat-window');
        if (!win) return;
        win.innerHTML = "";
        
        snap.forEach(doc => {
            const data = doc.data();
            const div = document.createElement('div');
            const isAdmin = data.sender === "admin";
            
            div.className = `msg ${isAdmin ? 'msg-admin' : 'msg-user'}`;
            div.innerHTML = `<b>${data.username}:</b> ${data.message}`;
            win.appendChild(div);
        });
        win.scrollTop = win.scrollHeight; // Прокрутка вниз к новому сообщению
    });
}

// --- TODO LIST И AUTH ---
auth.onAuthStateChanged(user => {
    const loginForm = document.getElementById('login-form'), userInfo = document.getElementById('user-info');
    if (user) {
        loginForm.style.display = 'none'; userInfo.style.display = 'flex';
        document.getElementById('user-email-display').innerText = user.email;
        loadTodos(user.uid);
    } else {
        loginForm.style.display = 'flex'; userInfo.style.display = 'none';
        showPage('home');
    }
});

function loadTodos(uid) {
    if (unsubscribeTodos) unsubscribeTodos();
    unsubscribeTodos = db.collection("users").doc(uid).collection("todos").orderBy("timestamp", "desc").onSnapshot(snap => {
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

async function handleLogin() {
    const e = document.getElementById('auth-email').value, p = document.getElementById('auth-pass').value;
    try { await auth.signInWithEmailAndPassword(e, p); } catch (err) { alert(err.message); }
}

async function handleSignUp() {
    const e = document.getElementById('auth-email').value, p = document.getElementById('auth-pass').value;
    try { await auth.createUserWithEmailAndPassword(e, p); } catch (err) { alert(err.message); }
}

function handleLogout() { if (unsubscribeTodos) unsubscribeTodos(); auth.signOut(); }

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

window.onload = () => {
    showPage('home');
    listenChats();
};

function toggleSecret() {
    const chatContainer = document.getElementById('chat-window');
    if (!chatContainer) return;

    if (chatContainer.style.display === "none" || chatContainer.style.display === "") {
        chatContainer.style.display = "block";
        chatContainer.style.position = "relative"; // Гарантируем, что он в потоке
        chatContainer.style.zIndex = "1000";      // Поверх котиков
        console.log("Секретный чат показан");
    } else {
        chatContainer.style.display = "none";
        console.log("Секретный чат скрыт");
    }
}
