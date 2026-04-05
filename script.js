// 1. ИНИЦИАЛИЗАЦИЯ FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyA_7n34vc1JM5PER6kvU9mMSzKfpu8s5YE",
  authDomain: "my-portfolio-auth-ff1ce.firebaseapp.com",
  projectId: "my-portfolio-auth-ff1ce",
  storageBucket: "my-portfolio-auth-ff1ce.firebasestorage.app",
  messagingSenderId: "391088510675",
  appId: "1:391088510675:web:ff1c4d866c37f921886626",
  measurementId: "G-9Q1N2PQ51L"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let unsubscribeTodos = null; // Переменная для остановки прослушивания БД при выходе

// 2. НАВИГАЦИЯ МЕЖДУ СЕКЦИЯМИ (SPA)
function showPage(pageId) {
    // Скрываем все секции с классом .page
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });

    // Показываем выбранную секцию
    const activePage = document.getElementById(pageId);
    if (activePage) {
        activePage.style.display = 'block';
    }
    
    // Закрываем мобильное меню при переходе
    const mobileMenu = document.getElementById("mobileMenu");
    if (mobileMenu) mobileMenu.classList.remove("show");
}

// 3. ФУНКЦИИ АВТОРИЗАЦИИ
async function handleSignUp() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    try {
        await auth.createUserWithEmailAndPassword(email, pass);
        alert("Аккаунт создан!");
    } catch (error) { 
        document.getElementById('auth-error').innerText = error.message;
    }
}

async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    try {
        await auth.signInWithEmailAndPassword(email, pass);
    } catch (error) { 
        document.getElementById('auth-error').innerText = error.message;
    }
}

function handleLogout() { 
    auth.signOut(); 
}

// 4. СЛУШАТЕЛЬ СОСТОЯНИЯ ПОЛЬЗОВАТЕЛЯ
auth.onAuthStateChanged(async (user) => {
    const loginForm = document.getElementById('login-form');
    const userInfo = document.getElementById('user-info');
    const emailDisplay = document.getElementById('user-email-display');
    const privateCards = document.querySelectorAll('.private-card');
    const todoList = document.getElementById('todo-list');

    if (user) {
        console.log("Пользователь вошел:", user.email);
        if (loginForm) loginForm.style.display = 'none';
        if (userInfo) userInfo.style.display = 'block';
        if (emailDisplay) emailDisplay.innerText = user.email;
        
        // Показываем элементы только для своих
        privateCards.forEach(card => card.style.display = 'block');
        
        // Автоматически переходим в Список дел после входа
        showPage('todo-section'); 
        loadTodos(user.uid); 

        // Загрузка сохраненной темы пользователя
        try {
            const doc = await db.collection("users").doc(user.uid).get();
            if (doc.exists && doc.data().theme === "dark") {
                document.body.classList.add('dark');
            }
        } catch (e) { console.error("Ошибка темы:", e); }

    } else {
        console.log("Никто не авторизован");
        // Отписываемся от БД, чтобы не было ошибки прав доступа
        if (unsubscribeTodos) {
            unsubscribeTodos();
            unsubscribeTodos = null;
        }
        
        if (loginForm) loginForm.style.display = 'block';
        if (userInfo) userInfo.style.display = 'none';
        privateCards.forEach(card => card.style.display = 'none');
        if (todoList) todoList.innerHTML = "";
        
        // При выходе возвращаем на главную
        showPage('home'); 
    }
});

// 5. РАБОТА СО СПИСКОМ ДЕЛ (FIRESTORE)
function loadTodos(userId) {
    if (unsubscribeTodos) unsubscribeTodos(); 

    // Слушаем изменения в коллекции пользователя в реальном времени
    unsubscribeTodos = db.collection("users").doc(userId).collection("todos")
        .orderBy("timestamp", "desc")
        .onSnapshot((snapshot) => {
            const list = document.getElementById('todo-list');
            if (!list) return;
            list.innerHTML = "";
            snapshot.forEach((doc) => {
                const li = document.createElement('li');
                li.innerHTML = `
                    ${doc.data().text} 
                    <button onclick="deleteTodo('${doc.id}')" class="delete-btn">×</button>
                `;
                list.appendChild(li);
            });
        }, (error) => {
            console.warn("Доступ ограничен или поток остановлен:", error.message);
        });
}

async function addTodo() {
    const input = document.getElementById('todo-input');
    const user = auth.currentUser;
    if (user && input.value.trim() !== "") {
        await db.collection("users").doc(user.uid).collection("todos").add({
            text: input.value,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        input.value = "";
    }
}

async function deleteTodo(todoId) {
    const user = auth.currentUser;
    if (user) {
        await db.collection("users").doc(user.uid).collection("todos").doc(todoId).delete();
    }
}

// 6. ТЕМА И ДОПОЛНИТЕЛЬНОЕ МЕНЮ
async function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    const user = auth.currentUser;
    if (user) {
        // Сохраняем выбор темы в Firestore
        await db.collection("users").doc(user.uid).set({ 
            theme: isDark ? "dark" : "light" 
        }, { merge: true });
    }
}

function toggleMenu() { document.getElementById("mobileMenu").classList.toggle("show"); }

// 7. API И TELEGRAM
async function sendToTg() {
    const name = document.getElementById('tg-name').value;
    const msg = document.getElementById('tg-msg').value;
    if (!name || !msg) return alert("Заполни поля!");
    
    const TOKEN = "8664813567:AAEkqGdXuyrS43Pjfc1gB-KdVuOOReWrkGw";
    const CHAT_ID = "7451263058";
    
    try {
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chat_id: CHAT_ID, 
                text: `🚀 Сообщение!\nИмя: ${name}\nТекст: ${msg}` 
            })
        });
        alert("Отправлено!");
    } catch (e) { alert("Ошибка!"); }
}

// 8. ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ
window.addEventListener('load', () => {
    // Показываем главную страницу по умолчанию
    showPage('home');
});
