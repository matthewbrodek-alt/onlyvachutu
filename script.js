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

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 2. ЛОКАЛИЗАЦИЯ
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
        nextFlag: "🇺🇸"
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
        nextFlag: "🇷🇺"
    }
};

function toggleLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    document.getElementById('lang-btn').innerText = translations[currentLang].nextFlag;
    
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (translations[currentLang][key]) el.innerHTML = translations[currentLang][key];
    });

    document.querySelectorAll('[data-placeholder]').forEach(el => {
        const key = el.getAttribute('data-placeholder');
        if (translations[currentLang][key]) el.placeholder = translations[currentLang][key];
    });
}

// 3. ФУНКЦИИ ИНТЕРФЕЙСА
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    document.getElementById('theme-icon').innerText = 
        document.body.classList.contains('dark-theme') ? '☀️' : '🌙';
}

function scrollToPanel(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

// 4. ЛОГИКА ЧАТА (Firebase + Telegram)
async function sendMessage() {
    const nameInput = document.getElementById('chat-name');
    const msgInput = document.getElementById('chat-msg');
    
    const name = nameInput.value.trim();
    const text = msgInput.value.trim();

    if (!name || !text) {
        alert(currentLang === 'ru' ? "Заполните все поля!" : "Please fill all fields!");
        return;
    }

    try {
        // А. Сохраняем в Firebase (для отображения на сайте)
        await db.collection("public_chats").add({
            username: name,
            message: text,
            sender: "user",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Б. Отправляем в Telegram API
        const botText = `🚀 <b>Новое сообщение!</b>\n\n👤 <b>От:</b> ${name}\n💬 <b>Текст:</b> ${text}`;
        
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: botText,
                parse_mode: 'HTML'
            })
        });

        // Очищаем поле сообщения
        msgInput.value = "";

    } catch (error) {
        console.error("Ошибка отправки:", error);
    }
}

// Слушатель сообщений из Firebase (обновление чата в реальном времени)
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

// 5. ЗАГЛУШКИ (Для работы кнопок ToDo без ошибок)
function handleLogin() { console.log("Login clicked"); }
function addTodo() { console.log("Add todo clicked"); }
