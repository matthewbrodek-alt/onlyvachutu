const firebaseConfig = {
    apiKey: "AIzaSyA_7n34vc1JM5PER6kvU9mMSzKfpu8s5YE",
    authDomain: "my-portfolio-auth-ff1ce.firebaseapp.com",
    projectId: "my-portfolio-auth-ff1ce",
    storageBucket: "my-portfolio-auth-ff1ce.firebasestorage.app",
    messagingSenderId: "391088510675",
    appId: "1:391088510675:web:ff1c4d866c37f921886626"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null;

// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ
$(document).ready(function() {
    // Активация 3D эффекта для карточек
    $('.art-card').tilt({
        maxTilt: 15,
        perspective: 1000,
        glare: true,
        maxGlare: .3
    });

    fetchCats();

    // Отправка сообщения по Enter
    $(document).on('keypress', '#chat-msg', function(e) {
        if(e.which == 13) sendMessage();
    });
});

// ПЛАВНЫЙ СКРОЛЛ
function scrollToPanel(id) {
    const el = document.getElementById(id);
    if(el) el.scrollIntoView({ behavior: 'smooth' });
}

// КОТЫ
async function fetchCats() {
    const container = document.getElementById('cat-container');
    container.innerHTML = "<p style='color: #666; font-size: 12px;'>Призываем...</p>";
    try {
        const res = await fetch('https://api.thecatapi.com/v1/images/search?limit=4');
        const data = await res.json();
        container.innerHTML = data.map(cat => `<img src="${cat.url}" alt="Cat">`).join('');
    } catch(e) { container.innerHTML = "<p>Магия котиков исчерпана</p>"; }
}

// ЯЗЫК
let currentLang = 'ru';
const dict = {
    ru: { 
        navHome: "Таверна", navPortfolio: "Свитки", navRoom: "Кабинет", navCats: "Коты",
        welcomeTitle: "Усталый путник", welcomeSub: "Мастерство кода и магия автоматизации",
        portfolioTitle: "Артефакты", todoTitle: "Вход", catsTitle: "Питомцы",
        loginBtn: "Открыть дверь", catsBtn: "Приманить новых"
    },
    en: { 
        navHome: "The Tavern", navPortfolio: "Scrolls", navRoom: "Study", navCats: "Cats",
        welcomeTitle: "Weary Traveler", welcomeSub: "Code Mastery & Automation Magic",
        portfolioTitle: "Artifacts", todoTitle: "Enter", catsTitle: "The Pets",
        loginBtn: "Unlock Door", catsBtn: "Summon More"
    }
};

function toggleLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    document.getElementById('lang-btn').innerText = currentLang.toUpperCase();
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if(dict[currentLang][key]) el.innerText = dict[currentLang][key];
    });
}

// FIREBASE ЛОГИКА
async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    if(!email || !pass) return;

    try {
        const cred = await auth.signInWithEmailAndPassword(email, pass)
            .catch(() => auth.createUserWithEmailAndPassword(email, pass));
        currentUser = cred.user;
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('user-info').style.display = 'block';
        startChat(currentUser.uid);
    } catch(e) { alert("Ошибка доступа: " + e.message); }
}

function startChat(uid) {
    db.collection("users").doc(uid).collection("messages").orderBy("timestamp", "asc").onSnapshot(snap => {
        const win = document.getElementById('chat-window');
        win.innerHTML = "";
        snap.forEach(doc => {
            const d = doc.data();
            const type = d.sender === 'user' ? 'sent' : 'received';
            win.innerHTML += `<div class="msg-box ${type}">${d.message}</div>`;
        });
        win.scrollTop = win.scrollHeight;
    });
}

async function sendMessage() {
    const input = document.getElementById('chat-msg');
    const text = input.value.trim();
    if(!text || !currentUser) return;

    await db.collection("users").doc(currentUser.uid).collection("messages").add({
        message: text,
        sender: "user",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    input.value = "";
}
