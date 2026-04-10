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

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null;
let chatListener = null;
let currentLang = 'ru';

// Переводы
const translations = {
    ru: {
        navHome: "Главная", navSkills: "Навыки", navTodo: "Кабинет", navAbout: "Связь",
        welcomeTitle: "Привет!", welcomeSub: "Junior Developer & Automation Specialist",
        skillIt: "IT & Разработка",
        skillProjects: "Проекты",
        todoTitle: "Личный кабинет", loginBtn: "Войти / Создать",
        tgTitle: "Быстрая связь", sendBtn: "Отправить", chatMsg: "Сообщение...", nextFlag: "🇺🇸"
    },
    en: {
        navHome: "Home", navSkills: "Skills", navTodo: "Account", navAbout: "Contact",
        welcomeTitle: "Hello!", welcomeSub: "Junior Developer & Automation Specialist",
        skillIt: "IT & Dev",
        skillProjects: "Projects",
        todoTitle: "Tesla Account", loginBtn: "Sign In",
        tgTitle: "Quick Contact", sendBtn: "Send", chatMsg: "Message...", nextFlag: "🇷🇺"
    }
};

// Переключение языка
function toggleLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    document.getElementById('lang-btn').innerText = translations[currentLang].nextFlag;
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (translations[currentLang][key]) el.innerHTML = translations[currentLang][key];
    });
}

// Авторизация
async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;

    if (!email || !pass) return alert("Fill fields");

    try {
        const userCred = await auth.signInWithEmailAndPassword(email, pass)
            .catch(() => auth.createUserWithEmailAndPassword(email, pass));
        
        currentUser = userCred.user;
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('user-info').style.display = 'block';
        document.getElementById('user-display-email').innerText = currentUser.email;
        
        startChatListener(currentUser.uid);
    } catch (e) { alert(e.message); }
}

// Отправка в Личном кабинете
async function sendMessage() {
    if (!currentUser) return;
    const msgInput = document.getElementById('chat-msg');
    const text = msgInput.value.trim();
    if (!text) return;

    await db.collection("users").doc(currentUser.uid).collection("messages").add({
        message: text, sender: "user", username: currentUser.email,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: `💎 <b>Кабинет:</b> ${currentUser.email}\n💬 ${text}`,
            parse_mode: 'HTML'
        })
    });
    msgInput.value = "";
}

// Прослушивание сообщений
function startChatListener(uid) {
    if (chatListener) chatListener();
    chatListener = db.collection("users").doc(uid).collection("messages")
        .orderBy("timestamp", "asc").onSnapshot(snap => {
            const win = document.getElementById('chat-window');
            win.innerHTML = "";
            snap.forEach(doc => {
                const d = doc.data();
                const div = document.createElement('div');
                div.className = d.sender === 'admin' ? 'msg-admin' : 'msg-user';
                div.innerHTML = d.message;
                win.appendChild(div);
            });
            win.scrollTop = win.scrollHeight;
        });
}

// Функции интерфейса
function toggleTheme() { document.body.classList.toggle('dark-theme'); }
function scrollToPanel(id) { document.getElementById(id).scrollIntoView({ behavior: 'smooth' }); }
