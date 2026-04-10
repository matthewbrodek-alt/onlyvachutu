const firebaseConfig = {
    apiKey: "AIzaSyA_7n34vc1JM5PER6kvU9mMSzKfpu8s5YE",
    authDomain: "my-portfolio-auth-ff1ce.firebaseapp.com",
    projectId: "my-portfolio-auth-ff1ce",
    storageBucket: "my-portfolio-auth-ff1ce.firebasestorage.app",
    messagingSenderId: "391088510675",
    appId: "1:391088510675:web:ff1c4d866c37f921886626"
};

// Инициализация
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
let currentUser = null;

// Слушатель входа/выхода
auth.onAuthStateChanged(user => {
    const logoutBtn = document.getElementById('logout-btn');
    if (user) {
        currentUser = user;
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('user-info').style.display = 'block';
        if(logoutBtn) logoutBtn.style.display = 'block';
        startChat(user.uid);
    } else {
        currentUser = null;
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('user-info').style.display = 'none';
        if(logoutBtn) logoutBtn.style.display = 'none';
    }
});

// ГЛОБАЛЬНЫЕ ФУНКЦИИ (вынесены из блоков, чтобы HTML их видел)
window.handleLogin = async () => {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    if(!email || !pass) return alert("Заполни свитки (email/pass)");
    try {
        await auth.signInWithEmailAndPassword(email, pass)
            .catch(() => auth.createUserWithEmailAndPassword(email, pass));
    } catch(e) { alert(e.message); }
};

window.handleLogout = () => {
    auth.signOut().then(() => {
        window.location.reload(); 
    });
};

window.sendMessage = async () => {
    const input = document.getElementById('chat-msg');
    const text = input.value.trim();
    if(!text || !currentUser) return;

    try {
        await db.collection("users").doc(currentUser.uid).collection("messages").add({
            message: text,
            sender: "user",
            status: "pending", // Ключевой статус для бота в bridge.py
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        input.value = "";
    } catch(e) { console.error("Ошибка магии:", e); }
};

window.startChat = (uid) => {
    db.collection("users").doc(uid).collection("messages")
      .orderBy("timestamp", "asc")
      .onSnapshot(snap => {
        const win = document.getElementById('chat-window');
        if(!win) return;
        win.innerHTML = "";
        snap.forEach(doc => {
            const d = doc.data();
            const side = d.sender === 'user' ? 'sent' : 'received';
            win.innerHTML += `<div class="msg-box ${side}">${d.message}</div>`;
        });
        win.scrollTop = win.scrollHeight;
    });
};

window.fetchCats = async () => {
    const container = document.getElementById('cat-container');
    try {
        const res = await fetch('https://api.thecatapi.com/v1/images/search?limit=4');
        const data = await res.json();
        container.innerHTML = data.map(cat => `<img src="${cat.url}" alt="Cat">`).join('');
    } catch(e) { container.innerHTML = "Коты спрятались..."; }
};

window.scrollToPanel = (id) => {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
};

// Локализация
let currentLang = 'ru';
const dict = {
    ru: { navHome: "Таверна", navPortfolio: "Свитки", navRoom: "Кабинет", navLogout: "Выйти", welcomeTitle: "Усталый путник", welcomeSub: "Мастерство кода и магия автоматизации", portfolioTitle: "Артефакты", todoTitle: "Вход", loginBtn: "Открыть дверь", catsTitle: "Питомцы", catsBtn: "Приманить новых" },
    en: { navHome: "Tavern", navPortfolio: "Scrolls", navRoom: "Study", navLogout: "Logout", welcomeTitle: "Weary Traveler", welcomeSub: "Code Mastery & Automation Magic", portfolioTitle: "Artifacts", todoTitle: "Enter", loginBtn: "Unlock Door", catsTitle: "The Pets", catsBtn: "Summon More" }
};

window.toggleLang = () => {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    document.getElementById('lang-btn').innerText = currentLang.toUpperCase();
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if(dict[currentLang][key]) el.innerText = dict[currentLang][key];
    });
};

// Инициализация при загрузке
$(document).ready(() => {
    window.fetchCats();
    if($('.art-card').length) $('.art-card').tilt({ maxTilt: 15 });
    
    $('#chat-msg').on('keypress', (e) => {
        if(e.which == 13) window.sendMessage();
    });
});
