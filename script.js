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

// Логика локализации (Смена языка)
let currentLang = 'ru';

const translations = {
    ru: {
        navHome: "Главная", navSkills: "Навыки", navTodo: "Задачи", navAbout: "Связь",
        welcomeTitle: "Привет!", welcomeSub: "Junior Developer & Automation Specialist",
        skillIt: "IT & Разработка",
        skillItList: "<li>Frontend: JS (UI/UX)</li><li>Backend: Firebase</li><li>Automation: Telegram API</li>",
        skillProjects: "Проекты",
        skillProjectsList: "<li>Web-Portfolio (Firebase)</li><li>Userbot (Cycle 3-4h)</li>",
        todoTitle: "Список дел", loginBtn: "Войти",
        todoPlaceholder: "Что нужно сделать?",
        tgTitle: "Чат со мной", chatName: "Ваше имя", chatMsg: "Сообщение...", sendBtn: "Отправить",
        nextFlag: "🇺🇸" // Флаг для перехода на англ
    },
    en: {
        navHome: "Home", navSkills: "Skills", navTodo: "Tasks", navAbout: "Contact",
        welcomeTitle: "Hello!", welcomeSub: "Junior Developer & Automation Specialist",
        skillIt: "IT & Dev",
        skillItList: "<li>Frontend: JS (UI/UX)</li><li>Backend: Firebase</li><li>Automation: Telegram Bots</li>",
        skillProjects: "Projects",
        skillProjectsList: "<li>Web-Portfolio (Firebase)</li><li>Userbot (Cycle 3-4h)</li>",
        todoTitle: "Tasks", loginBtn: "Login",
        todoPlaceholder: "What needs to be done?",
        tgTitle: "Chat with me", chatName: "Your Name", chatMsg: "Message...", sendBtn: "Send",
        nextFlag: "🇷🇺" // Флаг для перехода на ру
    }
};

function toggleLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    
    // Меняем флаг
    document.getElementById('lang-btn').innerText = translations[currentLang].nextFlag;
    
    // Меняем текст элементов
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (translations[currentLang][key]) el.innerHTML = translations[currentLang][key];
    });

    // Меняем текст внутри полей ввода
    document.querySelectorAll('[data-placeholder]').forEach(el => {
        const key = el.getAttribute('data-placeholder');
        if (translations[currentLang][key]) el.placeholder = translations[currentLang][key];
    });
}

// Заглушки для ToDo, чтобы консоль была чистой
function loadTodos(uid) { console.log("Loading todos..."); }
function handleLogin() { console.log("Login sequence..."); }
function addTodo() { console.log("Adding todo..."); }

// Навигация и Темы
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    document.getElementById('theme-icon').innerText = 
        document.body.classList.contains('dark-theme') ? '☀️' : '🌙';
}

function scrollToPanel(id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}

// Логика Чата (Отправка)
async function sendMessage() {
    const name = document.getElementById('chat-name').value;
    const text = document.getElementById('chat-msg').value;
    if (!name || !text) return;

    await db.collection("public_chats").add({
        username: name, message: text, sender: "user",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('chat-msg').value = "";
}

// Логика Чата (Чтение в реальном времени с сортировкой)
db.collection("public_chats").orderBy("timestamp", "asc").onSnapshot(snap => {
    const win = document.getElementById('chat-window');
    if (!win) return;
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
