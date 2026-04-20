/* ════════════════════════════════════════════════
   chat.js — Два независимых чата + AI-функции.

   ┌─ ЛИЧНЫЙ ЧАТ ──────────────────────────────┐
   │ sendPersonalMessage()                       │
   │ → api.js callBackend() [uid auto-inject]   │
   │ → bridge.py /api/memory                    │
   │ → Telegram + Firestore faraday_memory       │
   │                                             │
   │ Ответы обратно:                             │
   │ Telegram → bridge webhook                  │
   │ → Firestore users/{uid}/faraday_responses  │
   │ → auth.js onSnapshot → личный чат feed     │
   └─────────────────────────────────────────────┘

   ┌─ FARADAY AI ЧАТ ──────────────────────────┐
   │ sendFaradayMessage() → processFaradayCommand│
   │ → локальные команды + Firestore             │
   │ → TTS голос (Jarvis / en-GB мужской)       │
   └─────────────────────────────────────────────┘
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
   Только Firebase + Telegram через bridge.
   НЕ касается Faraday AI.
══════════════════════════════════════════════ */
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

    // uid добавляется автоматически в callBackend (api.js)
    bridgeSaveMemory(text, userEmail)
        .then(function(data) {
            if (!data) {
                console.warn('[Chat] Bridge недоступен — сообщение не доставлено в Telegram.');
            }
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

function appendMessage(feedEl, text, type) {
    if (!feedEl) return;
    var div = document.createElement('div');
    div.className   = 'msg-box ' + type;
    div.textContent = text;
    feedEl.appendChild(div);
    feedEl.scrollTop = feedEl.scrollHeight;
}

/* ══════════════════════════════════════════════
   TTS — ГОЛОС JARVIS
   Подбирает мужской британский голос (David /
   Google UK English Male) с низким pitch и
   замедленным темпом — максимально близко к
   голосу Jarvis из фильмов Marvel.
   Fallback: любой доступный голос en-GB → en.
══════════════════════════════════════════════ */
var faradayTTSEnabled = true;
var _jarvisVoice      = null; // кешируем выбранный голос

function _pickJarvisVoice() {
    if (_jarvisVoice) return _jarvisVoice;
    var voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // Приоритет: имя содержит David, затем Google UK English Male,
    // затем любой en-GB мужской, затем любой en-GB, затем любой en.
    var priority = [
        function(v) { return /david/i.test(v.name); },
        function(v) { return /google uk english male/i.test(v.name); },
        function(v) { return v.lang === 'en-GB' && /male|man/i.test(v.name); },
        function(v) { return v.lang === 'en-GB'; },
        function(v) { return v.lang && v.lang.startsWith('en'); },
    ];

    for (var i = 0; i < priority.length; i++) {
        var found = voices.filter(priority[i]);
        if (found.length) { _jarvisVoice = found[0]; return _jarvisVoice; }
    }
    return null;
}

function faradaySpeak(text) {
    if (!faradayTTSEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    var clean = text.replace(/<[^>]+>/g, '').replace(/^FARADAY:\s*/i, '').trim();
    if (!clean) return;

    var utt   = new SpeechSynthesisUtterance(clean);
    utt.lang  = 'en-GB';   // британский английский — ближайший к Jarvis
    utt.pitch = 0.6;        // низкий, уверенный голос
    utt.rate  = 0.88;       // чуть медленнее нормального — солидно
    utt.volume = 0.95;

    // Подбираем голос. Если синтез ещё не загрузил список — ждём.
    var voice = _pickJarvisVoice();
    if (voice) {
        utt.voice = voice;
    } else {
        // Список голосов может грузиться асинхронно
        window.speechSynthesis.onvoiceschanged = function() {
            window.speechSynthesis.onvoiceschanged = null;
            _jarvisVoice = null; // сбрасываем кеш
            var v = _pickJarvisVoice();
            if (v) utt.voice = v;
        };
    }

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
══════════════════════════════════════════════ */
function performSelfDiagnostic() {
    var feed    = document.getElementById('faraday-feed');
    var timing  = window.performance && window.performance.timing;
    var loadMs  = timing
        ? timing.domContentLoadedEventEnd - timing.navigationStart
        : -1;

    setTimeout(function() {
        var report = loadMs < 0
            ? 'Diagnostics: load time data unavailable.'
            : loadMs < 1000
                ? 'All systems nominal. Response time: ' + loadMs + 'ms.'
                : 'Elevated response latency: ' + loadMs + 'ms. I recommend optimising media resources.';

        checkBridgeHealth().then(function(ok) {
            var bridge = ok
                ? 'Bridge: Online. Telegram relay active.'
                : 'Bridge: Offline. Telegram and memory storage unavailable.';
            if (feed) appendFaradayAIMsg(feed, report + ' ' + bridge);
        });
    }, 5000);
}

/* ══════════════════════════════════════════════
   AI-МОДУЛЬ 3: КОНТЕКСТ ПРОЕКТА
══════════════════════════════════════════════ */
function updateProjectContext(projectName, techStack, status) {
    if (!window.db || !projectName) return Promise.resolve();
    return window.db.collection('project_manifests').doc(projectName).set({
        stack:          Array.isArray(techStack) ? techStack : [techStack],
        current_status: status || 'unknown',
        last_update:    firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() {
        console.log('[Faraday] Manifest «' + projectName + '» updated.');
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
                            'Intelligence index updated to ' + core.intelligence_index +
                            '. Protocol level: ' + core.level + '. Systems optimised.');
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
   Одна регистрация. Firestore + bridge → Telegram.
══════════════════════════════════════════════ */
window.onerror = function(message, source, lineno) {
    var shortSrc = source ? source.split('/').pop() : 'unknown';
    var note = 'System instability detected: ' + message +
               ' in «' + shortSrc + '», line ' + lineno + '. Logging to memory.';

    var feed = document.getElementById('faraday-feed');
    if (feed && typeof appendFaradayAIMsg === 'function') {
        appendFaradayAIMsg(feed, note);
    }

    if (window.db) {
        window.db.collection('faraday_memory').add({
            topic:     'system_error',
            content:   message + ' | ' + source + ':' + lineno,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(function() {});
    }

    if (typeof reportErrorToBridge === 'function') {
        reportErrorToBridge(message, source, lineno);
    }

    return false;
};

/* ══════════════════════════════════════════════
   FARADAY AI ЧАТ
   Полностью изолирован от личного мессенджера.
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
    if (t.includes('замолчи') || t.includes('тихо') || t.includes('silence') || t.includes('mute')) {
        faradayTTSEnabled = false;
        window.speechSynthesis && window.speechSynthesis.cancel();
        setHUD('TTS: OFF');
        return 'Voice output disabled, sir.';
    }
    if (t.includes('говори') || t.includes('включи голос') || t.includes('speak') || t.includes('unmute')) {
        faradayTTSEnabled = true;
        setHUD('TTS: ON');
        return 'Voice output re-engaged.';
    }

    // Цвет акцента
    var colorMap = {
        'синий':'#0077ff','blue':'#0077ff',
        'красный':'#ff4444','red':'#ff4444',
        'золотой':'#ffcc00','gold':'#ffcc00',
        'розовый':'#ff66cc','pink':'#ff66cc',
        'стандарт':'#00ff88','default':'#00ff88','зелёный':'#00ff88','green':'#00ff88',
    };
    if (t.includes('смени цвет') || t.includes('цвет на') || t.includes('change color') || t.includes('color')) {
        var color = '#00ff88';
        for (var k in colorMap) { if (t.includes(k)) { color = colorMap[k]; break; } }
        document.documentElement.style.setProperty('--accent', color);
        document.documentElement.style.setProperty('--accent-dim', color + '1a');
        document.documentElement.style.setProperty('--border-accent', color + '38');
        window.db && window.db.collection('system_config').doc('faraday_protocol')
            .update({ 'ui_theme.accent': color }).catch(function() {});
        setHUD('COLOR: ' + color.toUpperCase());
        return 'Accent colour updated to ' + color + '.';
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
        return 'All systems suspended, sir.';
    }

    // Запуск
    if (t.includes('активируй') || t.includes('пуск') || t.includes('запуск') ||
        t.includes('start') || t.includes('activate') || t.includes('resume')) {
        window.faradaySystemPaused = false;
        var v2 = document.getElementById('bg-video');
        if (v2) v2.play().catch(function() {});
        setHUD('SYSTEM: ACTIVE');
        if (pill) pill.innerText = 'АКТИВЕН';
        window.db && window.db.collection('system_config').doc('faraday_protocol')
            .update({ safety_protocols: 'active' }).catch(function() {});
        return 'All systems are back online, sir.';
    }

    // Синхронизация
    if (t.includes('синхронизация') || t.includes('sync') || t.includes('обнови') || t.includes('refresh')) {
        setHUD('SYNCING...');
        window.db && window.db.collection('system_config').doc('faraday_protocol').get()
            .then(function(snap) {
                if (!snap.exists) { setHUD('SYSTEM: STANDBY'); return; }
                var cfg = snap.data();
                if (cfg.ui_theme && cfg.ui_theme.accent)
                    document.documentElement.style.setProperty('--accent', cfg.ui_theme.accent);
                setHUD('SYSTEM: READY');
                if (feed) appendFaradayAIMsg(feed,
                    'Configuration loaded from Firestore. Protocol version: ' + (cfg.version || '—'));
            }).catch(function() { setHUD('SYNC ERROR'); });
        return 'Querying Firestore…';
    }

    // Статус
    if (t.includes('статус') || t.includes('status')) {
        return 'System status: ' + (window.faradaySystemPaused ? 'SUSPENDED' : 'ACTIVE') +
               '. Firebase: online. Voice: ' + (faradayTTSEnabled ? 'on' : 'off') + '. ' +
               (typeof getFaradayMood === 'function' ? getFaradayMood() : '');
    }

    // Диагностика
    if (t.includes('диагностика') || t.includes('diagnostic') || t.includes('scan')) {
        performSelfDiagnostic();
        return 'Running diagnostics, sir. Results incoming shortly.';
    }

    // Self-evolution
    if (t.includes('эволюция') || t.includes('evolution') || t.includes('развитие') || t.includes('level')) {
        runSelfEvolution().then(function(core) {
            if (core && feed) {
                appendFaradayAIMsg(feed,
                    'Analysis complete. Level: ' + core.level +
                    ', intelligence index: ' + core.intelligence_index +
                    ', total memory records: ' + core.experience_points + '.');
            }
        });
        return 'Initiating self-analysis…';
    }

    // Запомни
    if (t.startsWith('запомни') || t.startsWith('remember') || t.startsWith('note')) {
        var mem = text.replace(/^(запомни|remember|note)\s*/i, '').trim();
        if (mem && window.db) {
            window.db.collection('faraday_memory').add({
                topic:     'user_note',
                content:   mem,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }).then(function() {
                if (feed) appendFaradayAIMsg(feed, 'Noted, sir: «' + mem + '»');
            }).catch(function(e) {
                if (feed) appendFaradayAIMsg(feed, 'Memory write error: ' + e.message);
            });
            return 'Accessing memory core…';
        }
        return 'What should I remember? Say: «Remember [text]»';
    }

    // Помощь
    if (t.includes('помощь') || t.includes('help') || t.includes('команды') || t.includes('commands')) {
        return 'Available directives:\n' +
               '• «change color [blue/gold/red/default]» — accent colour\n' +
               '• «pause» / «activate» — system control\n' +
               '• «sync» — reload configuration\n' +
               '• «status» — system report\n' +
               '• «diagnostic» — performance scan\n' +
               '• «evolution» — self-analysis\n' +
               '• «remember [text]» — store in memory\n' +
               '• «silence» / «speak» — voice control';
    }

    // Приветствие
    if (t.includes('привет') || t.includes('hello') || t.includes('hi') || t.includes('hey')) {
        return 'Good day, sir. ' +
               (typeof getFaradayMood === 'function' ? getFaradayMood() : '') +
               ' How may I be of service?';
    }

    setHUD('SYSTEM: STANDBY');
    return 'Directive not recognised, sir. Say «help» for available commands.';
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
    div.innerHTML = '<strong>JARVIS:</strong> ' + text.replace(/\n/g, '<br>');
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
    div.innerHTML = '<strong>JARVIS:</strong> <span class="typing-dots">●●●</span>';
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
    recognition.onerror = function(e) {
        console.warn('[Voice]', e.error);
        setVoiceBtn(false);
    };
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
    // Предзагрузка голосов (Chrome требует взаимодействия, но список грузим заранее)
    if (window.speechSynthesis) {
        window.speechSynthesis.getVoices(); // инициирует загрузку списка
    }

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
