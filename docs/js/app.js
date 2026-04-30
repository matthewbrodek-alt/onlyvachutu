/* ════════════════════════════════════════════════
   app.js — Инициализация, навигация, язык,
             карусель, Nitro Boost, Faraday HUD.
════════════════════════════════════════════════ */

var T = {
    ru: {
        nav_projects:'Мои проекты', nav_about:'О нас', nav_services:'Услуги', nav_contacts:'Контакты',
        back:'Назад', btn_contact_short:'Связаться', nav_login:'Войти', nav_logout:'Выйти',
        hero_eyebrow:'ПРЕМИАЛЬНЫЕ ИНТЕРФЕЙСЫ И АРХИТЕКТУРА',
        hero_title:'НОВЫЙ СТАНДАРТ ЦИФРОВОГО ОПЫТА',
        hero_sub:'Мы создаём премиальные интерфейсы и архитектурные решения, которые задают будущее цифрового мира.',
        btn_projects:'Смотреть проекты →', btn_contact:'Связаться с нами',
        feat1_title:'Инновации',   feat1_desc:'Используем передовые технологии для лучших результатов.',
        feat2_title:'Надёжность',  feat2_desc:'Гарантируем стабильность и безопасность каждого решения.',
        feat3_title:'Качество',    feat3_desc:'Внимание к деталям и высочайшие стандарты в каждом проекте.',
        feat4_title:'Скорость',    feat4_desc:'Быстрая реализация проектов без потери качества.',
        nb_title:'НАШИ ПОКАЗАТЕЛИ',
        nb_m1:'Довольных клиентов', nb_m2:'Завершённых проектов',
        nb_m3:'Лет опыта', nb_m4:'Поддержка клиентов', nb_years:' лет',
        carousel_title:'НАШИ СОТРУДНИКИ',
        status_online:'В СЕТИ', status_busy:'ЗАНЯТ', status_offline:'ОФЛАЙН',
        open_site:'Открыть сайт ➔',
        about_name:'Михаил «Faraday» Романов',
        about_role:'Full-Stack Dev · Digital Alchemist · Cat Enthusiast',
        about_bio1:'Привет. Я тот самый человек, который в 3 часа ночи спорит с компилятором, держа на коленях кота.',
        about_bio2:'Более 7 лет я превращаю хаос требований в элегантные цифровые решения.',
        about_bio3:'Я верю, что каждый интерфейс должен быть живым — как хороший котик.',
        about_quote:'«Ничто не слишком прекрасно, чтобы быть истинным» — Майкл Фарадей.',
        svc1_title:'Веб-разработка',      svc1_desc:'Премиальные сайты и веб-приложения с нуля до деплоя.',
        svc2_title:'UI/UX Дизайн',        svc2_desc:'Интерфейсы, которые не просто красивы, но и работают идеально.',
        svc3_title:'Автоматизация',        svc3_desc:'Боты, скрипты и интеграции, которые экономят ваше время.',
        svc4_title:'Облачные решения',     svc4_desc:'Архитектура, масштабирование, Firebase, AWS — выберем лучшее.',
        svc5_title:'Всё что нужно в цифровой реальности',
        svc5_desc:'Нестандартная задача? Именно это нас и вдохновляет. Опишите проблему — мы найдём решение.',
        contacts_desc:'Напишите мне прямо здесь — мессенджер синхронизирован с личными каналами.',
        system_synced:'SYSTEM SYNCED', statusOnline:'В СЕТИ',
        chatTitle:'Личный мессенджер', chatPlaceholder:'Написать сообщение...',
        email_ph:'Email', pass_ph:'Пароль', loginBtn:'Авторизоваться',
        login_required:'Пожалуйста, войдите в аккаунт',
    },
    en: {
        nav_projects:'My Projects', nav_about:'About', nav_services:'Services', nav_contacts:'Contacts',
        back:'Back', btn_contact_short:'Contact', nav_login:'Sign In', nav_logout:'Sign Out',
        hero_eyebrow:'PREMIUM INTERFACES AND ARCHITECTURE',
        hero_title:'NEW STANDARD OF DIGITAL EXPERIENCE',
        hero_sub:'We build premium interfaces and architectural solutions that shape the future of the digital world.',
        btn_projects:'View Projects →', btn_contact:'Contact Us',
        feat1_title:'Innovation',  feat1_desc:'We use cutting-edge technologies for the best results.',
        feat2_title:'Reliability', feat2_desc:'We guarantee stability and security in every solution.',
        feat3_title:'Quality',     feat3_desc:'Attention to detail and the highest standards in every project.',
        feat4_title:'Speed',       feat4_desc:'Fast project delivery without compromising quality.',
        nb_title:'OUR METRICS',
        nb_m1:'Happy Clients', nb_m2:'Projects Completed', nb_m3:'Years of Experience', nb_m4:'Client Support',
        nb_years:' yrs',
        carousel_title:'OUR TEAM',
        status_online:'ONLINE', status_busy:'BUSY', status_offline:'OFFLINE',
        open_site:'Open Site ➔',
        about_name:'Michael «Faraday» Romanov',
        about_role:'Full-Stack Dev · Digital Alchemist · Cat Enthusiast',
        about_bio1:'Hi. I\'m the person who argues with the compiler at 3am with a cat on their lap.',
        about_bio2:'For over 7 years I\'ve been turning chaotic requirements into elegant digital solutions.',
        about_bio3:'I believe every interface should be alive — like a good cat.',
        about_quote:'"Nothing is too wonderful to be true" — Michael Faraday.',
        svc1_title:'Web Development',   svc1_desc:'Premium websites and web apps from scratch to deployment.',
        svc2_title:'UI/UX Design',      svc2_desc:'Interfaces that aren\'t just beautiful, but work perfectly.',
        svc3_title:'Automation',        svc3_desc:'Bots, scripts and integrations that save your time.',
        svc4_title:'Cloud Solutions',   svc4_desc:'Architecture, scaling, Firebase, AWS — we\'ll choose the best.',
        svc5_title:'Everything in Digital Reality',
        svc5_desc:'Non-standard task? That\'s exactly what inspires us. Describe the problem — we\'ll find a solution.',
        contacts_desc:'Message me right here — the messenger is synced with my private channels.',
        system_synced:'SYSTEM SYNCED', statusOnline:'ONLINE',
        chatTitle:'Personal Messenger', chatPlaceholder:'Type a message...',
        email_ph:'Email', pass_ph:'Password', loginBtn:'Authorize',
        login_required:'Please log in first',
    }
};

var currentLang = 'ru';

/* ── ЯЗЫК ── */
function setLang(lang) {
    currentLang = lang;
    ['lang-ru','lang-en','lang-ru-m','lang-en-m'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.classList.toggle('active', id === 'lang-' + lang || id === 'lang-' + lang + '-m');
    });
    document.querySelectorAll('[data-lang]').forEach(function(el) {
        var key = el.getAttribute('data-lang');
        var text = T[lang][key];
        if (!text) return;
        if (el.tagName === 'INPUT') { el.placeholder = text; return; }
        el.innerText = text;
    });
    document.querySelectorAll('[data-lang-ph]').forEach(function(el) {
        var key = el.getAttribute('data-lang-ph');
        var text = T[lang][key];
        if (text) el.placeholder = text;
    });
    // Уведомляем chat.js о смене языка для переключения голоса TTS
    if (typeof onLangChanged === 'function') onLangChanged(lang);
}

/* ── НАВИГАЦИЯ ── */
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
    var target = document.getElementById(pageId);
    if (target) target.classList.add('active');
    var main = document.getElementById('site-main');
    if (main) main.scrollTop = 0;
}

/* ── МОБИЛЬНОЕ МЕНЮ ──
   FIX (WAI-ARIA): фокус перемещается на бургер ДО установки
   aria-hidden="true" на nav — устраняет ошибку из консоли:
   "Blocked aria-hidden on an element because its descendant
   retained focus."
── */
function toggleMobileNav() {
    var burger  = document.getElementById('burger');
    var nav     = document.getElementById('mobile-nav');
    var overlay = document.getElementById('mobile-nav-overlay');
    if (!nav) return;
    var isOpen = nav.classList.contains('open');
    if (isOpen) {
        // Сначала уводим фокус, потом скрываем
        if (burger) burger.focus();
        if (burger)  { burger.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
        nav.classList.remove('open');
        nav.setAttribute('aria-hidden', 'true');
        if (overlay) overlay.classList.remove('open');
    } else {
        if (burger)  { burger.classList.add('open'); burger.setAttribute('aria-expanded', 'true'); }
        nav.classList.add('open');
        nav.setAttribute('aria-hidden', 'false');
        if (overlay) overlay.classList.add('open');
    }
}

function closeMobileNav() {
    var burger  = document.getElementById('burger');
    var nav     = document.getElementById('mobile-nav');
    var overlay = document.getElementById('mobile-nav-overlay');
    // Фокус сначала, потом aria-hidden
    if (burger) burger.focus();
    if (burger)  { burger.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
    if (nav)     { nav.classList.remove('open'); nav.setAttribute('aria-hidden', 'true'); }
    if (overlay) overlay.classList.remove('open');
}

/* ── МЕССЕНДЖЕРЫ ── */
function openMessenger() {
    var m = document.getElementById('messenger-modal');
    if (m) { m.classList.add('open'); document.body.style.overflow = 'hidden'; }
}
function closeMessenger() {
    var m = document.getElementById('messenger-modal');
    if (m) { m.classList.remove('open'); document.body.style.overflow = ''; }
}
function closeMessengerIfOutside(e) {
    if (e.target === document.getElementById('messenger-modal')) closeMessenger();
}
function openFaradayChat() {
    var m = document.getElementById('faraday-modal');
    if (m) { m.classList.add('open'); document.body.style.overflow = 'hidden'; }
}
function closeFaradayChat() {
    var m = document.getElementById('faraday-modal');
    if (m) { m.classList.remove('open'); document.body.style.overflow = ''; }
}
function closeFaradayChatIfOutside(e) {
    if (e.target === document.getElementById('faraday-modal')) closeFaradayChat();
}

/* ── КЛАВИАТУРА ── */
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { closeMessenger(); closeFaradayChat(); closeMobileNav(); }
    if (e.key === 'Enter') {
        var id = document.activeElement && document.activeElement.id;
        if (id === 'auth-email' || id === 'auth-pass') handleLogin();
        if (id === 'modal-auth-email' || id === 'modal-auth-pass') handleLoginModal();
    }
});

/* ── ВИДЕО ── */
function initVideo() {
    var video = document.getElementById('bg-video');
    if (!video) return;
    video.muted = true;
    var p = video.play();
    if (p !== undefined) {
        p.catch(function() {
            var unlock = function() {
                video.play().catch(function(){});
                document.removeEventListener('click',      unlock);
                document.removeEventListener('touchstart', unlock);
            };
            document.addEventListener('click',      unlock, { once: true });
            document.addEventListener('touchstart', unlock, { once: true });
        });
    }
    var fv = document.getElementById('feature-video');
    if (fv) { fv.muted = true; fv.play().catch(function(){}); }
}

/* ── NITRO BOOST ── */
function initNitroBoost() {
    var section = document.getElementById('nitro-boost');
    if (!section) return;
    var done = false;
    function animateCount(el, target, dur) {
        var s = performance.now();
        (function step(now) {
            var p = Math.min((now - s) / dur, 1);
            el.innerText = Math.round((1 - Math.pow(1 - p, 4)) * target);
            if (p < 1) requestAnimationFrame(step);
        })(s);
    }
    new IntersectionObserver(function(entries) {
        if (!entries[0].isIntersecting || done) return;
        done = true;
        section.querySelectorAll('.nb-metric').forEach(function(m, i) {
            var val = parseInt(m.dataset.val, 10);
            var fill  = m.querySelector('.nb-fill');
            var count = m.querySelector('.nb-count');
            var pct   = Math.min((val / 150) * 100, 100);
            setTimeout(function() {
                if (fill)  fill.style.width = pct + '%';
                if (count) animateCount(count, val, 1800);
            }, i * 200);
        });
    }, { threshold: 0.3 }).observe(section);
}

/* ── КАРУСЕЛЬ ── */
var TEAM = [
    { name:'Alex Chen',     role_ru:'Lead Developer',     role_en:'Lead Developer',    emoji:'👨‍💻', status:'online',  tags:['React','Node.js','TypeScript'] },
    { name:'Maria Santos',  role_ru:'UI/UX Дизайнер',     role_en:'UI/UX Designer',    emoji:'👩‍🎨', status:'online',  tags:['Figma','Motion','Branding'] },
    { name:'Dmitri Volkov', role_ru:'DevOps Инженер',     role_en:'DevOps Engineer',   emoji:'👨‍🔧', status:'busy',    tags:['Docker','AWS','CI/CD'] },
    { name:'Sara Kim',      role_ru:'Продакт Менеджер',   role_en:'Product Manager',   emoji:'👩‍💼', status:'online',  tags:['Agile','Roadmap','Analytics'] },
    { name:'Jordan Lee',    role_ru:'Full-Stack Разраб.', role_en:'Full-Stack Dev',    emoji:'🧑‍💻', status:'online',  tags:['Vue','Python','Firebase'] },
    { name:'Felix Wagner',  role_ru:'Аналитик Безопасн.', role_en:'Security Analyst',  emoji:'🕵️', status:'offline', tags:['Pentesting','OWASP'] },
    { name:'Yuki Tanaka',   role_ru:'Data Scientist',     role_en:'Data Scientist',    emoji:'👩‍🔬', status:'online',  tags:['ML','Python','BigQuery'] },
    { name:'Nina Okonkwo',  role_ru:'Арт-директор',       role_en:'Creative Director', emoji:'👩‍🎤', status:'busy',    tags:['Brand','3D','Concept'] },
];

var tooltip   = null;
var hideTimer = null;

function getStatusText(s) {
    return s === 'online' ? (T[currentLang].status_online || 'ONLINE')
         : s === 'busy'   ? (T[currentLang].status_busy   || 'BUSY')
         :                   (T[currentLang].status_offline|| 'OFFLINE');
}

function showTooltip(idx, card) {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    var m = TEAM[idx];
    tooltip = document.getElementById('c-tooltip');
    if (!tooltip) return;
    var get = function(id) { return document.getElementById(id); };
    if (get('ctt-avatar')) get('ctt-avatar').innerText = m.emoji;
    if (get('ctt-name'))   get('ctt-name').innerText   = m.name;
    if (get('ctt-role'))   get('ctt-role').innerText   = currentLang === 'ru' ? m.role_ru : m.role_en;
    if (get('ctt-status')) get('ctt-status').innerText = getStatusText(m.status);
    if (get('ctt-tags'))   get('ctt-tags').innerHTML   = m.tags.map(function(t) { return '<span>' + t + '</span>'; }).join('');
    positionTooltip(card);
    tooltip.classList.add('visible');
}
function positionTooltip(card) {
    if (!tooltip) return;
    var r = card.getBoundingClientRect();
    var tw = 180, th = 180;
    var l = r.right + 12;
    var t = r.top + (r.height / 2) - (th / 2);
    if (l + tw > window.innerWidth - 8)  l = r.left - tw - 12;
    if (t < 8) t = 8;
    if (t + th > window.innerHeight - 8) t = window.innerHeight - th - 8;
    tooltip.style.left = l + 'px';
    tooltip.style.top  = t + 'px';
}
function hideTooltip() {
    hideTimer = setTimeout(function() { if (tooltip) tooltip.classList.remove('visible'); }, 120);
}

function initCarousel() {
    var scene = document.getElementById('carousel-scene');
    if (!scene) return;
    tooltip = document.getElementById('c-tooltip');
    var N = TEAM.length;
    var els = [];

    TEAM.forEach(function(m, idx) {
        var div   = document.createElement('div'); div.className = 'c-card';
        var inner = document.createElement('div'); inner.className = 'c-card-inner';
        var img   = new Image();
        img.alt     = m.name;
        img.onload  = function() { inner.innerHTML = ''; inner.appendChild(img); };
        img.onerror = function() {
            inner.innerHTML = '<div class="c-card-placeholder"><div class="c-avatar">' +
                m.emoji + '</div><div class="c-pname">' + m.name + '</div></div>';
        };
        img.src = 'assets/gallery/photo' + (idx + 1) + '.jpg';
        div.appendChild(inner); scene.appendChild(div); els.push(div);
        div.addEventListener('mouseenter', function() { showTooltip(idx, div); });
        div.addEventListener('mouseleave', hideTooltip);
        div.addEventListener('touchstart', function() { showTooltip(idx, div); }, { passive: true });
    });

    if (tooltip) {
        tooltip.addEventListener('mouseenter', function() { if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; } });
        tooltip.addEventListener('mouseleave', hideTooltip);
    }

    var CARD_W = 120, CARD_H = 150;
    var angle = 0, paused = false, last = null;

    function render() {
        var W = scene.offsetWidth  || 900;
        var H = scene.offsetHeight || 280;
        var mob = window.innerWidth < 600;

        /* ── Точки A (левый низ) и B (правый низ) ──
           A = (paddingX, H - paddingY)
           B = (W - paddingX, H - paddingY)
           Центр полуокружности = середина AB, на той же высоте.
           Радиус по X = (B.x - A.x) / 2
           Радиус по Y = flatness * RX  (эллипс, не круг)
           Карточки идут от θ=π (левый край) до θ=0 (правый край)
           через верх (θ=π/2 → верхняя точка дуги).
        ── */
        var padX = mob ? 20  : 60;   /* отступ от краёв по X   */
        var padY = mob ? 10  : 20;   /* отступ от низа по Y    */
        var flat = mob ? 0.55 : 0.45; /* приплюснутость эллипса */

        var ax = padX;
        var bx = W - padX;
        var cy = H - padY;           /* Y центра эллипса = линия AB */
        var cx = (ax + bx) / 2;      /* X центра = середина AB      */
        var RX = (bx - ax) / 2;
        var RY = RX * flat;

        els.forEach(function(el, i) {
            /* Равномерно распределяем N карточек по дуге π..0
               (слева направо по верхней полуокружности)        */
            var t     = (i / N + angle) % 1;          /* 0..1 */
            var theta = Math.PI - t * Math.PI;        /* π → 0 */

            var x = cx + RX * Math.cos(theta) - CARD_W / 2;
            var y = cy - RY * Math.sin(theta)  - CARD_H / 2;
            /* sin(theta) на верхней дуге: 0 по краям, 1 в центре */

            /* Масштаб и прозрачность: максимум в центре вверху,
               минимум у краёв (A и B) где карточки "ныряют"     */
            var life = Math.sin(theta);               /* 0..1    */
            var s    = 0.45 + 0.55 * life;
            var o    = 0.15 + 0.85 * life;
            var rot  = Math.cos(theta) * -12;         /* наклон  */

            el.style.left      = x.toFixed(1) + 'px';
            el.style.top       = y.toFixed(1) + 'px';
            el.style.transform = 'scale(' + s.toFixed(3) + ') rotate(' + rot.toFixed(1) + 'deg)';
            el.style.zIndex    = Math.round(s * 100);
            el.style.opacity   = o.toFixed(3);
        });
    }

    function loop(ts) {
        if (!last) last = ts;
        if (!paused && !window.faradaySystemPaused) angle = (angle + (ts - last) / 1000 * 0.08) % 1;
        last = ts; render(); requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    window.addEventListener('resize', render);

    var pb = document.getElementById('car-pause');
    var pv = document.getElementById('car-prev');
    var nx = document.getElementById('car-next');
    if (pb) pb.addEventListener('click', function() { paused = !paused; this.innerHTML = paused ? '&#9654;' : '&#9646;&#9646;'; });
    if (pv) pv.addEventListener('click', function() { angle = (angle - 1 / N + 1) % 1; });
    if (nx) nx.addEventListener('click', function() { angle = (angle + 1 / N) % 1; });
}

/* ════════════════════════════════════════════════
   FARADAY CORE
   FIX: permission-denied на faraday_protocol
   теперь обрабатывается тихо — документ просто
   может не существовать; система работает с
   дефолтными значениями.
════════════════════════════════════════════════ */
window.faradaySystemPaused = false;

function initFaradayCore() {
    if (!window.db) return;

    window.db.collection('system_config').doc('faraday_protocol')
        .onSnapshot(function(snap) {
            if (!snap.exists) return;
            var cfg = snap.data();
            if (cfg.ui_theme) {
                var root = document.documentElement;
                if (cfg.ui_theme.accent) root.style.setProperty('--accent', cfg.ui_theme.accent);
                if (cfg.ui_theme.blur)   root.style.setProperty('--nav-blur', cfg.ui_theme.blur);
            }
            var vEl = document.getElementById('protocol-version');
            if (vEl && cfg.version) vEl.innerText = 'Ver: ' + cfg.version;
            var paused = cfg.safety_protocols !== 'active';
            window.faradaySystemPaused = paused;
            var hud = document.getElementById('hud-status');
            var pil = document.getElementById('faraday-hud-status-badge');
            var vid = document.getElementById('bg-video');
            if (hud) hud.innerText = paused ? 'SYSTEM: PAUSED' : 'SYSTEM: ACTIVE';
            if (pil) pil.innerText = paused ? 'ПАУЗА' : 'АКТИВЕН';
            if (vid) paused ? vid.pause() : vid.play().catch(function(){});
        }, function(err) {
            // permission-denied — документ не создан в Firestore.
            // Не критично: тихо пропускаем, система работает с дефолтами.
            if (err.code !== 'permission-denied') {
                console.warn('[Faraday] Protocol:', err.code);
            }
        });

    setTimeout(function() {
        var feed = document.getElementById('faraday-feed');
        if (!feed || typeof appendFaradayAIMsg !== 'function') return;
        appendFaradayAIMsg(feed, getFaradayMood());
        window.db.collection('faraday_memory')
            .orderBy('timestamp', 'desc').limit(1).get()
            .then(function(snap) {
                if (snap.empty) return;
                var note = snap.docs[0].data().content;
                if (note) appendFaradayAIMsg(feed, 'Последняя запись: «' + note + '». Продолжим?');
            }).catch(function(){});
    }, 1400);

    var THOUGHTS = [
        'Анализирую трафик... Угроз не обнаружено.',
        'Оптимизация завершена. Показатели в норме.',
        'Рекомендую проверить зависимости в проекте.',
        'Мониторинг активен. Все протоколы штатно.',
        'Фоновое сканирование: аномалий не выявлено.',
    ];
    setInterval(function() {
        var modal = document.getElementById('faraday-modal');
        if (!modal || !modal.classList.contains('open')) return;
        var feed = document.getElementById('faraday-feed');
        if (feed && typeof appendFaradayAIMsg === 'function')
            appendFaradayAIMsg(feed, THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)]);
    }, 600000);

    if (typeof initAIModules === 'function') initAIModules();
}

function getFaradayMood() {
    var h = new Date().getHours();
    var memHigh = window.performance && window.performance.memory &&
                  window.performance.memory.usedJSHeapSize > 50000000;
    if (memHigh)  return 'Предупреждение: высокая нагрузка памяти.';
    if (h < 6)    return 'Режим пониженного энергопотребления. Слушаю...';
    if (h < 12)   return 'Утренний протокол. Системы работают штатно.';
    if (h < 18)   return 'Все системы в норме. Производительность оптимальна.';
    if (h < 22)   return 'Вечерний режим. Снижаю приоритет фоновых задач.';
    return 'Поздний протокол. Системы ожидают команд.';
}

window.onload = function() {
    initVideo();
    initCarousel();
    initNitroBoost();
    setLang('ru');
};

console.log('%cNitro Hub v8.0 ✓', 'color:#00ff88;font-size:14px;font-weight:bold;');
