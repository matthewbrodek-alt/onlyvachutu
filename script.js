// 1. КОНФИГУРАЦИЯ И ИНИЦИАЛИЗАЦИЯ
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

// 2. ГЛАВНЫЙ СЛУШАТЕЛЬ СОСТОЯНИЯ (ВСЁ В ОДНОМ)
auth.onAuthStateChanged(async (user) => {
    const loginForm = document.getElementById('login-form');
    const userInfo = document.getElementById('user-info');
    const emailDisplay = document.getElementById('user-email-display');
    const authError = document.getElementById('auth-error');
    const privateCards = document.querySelectorAll('.private-card');
    const todoList = document.getElementById('todo-list');

    if (user) {
        console.log("Пользователь вошел:", user.email);
        // Интерфейс
        if (loginForm) loginForm.style.display = 'none';
        if (userInfo) userInfo.style.display = 'block';
        if (emailDisplay) emailDisplay.innerText = user.email;
        if (authError) authError.innerText = "";
        
        // Показываем секреты
        privateCards.forEach(card => card.style.display = 'block');

        // Загружаем тему из облака
        try {
            const doc = await db.collection("users").doc(user.uid).get();
            if (doc.exists && doc.data().theme === "dark") {
                document.body.classList.add('dark');
            }
        } catch (e) { console.error("Ошибка темы:", e); }

        // Запускаем список дел
        loadTodos(user.uid);

    } else {
        console.log("Никто не авторизован");
        if (loginForm) loginForm.style.display = 'block';
        if (userInfo) userInfo.style.display = 'none';
        privateCards.forEach(card => card.style.display = 'none');
        if (todoList) todoList.innerHTML = "";
    }
});

let unsubscribeTodos = null; // Переменная для остановки прослушивания дел

// 3. ФУНКЦИИ АВТОРИЗАЦИИ
async function handleSignUp() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    try {
        await auth.createUserWithEmailAndPassword(email, pass);
        alert("Аккаунт создан!");
    } catch (error) { document.getElementById('auth-error').innerText = error.message; }
}

async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    try {
        await auth.signInWithEmailAndPassword(email, pass);
    } catch (error) { document.getElementById('auth-error').innerText = error.message; }
}

function handleLogout() { auth.signOut(); }

// 4. ФУНКЦИИ ТЕМЫ И МЕНЮ
async function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    const user = auth.currentUser;
    if (user) {
        await db.collection("users").doc(user.uid).set({
            theme: isDark ? "dark" : "light"
        }, { merge: true });
    }
}

function toggleMenu() { document.getElementById("mobileMenu").classList.toggle("show"); }
function toggleSecret() { document.getElementById("secret").classList.toggle("show"); }

// 5. СПИСОК ДЕЛ (FIRESTORE)
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

function loadTodos(userId) {
    // Если мы уже что-то слушали — выключаем старый слушатель
    if (unsubscribeTodos) unsubscribeTodos(); 

    // Сохраняем новый слушатель в переменную
    unsubscribeTodos = db.collection("users").doc(userId).collection("todos")
        .orderBy("timestamp", "desc")
        .onSnapshot((snapshot) => {
            const list = document.getElementById('todo-list');
            if (!list) return;
            list.innerHTML = "";
            snapshot.forEach((doc) => {
                const li = document.createElement('li');
                li.innerHTML = `${doc.data().text} <button onclick="deleteTodo('${doc.id}')" style="background:none; color:red; border:none; cursor:pointer;">×</button>`;
                list.appendChild(li);
            });
        }, (error) => {
            // Добавляем обработку ошибки, чтобы она не "крашила" консоль
            console.warn("Слушатель остановлен или доступ запрещен:", error.message);
        });
}

async function deleteTodo(todoId) {
    const user = auth.currentUser;
    await db.collection("users").doc(user.uid).collection("todos").doc(todoId).delete();
}

// 6. ИЗБРАННОЕ (LOCALSTORAGE)
let favorites = JSON.parse(localStorage.getItem('myFavs')) || ['Пицца', 'Картошка', 'Игры'];
const listElement = document.getElementById('fav-list');

function renderList() {
    if (!listElement) return;
    listElement.innerHTML = "";
    favorites.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `${item} <button onclick="removeItem(${index})" style="margin-left:10px;">❌</button>`;
        listElement.appendChild(li);
    });
}

function addFavorite() {
    const input = document.getElementById('fav-input');
    if (input.value.trim()) {
        favorites.push(input.value.trim());
        localStorage.setItem('myFavs', JSON.stringify(favorites));
        renderList();
        input.value = "";
    }
}

function removeItem(index) {
    favorites.splice(index, 1);
    localStorage.setItem('myFavs', JSON.stringify(favorites));
    renderList();
}

// 7. API КОТИКОВ И TELEGRAM
async function getDog() {
    const loader = document.getElementById('loader');
    const img = document.getElementById('dog-image');
    loader.style.display = 'block';
    img.style.display = 'none';
    try {
        const res = await fetch('https://api.thecatapi.com/v1/images/search');
        const data = await res.json();
        img.src = data[0].url;
        img.onload = () => { loader.style.display = 'none'; img.style.display = 'block'; };
    } catch (e) { loader.style.display = 'none'; }
}

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
            body: JSON.stringify({ chat_id: CHAT_ID, text: `🚀 Сообщение!\nИмя: ${name}\nТекст: ${msg}` })
        });
        alert("Отправлено!");
    } catch (e) { alert("Ошибка!"); }
}

// 8. АНИМАЦИИ
function revealCards() {
    const trigger = window.innerHeight * 0.85;
    document.querySelectorAll('.card').forEach(card => {
        if (card.getBoundingClientRect().top < trigger) card.classList.add('show');
    });
}

window.addEventListener('scroll', revealCards);
window.addEventListener('load', () => { revealCards(); renderList(); });
