const firebaseConfig = {
  apiKey: "AIzaSyA_7n34vc1JM5PER6kvU9mMSzKfpu8s5YE",
  authDomain: "my-portfolio-auth-ff1ce.firebaseapp.com",
  projectId: "my-portfolio-auth-ff1ce",
  storageBucket: "my-portfolio-auth-ff1ce.firebasestorage.app",
  messagingSenderId: "391088510675",
  appId: "1:391088510675:web:ff1c4d866c37f921886626",
  measurementId: "G-9Q1N2PQ51L"
};

// Инициализируем
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Регистрация
async function handleSignUp() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    const errorElement = document.getElementById('auth-error');
    
    try {
        await auth.createUserWithEmailAndPassword(email, pass);
        alert("Аккаунт создан!");
    } catch (error) {
        errorElement.innerText = error.message;
    }
}

// Вход
async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    const errorElement = document.getElementById('auth-error');
    
    try {
        await auth.signInWithEmailAndPassword(email, pass);
    } catch (error) {
        errorElement.innerText = "Ошибка входа: " + error.message;
    }
}
// Выход
function handleLogout() {
    auth.signOut();
}

// Слушатель состояния (автоматически меняет интерфейс)
auth.onAuthStateChanged(user => {
    const loginForm = document.getElementById('login-form');
    const userInfo = document.getElementById('user-info');
    const emailDisplay = document.getElementById('user-email-display');

    if (user) {
        loginForm.style.display = 'none';
        userInfo.style.display = 'block';
        emailDisplay.innerText = user.email;
        document.getElementById('auth-error').innerText = "";
    } else {
        loginForm.style.display = 'block';
        userInfo.style.display = 'none';
    }
});

function toggleMenu() {
    document.getElementById("mobileMenu").classList.toggle("show");
}

function toggleSecret() {
    const secret = document.getElementById("secret");
    secret.classList.toggle("show");
}

function toggleTheme() {
    document.body.classList.toggle("dark");
}

// Анимация карточек
const cards = document.querySelectorAll('.card');

function revealCards() {
    const triggerBottom = window.innerHeight * 0.85;
    cards.forEach(card => {
        const cardTop = card.getBoundingClientRect().top;
        if (cardTop < triggerBottom) {
            card.classList.add('show');
        }
    });
}

window.addEventListener('scroll', revealCards);
// Запускаем один раз при загрузке, чтобы показать верхние карточки
window.addEventListener('load', revealCards);


   // 1. Пытаемся загрузить данные из памяти. Если там пусто, используем стандартный набор.
let favorites = JSON.parse(localStorage.getItem('myFavs')) || ['Пицца', 'Картошка', 'Игры','Програмировавывание'];

const listElement = document.getElementById('fav-list');

// Функция для отрисовки всего списка на экране
function renderList() {
    listElement.innerHTML = ""; // Очищаем список перед перерисовкой
    favorites.forEach((item, index) => {
        const li = document.createElement('li');
        li.textContent = item;
        
        // Добавим кнопку удаления для красоты (бонус!)
        const btn = document.createElement('button');
        btn.textContent = '❌';
        btn.style.marginLeft = '10px';
        btn.style.padding = '2px 5px';
        btn.onclick = () => removeItem(index);
        
        li.appendChild(btn);
        listElement.appendChild(li);
    });
}

// 2. Функция добавления
function addFavorite() {
    const input = document.getElementById('fav-input');
    const newValue = input.value.trim();

    if (newValue !== "") {
        favorites.push(newValue); // Добавляем в массив
        saveAndRender();          // Сохраняем и обновляем экран
        input.value = "";
    }
}

// 3. Функция удаления
function removeItem(index) {
    favorites.splice(index, 1); // Удаляем элемент из массива по индексу
    saveAndRender();
}

// 4. Главная функция: сохраняет массив в память и обновляет экран
function saveAndRender() {
    localStorage.setItem('myFavs', JSON.stringify(favorites)); // Сохраняем как строку
    renderList();
}

// Запускаем отрисовку при первой загрузке
renderList();


async function getDog() { // Название можно оставить старым, чтобы не менять HTML
    const loader = document.getElementById('loader');
    const img = document.getElementById('dog-image');

    loader.style.display = 'block';
    img.style.display = 'none';

    try {
        // API для случайных котиков
        const response = await fetch('https://api.thecatapi.com/v1/images/search');
        const data = await response.json();
        
        img.src = data[0].url; // У котиков структура ответа немного другая

        img.onload = () => {
            loader.style.display = 'none';
            img.style.display = 'block';
        };
    } catch (error) {
        loader.style.display = 'none';
        alert("Котик спрятался и не выходит :(");
    }
}
async function sendToTg() {
    const name = document.getElementById('tg-name').value;
    const msg = document.getElementById('tg-msg').value;
    const btn = document.querySelector('#contact button');

    if (name && msg) {
        btn.disabled = true;
        btn.textContent = "Отправляю...";

        const TOKEN = "8664813567:AAEkqGdXuyrS43Pjfc1gB-KdVuOOReWrkGw";
        const CHAT_ID = "7451263058";
        const fullText = `🚀 Новое сообщение с сайта!\nИмя: ${name}\nТекст: ${msg}`;

        try {
            const response = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CHAT_ID,
                    text: fullText
                })
            });

            if (response.ok) {
                alert("Сообщение улетело! Проверь Telegram.");
                document.getElementById('tg-name').value = "";
                document.getElementById('tg-msg').value = "";
            } else {
                alert("Ошибка сервера Telegram. Проверь бота.");
            }
        } catch (error) {
            alert("Ошибка сети! Проверь интернет.");
        } finally {
            // Возвращаем кнопку в рабочее состояние в любом случае
            btn.disabled = false;
            btn.textContent = "Отправить в Telegram";
        }
    } else {
        alert("Заполни все поля!");
    }
}

auth.onAuthStateChanged(user => {
    if (user) {
        console.log("Пользователь вошел:", user.email);
    } else {
        console.log("Никто не авторизован");
    }
});


