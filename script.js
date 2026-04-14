const firebaseConfig = {
    apiKey: "AIzaSyA_7n34vc1JM5PER6kvU9mMSzKfpu8s5YE",
    authDomain: "my-portfolio-auth-ff1ce.firebaseapp.com",
    projectId: "my-portfolio-auth-ff1ce",
    storageBucket: "my-portfolio-auth-ff1ce.firebasestorage.app",
    messagingSenderId: "391088510675",
    appId: "1:391088510675:web:ff1c4d866c37f921886626"
};

const TELEGRAM_BOT_TOKEN = "8664813567:AAEkqGdXuyrS43Pjfc1gB-KdVuOOReWrkGw";
const TELEGRAM_CHAT_ID = "7451263058";

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentLang = 'en'; // Как на скрине

const dict = {
    ru: {
        projectsLink: "МОИ ПРОЕКТЫ",
        heroTitle: "НОВЫЙ ЦИФРОВОЙ СТАНДАРТ",
        heroSub: "Премиальные интерфейсы и архитектуры.",
        welcomeSub: "Маг Автоматизации",
        chatTitle: "Мессенджер",
        loginBtn: "Войти",
        aboutTitle: "Майкл Фарадей",
        faradayDesc: "Майкл Фарадей — английский физик, внесший вклад в электромагнетизм.",
        faradayQuote: '"Ничто не слишком чудесно, чтобы быть правдой."',
        worksTitle: "Выбранные Работы",
        skillTech: "Арсенал",
        catsTitle: "Коты Таверны",
        catsBtn: "Призвать",
        projectsTitlePage: "Портфолио Разработки",
        backBtn: "← Назад",
        openBtn: "Открыть"
    },
    en: {
        projectsLink: "MY PROJECTS",
        heroTitle: "NEW DIGITAL STANDARD",
        heroSub: "Premium interfaces & architectures.",
        welcomeSub: "Automation Mage",
        chatTitle: "Messenger",
        loginBtn: "Login",
        aboutTitle: "Michael Faraday",
        faradayDesc: "Michael Faraday was an English scientist who contributed to electromagnetism.",
        faradayQuote: '"Nothing is too wonderful to be true."',
        worksTitle: "Selected Works",
        skillTech: "Arsenal",
        catsTitle: "Tavern Cats",
        catsBtn: "Summon",
        projectsTitlePage: "Dev Portfolio",
        backBtn: "← Back",
        openBtn: "Open"
    }
};

// Исправленная загрузка данных из Firestore
async function loadProjects() {
    const container = document.getElementById('portfolio-container');
    const snap = await db.collection("projects").get();
    
    container.innerHTML = snap.docs.map(doc => {
        const p = doc.data();
        const techHtml = p.tech ? p.tech.map(t => `<span class="tech-tag">${t}</span>`).join('') : '';
        return `
            <div class="project-item-card">
                <div class="neon-text" style="font-size:1.1rem">${p.title || 'Project'}</div>
                <div class="project-metric">Metric: ${p.metric || 'N/A'}</div>
                <div class="project-tech-list">${techHtml}</div>
            </div>
        `;
    }).join('');
}

function toggleLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    document.getElementById('lang-icon').innerText = currentLang === 'ru' ? "🌐 RU" : "🌐 US";
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (dict[currentLang][key]) el.innerText = dict[currentLang][key];
    });
}

function showPage(pageId) {
    document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

// Инициализация видео и данных
document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('bg-video');
    video.play().catch(() => {
        console.log("Auto-play blocked, interaction required");
        document.body.addEventListener('mousedown', () => video.play(), {once: true});
    });
    loadProjects();
    fetchCats();
});

// Auth & Chat Logic (сохранена без потерь)
auth.onAuthStateChanged(user => {
    document.getElementById('login-form').style.display = user ? 'none' : 'block';
    document.getElementById('user-info').style.display = user ? 'flex' : 'none';
    document.getElementById('logout-btn').style.display = user ? 'block' : 'none';
    document.getElementById('user-name').innerText = user ? user.email.split('@')[0] : "Guest";
    if (user) syncChat(user.uid);
});

async function handleLogin() {
    const e = document.getElementById('auth-email').value;
    const p = document.getElementById('auth-pass').value;
    if (e && p) await auth.signInWithEmailAndPassword(e, p).catch(() => auth.createUserWithEmailAndPassword(e, p));
}

function handleLogout() { auth.signOut(); }
