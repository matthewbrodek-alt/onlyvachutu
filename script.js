const firebaseConfig = {
    apiKey:            "AIzaSyA_7n34vc1JM5PER6kvU9mMSzKfpu8s5YE",
    authDomain:        "my-portfolio-auth-ff1ce.firebaseapp.com",
    projectId:         "my-portfolio-auth-ff1ce",
    storageBucket:     "my-portfolio-auth-ff1ce.firebasestorage.app",
    messagingSenderId: "391088510675",
    appId:             "1:391088510675:web:ff1c4d866c37f921886626"
};

const TELEGRAM_BOT_TOKEN = "8664813567:AAEkqGdXuyrS43Pjfc1gB-KdVuOOReWrkGw";
const TELEGRAM_CHAT_ID   = "7451263058";

// ── i18n ───────────────────────────────────────────────────
const T = {
    ru: {
        // NAV
        nav_projects:    "Мои проекты",
        nav_about:       "О нас",
        nav_services:    "Услуги",
        nav_contacts:    "Контакты",
        back:            "Назад",
        btn_contact_short: "Связаться",

        // HERO
        hero_eyebrow:    "ПРЕМИАЛЬНЫЕ ИНТЕРФЕЙСЫ И АРХИТЕКТУРА",
        hero_title:      "НОВЫЙ СТАНДАРТ\nЦИФРОВОГО ОПЫТА",
        hero_sub:        "Мы создаём премиальные интерфейсы и архитектурные решения, которые задают будущее цифрового мира.",
        btn_projects:    "Смотреть проекты →",
        btn_contact:     "Связаться с нами",

        // FEATURES
        feat1_title:     "Инновации",
        feat1_desc:      "Используем передовые технологии для лучших результатов.",
        feat2_title:     "Надёжность",
        feat2_desc:      "Гарантируем стабильность и безопасность каждого решения.",
        feat3_title:     "Качество",
        feat3_desc:      "Внимание к деталям и высочайшие стандарты в каждом проекте.",
        feat4_title:     "Скорость",
        feat4_desc:      "Быстрая реализация проектов без потери качества.",

        // NITRO BOOST
        nb_title:        "НАШИ ПОКАЗАТЕЛИ",
        nb_m1:           "Довольных клиентов",
        nb_m2:           "Завершённых проектов",
        nb_m3:           "Лет опыта",
        nb_m4:           "Поддержка клиентов",
        nb_years:        " лет",

        // CAROUSEL
        carousel_title:  "НАШИ СОТРУДНИКИ",
        status_online:   "В СЕТИ",
        status_busy:     "ЗАНЯТ",
        status_offline:  "ОФЛАЙН",

        // PROJECTS
        open_site:       "Открыть сайт ➔",

        // ABOUT
        about_name:      "Михаил «Faraday» Романов",
        about_role:      "Full-Stack Dev · Digital Alchemist · Cat Enthusiast",
        about_bio1:      "Привет. Я тот самый человек, который в 3 часа ночи спорит с компилятором, держа на коленях кота. Победитель в этом споре всегда кот — но код в итоге работает.",
        about_bio2:      "Более 7 лет я превращаю хаос требований в элегантные цифровые решения: от микросервисных архитектур до анимаций, от которых у дизайнеров перехватывает дыхание. Мой стек — React, Firebase, Python, Node.js и бесконечная любовь к деталям.",
        about_bio3:      "Я верю, что каждый интерфейс должен быть живым — как хороший котик: тёплым, отзывчивым и немного непредсказуемым. Если ваш проект скучный, я его починю. Если он уже хорош — я сделаю его незабываемым.",
        about_quote:     "«Ничто не слишком прекрасно, чтобы быть истинным» — Майкл Фарадей.",

        // SERVICES
        svc1_title:      "Веб-разработка",
        svc1_desc:       "Премиальные сайты и веб-приложения с нуля до деплоя.",
        svc2_title:      "UI/UX Дизайн",
        svc2_desc:       "Интерфейсы, которые не просто красивы, но и работают идеально.",
        svc3_title:      "Автоматизация",
        svc3_desc:       "Боты, скрипты и интеграции, которые экономят ваше время.",
        svc4_title:      "Облачные решения",
        svc4_desc:       "Архитектура, масштабирование, Firebase, AWS — выберем лучшее.",
        svc5_title:      "Всё что нужно в цифровой реальности",
        svc5_desc:       "Нестандартная задача? Именно это нас и вдохновляет. Опишите проблему — мы найдём решение.",

        // CONTACTS / CHAT
        contacts_desc:   "Напишите мне прямо здесь — мессенджер синхронизирован с личными каналами для мгновенного ответа.",
        system_synced:   "SYSTEM SYNCED",
        statusOnline:    "В СЕТИ",
        chatTitle:       "Мессенджер",
        chatPlaceholder: "Напишите сообщение...",
        email_ph:        "Эл. почта",
        pass_ph:         "Пароль",
        loginBtn:        "Авторизоваться",
        login_required:  "Пожалуйста, войдите в аккаунт",
    },
    en: {
        // NAV
        nav_projects:    "My Projects",
        nav_about:       "About",
        nav_services:    "Services",
        nav_contacts:    "Contacts",
        back:            "Back",
        btn_contact_short: "Contact",

        // HERO
        hero_eyebrow:    "PREMIUM INTERFACES AND ARCHITECTURE",
        hero_title:      "NEW STANDARD OF\nDIGITAL EXPERIENCE",
        hero_sub:        "We build premium interfaces and architectural solutions that shape the future of the digital world.",
        btn_projects:    "View Projects →",
        btn_contact:     "Contact Us",

        // FEATURES
        feat1_title:     "Innovation",
        feat1_desc:      "We use cutting-edge technologies for the best results.",
        feat2_title:     "Reliability",
        feat2_desc:      "We guarantee stability and security in every solution.",
        feat3_title:     "Quality",
        feat3_desc:      "Attention to detail and the highest standards in every project.",
        feat4_title:     "Speed",
        feat4_desc:      "Fast project delivery without compromising quality.",

        // NITRO BOOST
        nb_title:        "OUR METRICS",
        nb_m1:           "Happy Clients",
        nb_m2:           "Projects Completed",
        nb_m3:           "Years of Experience",
        nb_m4:           "Client Support",
        nb_years:        " yrs",

        // CAROUSEL
        carousel_title:  "OUR TEAM",
        status_online:   "ONLINE",
        status_busy:     "BUSY",
        status_offline:  "OFFLINE",

        // PROJECTS
        open_site:       "Open Site ➔",

        // ABOUT
        about_name:      "Michael «Faraday» Romanov",
        about_role:      "Full-Stack Dev · Digital Alchemist · Cat Enthusiast",
        about_bio1:      "Hi. I'm the person who argues with the compiler at 3am with a cat on their lap. The cat always wins the argument — but the code works in the end.",
        about_bio2:      "For over 7 years I've been turning chaotic requirements into elegant digital solutions: from microservice architectures to animations that leave designers breathless. My stack — React, Firebase, Python, Node.js and infinite love for details.",
        about_bio3:      "I believe every interface should be alive — like a good cat: warm, responsive, and a little unpredictable. If your project is boring, I'll fix it. If it's already good — I'll make it unforgettable.",
        about_quote:     "\"Nothing is too wonderful to be true\" — Michael Faraday.",

        // SERVICES
        svc1_title:      "Web Development",
        svc1_desc:       "Premium websites and web apps from scratch to deployment.",
        svc2_title:      "UI/UX Design",
        svc2_desc:       "Interfaces that aren't just beautiful, but work perfectly.",
        svc3_title:      "Automation",
        svc3_desc:       "Bots, scripts and integrations that save your time.",
        svc4_title:      "Cloud Solutions",
        svc4_desc:       "Architecture, scaling, Firebase, AWS — we'll choose the best.",
        svc5_title:      "Everything in Digital Reality",
        svc5_desc:       "Non-standard task? That's exactly what inspires us. Describe the problem — we'll find a solution.",

        // CONTACTS / CHAT
        contacts_desc:   "Message me right here — the messenger is synced with my private channels for an instant response.",
        system_synced:   "SYSTEM SYNCED",
        statusOnline:    "ONLINE",
        chatTitle:       "Messenger",
        chatPlaceholder: "Type a message...",
        email_ph:        "Email",
        pass_ph:         "Password",
        loginBtn:        "Authorize",
        login_required:  "Please log in first",
    }
};

// ── Firebase init ──────────────────────────────────────────
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db   = firebase.firestore();
const auth = firebase.auth();
let currentLang = 'ru';
let chatUnsubscribe = null;

// ── i18n: применить язык ──────────────────────────────────
function setLang(lang) {
    currentLang = lang;

    // Активные классы на обоих переключателях
    ['lang-ru','lang-en','lang-ru-m','lang-en-m'].forEach(id => {
        var el = document.getElementById(id);
        if (el) el.classList.toggle('active', id === 'lang-' + lang || id === 'lang-' + lang + '-m');
    });

    // data-lang → innerText
    document.querySelectorAll('[data-lang]').forEach(function(el) {
        var key  = el.getAttribute('data-lang');
        var text = T[currentLang][key];
        if (!text) return;
        if (el.tagName === 'INPUT') { el.placeholder = text; return; }
        el.innerText = text;
    });

    // data-lang-ph → placeholder (inputs в contacts/modal)
    document.querySelectorAll('[data-lang-ph]').forEach(function(el) {
        var key = el.getAttribute('data-lang-ph');
        var text = T[currentLang][key];
        if (text) el.placeholder = text;
    });

    // Обновить тултипы карусели (статусы на нужном языке)
    updateCarouselStatuses();
}

// Обновляет статусы команды при смене языка
function updateCarouselStatuses() {
    // Тултип, если сейчас открыт — он обновится при следующем hover
    // Достаточно обновить TEAM-статусы в DOM через data атрибут (уже реализовано ниже)
}

// ── Навигация ─────────────────────────────────────────────
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
    var target = document.getElementById(pageId);
    if (target) target.classList.add('active');
    var main = document.getElementById('site-main');
    if (main) main.scrollTop = 0;
}

// ── Мобильное меню ────────────────────────────────────────
function toggleMobileNav() {
    var burger  = document.getElementById('burger');
    var nav     = document.getElementById('mobile-nav');
    var overlay = document.getElementById('mobile-nav-overlay');
    var isOpen  = nav.classList.contains('open');
    burger.classList.toggle('open', !isOpen);
    nav.classList.toggle('open', !isOpen);
    overlay.classList.toggle('open', !isOpen);
}
function closeMobileNav() {
    document.getElementById('burger').classList.remove('open');
    document.getElementById('mobile-nav').classList.remove('open');
    document.getElementById('mobile-nav-overlay').classList.remove('open');
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
    var el = document.getElementById('chat-msg');
    if (el) { el.value += emoji; el.focus(); }
}
function addEmojiModal(emoji) {
    var el = document.getElementById('modal-chat-msg');
    if (el) { el.value += emoji; el.focus(); }
}

// ── Единый обработчик клавиш ─────────────────────────────
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeMessenger();
        hideTooltip();
        closeMobileNav();
    }
    if (e.key === 'Enter') {
        var id = document.activeElement && document.activeElement.id;
        if (id === 'chat-msg')       sendMessage();
        if (id === 'modal-chat-msg') sendMessageModal();
    }
});

// ── Отправка сообщений ────────────────────────────────────
async function sendMessage()      { await _sendMsg('chat-msg'); }
async function sendMessageModal() { await _sendMsg('modal-chat-msg'); }

async function _sendMsg(inputId) {
    var input = document.getElementById(inputId);
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;
    if (!auth.currentUser) {
        alert(T[currentLang].login_required);
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
        }).catch(function() {});
    } catch (err) {
        console.error('sendMsg error:', err);
    }
}

// ── Auth ──────────────────────────────────────────────────
auth.onAuthStateChanged(function(user) {
    var lf  = document.getElementById('login-form');
    var ui  = document.getElementById('user-info');
    var mlf = document.getElementById('modal-login-form');
    var mui = document.getElementById('modal-user-info');

    if (user) {
        var name = user.email.split('@')[0];
        if (lf)  lf.style.display  = 'none';
        if (ui)  ui.style.display  = 'flex';
        if (mlf) mlf.style.display = 'none';
        if (mui) mui.style.display = 'flex';
        var uname = document.getElementById('user-name-contacts');
        if (uname) uname.innerText = name;

        if (chatUnsubscribe) chatUnsubscribe();
        chatUnsubscribe = db.collection('users').doc(user.uid).collection('messages')
            .orderBy('timestamp', 'asc')
            .onSnapshot(function(snap) {
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
    var win = document.getElementById(windowId);
    if (!win) return;
    win.innerHTML = '';
    snap.forEach(function(doc) {
        var m   = doc.data();
        var div = document.createElement('div');
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

// ═══════════════════════════════════════════════════════════
//  КАРУСЕЛЬ — с hover-тултипом рядом с карточкой
// ═══════════════════════════════════════════════════════════
var TEAM = [
    { name: 'Alex Chen',     role_ru: 'Lead Developer',    role_en: 'Lead Developer',    emoji: '👨‍💻', status: 'online', tags: ['React','Node.js','TypeScript'] },
    { name: 'Maria Santos',  role_ru: 'UI/UX Дизайнер',    role_en: 'UI/UX Designer',    emoji: '👩‍🎨', status: 'online', tags: ['Figma','Motion','Branding'] },
    { name: 'Dmitri Volkov', role_ru: 'DevOps Инженер',    role_en: 'DevOps Engineer',   emoji: '👨‍🔧', status: 'busy',   tags: ['Docker','AWS','CI/CD'] },
    { name: 'Sara Kim',      role_ru: 'Продакт Менеджер',  role_en: 'Product Manager',   emoji: '👩‍💼', status: 'online', tags: ['Agile','Roadmap','Analytics'] },
    { name: 'Jordan Lee',    role_ru: 'Full-Stack Разраб.', role_en: 'Full-Stack Dev',   emoji: '🧑‍💻', status: 'online', tags: ['Vue','Python','Firebase'] },
    { name: 'Felix Wagner',  role_ru: 'Аналитик Безопасн.',role_en: 'Security Analyst',  emoji: '🕵️', status: 'offline',tags: ['Pentesting','OWASP'] },
    { name: 'Yuki Tanaka',   role_ru: 'Data Scientist',    role_en: 'Data Scientist',    emoji: '👩‍🔬', status: 'online', tags: ['ML','Python','BigQuery'] },
    { name: 'Nina Okonkwo',  role_ru: 'Арт-директор',      role_en: 'Creative Director', emoji: '👩‍🎤', status: 'busy',   tags: ['Brand','3D','Concept'] },
];

var tooltip    = null;
var hideTimer  = null;

function getStatusText(status) {
    if (status === 'online')  return T[currentLang].status_online;
    if (status === 'busy')    return T[currentLang].status_busy;
    return T[currentLang].status_offline;
}

function showTooltip(memberIndex, cardEl) {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }

    var member = TEAM[memberIndex];
    tooltip = document.getElementById('c-tooltip');

    // Заполнить данными
    document.getElementById('ctt-avatar').innerText = member.emoji;
    document.getElementById('ctt-name').innerText   = member.name;
    document.getElementById('ctt-role').innerText   = currentLang === 'ru' ? member.role_ru : member.role_en;
    document.getElementById('ctt-status').innerText = getStatusText(member.status);
    var tagsEl = document.getElementById('ctt-tags');
    tagsEl.innerHTML = member.tags.map(function(t) { return '<span>' + t + '</span>'; }).join('');

    // Позиционирование относительно карточки
    positionTooltip(cardEl);

    tooltip.classList.add('visible');
}

function positionTooltip(cardEl) {
    if (!tooltip) return;
    var rect = cardEl.getBoundingClientRect();
    var tw   = 210; // примерная ширина тултипа
    var th   = 180; // примерная высота

    var left = rect.right + 14;
    var top  = rect.top + (rect.height / 2) - (th / 2);

    // Если не вмещается справа — показываем слева
    if (left + tw > window.innerWidth - 8) {
        left = rect.left - tw - 14;
    }
    // Не выходить за верх/низ
    if (top < 8) top = 8;
    if (top + th > window.innerHeight - 8) top = window.innerHeight - th - 8;

    tooltip.style.left = left + 'px';
    tooltip.style.top  = top  + 'px';
}

function hideTooltip() {
    hideTimer = setTimeout(function() {
        if (tooltip) tooltip.classList.remove('visible');
    }, 120);
}

function initCarousel() {
    var scene = document.getElementById('carousel-scene');
    if (!scene) return;

    tooltip = document.getElementById('c-tooltip');

    var N  = TEAM.length;
    var RX = 460, RY = 460, CX = 500, CY = 500;
    var els = [];

    TEAM.forEach(function(member, idx) {
        var div   = document.createElement('div');
        div.className = 'c-card';

        var inner = document.createElement('div');
        inner.className = 'c-card-inner';

        var img = new Image();
        img.alt = member.name;
        img.onload = function() {
            inner.innerHTML = '';
            inner.appendChild(img);
        };
        img.onerror = function() {
            inner.innerHTML =
                '<div class="c-card-placeholder">' +
                  '<div class="c-avatar">' + member.emoji + '</div>' +
                  '<div class="c-pname">' + member.name + '</div>' +
                '</div>';
        };
        img.src = 'gallery/photo' + (idx + 1) + '.jpg';

        div.appendChild(inner);
        scene.appendChild(div);
        els.push(div);

        // Hover → тултип
        div.addEventListener('mouseenter', function() { showTooltip(idx, div); });
        div.addEventListener('mouseleave', function() { hideTooltip(); });
        // Дать тултипу немного держаться при переходе мыши на него
        if (tooltip) {
            tooltip.addEventListener('mouseenter', function() {
                if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
            });
            tooltip.addEventListener('mouseleave', function() { hideTooltip(); });
        }
    });

    var angle = 0, paused = false, last = null;

    function render() {
        els.forEach(function(el, i) {
            var theta = angle + (i / N) * Math.PI * 2;
            var x = CX + RX * Math.cos(theta) - 75;
            var y = CY + RY * 0.36 * Math.sin(theta) - 95;
            var s = 0.5 + 0.5 * ((Math.sin(theta) + 1) / 2);
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
    document.getElementById('car-prev').addEventListener('click', function() {
        angle += (2 * Math.PI / N);
    });
    document.getElementById('car-next').addEventListener('click', function() {
        angle -= (2 * Math.PI / N);
    });
}

// ═══════════════════════════════════════════════════════════
//  NITRO BOOST — scroll-triggered счётчики
// ═══════════════════════════════════════════════════════════
function initNitroBoost() {
    var section = document.getElementById('nitro-boost');
    if (!section) return;
    var activated = false;

    function animateCount(el, target, duration) {
        var start = performance.now();
        function step(now) {
            var p = Math.min((now - start) / duration, 1);
            var eased = 1 - Math.pow(1 - p, 4);
            el.innerText = Math.round(eased * target);
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    function activate() {
        if (activated) return;
        activated = true;
        section.querySelectorAll('.nb-metric').forEach(function(metric, i) {
            var val   = parseInt(metric.dataset.val, 10);
            var fill  = metric.querySelector('.nb-fill');
            var count = metric.querySelector('.nb-count');
            var pct   = Math.min((val / 150) * 100, 100);
            setTimeout(function() {
                fill.style.width = pct + '%';
                animateCount(count, val, 1800);
            }, i * 200);
        });
    }

    var obs = new IntersectionObserver(function(entries) {
        entries.forEach(function(e) { if (e.isIntersecting) activate(); });
    }, { threshold: 0.3 });
    obs.observe(section);
}

// ═══════════════════════════════════════════════════════════
//  ВИДЕО: обходим политику autoplay
// ═══════════════════════════════════════════════════════════
function initVideo() {
    var video = document.getElementById('bg-video');
    if (!video) return;
    // Убедиться что muted = true (обязательно для autoplay)
    video.muted = true;
    var promise = video.play();
    if (promise !== undefined) {
        promise.catch(function() {
            // Если браузер заблокировал — запускаем по первому взаимодействию
            document.addEventListener('click', function handler() {
                video.play().catch(function() {});
                document.removeEventListener('click', handler);
            }, { once: true });
        });
    }
}

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
window.onload = function() {
    initVideo();
    initCarousel();
    initNitroBoost();
    setLang('ru'); // применить дефолтный язык
};
