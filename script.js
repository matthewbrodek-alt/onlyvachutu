// 1. КОНФИГУРАЦИЯ
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
let unsubscribeTodos = null;

// 2. НАВИГАЦИЯ И ТЕМА
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });
    const activePage = document.getElementById(pageId);
    if (activePage) activePage.style.display = 'block';
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    const icon = document.getElementById('theme-icon');
    if (icon) icon.innerText = isDark ? "☀️" : "🌙";
    
    if (auth.currentUser) {
        db.collection("users").doc(auth.currentUser.uid).set({ theme: isDark ? "dark" : "light" }, { merge: true });
    }
}

// 3. АВТОРИЗАЦИЯ
async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    try {
        await auth.signInWithEmailAndPassword(email, pass);
    } catch (e) { alert("Ошибка входа: " + e.message); }
}

async function handleSignUp() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    try {
        await auth.createUserWithEmailAndPassword(email, pass);
        alert("Аккаунт создан!");
    } catch (e) { alert("Ошибка регистрации: " + e.message); }
}

function handleLogout() { 
    if (unsubscribeTodos) {
        unsubscribeTodos();
        unsubscribeTodos = null;
    }
    auth.signOut(); 
}

// 4. СЛУШАТЕЛЬ СОСТОЯНИЯ
auth.onAuthStateChanged(async (user) => {
    const loginForm = document.getElementById('login-form');
    const userInfo = document.getElementById('user-info');

    if (user) {
        if (loginForm) loginForm.style.display = 'none';
        if (userInfo) userInfo.style.display = 'block';
        document.getElementById('user-email-display').innerText = user.email;
        loadTodos(user.uid);
        
        const doc = await db.collection("users").doc(user.uid).get();
        if (doc.exists && doc.data().theme === "dark") {
            document.body.classList.add('dark');
            if (document.getElementById('theme-icon')) document.getElementById('theme-icon').innerText = "☀️";
        }
    } else {
        if (loginForm) loginForm.style.display = 'block';
        if (userInfo) userInfo.style.display = 'none';
        showPage('home');
    }
});

// 5. FIRESTORE (СПИСОК ДЕЛ)
function loadTodos(userId) {
    if (unsubscribeTodos) unsubscribeTodos();
    unsubscribeTodos = db.collection("users").doc(userId).collection("todos")
        .orderBy("timestamp", "desc")
        .onSnapshot((snapshot) => {
            const list = document.getElementById('todo-list');
            if (!list) return;
            list.innerHTML = "";
            snapshot.forEach((doc) => {
                const li = document.createElement('li');
                li.innerHTML = `${doc.data().text} <button onclick="deleteTodo('${doc.id}')">×</button>`;
                list.appendChild(li);
            });
        }, (error) => {
            console.warn("Слушатель отключен (норма при выходе)");
        });
}

async function addTodo() {
    const input = document.getElementById('todo-input');
    if (auth.currentUser && input.value.trim() !== "") {
        await db.collection("users").doc(auth.currentUser.uid).collection("todos").add({
            text: input.value,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        input.value = "";
    }
}

async function deleteTodo(todoId) {
    if (auth.currentUser) {
        await db.collection("users").doc(auth.currentUser.uid).collection("todos").doc(todoId).delete();
    }
}

window.onload = () => showPage('home');
