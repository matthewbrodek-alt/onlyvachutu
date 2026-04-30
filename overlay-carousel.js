/* =========================================================
   Overlay-style Orbital Carousel
   ---------------------------------------------------------
   Эллиптическая 360° орбита вокруг центра с перспективой,
   автовращением, drag/swipe и инерцией. Vanilla JS, без
   сторонних библиотек. Адаптивно от 320px до 4K.
   ========================================================= */

function initCarousel() {
  // ---------- DOM ----------
  const scene   = document.getElementById('carousel-scene');
  if (!scene) return;
  const orbit   = document.getElementById('carousel-orbit')   || scene; // контейнер для карточек
  const tooltip = document.getElementById('c-tooltip');
  const btnPrev = document.getElementById('car-prev');
  const btnNext = document.getElementById('car-next');
  const btnPause= document.getElementById('car-pause');

  // ---------- ДАННЫЕ ----------
  // Замени TEAM на свой массив (name, role, img/icon, link)
  const TEAM = window.TEAM_DATA || [
    { name: 'Alpha',   role: 'Lead',     icon: '◆' },
    { name: 'Beta',    role: 'Designer', icon: '✦' },
    { name: 'Gamma',   role: 'Engineer', icon: '✧' },
    { name: 'Delta',   role: 'PM',       icon: '❖' },
    { name: 'Epsilon', role: 'QA',       icon: '✺' },
    { name: 'Zeta',    role: 'DevOps',   icon: '✸' },
    { name: 'Eta',     role: 'Marketing',icon: '❉' },
    { name: 'Theta',   role: 'Sales',    icon: '✹' },
  ];

  // ---------- СОСТОЯНИЕ ----------
  let W = 0, H = 0;        // размеры сцены
  let cx = 0, cy = 0;      // центр орбиты
  let RX = 0, RY = 0;      // радиусы эллипса (X, Y)
  let angle = 0;           // текущий угол вращения (рад)
  let velocity = 0.0025;   // базовая угловая скорость (авто-вращение)
  let dragVel  = 0;        // скорость от пользователя (инерция)
  let paused   = false;
  let isDragging = false;
  let lastX = 0, lastT = 0;

  // ---------- СОЗДАНИЕ КАРТОЧЕК ----------
  orbit.innerHTML = '';
  const cards = TEAM.map((m, i) => {
    const el = document.createElement('div');
    el.className = 'orbit-card';
    el.dataset.index = i;
    el.innerHTML = `
      <div class="orbit-card__inner">
        <div class="orbit-card__icon">${m.icon || '◆'}</div>
      </div>
    `;
    // Тултип на hover
    el.addEventListener('mouseenter', (e) => showTooltip(m, e));
    el.addEventListener('mousemove',  (e) => moveTooltip(e));
    el.addEventListener('mouseleave', hideTooltip);
    orbit.appendChild(el);
    return el;
  });

  // ---------- РАЗМЕРЫ ----------
  function measure() {
    const r = scene.getBoundingClientRect();
    W = r.width; H = r.height;
    cx = W / 2;
    cy = H / 2;

    // Эллипс: широкий по X, узкий по Y (как у overlay.com)
    // На мобиле делаем более «круглым», чтобы не уезжало за края
    const isMobile = W < 640;
    RX = isMobile ? W * 0.42 : W * 0.46;
    RY = isMobile ? H * 0.32 : H * 0.38;
  }

  // ---------- РЕНДЕР ----------
  function render() {
    const N = cards.length;
    for (let i = 0; i < N; i++) {
      const a = angle + (i / N) * Math.PI * 2;

      // Позиция на эллипсе
      const x = cx + Math.cos(a) * RX;
      const y = cy + Math.sin(a) * RY;

      // Глубина: sin(a) от -1 (сзади) до +1 (спереди)
      // У overlay карточки спереди = крупные, сзади = маленькие/прозрачные
      const depth = Math.sin(a);            // -1..1
      const t     = (depth + 1) / 2;        // 0..1

      const scale   = 0.45 + t * 0.85;      // 0.45..1.30
      const opacity = 0.25 + t * 0.75;      // 0.25..1.00
      const zIndex  = Math.round(t * 1000);

      const el = cards[i];
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale})`;
      el.style.opacity   = opacity.toFixed(3);
      el.style.zIndex    = zIndex;
    }
  }

  // ---------- ЦИКЛ АНИМАЦИИ ----------
  function tick() {
    if (!paused && !isDragging) {
      angle += velocity + dragVel;
    } else if (isDragging) {
      angle += dragVel;
    } else {
      angle += dragVel;
    }
    // Затухание инерции от пользователя
    dragVel *= 0.94;
    if (Math.abs(dragVel) < 0.00005) dragVel = 0;

    render();
    requestAnimationFrame(tick);
  }

  // ---------- DRAG / SWIPE ----------
  function onDown(e) {
    isDragging = true;
    lastX = (e.touches ? e.touches[0].clientX : e.clientX);
    lastT = performance.now();
    scene.classList.add('is-grabbing');
  }
  function onMove(e) {
    if (!isDragging) return;
    const x = (e.touches ? e.touches[0].clientX : e.clientX);
    const dx = x - lastX;
    const now = performance.now();
    const dt = Math.max(1, now - lastT);

    // Перевод пикселей в угловую скорость
    const k = 0.005;
    angle  += dx * k;
    dragVel = (dx * k) / (dt / 16);  // импульс для инерции
    lastX = x;
    lastT = now;
  }
  function onUp() {
    isDragging = false;
    scene.classList.remove('is-grabbing');
  }

  scene.addEventListener('mousedown',  onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup',   onUp);
  scene.addEventListener('touchstart', onDown, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('touchend',  onUp);

  // ---------- КНОПКИ ----------
  btnPrev?.addEventListener('click', () => { dragVel -= 0.08; });
  btnNext?.addEventListener('click', () => { dragVel += 0.08; });
  btnPause?.addEventListener('click', () => {
    paused = !paused;
    btnPause.textContent = paused ? '▶' : '❚❚';
  });

  // ---------- TOOLTIP ----------
  function showTooltip(m, e) {
    if (!tooltip) return;
    tooltip.innerHTML = `<strong>${m.name}</strong><span>${m.role || ''}</span>`;
    tooltip.classList.add('is-visible');
    moveTooltip(e);
    paused = true; // пауза при наведении (как у overlay)
  }
  function moveTooltip(e) {
    if (!tooltip) return;
    const r = scene.getBoundingClientRect();
    tooltip.style.left = (e.clientX - r.left) + 'px';
    tooltip.style.top  = (e.clientY - r.top - 20) + 'px';
  }
  function hideTooltip() {
    tooltip?.classList.remove('is-visible');
    paused = false;
  }

  // ---------- РЕСАЙЗ ----------
  const ro = new ResizeObserver(measure);
  ro.observe(scene);
  window.addEventListener('orientationchange', measure);

  // ---------- СТАРТ ----------
  measure();
  render();
  requestAnimationFrame(tick);
}

document.addEventListener('DOMContentLoaded', initCarousel);
