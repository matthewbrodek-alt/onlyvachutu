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
        nb_title:       "НАШИ ПОКАЗАТЕЛИ",
        nb_m1:          "Довольных клиентов",
        nb_m2:          "Завершённых проектов",
        nb_m3:          "Лет опыта",
        nb_m4:          "Поддержка клиентов",
        carousel_title: "НАШИ СОТРУДНИКИ",
        open_site:      "Открыть сайт ➔",
        about_name:     "Михаил «Faraday» Романов",
        about_role:     "Full-Stack Dev · Digital Alchemist · Cat Enthusiast",
        about_bio1:     "Привет. Я тот самый человек, который в 3 часа ночи спорит с компилятором, держа на коленях кота. Победитель в этом споре всегда кот — но код в итоге работает.",
        about_bio2:     "Более 7 лет я превращаю хаос требований в элегантные цифровые решения: от микросервисных архитектур до анимаций, от которых у дизайнеров перехватывает дыхание. Мой стек — React, Firebase, Python, Node.js и бесконечная любовь к деталям.",
        about_bio3:     "Я верю, что каждый интерфейс должен быть живым — как хороший котик: тёплым, отзывчивым и немного непредсказуемым. Если ваш проект скучный, я его починю. Если он уже хорош — я сделаю его незабываемым.",
        about_quote:    "«Ничто не слишком прекрасно, чтобы быть истинным» — Майкл Фарадей.",
        svc1_title:     "Веб-разработка",
        svc1_desc:      "Премиальные сайты и веб-приложения с нуля до деплоя.",
        svc2_title:     "UI/UX Дизайн",
        svc2_desc:      "Интерфейсы, которые не просто красивы, но и работают идеально.",
        svc3_title:     "Автоматизация",
        svc3_desc:      "Боты, скрипты и интеграции, которые экономят ваше время.",
        svc4_title:     "Облачные решения",
        svc4_desc:      "Архитектура, масштабирование, Firebase, AWS — выберем лучшее.",
        svc5_title:     "Всё что нужно в цифровой реальности",
        svc5_desc:      "Нестандартная задача? Именно это нас и вдохновляет. Опишите проблему — мы найдём решение.",
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
        nb_title:       "OUR METRICS",
        nb_m1:          "Happy Clients",
        nb_m2:          "Projects Completed",
        nb_m3:          "Years of Experience",
        nb_m4:          "Client Support",
        carousel_title: "OUR TEAM",
        open_site:      "Open Site ➔",
        about_name:     "Michael «Faraday» Romanov",
        about_role:     "Full-Stack Dev · Digital Alchemist · Cat Enthusiast",
        about_bio1:     "Hi. I'm the person who argues with the compiler at 3am with a cat on their lap. The cat always wins the argument — but the code works in the end.",
        about_bio2:     "For over 7 years I've been turning chaotic requirements into elegant digital solutions: from microservice architectures to animations that leave designers breathless.",
        about_bio3:     "I believe every interface should be alive — like a good cat: warm, responsive, and a little unpredictable. If your project is boring, I'll fix it. If it's already good — I'll make it unforgettable.",
        about_quote:    "\"Nothing is too wonderful to be true\" — Michael Faraday.",
        svc1_title:     "Web Development",
        svc1_desc:      "Premium websites and web apps from scratch to deployment.",
        svc2_title:     "UI/UX Design",
        svc2_desc:      "Interfaces that aren't just beautiful, but work perfectly.",
        svc3_title:     "Automation",
        svc3_desc:      "Bots, scripts and integrations that save your time.",
        svc4_title:     "Cloud Solutions",
        svc4_desc:      "Architecture, scaling, Firebase, AWS — we'll choose the best.",
        svc5_title:     "Everything in Digital Reality",
        svc5_desc:      "Non-standard task? That's exactly what inspires us. Describe the problem — we'll find a solution.",
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
let chatUnsubscribe = null;

// ── i18n ──────────────────────────────────────────────────
function setLang(lang) {
    currentLang = lang;
    document.querySelectorAll('.lang-option').forEach(el => el.classList.remove('active'));
    document.getElementById('lang-' + lang).classList.add('active');
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
    const main = document.getElementById('site-main');
    if (main) main.scrollTop = 0;
}

// ── Мобильное меню ────────────────────────────────────────
function toggleMobileNav() {
    const burger  = document.getElementById('burger');
    const nav     = document.getElementById('mobile-nav');
    const overlay = document.getElementById('mobile-nav-overlay');
    const isOpen  = nav.classList.contains('open');
    burger.classList.toggle('open', !isOpen);
    nav.classList.toggle('open', !isOpen);
    overlay.classList.toggle('open', !isOpen);
    document.body.style.overflow = isOpen ? '' : 'hidden';
}
function closeMobileNav() {
    document.getElementById('burger').classList.remove('open');
    document.getElementById('mobile-nav').classList.remove('open');
    document.getElementById('mobile-nav-overlay').classList.remove('open');
    document.body.style.overflow = '';
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

// ── Единый keydown ────────────────────────────────────────
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeMessenger();
        closeTeamModal();
        closeMobileNav();
    }
    if (e.key === 'Enter') {
        const id = document.activeElement && document.activeElement.id;
        if (id === 'chat-msg')       sendMessage();
        if (id === 'modal-chat-msg') sendMessageModal();
    }
});

// ── Отправка сообщений ────────────────────────────────────
async function sendMessage()      { await _sendMsg('chat-msg'); }
async function sendMessageModal() { await _sendMsg('modal-chat-msg'); }

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
        fetch('https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: '👤 ' + auth.currentUser.email + '\n💬 ' + text
            })
        }).catch(() => {});
    } catch (err) {
        console.error('sendMsg error:', err);
    }
}

// ── Auth ──────────────────────────────────────────────────
auth.onAuthStateChanged(user => {
    const lf  = document.getElementById('login-form');
    const ui  = document.getElementById('user-info');
    const mlf = document.getElementById('modal-login-form');
    const mui = document.getElementById('modal-user-info');

    if (user) {
        const name = user.email.split('@')[0];
        if (lf)  lf.style.display  = 'none';
        if (ui)  ui.style.display  = 'flex';
        if (mlf) mlf.style.display = 'none';
        if (mui) mui.style.display = 'flex';
        const uname = document.getElementById('user-name-contacts');
        if (uname) uname.innerText = name;

        if (chatUnsubscribe) chatUnsubscribe();
        chatUnsubscribe = db.collection('users').doc(user.uid).collection('messages')
            .orderBy('timestamp', 'asc')
            .onSnapshot(snap => {
                renderMessages(snap, 'chat-window');
                renderMessages(snap, 'modal-chat-window');
            });
    } else {
        if (lf)  lf.style.display  = 'flex';
        if (ui)  ui.style.display  = 'none';
        if (mlf) mlf.style.display = 'flex';
        if (mui) mui.style.display = 'none';
        if (chatUnsubscribe) { chatUnsubscribe(); chatUnsubscribe = null; }
    }
});

function renderMessages(snap, windowId) {
    const win = document.getElementById(windowId);
    if (!win) return;
    win.innerHTML = '';
    snap.forEach(doc => {
        const m   = doc.data();
        const div = document.createElement('div');
        div.className = 'msg-box ' + (m.sender === 'user' ? 'sent' : 'received');
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

// ── Карусель с командой и попапами ────────────────────────
const TEAM = [
    { name: 'Alex Chen',      role: 'Lead Developer',    emoji: '👨‍💻', status: 'В СЕТИ',  tags: ['React','Node.js','TypeScript'] },
    { name: 'Maria Santos',   role: 'UI/UX Designer',    emoji: '👩‍🎨', status: 'В СЕТИ',  tags: ['Figma','Motion','Branding'] },
    { name: 'Dmitri Volkov',  role: 'DevOps Engineer',   emoji: '👨‍🔧', status: 'ЗАНЯТ',   tags: ['Docker','AWS','CI/CD'] },
    { name: 'Sara Kim',       role: 'Product Manager',   emoji: '👩‍💼', status: 'В СЕТИ',  tags: ['Agile','Roadmap','Analytics'] },
    { name: 'Jordan Lee',     role: 'Full-Stack Dev',    emoji: '🧑‍💻', status: 'В СЕТИ',  tags: ['Vue','Python','Firebase'] },
    { name: 'Felix Wagner',   role: 'Security Analyst',  emoji: '🕵️',  status: 'ОФЛАЙН', tags: ['Pentesting','OWASP','Audit'] },
    { name: 'Yuki Tanaka',    role: 'Data Scientist',    emoji: '👩‍🔬', status: 'В СЕТИ',  tags: ['ML','Python','BigQuery'] },
    { name: 'Nina Okonkwo',   role: 'Creative Director', emoji: '👩‍🎤', status: 'ЗАНЯТ',   tags: ['Brand','3D','Concept'] },
];

function openTeamModal(index) {
    const member = TEAM[index];
    document.getElementById('tm-avatar').innerText = member.emoji;
    document.getElementById('tm-name').innerText   = member.name;
    document.getElementById('tm-role').innerText   = member.role;
    document.getElementById('tm-status').innerText = member.status;
    const tags = document.getElementById('tm-tags');
    tags.innerHTML = member.tags.map(t => '<span>' + t + '</span>').join('');
    document.getElementById('team-modal').classList.add('open');
}
function closeTeamModal() {
    document.getElementById('team-modal').classList.remove('open');
}
function closeTeamModalIfOutside(e) {
    if (e.target === document.getElementById('team-modal')) closeTeamModal();
}

function initCarousel() {
    const scene = document.getElementById('carousel-scene');
    if (!scene) return;

    const N  = TEAM.length;
    const RX = 460, RY = 460, CX = 500, CY = 500;
    const els = [];

    TEAM.forEach((member, idx) => {
        const div = document.createElement('div');
        div.className = 'c-card';
        div.title = member.name;

        const img = new Image();
        img.alt = member.name;
        img.onload = () => {
            div.innerHTML = '';
            div.appendChild(img);
        };
        img.onerror = () => {
            div.innerHTML =
                '<div class="c-card-placeholder">' +
                  '<div class="c-avatar">' + member.emoji + '</div>' +
                  '<div class="c-name">' + member.name + '</div>' +
                '</div>';
        };
        img.src = 'gallery/photo' + (idx + 1) + '.jpg';

        div.addEventListener('click', () => openTeamModal(idx));
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
            el.style.transform = 'scale(' + s.toFixed(3) + ') rotate(' + (Math.cos(theta) * -10).toFixed(1) + 'deg)';
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

    document.getElementById('car-pause').addEventListener('click', function() {
        paused = !paused;
        this.innerHTML = paused ? '&#9654;' : '&#9646;&#9646;';
    });
    document.getElementById('car-prev').addEventListener('click', () => { angle += (2 * Math.PI / N); });
    document.getElementById('car-next').addEventListener('click', () => { angle -= (2 * Math.PI / N); });
}

// ── NITRO BOOST — scroll-triggered анимация ───────────────
function initNitroBoost() {
    const section = document.getElementById('nitro-boost');
    if (!section) return;

    let activated = false;

    // Функция анимации счётчика
    function animateCount(el, target, duration) {
        const start = performance.now();
        function step(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // easeOutQuart
            const eased = 1 - Math.pow(1 - progress, 4);
            el.innerText = Math.round(eased * target);
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    function activate() {
        if (activated) return;
        activated = true;
        section.classList.add('activated');

        const metrics = section.querySelectorAll('.nb-metric');
        metrics.forEach((metric, i) => {
            const val    = parseInt(metric.dataset.val, 10);
            const fill   = metric.querySelector('.nb-fill');
            const count  = metric.querySelector('.nb-count');
            const pct    = Math.min((val / 150) * 100, 100);
            const delay  = i * 180;

            setTimeout(() => {
                fill.style.width = pct + '%';
                animateCount(count, val, 1600);
            }, delay);
        });
    }

    // IntersectionObserver для scroll-триггера
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) activate(); });
    }, { threshold: 0.3 });

    observer.observe(section);
}

// ── Init ──────────────────────────────────────────────────
window.onload = () => {
    initCarousel();
    initNitroBoost();
};
