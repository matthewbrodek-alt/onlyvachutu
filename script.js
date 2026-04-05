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

const translations = {
    ru: {
        navHome: "Главная", navSkills: "Навыки", navTodo: "Задачи", navAbout: "Связь",
        welcomeTitle: "Привет!", welcomeSub: "Junior Developer & Automation Specialist",
        skillIt: "IT & Разработка",
        skillItList: "<li><b>Frontend:</b> JS (UI/UX, Анимации)</li><li><b>Backend:</b> Firebase, Telegram API</li><li><b>Automation:</b> Маркет-боты</li>",
        skillProjects: "Проекты",
        skillProjectsList: "<li><b>Web-Portfolio:</b> Firebase & Auth</li><li><b>Userbot:</b> Имитация поведения (3-4ч)</li>",
        skillSoft: "Soft Skills", skillSoftDesc: "Адаптивность, аналитика, дисциплина и тайм-менеджмент.",
        skillStack: "Стек", todoTitle: "Список дел", loginBtn: "Войти",
        todoPlaceholder: "Что нужно сделать?", addBtn: "Добавить",
        tgTitle: "Чат со мной", chatName: "Ваше имя", chatMsg: "Сообщение...", sendBtn: "Отправить"
    },
    en: {
        navHome: "Home", navSkills: "Skills", navTodo: "Tasks", navAbout: "Contact",
        welcomeTitle: "Hello!", welcomeSub: "Junior Developer & Automation Specialist",
        skillIt: "IT & Development",
        skillItList: "<li><b>Frontend:</b> JS (UI/UX, Animations)</li><li><b>Backend:</b> Firebase, Telegram API</li><li><b>Automation:</b> Market Bots</li>",
        skillProjects: "Projects",
        skillProjectsList: "<li><b>Web-Portfolio:</b> Firebase & Auth</li><li><b>Userbot:</b> Human-like (3-4h cycles)</li>",
        skillSoft: "Soft Skills", skillSoftDesc: "Adaptability, analytical thinking, discipline and time management.",
        skillStack: "Stack", todoTitle: "To-Do List", loginBtn: "Login",
        todoPlaceholder: "What needs to be done?", addBtn: "Add",
        tgTitle: "Chat with me", chatName: "Your Name", chatMsg: "Message...", sendBtn: "Send"
    }
};

function toggleLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    document.getElementById('lang-btn').innerText = currentLang.toUpperCase();
    
    // Перевод обычного текста
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

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const icon = document.getElementById('theme-icon');
    icon.innerText = document.body.classList.contains('dark-theme') ? '☀️' : '🌙';
}

function scrollToPanel(id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}

// Firebase Chat Logic
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
