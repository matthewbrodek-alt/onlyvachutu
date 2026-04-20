/* ════════════════════════════════════════════════
   chat.js — Два независимых чата + AI-модули.

   ЛИЧНЫЙ ЧАТ:   sendPersonalMessage() → bridge → Telegram
                 Ответы из Telegram → chat-window (auth.js)

   FARADAY AI:   sendFaradayMessage() → локально
                 Голос: en-GB (Jarvis) / ru-RU (мужской)
                 Поиск в интернете через Wikipedia API
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
   Полностью изолирован от Faraday AI.
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

    // uid добавляется в callBackend (api.js) автоматически
    bridgeSaveMemory(text, userEmail).then(function(data) {
        if (!data) console.warn('[Chat] Bridge недоступен.');
    });
}

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
   EN → en-GB мужской (David / Google UK English Male)
   RU → ru-RU мужской (приоритет: Pavel, Yuri, любой муж. ru)
        — это наиболее близкий к голосу Григория Переля
          вариант доступный через Web Speech API.
          Web Speech API не даёт выбрать конкретного
          актёра озвучки — только системные голоса.
══════════════════════════════════════════════ */
var faradayTTSEnabled = true;
var _ttsLang          = 'ru'; // текущий язык сайта
var _voiceCache       = {};   // кеш подобранных голосов

/* Вызывается из app.js при смене языка */
function onLangChanged(lang) {
    _ttsLang = lang;
    _voiceCache = {}; // сбрасываем кеш — для нового языка выбираем заново
}

function _pickVoice(lang) {
    if (_voiceCache[lang]) return _voiceCache[lang];
    var voices = window.speechSynthesis.getVoices();
    if (!voices || !voices.length) return null;

    var isRu = lang === 'ru';
    var priority;

    if (isRu) {
        // Приоритет для русского голоса — мужские имена
        priority = [
            function(v) { return v.lang === 'ru-RU' && /pavel|pavel|yuri|dmitri|male/i.test(v.name); },
            function(v) { return v.lang === 'ru-RU' && !/female|woman|женщин|anya|alena|milena/i.test(v.name); },
            function(v) { return v.lang === 'ru-RU'; },
            function(v) { return v.lang && v.lang.startsWith('ru'); },
        ];
    } else {
        // Приоритет для английского — Jarvis-style
        priority = [
            function(v) { return /david/i.test(v.name); },
            function(v) { return /google uk english male/i.test(v.name); },
            function(v) { return v.lang === 'en-GB' && /male|man/i.test(v.name); },
            function(v) { return v.lang === 'en-GB'; },
            function(v) { return v.lang && v.lang.startsWith('en'); },
        ];
    }

    for (var i = 0; i < priority.length; i++) {
        var found = voices.filter(priority[i]);
        if (found.length) { _voiceCache[lang] = found[0]; return found[0]; }
    }
    return null;
}

function faradaySpeak(text) {
    if (!faradayTTSEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    var clean = text.replace(/<[^>]+>/g, '').replace(/^(JARVIS|FARADAY):\s*/i, '').trim();
    if (!clean) return;

    var utt = new SpeechSynthesisUtterance(clean);
    var isRu = _ttsLang === 'ru';

    utt.lang   = isRu ? 'ru-RU' : 'en-GB';
    utt.pitch  = isRu ? 0.75 : 0.6;   // RU: чуть выше; EN: низкий Jarvis
    utt.rate   = isRu ? 0.92 : 0.88;  // RU: чуть медленнее; EN: солидно
    utt.volume = 0.95;

    var voice = _pickVoice(_ttsLang);
    if (voice) {
        utt.voice = voice;
    } else {
        // Голоса ещё загружаются — ждём
        window.speechSynthesis.onvoiceschanged = function() {
            window.speechSynthesis.onvoiceschanged = null;
            _voiceCache = {};
            var v = _pickVoice(_ttsLang);
            if (v) utt.voice = v;
            window.speechSynthesis.speak(utt);
        };
        return; // speak будет вызван в onvoiceschanged
    }
    window.speechSynthesis.speak(utt);
}

/* ══════════════════════════════════════════════
   ПОИСК В ИНТЕРНЕТЕ — Wikipedia API
   Используется в Faraday AI при команде "найди"
   или неизвестном вопросе. Публичный API,
   не требует ключей.
══════════════════════════════════════════════ */
function searchWikipedia(query, lang) {
    var wikiLang = (lang === 'ru') ? 'ru' : 'en';
    var url = 'https://ru.wikipedia.org/w/api.php?' +
        'action=query&format=json&origin=*' +
        '&prop=extracts&exintro=true&explaintext=true' +
        '&exsentences=3&redirects=1' +
        '&titles=' + encodeURIComponent(query);
    if (wikiLang === 'en') {
        url = url.replace('ru.wikipedia.org', 'en.wikipedia.org');
    }
    return fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(data) {
            var pages  = data.query && data.query.pages;
            if (!pages) return null;
            var pageId = Object.keys(pages)[0];
            if (pageId === '-1') return null; // не найдено
            var extract = pages[pageId].extract;
            if (!extract) return null;
            // Берём первые 3 предложения
            var sentences = extract.split(/(?<=[.!?])\s+/).slice(0, 3).join(' ');
            return sentences.trim() || null;
        })
        .catch(function() { return null; });
}

/* Быстрый поиск определения через словарь DuckDuckGo instant */
function searchDDG(query) {
    var url = 'https://api.duckduckgo.com/?q=' + encodeURIComponent(query) +
              '&format=json&no_html=1&skip_disambig=1';
    return fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(data) {
            return data.AbstractText || data.Answer || null;
        })
        .catch(function() { return null; });
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
    var loadMs  = timing ? timing.domContentLoadedEventEnd - timing.navigationStart : -1;

    setTimeout(function() {
        var report = loadMs < 0
            ? 'Диагностика: данные загрузки недоступны.'
            : loadMs < 1000
                ? 'Системы работают штатно. Время отклика: ' + loadMs + 'мс.'
                : 'Задержка: ' + loadMs + 'мс. Рекомендую оптимизировать медиа.';

        checkBridgeHealth().then(function(ok) {
            var br = ok ? 'Bridge: Online.' : 'Bridge: Offline — Telegram недоступен.';
            if (feed) appendFaradayAIMsg(feed, report + ' ' + br);
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
                .set(core, { merge: true }).then(function() { return core; });
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
        .catch(function(err) {
            console.warn('[Faraday] Self-evolution:', err.message);
            return null;
        });
}

/* ══════════════════════════════════════════════
   ПЕРЕХВАТ ОШИБОК
══════════════════════════════════════════════ */
window.onerror = function(message, source, lineno) {
    var shortSrc = source ? source.split('/').pop() : 'unknown';
    var note = 'Системная нестабильность: ' + message +
               ' в «' + shortSrc + '», строка ' + lineno + '. Записываю в журнал.';
    var feed = document.getElementById('faraday-feed');
    if (feed && typeof appendFaradayAIMsg === 'function') appendFaradayAIMsg(feed, note);
    if (window.db) {
        window.db.collection('faraday_memory').add({
            topic: 'system_error',
            content: message + ' | ' + source + ':' + lineno,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(function(){});
    }
    if (typeof reportErrorToBridge === 'function') reportErrorToBridge(message, source, lineno);
    return false;
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
        // resp может быть строкой или Promise (для поиска)
        if (resp && typeof resp.then === 'function') {
            resp.then(function(answer) {
                appendFaradayAIMsg(feed, answer);
            });
        } else {
            appendFaradayAIMsg(feed, resp);
        }
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

    // TTS управление
    if (t.includes('замолчи') || t.includes('тихо') || t.includes('silence') || t.includes('mute')) {
        faradayTTSEnabled = false;
        window.speechSynthesis && window.speechSynthesis.cancel();
        setHUD('TTS: OFF');
        return 'Голосовой вывод отключён.';
    }
    if (t.includes('говори') || t.includes('включи голос') || t.includes('speak') || t.includes('unmute')) {
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
        'стандарт':'#00ff88','default':'#00ff88','зелёный':'#00ff88','green':'#00ff88',
    };
    if (t.includes('смени цвет') || t.includes('цвет на') || t.includes('change color')) {
        var color = '#00ff88';
        for (var k in colorMap) { if (t.includes(k)) { color = colorMap[k]; break; } }
        document.documentElement.style.setProperty('--accent', color);
        document.documentElement.style.setProperty('--accent-dim', color + '1a');
        document.documentElement.style.setProperty('--border-accent', color + '38');
        window.db && window.db.collection('system_config').doc('faraday_protocol')
            .update({ 'ui_theme.accent': color }).catch(function(){});
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
            .update({ safety_protocols: 'paused' }).catch(function(){});
        return 'Системы приостановлены.';
    }

    // Запуск
    if (t.includes('активируй') || t.includes('пуск') || t.includes('запуск') ||
        t.includes('start') || t.includes('activate') || t.includes('resume')) {
        window.faradaySystemPaused = false;
        var v2 = document.getElementById('bg-video');
        if (v2) v2.play().catch(function(){});
        setHUD('SYSTEM: ACTIVE');
        if (pill) pill.innerText = 'АКТИВЕН';
        window.db && window.db.collection('system_config').doc('faraday_protocol')
            .update({ safety_protocols: 'active' }).catch(function(){});
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
                if (feed) appendFaradayAIMsg(feed,
                    'Конфигурация загружена. Версия: ' + (cfg.version || '—'));
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
    if (t.includes('диагностика') || t.includes('diagnostic') || t.includes('scan')) {
        performSelfDiagnostic();
        return 'Запуск диагностики... Результат через несколько секунд.';
    }

    // Self-evolution
    if (t.includes('эволюция') || t.includes('evolution') || t.includes('развитие')) {
        runSelfEvolution().then(function(core) {
            if (core && feed) appendFaradayAIMsg(feed,
                'Анализ завершён. Уровень: ' + core.level +
                ', индекс: ' + core.intelligence_index + '.');
        });
        return 'Запускаю анализ саморазвития...';
    }

    // Запомни
    if (t.startsWith('запомни') || t.startsWith('remember') || t.startsWith('note')) {
        var mem = text.replace(/^(запомни|remember|note)\s*/i, '').trim();
        if (mem && window.db) {
            window.db.collection('faraday_memory').add({
                topic: 'user_note', content: mem,
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

    // ── ПОИСК В ИНТЕРНЕТЕ (Wikipedia) ──
    // Триггеры: «найди», «что такое», «кто такой», «поищи», «find», «search», «what is»
    var searchTriggers = ['найди ', 'что такое ', 'кто такой ', 'кто такая ', 'поищи ',
                          'find ', 'search ', 'what is ', 'who is ', 'расскажи о '];
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
        // Возвращаем Promise — sendFaradayMessage умеет с ним работать
        return searchWikipedia(sq, _ttsLang).then(function(result) {
            setHUD('SYSTEM: ACTIVE');
            if (result) {
                return '🌐 Wikipedia: ' + result;
            }
            // Fallback: DuckDuckGo instant
            return searchDDG(sq).then(function(ddgResult) {
                if (ddgResult) return '🌐 ' + ddgResult;
                return 'По запросу «' + sq + '» ничего не найдено. Попробуйте переформулировать.';
            });
        });
    }

    // Помощь
    if (t.includes('помощь') || t.includes('help') || t.includes('команды') || t.includes('что умеешь')) {
        return '⚡ Команды Faraday:\n' +
               '• «смени цвет на [синий/золотой/красный/стандарт]»\n' +
               '• «пауза» / «активируй» — системы\n' +
               '• «синхронизация» — загрузить конфиг\n' +
               '• «статус» — состояние\n' +
               '• «диагностика» — тест производительности\n' +
               '• «эволюция» — саморазвитие\n' +
               '• «запомни [текст]» — память\n' +
               '• «найди [запрос]» — поиск Wikipedia\n' +
               '• «замолчи» / «говори» — TTS';
    }

    // Приветствие
    if (t.includes('привет') || t.includes('hello') || t.includes('hi') || t.includes('hey')) {
        return 'Приветствую. ' +
               (typeof getFaradayMood === 'function' ? getFaradayMood() : '') +
               ' Чем могу помочь? Введите «помощь» для списка команд.';
    }

    // ── УМНЫЙ FALLBACK: неизвестный запрос → поиск ──
    // Если фраза похожа на вопрос — пробуем найти ответ
    var isQuestion = t.endsWith('?') || t.startsWith('как ') || t.startsWith('почему ') ||
                     t.startsWith('where ') || t.startsWith('when ') || t.startsWith('how ');
    if (isQuestion) {
        var fallbackQuery = text.replace(/\?$/, '').trim();
        setHUD('SEARCHING...');
        return searchWikipedia(fallbackQuery, _ttsLang).then(function(result) {
            setHUD('SYSTEM: STANDBY');
            if (result) return '🌐 ' + result;
            return 'Команда не распознана. Введите «помощь» для команд Faraday.';
        });
    }

    setHUD('SYSTEM: STANDBY');
    return 'Команда не распознана. Попробуйте «помощь» или «найди [тема]» для поиска.';
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
    div.id  = id; div.className = 'msg-box ai-msg';
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
   ГОЛОСОВОЙ ВВОД
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
    // Язык распознавания совпадает с языком интерфейса
    recognition.lang = (_ttsLang === 'ru') ? 'ru-RU' : 'en-GB';
    try { recognition.start(); setVoiceBtn(true); }
    catch(e) { console.warn('[Voice start]', e); }
}

/* ══════════════════════════════════════════════
   ЗАПУСК AI-МОДУЛЕЙ
══════════════════════════════════════════════ */
function initAIModules() {
    // Предзагружаем список голосов
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
