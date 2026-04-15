const firebaseConfig = {
    apiKey: "AIzaSyA_7n34vc1JM5PER6kvU9mMSzKfpu8s5YE",
    authDomain: "my-portfolio-auth-ff1ce.firebaseapp.com",
    projectId: "my-portfolio-auth-ff1ce",
    storageBucket: "my-portfolio-auth-ff1ce.firebasestorage.app",
    messagingSenderId: "391088510675",
    appId: "1:391088510675:web:ff1c4d866c37f921886626"
};

const TELEGRAM_BOT_TOKEN = "8664813567:AAEkqGdXuyrS43Pjfc1gB-KdVuOOReWrkGw";
const TELEGRAM_CHAT_ID   = "7451263058";

// ── i18n ──────────────────────────────────────────────────
const translations = {
    ru: {
        nav_projects:   "Мои проекты",
        nav_about:      "О нас",
        nav_services:   "Услуги",
        nav_contacts:   "Контакты",
        back:           "Назад",
        hero_eyebrow:   "ПРЕМИАЛЬНЫЕ ИНТЕРФЕЙСЫ И АРХИТЕКТУРА",
        hero_title:     "НОВЫЙ СТАНДАРТ\nЦИФРОВОГО ОПЫТА",
        hero_sub:       "Мы создаём премиальные интерфейсы и архитектурные решения, которые задают будущее цифрового мира.",
        btn_projects:   "Смотреть проекты →",
        btn_contact:    "Связаться с нами",
        feat1_title:    "Инновации",
        feat1_desc:     "Используем передовые технологии для лучших результатов.",
        feat2_title:    "Надёжность",
        feat2_desc:     "Гарантируем стабильность и безопасность каждого решения.",
        feat3_title:    "Качество",
        feat3_desc:     "Внимание к деталям и высочайшие стандарты в каждом проекте.",
        feat4_title:    "Скорость",
        feat4_desc:     "Быстрая реализация проектов без потери качества.",
        carousel_title: "НАШИ СОТРУДНИКИ",
        open_site:      "Открыть сайт ➔",
        about_name:     "Михаил «Faraday» Романов",
        about_role:     "Full-Stack Dev · Digital Alchemist · Cat Enthusiast",
        about_bio1:     "Привет. Я тот самый человек, который в 3 часа ночи спорит с компилятором, держа на коленях кота. Победитель в этом споре всегда кот — но код в итоге работает.",
        about_bio2:     "Более 7 лет я превращаю хаос требований в элегантные цифровые решения: от микросервисных архитектур до анимаций, от которых у дизайнеров перехватывает дыхание. Мой стек — React, Firebase, Python, Node.js и бесконечная любовь к деталям.",
        about_bio3:     "Я верю, что каждый интерфейс должен быть живым — как хороший котик: тёплым, отзывчивым и немного непредсказуемым. Если ваш проект скучный, я его починю. Если он уже хорош — я сделаю его незабываемым.",
        about_quote:    "«Ничто не слишком прекрасно, чтобы быть истинным» — Майкл Фарадей.\nИ я в это искренне верю. Особенно когда смотрю на котиков.",
        svc1_title:     "Веб-разработка",
        svc1_desc:      "Премиальные сайты и веб-приложения с нуля до деплоя.",
        svc2_title:     "UI/UX Дизайн",
        svc2_desc:      "Интерфейсы, которые не просто красивы, но и работают идеально.",
        svc3_title:     "Автоматизация",
        svc3_desc:      "Боты, скрипты и интеграции, которые экономят ваше время.",
        svc4_title:     "Облачные решения",
        svc4_desc:      "Архитектура, масштабирование, Firebase, AWS — выберем лучшее.",
        svc5_title:     "Всё что нужно в цифровой реальности",
        svc5_desc:      "Сделаем всё что нужно в пределах цифровой реальности. Нестандартная задача? Именно это нас и вдохновляет. Опишите проблему — мы найдём решение.",
        contacts_desc:  "Напишите мне прямо здесь — мессенджер синхронизирован с личными каналами для мгновенного ответа.",
        statusOnline:   "В СЕТИ",
        chatTitle:      "Мессенджер",
        chatPlaceholder:"Напишите сообщение...",
        loginBtn:       "Авторизоваться",
    },
    en: {
        nav_projects:   "My Projects",
        nav_about:      "About",
        nav_services:   "Services",
        nav_contacts:   "Contacts",
        back:           "Back",
        hero_eyebrow:   "PREMIUM INTERFACES AND ARCHITECTURE",
        hero_title:     "NEW STANDARD OF\nDIGITAL EXPERIENCE",
        hero_sub:       "We build premium interfaces and architectural solutions that shape the future of the digital world.",
        btn_projects:   "View Projects →",
        btn_contact:    "Contact Us",
        feat1_title:    "Innovation",
        feat1_desc:     "We use cutting-edge technologies for the best results.",
        feat2_title:    "Reliability",
        feat2_desc:     "We guarantee stability and security in every solution.",
        feat3_title:    "Quality",
        feat3_desc:     "Attention to detail and the highest standards in every project.",
        feat4_title:    "Speed",
        feat4_desc:     "Fast project delivery without compromising quality.",
        carousel_title: "OUR TEAM",
        open_site:      "Open Site ➔",
        about_name:     "Michael «Faraday» Romanov",
        about_role:     "Full-Stack Dev · Digital Alchemist · Cat Enthusiast",
        about_bio1:     "Hi. I'm the person who argues with the compiler at 3am with a cat on their lap. The cat always wins the argument — but the code works in the end.",
        about_bio2:     "For over 7 years I've been turning chaotic requirements into elegant digital solutions: from microservice architectures to animations that leave designers breathless. My stack — React, Firebase, Python, Node.js and infinite love for details.",
        about_bio3:     "I believe every interface should be alive — like a good cat: warm, responsive, and a little unpredictable. If your project is boring, I'll fix it. If it's already good — I'll make it unforgettable.",
        about_quote:    "\"Nothing is too wonderful to be true\" — Michael Faraday.\nAnd I sincerely believe that. Especially when looking at cats.",
        svc1_title:     "Web Development",
        svc1_desc:      "Premium websites and web apps from scratch to deployment.",
        svc2_title:     "UI/UX Design",
        svc2_desc:      "Interfaces that aren't just beautiful, but work perfectly.",
        svc3_title:     "Automation",
        svc3_desc:      "Bots, scripts and integrations that save your time.",
        svc4_title:     "Cloud Solutions",
        svc4_desc:      "Architecture, scaling, Firebase, AWS — we'll choose the best.",
        svc5_title:     "Everything in Digital Reality",
        svc5_desc:      "We'll do everything needed within the digital realm. Non-standard task? That's exactly what inspires us. Describe the problem — we'll find a solution.",
        contacts_desc:  "Message me right here — the messenger is synced with my private channels for an instant response.",
        statusOnline:   "ONLINE",
        chatTitle:      "Messenger",
        chatPlaceholder:"Type a message...",
        loginBtn:       "Authorize",
    }
};

// ── Firebase init ──────────────────────────────────────────
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db   = firebase.firestore();
const auth = firebase.auth();
let currentLang = 'ru';
let chatUnsubscribe = null; // для отписки от snaphot

// ── i18n ──────────────────────────────────────────────────
function setLang(lang) {
    currentLang = lang;
    document.querySelectorAll('.lang-option').forEach(el => el.classList.remove('active'));
    document.getElementById(`lang-${lang}`).classList.add('active');

    document.querySelectorAll('[data-lang]').forEach(el => {
        const key  = el.getAttribute('data-lang');
        const text = translations[currentLang][key];
        if (!text) return;
        if (el.tagName === 'INPUT') el.placeholder = text;
        else el.innerText = text;
    });
}

// ── Навигация ─────────────────────────────────────────────
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');

    // Прокрутка наверх
    const main = document.getElementById('site-main');
    if (main) main.scrollTop = 0;
}

// ── Модальный мессенджер ──────────────────────────────────
function openMessenger() {
    document.getElementById('messenger-modal').classList.add('open');
    document.body.style.overflow = 'hidden';
}
function closeMessenger() {
    document.getElementById('messenger-modal').classList.remove('open');
    document.body.style.overflow = '';
}
function closeMessengerIfOutside(e) {
    if (e.target === document.getElementById('messenger-modal')) closeMessenger();
}

// ── Emoji ──────────────────────────────────────────────────
function addEmoji(emoji) {
    const el = document.getElementById('chat-msg');
    if (el) { el.value += emoji; el.focus(); }
}
function addEmojiModal(emoji) {
    const el = document.getElementById('modal-chat-msg');
    if (el) { el.value += emoji; el.focus(); }
}

// ── Отправка (основной чат) ───────────────────────────────
async function sendMessage() {
    await _sendMsg('chat-msg');
}
async function sendMessageModal() {
    await _sendMsg('modal-chat-msg');
}

async function _sendMsg(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    if (!auth.currentUser) {
        alert(currentLang === 'ru' ? 'Пожалуйста, войдите в аккаунт' : 'Please log in first');
        return;
    }
    input.value = '';
    try {
        await db.collection('users').doc(auth.currentUser.uid).collection('messages').add({
            message:   text,
            sender:    'user',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: `👤 ${auth.currentUser.email}\n💬 ${text}`
            })
        }).catch(() => {});
    } catch (err) {
        console.error('sendMsg error:', err);
    }
}

// ── Enter key ─────────────────────────────────────────────
document.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    if (document.activeElement.id === 'chat-msg')       sendMessage();
    if (document.activeElement.id === 'modal-chat-msg') sendMessageModal();
});

// Escape — закрыть модалку
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMessenger();
});

// ── Auth ──────────────────────────────────────────────────
auth.onAuthStateChanged(user => {
    // Основная страница контактов
    const lf = document.getElementById('login-form');
    const ui = document.getElementById('user-info');
    // Модалка
    const mlf = document.getElementById('modal-login-form');
    const mui = document.getElementById('modal-user-info');

    if (user) {
        const name = user.email.split('@')[0];
        // Contacts page
        if (lf) lf.style.display = 'none';
        if (ui) ui.style.display = 'flex';
        // Modal
        if (mlf) mlf.style.display = 'none';
        if (mui) mui.style.display = 'flex';
        // Profile name
        const uname = document.getElementById('user-name-contacts');
        if (uname) uname.innerText = name;

        // Подписываемся на чат один раз
        if (chatUnsubscribe) chatUnsubscribe();
        chatUnsubscribe = db.collection('users').doc(user.uid).collection('messages')
            .orderBy('timestamp', 'asc')
            .onSnapshot(snap => {
                renderMessages(snap, 'chat-window');
                renderMessages(snap, 'modal-chat-window');
            });
    } else {
        if (lf) lf.style.display = 'flex';
        if (ui) ui.style.display = 'none';
        if (mlf) mlf.style.display = 'flex';
        if (mui) mui.style.display = 'none';
    }
});

function renderMessages(snap, windowId) {
    const win = document.getElementById(windowId);
    if (!win) return;
    win.innerHTML = '';
    snap.forEach(doc => {
        const m   = doc.data();
        const div = document.createElement('div');
        div.className = `msg-box ${m.sender === 'user' ? 'sent' : 'received'}`;
        div.innerText = m.message;
        win.appendChild(div);
    });
    win.scrollTop = win.scrollHeight;
}

async function handleLogin() {
    await _doLogin(
        document.getElementById('auth-email').value.trim(),
        document.getElementById('auth-pass').value
    );
}
async function handleLoginModal() {
    await _doLogin(
        document.getElementById('modal-auth-email').value.trim(),
        document.getElementById('modal-auth-pass').value
    );
}
async function _doLogin(email, pass) {
    if (!email || !pass) return;
    try {
        await auth.signInWithEmailAndPassword(email, pass);
    } catch (e) {
        if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
            try { await auth.createUserWithEmailAndPassword(email, pass); }
            catch (ce) { alert(ce.message); }
        } else { alert(e.message); }
    }
}

// ── Карусель ──────────────────────────────────────────────
function initCarousel() {
    const IMAGES = [
        { src: 'gallery/photo1.jpg', label: 'ФОТО 1' },
        { src: 'gallery/photo2.jpg', label: 'ФОТО 2' },
        { src: 'gallery/photo3.jpg', label: 'ФОТО 3' },
        { src: 'gallery/photo4.jpg', label: 'ФОТО 4' },
        { src: 'gallery/photo5.jpg', label: 'ФОТО 5' },
        { src: 'gallery/photo6.jpg', label: 'ФОТО 6' },
        { src: 'gallery/photo7.jpg', label: 'ФОТО 7' },
        { src: 'gallery/photo8.jpg', label: 'ФОТО 8' },
    ];

    const scene = document.getElementById('carousel-scene');
    if (!scene) return;

    const N = IMAGES.length;
    const RX = 460, RY = 460, CX = 500, CY = 500;
    const els = [];

    IMAGES.forEach(item => {
        const div = document.createElement('div');
        div.className = 'c-card';

        const img = new Image();
        img.alt = item.label;
        img.onload = () => { div.innerHTML = ''; div.appendChild(img); };
        img.onerror = () => {
            div.innerHTML = `<div class="c-card-placeholder"><span style="font-size:26px">🖼</span><span>${item.label}</span></div>`;
        };
        img.src = item.src;

        scene.appendChild(div);
        els.push(div);
    });

    let angle = 0, paused = false, last = null;

    function render() {
        els.forEach((el, i) => {
            const theta = angle + (i / N) * Math.PI * 2;
            const x = CX + RX * Math.cos(theta) - 75;
            const y = CY + RY * 0.36 * Math.sin(theta) - 95;
            const s = 0.5 + 0.5 * ((Math.sin(theta) + 1) / 2);
            el.style.left      = x + 'px';
            el.style.top       = y + 'px';
            el.style.transform = `scale(${s.toFixed(3)}) rotate(${(Math.cos(theta) * -10).toFixed(1)}deg)`;
            el.style.zIndex    = Math.round(s * 100);
            el.style.opacity   = (0.4 + 0.6 * ((Math.sin(theta) + 1) / 2)).toFixed(3);
        });
    }

    function loop(ts) {
        if (!last) last = ts;
        if (!paused) angle -= (ts - last) / 1000 * 0.4;
        last = ts;
        render();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    document.getElementById('car-pause').addEventListener('click', () => {
        paused = !paused;
        document.getElementById('car-pause').innerHTML = paused ? '&#9654;' : '&#9646;&#9646;';
    });
    document.getElementById('car-prev').addEventListener('click', () => { angle += (2 * Math.PI / N); });
    document.getElementById('car-next').addEventListener('click', () => { angle -= (2 * Math.PI / N); });
}

// ── Init ──────────────────────────────────────────────────
window.onload = () => {
    initCarousel();
};
