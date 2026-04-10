// 1. КОНФИГУРАЦИЯ (Твои актуальные ключи)
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
const auth = firebase.auth();

// Глобальные переменные состояния
let currentUser = null;
let chatListener = null;
let currentLang = 'ru';

// 2. ЛОКАЛИЗАЦИЯ
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
        tgTitle: "Личный чат", chatName: "Ваше имя", chatMsg: "Сообщение...", sendBtn: "Отправить",
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
        tgTitle: "Private Chat", chatName: "Your Name", chatMsg: "Message...", sendBtn: "Send",
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

// 4. ЛОГИКА ВХОДА (Личный кабинет)
async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;

    if (!email || !pass) return alert("Введите Email и пароль");

    try {
        // Пытаемся войти. Если юзера нет — создаем его.
        const userCredential = await auth.signInWithEmailAndPassword(email, pass)
            .catch(() => auth.createUserWithEmailAndPassword(email, pass));
        
        currentUser = userCredential.user;
        
        // Переключаем видимость блоков (из твоего HTML)
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('user-info').style.display = 'block';
        
        // Подключаем чат этого конкретного юзера
        startChatListener(currentUser.uid);
        
    } catch (error) {
        alert("Ошибка: " + error.message);
    }
}

// 5. ЛОГИКА ЧАТА (Отправка)
async function sendMessage() {
    if (!currentUser) return alert("Сначала нужно войти!");

    const nameInput = document.getElementById('chat-name');
    const msgInput = document.getElementById('chat-msg');
    const text = msgInput.value.trim();
    const name = nameInput.value.trim() || "Пользователь";

    if (!text) return;

    try {
        // А. Сохраняем в ЛИЧНУЮ коллекцию пользователя
        await db.collection("users").doc(currentUser.uid).collection("messages").add({
            username: name,
            message: text,
            sender: "user",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Б. Отправляем в Telegram тебе
        const botText = `👤 <b>Чат:</b> ${currentUser.email}\n💬 <b>Текст:</b> ${text}`;
        
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: botText,
                parse_mode: 'HTML'
            })
        });

        msgInput.value = "";
    } catch (error) {
        console.error("Ошибка отправки:", error);
    }
}

// 6. СЛУШАТЕЛЬ ЛИЧНОГО ЧАТА (Real-time)
function startChatListener(uid) {
    if (chatListener) chatListener(); // Сброс старого слушателя

    chatListener = db.collection("users").doc(uid).collection("messages")
        .orderBy("timestamp", "asc")
        .onSnapshot(snap => {
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
}

// 7. ЗАГЛУШКИ
function addTodo() { 
    console.log("Функция ToDo пока в разработке"); 
}
