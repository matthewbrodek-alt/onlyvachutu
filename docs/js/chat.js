/* ════════════════════════════════════════════════
   chat.js — Два независимых чата + AI-функции.

   Личные сообщения:
     sendPersonalMessage() → api.js callBackend()
     → bridge.py /api/memory → Telegram + Firestore

   Ответы из Telegram:
     bridge.py /api/telegram-webhook
     → Firestore users/{uid}/faraday_responses
     → auth.js onSnapshot → appendFaradayAIMsg()
     (chat.js этим НЕ занимается — только auth.js)

   Faraday AI чат:
     sendFaradayMessage() → processFaradayCommand()
     → локальные команды (локально, без bridge)
════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════
   EMOJI
══════════════════════════════════════════════ */
function addEmoji(inputId, emoji) {
    var el = document.getElementById(inputId);
    if (el) { el.value += emoji; el.focus(); }
}

/* ══════════════════════════════════════════════
   ЛИЧНЫЙ МЕССЕНДЖЕР
══════════════════════════════════════════════ */

/**
 * Отправить личное сообщение.
 * uid добавляется автоматически в api.js callBackend().
 */
function sendPersonalMessage(inputId, windowId) {
    var input  = document.getElementById(inputId  || 'chat-msg');
    var feedEl = document.getElementById(windowId || 'chat-window');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;

    if (!window.auth || !window.auth.currentUser) {
        alert('Сначала войдите в систему');
        return;
    }

    var userEmail = window.auth.currentUser.email || 'guest@nitro.hub';
    input.value = '';
    appendMessage(feedEl, text, 'sent');

    // Анализ тональности — реакция в Faraday-чате
    var tone = analyzeTone(text);
    var feed = document.getElementById('faraday-feed');
    if (tone === 'alert' && feed) {
        appendFaradayAIMsg(feed, 'Зафиксирован сигнал тревоги. Мониторинг усилен.');
    } else if (tone === 'friendly' && feed) {
        appendFaradayAIMsg(feed, 'Позитивный сигнал принят. Всё идёт по плану, сэр.');
    }

    // Отправка через bridge.py — uid добавится в callBackend автоматически
    bridgeSaveMemory(text, userEmail)
        .then(function(data) {
            if (!data) console.warn('[Chat] Bridge недоступен — сообщение не доставлено.');
        });
}

/**
 * Рендер личных сообщений из Firestore (в оба окна чата).
 * Вызывается из auth.js через onSnapshot.
 */
function renderPersonalMessages(snap) {
    ['chat-window', 'modal-chat-window'].forEach(function(id) {
        var win = document.getElementById(id);
        if (!win) return;
        win.innerHTML = '';
        snap.forEach(function(doc) {
            var m   = doc.data();
            var div = document.createElement('div');
            div.className   = 'msg-box ' + (m.sender === 'user' ? 'sent' : 'received');
            div.textContent = m.message || '';
            win.appendChild(div);
        });
        win.scrollTop = win.scrollHeight;
    });
}

/* Вспомогательный рендер одного сообщения */
function appendMessage(feedEl, text, type) {
    if (!feedEl) return;
    var div = document.createElement('div');
    div.className   = 'msg-box ' + type;
    div.textContent = text;
    feedEl.appendChild(div);
    feedEl.scrollTop = feedEl.scrollHeight;
}

/* ══════════════════════════════════════════════
   TTS — ГОЛОС FARADAY
══════════════════════════════════════════════ */
var faradayTTSEnabled = true;

function faradaySpeak(text) {
    if (!faradayTTSEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    var clean = text.replace(/<[^>]+>/g, '').replace(/^FARADAY:\s*/i, '').trim();
    if (!clean) return;
    var utt    = new SpeechSynthesisUtterance(clean);
    utt.lang   = 'ru-RU';
    utt.pitch  = 0.7;
    utt.rate   = 1.0;
    utt.volume = 0.9;
    window.speechSynthesis.speak(utt);
}

/* ══════════════════════════════════════════════
   AI-МОДУЛЬ 1: АНАЛИЗ ТОНАЛЬНОСТИ
══════════════════════════════════════════════ */
function analyzeTone(text) {
    if (!text || typeof text !== 'string') return 'neutral';
    if (text === text.toUpperCase() && text.length > 5) return 'alert';
    var lower = text.toLowerCase();
    if (lower.includes('спасибо') || lower.includes('круто') ||
        lower.includes('отлично') || lower.includes('супер')) return 'friendly';
    return 'neutral';
}

/* ══════════════════════════════════════════════
   AI-МОДУЛЬ 2: САМОДИАГНОСТИКА
   Запускается через 5с.
══════════════════════════════════════════════ */
function performSelfDiagnostic() {
    var feed = document.getElementById('faraday-feed');
    var timing   = window.performance && window.performance.timing;
    var loadTime = timing
        ? timing.domContentLoadedEventEnd - timing.navigationStart
        : -1;

    setTimeout(function() {
        var report;
        if (loadTime < 0) {
            report = 'Диагностика: данные о загрузке недоступны.';
        } else if (loadTime < 1000) {
            report = 'Системы работают штатно. Задержек нет (' + loadTime + 'мс).';
        } else {
            report = 'Задержка: ' + loadTime + 'мс. Рекомендую оптимизировать медиа.';
        }

        checkBridgeHealth().then(function(ok) {
            var bridge = ok
                ? 'Bridge: Online. Telegram-мост активен.'
                : 'Bridge: Offline — Telegram недоступен.';
            if (feed) appendFaradayAIMsg(feed, report + ' ' + bridge);
        });
    }, 5000);
}

/* ══════════════════════════════════════════════
   AI-МОДУЛЬ 3: КОНТЕКСТ ПРОЕКТА
   Вызов: updateProjectContext('MyApp', ['React'], 'active')
══════════════════════════════════════════════ */
function updateProjectContext(projectName, techStack, status) {
    if (!window.db || !projectName) return Promise.resolve();
    return window.db.collection('project_manifests').doc(projectName).set({
        stack:          Array.isArray(techStack) ? techStack : [techStack],
        current_status: status || 'unknown',
        last_update:    firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() {
        console.log('[Faraday] Манифест «' + projectName + '» обновлён.');
    }).catch(function(err) {
        console.warn('[Faraday] updateProjectContext:', err.message);
    });
}

/* ══════════════════════════════════════════════
   AI-МОДУЛЬ 4: SELF-EVOLUTION
══════════════════════════════════════════════ */
function runSelfEvolution() {
    if (!window.db) return Promise.resolve(null);

    return window.db.collection('faraday_memory').get()
        .then(function(snap) {
            var exp   = snap.size;
            var level = Math.floor(exp / 10) + 1;
            var core  = {
                level:             level,
                intelligence_index: parseFloat((exp * 0.15).toFixed(2)),
                experience_points:  exp,
                last_sync:          new Date().toLocaleString()
            };
            return window.db.collection('system_config').doc('faraday_core')
                .set(core, { merge: true })
                .then(function() { return core; });
        })
        .then(function(core) {
            if (!core) return null;
            if (core.level > 1) {
                setTimeout(function() {
                    var feed = document.getElementById('faraday-feed');
                    if (feed) {
                        appendFaradayAIMsg(feed,
                            'Индекс интеллекта: ' + core.intelligence_index +
                            '. Уровень: ' + core.level + '. Протоколы оптимизированы.');
                    }
                }, 10000);
            }
            return core;
        })
        .catch(function(err) {
            console.warn('[Faraday] Self-evolution:', err.message);
            return null;
        });
}

/* ══════════════════════════════════════════════
   ПЕРЕХВАТ ОШИБОК — window.onerror
   Одна регистрация. Feed + Firestore + bridge.
══════════════════════════════════════════════ */
window.onerror = function(message, source, lineno) {
    var shortSrc = source ? source.split('/').pop() : 'unknown';
    var note = 'Системная нестабильность: ' + message +
               ' в «' + shortSrc + '», строка ' + lineno + '. Записываю в журнал.';

    var feed = document.getElementById('faraday-feed');
    if (feed && typeof appendFaradayAIMsg === 'function') {
        appendFaradayAIMsg(feed, note);
    }

    // Firestore — надёжнее при JS-ошибках (нет зависимости от fetch)
    if (window.db) {
        window.db.collection('faraday_memory').add({
            topic:     'system_error',
            content:   message + ' | ' + source + ':' + lineno,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(function() {}); // тихо — чтобы не зациклить onerror
    }

    // Telegram через bridge (без токенов в JS)
    if (typeof reportErrorToBridge === 'function') {
        reportErrorToBridge(message, source, lineno);
    }

    return false; // не подавляем дефолтный обработчик браузера
};

/* ══════════════════════════════════════════════
   FARADAY AI ЧАТ
══════════════════════════════════════════════ */

function sendFaradayMessage() {
    var input = document.getElementById('faraday-input');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;
    input.value = '';

    var feed = document.getElementById('faraday-feed');
    appendFaradayUserMsg(feed, text);
    var tid = appendFaradayTyping(feed);

    setTimeout(function() {
        removeFaradayTyping(tid);
        var resp = processFaradayCommand(text);
        appendFaradayAIMsg(feed, resp);
    }, 450 + Math.random() * 350);
}

function faradayQuick(cmd) {
    var input = document.getElementById('faraday-input');
    if (input) input.value = cmd;
    sendFaradayMessage();
}

/* ── Движок команд ── */
function processFaradayCommand(text) {
    var t     = text.toLowerCase().trim();
    var hudSt = document.getElementById('hud-status');
    var pill  = document.getElementById('faraday-hud-status-badge');
    var feed  = document.getElementById('faraday-feed');

    function setHUD(msg) { if (hudSt) hudSt.innerText = msg; }

    // TTS
    if (t.includes('замолчи') || t.includes('тихо') || t.includes('выключи голос')) {
        faradayTTSEnabled = false;
        window.speechSynthesis && window.speechSynthesis.cancel();
        setHUD('TTS: OFF');
        return 'Голосовой вывод отключён.';
    }
    if (t.includes('говори') || t.includes('включи голос')) {
        faradayTTSEnabled = true;
        setHUD('TTS: ON');
        return 'Голосовой вывод активирован.';
    }

    // Цвет акцента
    var colorMap = {
        'синий':'#0077ff','blue':'#0077ff',
        'красный':'#ff4444','red':'#ff4444',
        'золотой':'#ffcc00','gold':'#ffcc00',
        'розовый':'#ff66cc','pink':'#ff66cc',
        'стандарт':'#00ff88','default':'#00ff88','зелёный':'#00ff88',
    };
    if (t.includes('смени цвет') || t.includes('цвет на') || t.includes('change color')) {
        var color = '#00ff88';
        for (var k in colorMap) { if (t.includes(k)) { color = colorMap[k]; break; } }
        document.documentElement.style.setProperty('--accent', color);
        document.documentElement.style.setProperty('--accent-dim', color + '1a');
        document.documentElement.style.setProperty('--border-accent', color + '38');
        window.db && window.db.collection('system_config').doc('faraday_protocol')
            .update({ 'ui_theme.accent': color }).catch(function() {});
        setHUD('COLOR: ' + color.toUpperCase());
        return 'Акцент изменён на ' + color + '.';
    }

    // Пауза
    if (t.includes('пауза') || t.includes('стоп') || t.includes('pause') || t.includes('stop')) {
        window.faradaySystemPaused = true;
        var v = document.getElementById('bg-video');
        if (v) v.pause();
        setHUD('SYSTEM: PAUSED');
        if (pill) pill.innerText = 'ПАУЗА';
        window.db && window.db.collection('system_config').doc('faraday_protocol')
            .update({ safety_protocols: 'paused' }).catch(function() {});
        return 'Системы приостановлены.';
    }

    // Запуск
    if (t.includes('активируй') || t.includes('пуск') || t.includes('запуск') ||
        t.includes('start') || t.includes('activate')) {
        window.faradaySystemPaused = false;
        var v2 = document.getElementById('bg-video');
        if (v2) v2.play().catch(function() {});
        setHUD('SYSTEM: ACTIVE');
        if (pill) pill.innerText = 'АКТИВЕН';
        window.db && window.db.collection('system_config').doc('faraday_protocol')
            .update({ safety_protocols: 'active' }).catch(function() {});
        return 'Все системы запущены.';
    }

    // Синхронизация
    if (t.includes('синхронизация') || t.includes('sync') || t.includes('обнови')) {
        setHUD('SYNCING...');
        window.db && window.db.collection('system_config').doc('faraday_protocol').get()
            .then(function(snap) {
                if (!snap.exists) { setHUD('SYSTEM: STANDBY'); return; }
                var cfg = snap.data();
                if (cfg.ui_theme && cfg.ui_theme.accent)
                    document.documentElement.style.setProperty('--accent', cfg.ui_theme.accent);
                setHUD('SYSTEM: READY');
                if (feed) appendFaradayAIMsg(feed, 'Конфигурация загружена. Версия: ' + (cfg.version || '—'));
            }).catch(function() { setHUD('SYNC ERROR'); });
        return 'Запрашиваю Firestore...';
    }

    // Статус
    if (t.includes('статус') || t.includes('status')) {
        return 'Система: ' + (window.faradaySystemPaused ? 'ПАУЗА' : 'АКТИВНА') +
               '. Firebase: OK. TTS: ' + (faradayTTSEnabled ? 'ON' : 'OFF') +
               '. ' + (typeof getFaradayMood === 'function' ? getFaradayMood() : '');
    }

    // Диагностика
    if (t.includes('диагностика') || t.includes('diagnostic')) {
        performSelfDiagnostic();
        return 'Запуск диагностики... Результат через несколько секунд.';
    }

    // Self-evolution
    if (t.includes('эволюция') || t.includes('evolution') || t.includes('развитие')) {
        runSelfEvolution().then(function(core) {
            if (core && feed) {
                appendFaradayAIMsg(feed,
                    'Анализ завершён. Уровень: ' + core.level +
                    ', индекс: ' + core.intelligence_index +
                    ', опыт: ' + core.experience_points + ' записей.');
            }
        });
        return 'Запускаю анализ саморазвития...';
    }

    // Запомни
    if (t.startsWith('запомни') || t.startsWith('remember')) {
        var mem = text.replace(/^запомни\s*|^remember\s*/i, '').trim();
        if (mem && window.db) {
            window.db.collection('faraday_memory').add({
                topic:     'user_note',
                content:   mem,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }).then(function() {
                if (feed) appendFaradayAIMsg(feed, 'Запомнено: «' + mem + '»');
            }).catch(function(e) {
                if (feed) appendFaradayAIMsg(feed, 'Ошибка памяти: ' + e.message);
            });
            return 'Обращаюсь к ядру памяти...';
        }
        return 'Что запомнить? Напишите: «Запомни [текст]»';
    }

    // Помощь
    if (t.includes('помощь') || t.includes('help') || t.includes('команды') || t.includes('что умеешь')) {
        return '⚡ Команды Faraday:\n' +
               '• «смени цвет на [синий/золотой/красный/стандарт]»\n' +
               '• «пауза» / «активируй»\n' +
               '• «синхронизация» — загрузить конфиг\n' +
               '• «статус» — состояние системы\n' +
               '• «диагностика» — тест производительности\n' +
               '• «эволюция» — анализ саморазвития\n' +
               '• «запомни [текст]» — сохранить в память\n' +
               '• «замолчи» / «говори» — TTS';
    }

    // Приветствие
    if (t.includes('привет') || t.includes('hello') || t.includes('hi')) {
        return 'Приветствую. ' +
               (typeof getFaradayMood === 'function' ? getFaradayMood() : '') +
               ' Введите «помощь» для команд.';
    }

    setHUD('SYSTEM: STANDBY');
    return 'Команда не распознана. Попробуйте «помощь».';
}

/* ── Рендер сообщений Faraday ── */
function appendFaradayUserMsg(feed, text) {
    if (!feed) return;
    var div = document.createElement('div');
    div.className   = 'msg-box user-msg-faraday';
    div.textContent = text;
    feed.appendChild(div);
    feed.scrollTop = feed.scrollHeight;
}

function appendFaradayAIMsg(feed, text) {
    if (!feed) return;
    var div = document.createElement('div');
    div.className = 'msg-box ai-msg';
    div.innerHTML = '<strong>FARADAY:</strong> ' + text.replace(/\n/g, '<br>');
    feed.appendChild(div);
    feed.scrollTop = feed.scrollHeight;
    faradaySpeak(text);
}

function appendFaradayTyping(feed) {
    if (!feed) return null;
    var id  = 'typing-' + Date.now();
    var div = document.createElement('div');
    div.id  = id;
    div.className = 'msg-box ai-msg';
    div.innerHTML = '<strong>FARADAY:</strong> <span class="typing-dots">●●●</span>';
    feed.appendChild(div);
    feed.scrollTop = feed.scrollHeight;
    return id;
}
function removeFaradayTyping(id) {
    var el = id && document.getElementById(id);
    if (el) el.remove();
}

/* ══════════════════════════════════════════════
   ГОЛОСОВОЙ ВВОД
══════════════════════════════════════════════ */
var recognition = null;
(function() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    recognition = new SR();
    recognition.lang           = 'ru-RU';
    recognition.continuous     = false;
    recognition.interimResults = false;

    recognition.onresult = function(e) {
        var t = e.results[0][0].transcript;
        var input = document.getElementById('faraday-input');
        if (input) { input.value = t; sendFaradayMessage(); }
        setVoiceBtn(false);
    };
    recognition.onend   = function() { setVoiceBtn(false); };
    recognition.onerror = function(e) { console.warn('[Voice]', e.error); setVoiceBtn(false); };
})();

function setVoiceBtn(on) {
    var btn = document.querySelector('.voice-btn');
    if (btn) btn.classList.toggle('listening', on);
}

function startVoiceCommand() {
    if (!recognition) { alert('Голосовой ввод не поддерживается.'); return; }
    try { recognition.start(); setVoiceBtn(true); }
    catch(e) { console.warn('[Voice start]', e); }
}

/* ══════════════════════════════════════════════
   ЗАПУСК AI-МОДУЛЕЙ
   Вызывается из app.js → initFaradayCore()
══════════════════════════════════════════════ */
function initAIModules() {
    performSelfDiagnostic();
    runSelfEvolution();

    if (!document.getElementById('faraday-typing-css')) {
        var style = document.createElement('style');
        style.id  = 'faraday-typing-css';
        style.textContent =
            '@keyframes typingBlink{0%,100%{opacity:.3}50%{opacity:1}}' +
            '.typing-dots{display:inline-block;letter-spacing:3px;' +
            'animation:typingBlink 1.2s ease-in-out infinite;color:var(--accent);}';
        document.head.appendChild(style);
    }
}
