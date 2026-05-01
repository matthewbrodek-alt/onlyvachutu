/* ════════════════════════════════════════════════
   app.js — Инициализация, навигация, язык,
             карусель, Nitro Boost, Faraday HUD.
════════════════════════════════════════════════ */

var T = {
    ru: {
        nav_projects:'Мои проекты', nav_about:'О нас', nav_services:'Услуги', nav_contacts:'Контакты',
        back:'Назад', btn_contact_short:'Связаться', nav_login:'Войти', nav_logout:'Выйти',
        hero_eyebrow:'HIGH-END РАЗРАБОТКА И АВТОМАТИЗАЦИЯ БИЗНЕСА',
        hero_title:'Архитектура цифрового превосходства: от идеи до High-End продукта',
        hero_sub:'Разработка сложных веб-сервисов и автоматизация бизнеса с фокусом на конверсию и безупречный UX.',
        btn_projects:'Смотреть проекты →', btn_contact:'Связаться с нами',
        feat1_title:'Чистый код',      feat1_desc:'Читаемая архитектура, которую легко масштабировать и поддерживать.',
        feat2_title:'Гарантия 1 год',  feat2_desc:'Исправляю баги бесплатно в течение года после сдачи проекта.',
        feat3_title:'Дедлайны',        feat3_desc:'Соблюдение сроков — не исключение, а стандарт работы.',
        feat4_title:'Прямой контакт',  feat4_desc:'Общение напрямую с разработчиком без менеджеров и посредников.',
        nb_title:'НАШИ ПОКАЗАТЕЛИ',
        nb_m1:'Клиентов возвращаются', nb_m2:'Индивидуальных решений',
        nb_m3:'В High-End разработке', nb_m4:'LTV-сопровождение',
        nb_years:' года',
        carousel_title:'НАШИ СОТРУДНИКИ',
        status_online:'В СЕТИ', status_busy:'ЗАНЯТ', status_offline:'ОФЛАЙН',
        open_site:'Открыть сайт ➔',
        about_name:'Artem Lee',
        about_role:'Full-Stack Dev · Digital Alchemist · Cat Enthusiast',
        about_bio1:'Привет. Я тот самый человек, который в 3 часа ночи спорит с компилятором, держа на коленях кота. Победитель в этом споре всегда кот — но код в итоге работает.',
        about_bio2:'Более 3 лет я строю High-End решения: от микросервисных архитектур до анимаций, от которых у дизайнеров перехватывает дыхание. React, Firebase, Node.js и бесконечная любовь к деталям.',
        about_bio3:'Я верю, что каждый интерфейс должен быть живым — как хороший котик: тёплым, отзывчивым и немного непредсказуемым. Если ваш проект скучный — я его починю.',
        about_quote:'«Ничто не слишком прекрасно, чтобы быть истинным» — Майкл Фарадей.',
        svc1_title:'Веб-разработка',
        svc1_desc:'Создание масштабируемых платформ. Высоконагруженные системы, которые растут вместе с вашим бизнесом без багов и тормозов.',
        svc2_title:'UI/UX Дизайн',
        svc2_desc:'Интерфейсы, которые конвертируют. Не просто красиво — каждый элемент работает на результат.',
        svc3_title:'Автоматизация',
        svc3_desc:'Освобождение 40+ рабочих часов в месяц. Умные боты и n8n-сценарии, которые заменяют целый отдел рутинных сотрудников.',
        svc4_title:'Облачные решения',
        svc4_desc:'Архитектура под нагрузку. Firebase, AWS — выбираю то, что даст максимум надёжности при минимуме затрат.',
        svc5_title:'Нестандартная задача?',
        svc5_desc:'Именно это вдохновляет больше всего. Опишите проблему — найдём решение, о котором вы не думали.',
        contacts_desc:'Напишите мне прямо здесь — мессенджер синхронизирован с личными каналами для мгновенного ответа.',
        system_synced:'SYSTEM SYNCED', statusOnline:'В СЕТИ',
        chatTitle:'Личный мессенджер', chatPlaceholder:'Написать сообщение...',
        email_ph:'Email', pass_ph:'Пароль', loginBtn:'Авторизоваться',
        login_required:'Пожалуйста, войдите в аккаунт',
    },
    en: {
        nav_projects:'My Projects', nav_about:'About', nav_services:'Services', nav_contacts:'Contacts',
        back:'Back', btn_contact_short:'Contact', nav_login:'Sign In', nav_logout:'Sign Out',
        hero_eyebrow:'HIGH-END DEVELOPMENT AND BUSINESS AUTOMATION',
        hero_title:'Architecture of Digital Excellence: from idea to High-End product',
        hero_sub:'Complex web service development and business automation focused on conversion and flawless UX.',
        btn_projects:'View Projects →', btn_contact:'Contact Us',
        feat1_title:'Clean Code',       feat1_desc:'Readable architecture that\'s easy to scale and maintain.',
        feat2_title:'1-Year Guarantee', feat2_desc:'I fix bugs for free within a year after project delivery.',
        feat3_title:'Deadlines',        feat3_desc:'Meeting deadlines isn\'t an exception — it\'s the standard.',
        feat4_title:'Direct Contact',   feat4_desc:'Talk directly to the developer — no managers, no middlemen.',
        nb_title:'OUR METRICS',
        nb_m1:'Clients come back', nb_m2:'Custom solutions', nb_m3:'In High-End dev', nb_m4:'LTV support',
        nb_years:' yrs',
        carousel_title:'OUR TEAM',
        status_online:'ONLINE', status_busy:'BUSY', status_offline:'OFFLINE',
        open_site:'Open Site ➔',
        about_name:'Artem Lee',
        about_role:'Full-Stack Dev · Digital Alchemist · Cat Enthusiast',
        about_bio1:'Hi. I\'m the person who argues with the compiler at 3am with a cat on their lap. The cat always wins — but the code works in the end.',
        about_bio2:'For over 3 years I\'ve been building High-End solutions: from microservice architectures to animations that take designers\' breath away. React, Firebase, Node.js and endless attention to detail.',
        about_bio3:'I believe every interface should be alive — like a good cat: warm, responsive, and a little unpredictable.',
        about_quote:'"Nothing is too wonderful to be true" — Michael Faraday.',
        svc1_title:'Web Development',
        svc1_desc:'Building scalable platforms. High-load systems that grow with your business — no bugs, no lag.',
        svc2_title:'UI/UX Design',
        svc2_desc:'Interfaces that convert. Not just beautiful — every element works toward a result.',
        svc3_title:'Automation',
        svc3_desc:'Free up 40+ work hours per month. Smart bots and n8n workflows that replace an entire routine department.',
        svc4_title:'Cloud Solutions',
        svc4_desc:'Architecture built for load. Firebase, AWS — I pick what gives maximum reliability at minimum cost.',
        svc5_title:'Unusual challenge?',
        svc5_desc:'That\'s exactly what inspires me most. Describe the problem — we\'ll find a solution you haven\'t thought of.',
        contacts_desc:'Message me right here — synced with my private channels for instant response.',
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
    const scene = document.getElementById('carousel-scene');
    if (!scene) return;
  
    const tooltip = document.getElementById('c-tooltip');
    const N = TEAM.length;
    const els = [];
  
    // ── Создание карточек ──
    TEAM.forEach((m, idx) => {
      const div = document.createElement('div');
      div.className = 'c-card';
      div.style.left = '0px';
      div.style.top  = '0px';
  
      const inner = document.createElement('div');
      inner.className = 'c-card-inner';
  
      const img = new Image();
      img.alt = m.name;
      img.loading = 'lazy';
      img.decoding = 'async';
  
      img.onload = () => {
        inner.innerHTML = '';
        inner.appendChild(img);
      };
      img.onerror = () => {
        inner.innerHTML = `
          <div class="c-card-placeholder">
            <div class="c-avatar">${m.emoji}</div>
            <div class="c-pname">${m.name}</div>
          </div>`;
      };
      img.src = 'assets/gallery/photo' + (idx + 1) + '.jpg';
  
      div.appendChild(inner);
      scene.appendChild(div);
      els.push(div);
  
      div.addEventListener('mouseenter', () => showTooltip(idx, div));
      div.addEventListener('mouseleave', hideTooltip);
      div.addEventListener('touchstart', () => showTooltip(idx, div), { passive: true });
    });
  
    if (tooltip) {
      tooltip.addEventListener('mouseenter', () => {
        if (window.hideTimer) { clearTimeout(window.hideTimer); window.hideTimer = null; }
      });
      tooltip.addEventListener('mouseleave', hideTooltip);
    }
  
    // ── Состояние ──
    let angle = 0;
    let paused = false;
    let last = null;
  
    // Уважаем prefers-reduced-motion
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const SPEED = reduceMotion ? 0 : 0.05; // оборотов в секунду
  
    // ── Брейкпоинты ──
    function getMetrics() {
      const W = scene.clientWidth  || window.innerWidth;
      const H = scene.clientHeight || 280;
      const vw = window.innerWidth;
  
      let cw, ch;
      if (vw < 600)       { cw = 70;  ch = 90;  }   // mobile
      else if (vw < 1024) { cw = 100; ch = 128; }   // tablet
      else                { cw = 120; ch = 150; }   // desktop
  
      // Центр сцены — строго по горизонтали
      const cx = W / 2;
      // Карточки «стоят» на нижней линии сцены
      const cy = H - ch * 0.15;
  
      // Радиусы с запасом, чтобы карточки не вылетали за края сцены
      const RX = Math.max(60, (W / 2) - cw / 2 - 8);
      const RY = Math.max(60, H - ch - 8);
  
      return { W, H, cw, ch, cx, cy, RX, RY };
    }
  
    function render() {
      const { cw, ch, cx, cy, RX, RY } = getMetrics();
  
      for (let i = 0; i < N; i++) {
        const t     = ((i / N) + angle) % 1;
        const theta = Math.PI - t * Math.PI; // полукруг сверху
  
        const x = cx + RX * Math.cos(theta) - cw / 2;
        const y = cy - RY * Math.sin(theta) - ch / 2;
  
        const life = Math.sin(theta);          // 0..1
        const s    = 0.50 + 0.50 * life;
        const o    = 0.15 + 0.85 * life;
        const rot  = Math.cos(theta) * -20;
  
        const el = els[i];
        el.style.width  = cw + 'px';
        el.style.height = ch + 'px';
        el.style.transform =
          `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) ` +
          `scale(${s.toFixed(3)}) rotate(${rot.toFixed(1)}deg)`;
        el.style.zIndex  = Math.round(s * 100);
        el.style.opacity = o.toFixed(3);
      }
    }
  
    function loop(ts) {
      if (last == null) last = ts;
      if (!paused && !window.faradaySystemPaused && SPEED > 0) {
        angle = (angle + (ts - last) / 1000 * SPEED) % 1;
      }
      last = ts;
      render();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  
    // ── Реакция на изменение размеров ──
    window.addEventListener('resize', render);
    if ('ResizeObserver' in window) {
      new ResizeObserver(render).observe(scene);
    }
  
    // ── Кнопки управления ──
    const pb = document.getElementById('car-pause');
    const pv = document.getElementById('car-prev');
    const nx = document.getElementById('car-next');
  
    if (pb) {
      pb.addEventListener('click', function () {
        paused = !paused;
        this.innerHTML = paused ? '&#9654;' : '&#9646;&#9646;';
        this.setAttribute('aria-pressed', String(paused));
      });
    }
    if (pv) pv.addEventListener('click', () => { angle = (angle - 1 / N + 1) % 1; });
    if (nx) nx.addEventListener('click', () => { angle = (angle + 1 / N) % 1; });
  
    // ── Свайпы (touch) ──
    let touchX = null;
    scene.addEventListener('touchstart', (e) => {
      touchX = e.touches[0].clientX;
    }, { passive: true });
    scene.addEventListener('touchend', (e) => {
      if (touchX == null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40) {
        angle = (angle + (dx < 0 ? 1 : -1) / N + 1) % 1;
      }
      touchX = null;
    }, { passive: true });
  
    // Пауза при уходе из вкладки — экономим CPU/батарею
    document.addEventListener('visibilitychange', () => {
      paused = document.hidden ? true : paused;
    });
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

/* ── ОТЗЫВЫ → bridge_queue → Telegram ── */
function submitReview() {
    var nameEl = document.getElementById('review-name-input');
    var textEl = document.getElementById('review-text-input');
    var note   = document.getElementById('review-form-note');
    if (!nameEl || !textEl) return;

    var name = nameEl.value.trim();
    var text = textEl.value.trim();

    if (!name || !text) {
        if (note) { note.style.display = 'block'; note.style.color = '#ff6666'; note.textContent = 'Пожалуйста, заполните имя и текст отзыва.'; }
        return;
    }

    var content = '[ОТЗЫВ НА МОДЕРАЦИЮ]\nИмя: ' + name + '\nОтзыв: ' + text;

    /* Отправляем через bridge_queue — тот же канал что и личный мессенджер */
    if (window.db) {
        window.db.collection('bridge_queue').add({
            content:   content,
            uid:       'review_anonymous',
            email:     'review@nitro-hub',
            chatType:  'direct',
            status:    'pending',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function() {
            nameEl.value = '';
            textEl.value = '';
            if (note) { note.style.display = 'block'; note.style.color = 'var(--accent)'; note.textContent = '✓ Спасибо! Отзыв отправлен на модерацию.'; }
        }).catch(function(err) {
            if (note) { note.style.display = 'block'; note.style.color = '#ff6666'; note.textContent = 'Ошибка отправки. Попробуйте ещё раз.'; }
            console.error('[Review]', err.message);
        });
    } else {
        /* Fallback — прямой POST если Firestore недоступен */
        sendTelegramMessage(content, 'review@nitro-hub');
        nameEl.value = '';
        textEl.value = '';
        if (note) { note.style.display = 'block'; note.style.color = 'var(--accent)'; note.textContent = '✓ Отзыв отправлен!'; }
    }
}

window.onload = function() {
    initVideo();
    initCarousel();
    initNitroBoost();
    setLang('ru');
};

console.log('%cNitro Hub v8.0 ✓', 'color:#00ff88;font-size:14px;font-weight:bold;');
