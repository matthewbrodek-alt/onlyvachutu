const firebaseConfig = {
    apiKey: "AIzaSyA_7n34vc1JM5PER6kvU9mMSzKfpu8s5YE",
    authDomain: "my-portfolio-auth-ff1ce.firebaseapp.com",
    projectId: "my-portfolio-auth-ff1ce",
    storageBucket: "my-portfolio-auth-ff1ce.firebasestorage.app",
    messagingSenderId: "391088510675",
    appId: "1:391088510675:web:ff1c4d866c37f921886626"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentLang = 'ru';

// Переводы
const translations = {
    ru: {
        navHome: "Главная", navSkills: "Навыки", navTodo: "Задачи", navAbout: "Связь",
        welcomeTitle: "Привет!", tgTitle: "Чат со мной", sendBtn: "Отправить",
        skillIt: "IT & Разработка", skillProjects: "Проекты", skillSoft: "Soft Skills", skillStack: "Стек"
    },
    en: {
        navHome: "Home", navSkills: "Skills", navTodo: "Tasks", navAbout: "Contact",
        welcomeTitle: "Hello!", tgTitle: "Chat", sendBtn: "Send",
        skillIt: "IT & Dev", skillProjects: "Projects", skillSoft: "Soft Skills", skillStack: "Stack"
    }
};

function scrollToPanel(id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}

function toggleLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    document.getElementById('lang-btn').innerText = currentLang.toUpperCase();
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (translations[currentLang][key]) el.innerText = translations[currentLang][key];
    });
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const icon = document.getElementById('theme-icon');
    icon.innerText = document.body.classList.contains('dark-theme') ? '☀️' : '🌙';
}

// Чат
async function sendMessage() {
    const name = document.getElementById('chat-name').value;
    const text = document.getElementById('chat-msg').value;
    if (!name || !text) return;

    await db.collection("public_chats").add({
        username: name, message: text, sender: "user",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    const TOKEN = "8664813567:AAEkqGdXuyrS43Pjfc1gB-KdVuOOReWrkGw", CHAT_ID = "7451263058";
    fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({chat_id: CHAT_ID, text: `👤 ${name}: ${text}`})
    });
    document.getElementById('chat-msg').value = "";
}

// Слушатель чата с сортировкой (чтобы сообщения не прыгали)
db.collection("public_chats").orderBy("timestamp", "asc").onSnapshot(snap => {
    const win = document.getElementById('chat-window');
    win.innerHTML = "";
    snap.forEach(doc => {
        const d = doc.data();
        const div = document.createElement('div');
        div.className = d.sender === 'admin' ? 'msg-admin' : 'msg-user';
        div.innerHTML = `<b>${d.username}:</b> ${d.message}`;
        win.appendChild(div);
    });
    win.scrollTop = win.scrollHeight;
});

// Заглушки для ToDo
function loadTodos(uid) { console.log("Todos for:", uid); }
function handleLogin() { console.log("Login clicked"); }
