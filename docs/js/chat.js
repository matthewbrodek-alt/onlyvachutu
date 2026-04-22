/* ════════════════════════════════════════════════
   chat.js — Два независимых чата.

   ┌─ ЛИЧНЫЙ ЧАТ ────────────────────────────────┐
   │  sendPersonalMessage()                        │
   │  → bridgeSaveMessage() [api.js]              │
   │  → bridge.py /api/message                    │
   │  → Firestore users/{uid}/messages            │
   │  → Telegram (уведомление владельцу)          │
   │                                               │
   │  Ответ из Telegram:                           │
   │  /api/telegram-webhook → Firestore            │
   │  → faraday_responses → auth.js → chat-window │
   └─────────────────────────────────────────────┘

   ┌─ FARADAY AI ────────────────────────────────┐
   │  sendFaradayMessage()                         │
   │  → processFaradayCommand() — локально        │
   │  → Wikipedia / DDG поиск                     │
   │  → TTS                                       │
   │  Telegram НЕ задействован.                   │
   │  Стикеры/эмодзи в поле ввода — убраны.      │
   └─────────────────────────────────────────────┘
════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════
   EMOJI — только для личного чата
══════════════════════════════════════════════ */
function addEmoji(inputId, emoji) {
    var el = document.getElementById(inputId);
    if (el) { el.value += emoji; el.focus(); }
}

/* ══════════════════════════════════════════════
   ЛИЧНЫЙ МЕССЕНДЖЕР
   Только bridge.py + Telegram. Без ИИ.
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
    var userEmail = window.auth.currentUser.email || '';
    input.value = '';

    /* Оптимистичный рендер — сразу показываем */
    appendMessage(feedEl, text, 'sent');

    /* Отправляем через мост → Telegram + Firestore */
    bridgeSaveMessage(text, userEmail)
        .catch(function(err) {
            console.warn('[Chat] Ошибка моста:', err);
        });
}

/* Добавить одно сообщение в ленту */
function appendMessage(feedEl, text, type) {
    if (!feedEl) return;
    var div = document.createElement('div');
    div.className   = 'msg-box ' + type;
    div.textContent = text;
    feedEl.appendChild(div);
    feedEl.scrollTop = feedEl.scrollHeight;
}

/* ══════════════════════════════════════════════
   TTS — Голос ДЖАРВИС/JARVIS
══════════════════════════════════════════════ */
var faradayTTSEnabled = true;
var _ttsLang          = 'ru';
var _voiceCache       = {};

function onLangChanged(lang) {
    _ttsLang    = lang;
    _voiceCache = {};
}

function _pickVoice(lang) {
    if (_voiceCache[lang]) return _voiceCache[lang];
    var voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    if (!voices.length) return null;
    var priority = (lang === 'ru') ? [
        function(v) { return v.lang === 'ru-RU' && /pavel|yuri|dmitri|male/i.test(v.name); },
        function(v) { return v.lang === 'ru-RU' && !/female|woman|anya|alena/i.test(v.name); },
        function(v) { return v.lang === 'ru-RU'; },
        function(v) { return v.lang && v.lang.startsWith('ru'); },
    ] : [
        function(v) { return /david/i.test(v.name); },
        function(v) { return /google uk english male/i.test(v.name); },
        function(v) { return v.lang === 'en-GB'; },
        function(v) { return v.lang && v.lang.startsWith('en'); },
    ];
    for (var i = 0; i < priority.length; i++) {
        var found = voices.filter(priority[i]);
        if (found.length) { _voiceCache[lang] = found[0]; return found[0]; }
    }
    return null;
}

function faradaySpeak(text) {
    if (!faradayTTSEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    var clean = text.replace(/<[^>]+>/g, '').replace(/^(JARVIS|ДЖАРВИС|FARADAY):\s*/i, '').trim();
    if (!clean) return;
    var utt   = new SpeechSynthesisUtterance(clean);
    var isRu  = (_ttsLang === 'ru');
    utt.lang  = isRu ? 'ru-RU' : 'en-GB';
    utt.pitch = isRu ? 0.75 : 0.6;
    utt.rate  = isRu ? 0.92 : 0.88;
    utt.volume = 0.95;
    var voice = _pickVoice(_ttsLang);
    if (voice) {
        utt.voice = voice;
        window.speechSynthesis.speak(utt);
    } else {
        window.speechSynthesis.onvoiceschanged = function() {
            window.speechSynthesis.onvoiceschanged = null;
            _voiceCache = {};
            var v = _pickVoice(_ttsLang);
            if (v) utt.voice = v;
            window.speechSynthesis.speak(utt);
        };
    }
}

/* ══════════════════════════════════════════════
   ПОИСК — Wikipedia + DDG
══════════════════════════════════════════════ */
function searchWikipedia(query, lang) {
    var host = (lang === 'ru') ? 'ru.wikipedia.org' : 'en.wikipedia.org';
    var url  = 'https://' + host + '/w/api.php?' +
               'action=query&format=json&origin=*' +
               '&prop=extracts&exintro=true&explaintext=true' +
               '&exsentences=3&redirects=1' +
               '&titles=' + encodeURIComponent(query);
    return fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(data) {
            var pages  = data.query && data.query.pages;
            if (!pages) return null;
            var pageId = Object.keys(pages)[0];
            if (pageId === '-1') return null;
            var extract = (pages[pageId].extract || '').trim();
            if (!extract) return null;
            return extract.split(/(?<=[.!?])\s+/).slice(0, 3).join(' ');
        })
        .catch(function() { return null; });
}

function searchDDG(query) {
    var url = 'https://api.duckduckgo.com/?q=' + encodeURIComponent(query) +
              '&format=json&no_html=1&skip_disambig=1';
    return fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(d) { return d.AbstractText || d.Answer || null; })
        .catch(function() { return null; });
}

/* ══════════════════════════════════════════════
   AI-МОДУЛИ
══════════════════════════════════════════════ */
function analyzeTone(text) {
    if (!text || typeof text !== 'string') return 'neutral';
    if (text === text.toUpperCase() && text.length > 5) return 'alert';
    var lower = text.toLowerCase();
    if (lower.includes('спасибо') || lower.includes('круто') ||
        lower.includes('отлично') || lower.includes('супер')) return 'friendly';
    return 'neutral';
}

function performSelfDiagnostic() {
    var feed   = document.getElementById('faraday-feed');
    var timing = window.performance && window.performance.timing;
    var loadMs = timing ? timing.domContentLoadedEventEnd - timing.navigationStart : -1;
    setTimeout(function() {
        var report = loadMs < 0
            ? 'Диагностика: данные загрузки недоступны.'
            : loadMs < 1000
                ? 'Системы работают штатно. Время отклика: ' + loadMs + 'мс.'
                : 'Задержка отклика: ' + loadMs + 'мс. Рекомендую оптимизировать медиа.';
        checkBridgeHealth().then(function(ok) {
            var br = ok
                ? 'Bridge: Online. Telegram активен.'
                : 'Bridge: Offline. Проверьте Firebase Studio.';
            if (feed) appendFaradayAIMsg(feed, report + ' ' + br);
        });
    }, 5000);
}

function updateProjectContext(projectName, techStack, status) {
    if (!window.db || !projectName) return Promise.resolve();
    return window.db.collection('project_manifests').doc(projectName).set({
        stack:          Array.isArray(techStack) ? techStack : [techStack],
        current_status: status || 'unknown',
        last_update:    firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function(e) { console.warn('[Faraday] updateProjectContext:', e.message); });
}

function runSelfEvolution() {
    if (!window.db) return Promise.resolve(null);
    var user = window.auth && window.auth.currentUser;
    return window.db.collection('faraday_memory').get()
        .then(function(snap) {
            var exp   = snap.size;
            var level = Math.floor(exp / 10) + 1;
            var core  = {
                level:              level,
                intelligence_index: parseFloat((exp * 0.15).toFixed(2)),
                experience_points:  exp,
                last_sync:          new Date().toLocaleString()
            };
            var saveRef = user
                ? window.db.collection('users').doc(user.uid)
                           .collection('faraday_core').doc('state')
                : null;
            if (saveRef) return saveRef.set(core, { merge: true }).then(function() { return core; });
            return core;
        })
        .then(function(core) {
            if (!core) return null;
            if (core.level > 1) {
                setTimeout(function() {
                    var feed = document.getElementById('faraday-feed');
                    if (feed) appendFaradayAIMsg(feed,
                        'Индекс интеллекта: ' + core.intelligence_index +
                        '. Уровень: ' + core.level + '. Протоколы оптимизированы.');
                }, 10000);
            }
            return core;
        })
        .catch(function(e) { console.warn('[Faraday] Self-evolution:', e.message); return null; });
}

/* Перехват ошибок */
window.onerror = function(message, source, lineno) {
    var shortSrc = source ? source.split('/').pop() : 'unknown';
    var note = 'Системная нестабильность: ' + message +
               ' в «' + shortSrc + '», строка ' + lineno + '.';
    var feed = document.getElementById('faraday-feed');
    if (feed && typeof appendFaradayAIMsg === 'function') appendFaradayAIMsg(feed, note);
    if (window.db) {
        window.db.collection('faraday_memory').add({
            topic:     'system_error',
            content:   message + ' | ' + source + ':' + lineno,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(function(){});
    }
    if (typeof reportErrorToBridge === 'function') reportErrorToBridge(message, source, lineno);
    return false;
};

/* ══════════════════════════════════════════════
   FARADAY AI ЧАТ
   Изолирован от Telegram и личного мессенджера.
   Стикеры убраны из поля ввода.
══════════════════════════════════════════════ */
function sendFaradayMessage() {
    var input = document.getElementById('faraday-input');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;
    input.value = '';

    var feed   = document.getElementById('faraday-feed');
    appendFaradayUserMsg(feed, text);
    var tid = appendFaradayTyping(feed);

    var result = processFaradayCommand(text);

    if (result && typeof result.then === 'function') {
        result.then(function(answer) {
            removeFaradayTyping(tid);
            appendFaradayAIMsg(feed, answer || 'Ничего не найдено.');
        }).catch(function() {
            removeFaradayTyping(tid);
            appendFaradayAIMsg(feed, 'Ошибка поиска. Попробуйте ещё раз.');
        });
    } else {
        setTimeout(function() {
            removeFaradayTyping(tid);
            appendFaradayAIMsg(feed, result || '...');
        }, 450 + Math.random() * 350);
    }
}

function faradayQuick(cmd) {
    var input = document.getElementById('faraday-input');
    if (input) input.value = cmd;
    sendFaradayMessage();
}

/* ── Движок команд ── */
function processFaradayCommand(text) {
    var t    = text.toLowerCase().trim();
    var hudSt= document.getElementById('hud-status');
    var pill = document.getElementById('faraday-hud-status-badge');
    var feed = document.getElementById('faraday-feed');
    function setHUD(msg) { if (hudSt) hudSt.innerText = msg; }

    /* TTS */
    if (t.includes('замолчи') || t.includes('тихо') || t.includes('mute')) {
        faradayTTSEnabled = false;
        window.speechSynthesis && window.speechSynthesis.cancel();
        setHUD('TTS: OFF');
        return 'Голосовой вывод отключён.';
    }
    if (t.includes('говори') || t.includes('включи голос') || t.includes('unmute')) {
        faradayTTSEnabled = true;
        setHUD('TTS: ON');
        return 'Голосовой вывод активирован.';
    }

    /* Цвет акцента */
    var colorMap = {
        'синий':'#0077ff','blue':'#0077ff',
        'красный':'#ff4444','red':'#ff4444',
        'золотой':'#ffcc00','gold':'#ffcc00',
        'розовый':'#ff66cc','pink':'#ff66cc',
        'стандарт':'#00ff88','default':'#00ff88','зелёный':'#00ff88','green':'#00ff88',
    };
    if (t.includes('смени цвет') || t.includes('цвет на') || t.includes('change color')) {
        var color = '#00ff88';
        for (var k in colorMap) { if (t.includes(k)) { color = colorMap[k]; break; } }
        document.documentElement.style.setProperty('--accent',        color);
        document.documentElement.style.setProperty('--accent-dim',    color + '1a');
        document.documentElement.style.setProperty('--border-accent', color + '38');
        window.db && window.db.collection('system_config').doc('faraday_protocol')
            .update({'ui_theme.accent': color}).catch(function(){});
        setHUD('COLOR: ' + color.toUpperCase());
        return 'Акцент изменён на ' + color + '.';
    }

    /* Пауза */
    if (t.includes('пауза') || t.includes('стоп') || t.includes('pause') || t.includes('stop')) {
        window.faradaySystemPaused = true;
        var v = document.getElementById('bg-video');
        if (v) v.pause();
        setHUD('SYSTEM: PAUSED');
        if (pill) pill.innerText = 'ПАУЗА';
        window.db && window.db.collection('system_config').doc('faraday_protocol')
            .update({safety_protocols:'paused'}).catch(function(){});
        return 'Системы приостановлены.';
    }

    /* Запуск */
    if (t.includes('активируй') || t.includes('пуск') || t.includes('запуск') ||
        t.includes('start') || t.includes('activate') || t.includes('resume')) {
        window.faradaySystemPaused = false;
        var v2 = document.getElementById('bg-video');
        if (v2) v2.play().catch(function(){});
        setHUD('SYSTEM: ACTIVE');
        if (pill) pill.innerText = 'АКТИВЕН';
        window.db && window.db.collection('system_config').doc('faraday_protocol')
            .update({safety_protocols:'active'}).catch(function(){});
        return 'Все системы запущены.';
    }

    /* Синхронизация */
    if (t.includes('синхронизация') || t.includes('sync') || t.includes('обнови')) {
        setHUD('SYNCING...');
        window.db && window.db.collection('system_config').doc('faraday_protocol').get()
            .then(function(snap) {
                if (!snap.exists) { setHUD('SYSTEM: STANDBY'); return; }
                var cfg = snap.data();
                if (cfg.ui_theme && cfg.ui_theme.accent)
                    document.documentElement.style.setProperty('--accent', cfg.ui_theme.accent);
                setHUD('SYSTEM: READY');
                if (feed) appendFaradayAIMsg(feed,
                    'Конфигурация загружена. Версия: ' + (cfg.version || '—'));
            }).catch(function() { setHUD('SYNC ERROR'); });
        return 'Запрашиваю Firestore...';
    }

    /* Статус */
    if (t.includes('статус') || t.includes('status')) {
        return 'Система: ' + (window.faradaySystemPaused ? 'ПАУЗА' : 'АКТИВНА') +
               '. Firebase: OK. TTS: ' + (faradayTTSEnabled ? 'ON' : 'OFF') +
               '. ' + (typeof getFaradayMood === 'function' ? getFaradayMood() : '');
    }

    /* Диагностика */
    if (t.includes('диагностика') || t.includes('diagnostic') || t.includes('scan')) {
        performSelfDiagnostic();
        return 'Запуск диагностики... Результат через несколько секунд.';
    }

    /* Self-evolution */
    if (t.includes('эволюция') || t.includes('evolution') || t.includes('развитие')) {
        runSelfEvolution().then(function(core) {
            if (core && feed) appendFaradayAIMsg(feed,
                'Анализ завершён. Уровень: ' + core.level +
                ', индекс: ' + core.intelligence_index + '.');
        });
        return 'Запускаю анализ саморазвития...';
    }

    /* Запомни */
    if (t.startsWith('запомни') || t.startsWith('remember') || t.startsWith('note')) {
        var mem = text.replace(/^(запомни|remember|note)\s*/i, '').trim();
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

    /* Поиск */
    var searchTriggers = ['найди ','что такое ','кто такой ','кто такая ','поищи ',
                          'find ','search ','what is ','who is ','расскажи о ',
                          'что значит ','объясни '];
    var searchQuery = null;
    for (var si = 0; si < searchTriggers.length; si++) {
        if (t.startsWith(searchTriggers[si])) {
            searchQuery = text.slice(searchTriggers[si].length).trim();
            break;
        }
    }
    if (searchQuery) {
        setHUD('SEARCHING...');
        var sq = searchQuery;
        return searchWikipedia(sq, _ttsLang).then(function(result) {
            setHUD('SYSTEM: ACTIVE');
            if (result) return '🌐 Wikipedia: ' + result;
            return searchDDG(sq).then(function(ddgResult) {
                if (ddgResult) return '🌐 ' + ddgResult;
                return 'По запросу «' + sq + '» ничего не найдено.';
            });
        });
    }

    /* Помощь */
    if (t.includes('помощь') || t.includes('help') || t.includes('команды') || t.includes('что умеешь')) {
        return '⚡ Команды ДЖАРВИС:\n' +
               '• «смени цвет на [синий/золотой/красный/стандарт]»\n' +
               '• «пауза» / «активируй»\n' +
               '• «синхронизация» — конфиг\n' +
               '• «статус» — состояние\n' +
               '• «диагностика» — тест Bridge\n' +
               '• «эволюция» — саморазвитие\n' +
               '• «запомни [текст]» — память\n' +
               '• «найди [тема]» — поиск Wikipedia\n' +
               '• «замолчи» / «говори» — голос';
    }

    /* Приветствие */
    if (t.includes('привет') || t.includes('hello') || t.includes('hi') || t.includes('hey')) {
        return 'Приветствую. ' +
               (typeof getFaradayMood === 'function' ? getFaradayMood() : '') +
               ' Чем могу помочь?';
    }

    /* Вопрос → Wikipedia */
    var isQ = t.endsWith('?') || t.startsWith('как ') || t.startsWith('почему ') ||
              t.startsWith('где ') || t.startsWith('когда ') ||
              t.startsWith('how ') || t.startsWith('why ') || t.startsWith('where ');
    if (isQ) {
        var fq = text.replace(/\?$/, '').trim();
        setHUD('SEARCHING...');
        return searchWikipedia(fq, _ttsLang).then(function(result) {
            setHUD('SYSTEM: STANDBY');
            if (result) return '🌐 ' + result;
            return 'Команда не распознана. Попробуйте «найди [тема]».';
        });
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
    var label = (_ttsLang === 'ru') ? 'ДЖАРВИС' : 'JARVIS';
    var div = document.createElement('div');
    div.className = 'msg-box ai-msg';
    div.innerHTML = '<strong>' + label + ':</strong> ' + text.replace(/\n/g, '<br>');
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
    div.innerHTML = '<strong>' + (_ttsLang === 'ru' ? 'ДЖАРВИС' : 'JARVIS') +
                    ':</strong> <span class="typing-dots">●●●</span>';
    feed.appendChild(div);
    feed.scrollTop = feed.scrollHeight;
    return id;
}

function removeFaradayTyping(id) {
    var el = id && document.getElementById(id);
    if (el) el.remove();
}

/* ══════════════════════════════════════════════
   ГОЛОСОВОЙ ВВОД — только для Faraday AI
══════════════════════════════════════════════ */
var recognition = null;
(function() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    recognition = new SR();
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
    recognition.lang = (_ttsLang === 'ru') ? 'ru-RU' : 'en-GB';
    try { recognition.start(); setVoiceBtn(true); }
    catch(e) { console.warn('[Voice start]', e); }
}

/* ══════════════════════════════════════════════
   ЗАПУСК AI-МОДУЛЕЙ
   Вызывается из app.js → initFaradayCore()
══════════════════════════════════════════════ */
function initAIModules() {
    if (window.speechSynthesis) window.speechSynthesis.getVoices();
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
