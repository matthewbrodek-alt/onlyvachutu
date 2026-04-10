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
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null;
let currentLang = 'ru';

const dict = {
    ru: { welcomeSub: "Маг Автоматизации", todoTitle: "Тайная комната", loginBtn: "Открыть дверь", catsTitle: "Коты Таверны", skillTech: "Арсенал" },
    en: { welcomeSub: "Automation Mage", todoTitle: "Secret Room", loginBtn: "Open Door", catsTitle: "Tavern Cats", skillTech: "Arsenal" }
};

// Смена языка
function toggleLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    const btn = document.getElementById('lang-btn');
    if (btn) btn.innerText = currentLang === 'ru' ? '🇺🇸 EN' : '🇷🇺 RU';
    
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (dict[currentLang][key]) el.innerText = dict[currentLang][key];
    });
}

// Логин
async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    if(!email || !pass) return alert("Введите данные!");

    try {
        const userCred = await auth.signInWithEmailAndPassword(email, pass)
            .catch(() => auth.createUserWithEmailAndPassword(email, pass));
        
        currentUser = userCred.user;
        
        // Запись профиля (для правил Firebase)
        await db.collection("users").doc(currentUser.uid).set({
            email: currentUser.email.toLowerCase()
        }, { merge: true });

        document.getElementById('login-form').style.display = 'none';
        document.getElementById('user-info').style.display = 'flex';
        document.getElementById('user-name').innerText = currentUser.email.split('@')[0];
        
        startChatListener(currentUser.uid);
    } catch (e) { alert(e.message); }
}

// Отправка (Твоя логика Telegram)
async function sendMessage() {
    const msgInput = document.getElementById('chat-msg');
    const text = msgInput.value.trim();
    if (!text || !currentUser) return;

    // В Firestore
    await db.collection("users").doc(currentUser.uid).collection("messages").add({
        message: text,
        sender: "user",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // В Telegram (Формат: Юзер + ID + Текст)
    const botText = `👤 Юзер: ${currentUser.email}\nID ${currentUser.uid}\n\n💬 ${text}`;
    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: botText })
    });

    msgInput.value = "";
}

// Слушатель чата
function startChatListener(uid) {
    db.collection("users").doc(uid).collection("messages")
        .orderBy("timestamp", "asc").onSnapshot(snap => {
            const win = document.getElementById('chat-window');
            win.innerHTML = "";
            snap.forEach(doc => {
                const d = doc.data();
                const div = document.createElement('div');
                div.className = d.sender === 'user' ? 'msg-box sent' : 'msg-box received';
                div.innerText = d.message;
                win.appendChild(div);
            });
            win.scrollTop = win.scrollHeight;
        });
}

// Котики
async function fetchCats() {
    try {
        const res = await fetch('https://api.thecatapi.com/v1/images/search?limit=4');
        const data = await res.json();
        const container = document.getElementById('cat-container');
        if (container) {
            container.innerHTML = data.map(c => `<img src="${c.url}">`).join('');
        }
    } catch (e) { console.log("Коты сбежали"); }
}

// Запуск
$(document).ready(() => {
    fetchCats();
    
    // Прямой слушатель кнопки языка
    const langBtn = document.getElementById('lang-btn');
    if (langBtn) langBtn.addEventListener('click', toggleLang);

    // Усмиренный Tilt (4 градуса макс)
    if ($('.bento-item').length) {
        $('.bento-item').tilt({
            maxTilt: 4,
            perspective: 1000,
            speed: 800,
            glare: true,
            maxGlare: 0.05
        });
    }
});
