// Firebase Init (оставь свой конфиг)
const firebaseConfig = { ... }; 
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentLang = 'ru';

const translations = {
    ru: {
        navHome: "Главная", navSkills: "Навыки", navTodo: "Задачи", navAbout: "Связь",
        welcomeTitle: "Привет!", welcomeSub: "Junior Developer & Automation Specialist",
        skillIt: "IT & Разработка",
        skillProjects: "Проекты",
        todoTitle: "Список дел", loginBtn: "Войти",
        tgTitle: "Чат со мной", sendBtn: "Отправить",
        nextFlag: "🇺🇸" // Флаг, который покажется на кнопке
    },
    en: {
        navHome: "Home", navSkills: "Skills", navTodo: "Tasks", navAbout: "Contact",
        welcomeTitle: "Hello!", welcomeSub: "Junior Developer & Automation Specialist",
        skillIt: "IT & Dev",
        skillProjects: "Projects",
        todoTitle: "Tasks", loginBtn: "Login",
        tgTitle: "Chat", sendBtn: "Send",
        nextFlag: "🇷🇺"
    }
};

// Исправленная функция переключения языка
function toggleLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    
    // Меняем флаг на кнопке
    document.getElementById('lang-btn').innerText = translations[currentLang].nextFlag;
    
    // Перевод текста
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (translations[currentLang][key]) el.innerHTML = translations[currentLang][key];
    });

    // Перевод плейсхолдеров
    document.querySelectorAll('[data-placeholder]').forEach(el => {
        const key = el.getAttribute('data-placeholder');
        if (translations[currentLang][key]) el.placeholder = translations[currentLang][key];
    });
}

// Заглушки, чтобы не было ошибок в консоли
function loadTodos(uid) { console.log("Loading todos..."); }
function handleLogin() { console.log("Login sequence..."); }
function addTodo() { console.log("Adding todo..."); }

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    document.getElementById('theme-icon').innerText = 
        document.body.classList.contains('dark-theme') ? '☀️' : '🌙';
}

function scrollToPanel(id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}

// Чат
async function sendMessage() {
    const name = document.getElementById('chat-name').value;
    const text = document.getElementById('chat-msg').value;
    if (!name || !text) return;
    await db.collection("public_chats").add({
        username: name, message: text, timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('chat-msg').value = "";
}
