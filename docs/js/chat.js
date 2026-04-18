/* ════════════════════════════════════════════════
   chat.js — Два независимых чата:
   1. sendPersonalMessage() — личный → Firebase
   2. sendFaradayMessage()  — Faraday AI → команды
   Чаты полностью изолированы.
════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════
   ЛИЧНЫЙ МЕССЕНДЖЕР
════════════════════════════════════════════════ */

/* Добавить эмодзи в нужное поле */
function addEmoji(inputId, emoji) {
    var el = document.getElementById(inputId);
    if (el) { el.value += emoji; el.focus(); }
}

/* Отправить личное сообщение → Firebase + Telegram */
function sendPersonalMessage(inputId, windowId) {
    var input = document.getElementById(inputId || 'chat-msg');
    var feedEl = document.getElementById(windowId || 'chat-window');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;

    if (!window.auth || !window.auth.currentUser) {
        alert('Сначала войдите в систему');
        return;
    }

    const userEmail = window.auth.currentUser.email || 'guest@nitro.hub';
    input.value = '';
    appendMessage(feedEl, text, 'sent');

    // ОТПРАВКА НА PYTHON BRIDGE
    fetch('http://127.0.0.1:5000/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: text,   // В bridge.py мы добавили поддержку поля 'message'
            email: userEmail // Используем безопасную переменную
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('Ошибка сервера: ' + response.status);
        return response.json();
    })
    .then(data => {
        console.log('[Bridge] Ответ сервера:', data);
    })
    .catch(err => {
        console.error('[Bridge] Ошибка связи с Python:', err);
        // Не показываем alert на каждую ошибку, чтобы не бесить пользователя, 
        // просто пишем в консоль.
    });
}

// Слушаем ответы от Faraday в реальном времени
function listenForFaradayResponses() {
    if (!window.auth.currentUser) return;

    window.db.collection('faraday_responses') // Создаем отдельную коллекцию для ответов
        .where('recipientId', '==', window.auth.currentUser.uid)
        .orderBy('timestamp', 'desc')
        .limit(1)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const data = change.doc.data();
                    const feed = document.getElementById('faraday-feed');
                    if (feed) {
                        appendFaradayAIMsg(feed, data.text); // Выводим ответ на экран
                    }
                }
            });
        });
}

// Вызови эту функцию сразу после авторизации пользователя
/* Рендер личных сообщений из Firestore (в оба окна) */
function renderPersonalMessages(snap) {
    ['chat-window', 'modal-chat-window'].forEach(function(id) {
        var win = document.getElementById(id);
        if (!win) return;
        win.innerHTML = '';
        snap.forEach(function(doc) {
            var m = doc.data();
            var div = document.createElement('div');
            div.className  = 'msg-box ' + (m.sender === 'user' ? 'sent' : 'received');
            div.textContent = m.message || '';
            win.appendChild(div);
        });
        win.scrollTop = win.scrollHeight;
    });
}

/* Вспомогательная функция добавления сообщения */
function appendMessage(feedEl, text, type) {
    if (!feedEl) return;
    var div = document.createElement('div');
    div.className  = 'msg-box ' + type;
    div.textContent = text;
    feedEl.appendChild(div);
    feedEl.scrollTop = feedEl.scrollHeight;
}

/* ════════════════════════════════════════════════
   TTS — ГОЛОС FARADAY
════════════════════════════════════════════════ */
var faradayTTSEnabled = true;

function faradaySpeak(text) {
    if (!faradayTTSEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    var clean  = text.replace(/<[^>]+>/g, '').replace(/^FARADAY:\s*/i, '').trim();
    if (!clean) return;
    var utt    = new SpeechSynthesisUtterance(clean);
    utt.lang   = 'ru-RU';
    utt.pitch  = 0.7;
    utt.rate   = 1.0;
    utt.volume = 0.9;
    window.speechSynthesis.speak(utt);
}

/* ════════════════════════════════════════════════
   FARADAY AI ЧАТ
════════════════════════════════════════════════ */

/* Отправка из поля ввода */
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

/* Быстрые команды из кнопок */
function faradayQuick(cmd) {
    var input = document.getElementById('faraday-input');
    if (input) input.value = cmd;
    sendFaradayMessage();
}

/* ── Движок команд ── */
function processFaradayCommand(text) {
    var t      = text.toLowerCase().trim();
    var hudSt  = document.getElementById('hud-status');
    var pill   = document.getElementById('faraday-hud-status-badge');

    function setHUD(msg) { if (hudSt) hudSt.innerText = msg; }

    // TTS управление
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
        синий:'#0077ff', blue:'#0077ff',
        красный:'#ff4444', red:'#ff4444',
        золотой:'#ffcc00', gold:'#ffcc00',
        розовый:'#ff66cc', pink:'#ff66cc',
        стандарт:'#00ff88', default:'#00ff88', зелёный:'#00ff88',
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
        return 'Системы приостановлены. Видео и карусель остановлены.';
    }

    // Запуск
    if (t.includes('активируй') || t.includes('пуск') || t.includes('запуск') || t.includes('start') || t.includes('activate')) {
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
                appendFaradayAIMsg(document.getElementById('faraday-feed'),
                    'Конфигурация загружена. Версия: ' + (cfg.version || '—'));
            }).catch(function(){ setHUD('SYNC ERROR'); });
        return 'Запрашиваю Firestore...';
    }

    // Статус
    if (t.includes('статус') || t.includes('status')) {
        return 'Система: ' + (window.faradaySystemPaused ? 'ПАУЗА' : 'АКТИВНА') +
               '. Firebase: OK. TTS: ' + (faradayTTSEnabled ? 'ON' : 'OFF') +
               '. Настроение: ' + getFaradayMood();
    }

    // Запомни
    if (t.startsWith('запомни') || t.startsWith('remember')) {
        var mem = text.replace(/^запомни\s*|^remember\s*/i, '').trim();
        if (mem && window.db) {
            window.db.collection('faraday_memory').add({
                topic: 'user_note', content: mem,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }).then(function() {
                appendFaradayAIMsg(document.getElementById('faraday-feed'), 'Запомнено: «'+mem+'»');
            }).catch(function(e) {
                appendFaradayAIMsg(document.getElementById('faraday-feed'), 'Ошибка памяти: '+e.message);
            });
            return 'Обращаюсь к ядру памяти...';
        }
        return 'Что запомнить? Напишите: «Запомни [текст]»';
    }

    // Помощь
    if (t.includes('помощь') || t.includes('help') || t.includes('команды') || t.includes('что умеешь')) {
        return '⚡ Команды Faraday:\n' +
               '• «смени цвет на [синий/золотой/красный/стандарт]»\n' +
               '• «пауза» / «активируй» — управление системами\n' +
               '• «синхронизация» — загрузить конфиг\n' +
               '• «статус» — состояние системы\n' +
               '• «запомни [текст]» — сохранить в память\n' +
               '• «замолчи» / «говори» — TTS';
    }

    // Приветствие
    if (t.includes('привет') || t.includes('hello') || t.includes('hi')) {
        return 'Приветствую. ' + getFaradayMood() + ' Введите «помощь» для команд.';
    }

    setHUD('SYSTEM: STANDBY');
    return 'Команда не распознана. Попробуйте «помощь».';
}

/* ── Рендер сообщений Faraday ── */
function appendFaradayUserMsg(feed, text) {
    if (!feed) return;
    var div = document.createElement('div');
    div.className  = 'msg-box user-msg-faraday';
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
    div.id  = id; div.className = 'msg-box ai-msg';
    div.innerHTML = '<strong>FARADAY:</strong> <span class="typing-dots">●●●</span>';
    feed.appendChild(div);
    feed.scrollTop = feed.scrollHeight;
    return id;
}
function removeFaradayTyping(id) {
    var el = id && document.getElementById(id);
    if (el) el.remove();
}

/* ════════════════════════════════════════════════
   ГОЛОСОВОЙ ВВОД
════════════════════════════════════════════════ */
var recognition = null;
(function() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    recognition = new SR();
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = function(e) {
        var t = e.results[0][0].transcript;
        var input = document.getElementById('faraday-input');
        if (input) { input.value = t; sendFaradayMessage(); }
        setVoiceBtn(false);
    };
    recognition.onend   = function() { setVoiceBtn(false); };
    recognition.onerror = function(e) { console.warn('Voice:', e.error); setVoiceBtn(false); };
})();

function setVoiceBtn(on) {
    var btn = document.querySelector('.voice-btn');
    if (btn) btn.classList.toggle('listening', on);
}

function startVoiceCommand() {
    if (!recognition) { alert('Голосовой ввод не поддерживается.'); return; }
    try { recognition.start(); setVoiceBtn(true); }
    catch(e) { console.warn('Voice start:', e); }
}
