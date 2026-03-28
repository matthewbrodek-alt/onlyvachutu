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

async function getDog() {
    const imgElement = document.getElementById('dog-image');
    const button = document.querySelector('#api-card button');

    // Пока ждем ответа, меняем текст на кнопке
    button.textContent = "Ищу песика... 🔎";

  try {
        // МЫ ЗАПРАШИВАЕМ ДАННЫЕ У СЕРВИСА (API), А НЕ ПРОСТО КАРТИНКУ
        const response = await fetch('https://dog.ceo/api/breeds/image/random');
        
        // 2. Сервер присылает данные в текстовом формате JSON. 
        // Мы переводим их в удобный для JavaScript формат (объект)
        const data = await response.json();
        
        // В data.message сейчас лежит прямая ссылка на фото собаки!
        // 3. Подставляем эту ссылку в атрибут src нашей картинки
        imgElement.src = data.message;
        
        // 4. Делаем картинку видимой
        imgElement.style.display = "block"; 
        
    } catch (error) {
        // Если интернет пропал или сервер сломался, мы поймаем ошибку здесь
        alert("Упс! Собачка убежала. Проверьте интернет.");
    } finally {
        // Этот код выполнится в любом случае в самом конце
        button.textContent = "Позвать другую собачку!";
    }
}

async function sendToTg() {
    const name = document.getElementById('tg-name').value;
    const msg = document.getElementById('tg-msg').value;
    const btn = document.querySelector('#contact button'); // Хватаем кнопку

    if (name && msg) {
        btn.disabled = true; // Выключаем кнопку
        btn.textContent = "Отправляю...";
    const TOKEN = "8664813567:AAEkqGdXuyrS43Pjfc1gB-KdVuOOReWrkGw";
    const CHAT_ID = "7451263058";
    
    // Формируем текст сообщения
    const fullText = `🚀 Новое сообщение с сайта!\nИмя: ${name}\nТекст: ${msg}`;

    if (name && msg) {
        try {
            // Отправляем запрос на сервер Telegram
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
            }
        } catch (error) {
            alert("Ошибка при отправке!");
        }
    } else {
        alert("Заполни все поля!");
    }
}


