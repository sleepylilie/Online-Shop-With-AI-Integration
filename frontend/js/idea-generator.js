/**
 * idea-generator.ts - страница генератора идей
 *
 * На странице есть:
 * - генератор идей (в виде чата);
 * - готовые идеи (шаблоны идей).
 * История генератора идей сохраняется в двух местах:
 *  - sessionStorage - для всех, пока вкладка открыта
 *  - база данных    - для авторизованных, загружается при следующем входе (последние 5 идей)
 */
// =============
// Утилиты
// =============
// Берём токен авторизации из localStorage
const tok = () => localStorage.getItem('access_token');
// Ключи для хранения истории и ID сессии
const HISTORY_KEY = 'idea_chat_history';
const SESSION_KEY = 'idea_chat_session_id';
// =============
// Состояние
// =============
// История сообщений
let chatHistory = [];
// Выбранные параметры генерации по умолчанию
let selectedHobby = 'Рисование';
let selectedAge = 'все';
let selectedDifficulty = 'легкий';
// Уникальный ID сессии нужен чтобы группировать сообщения в БД
const getSessionId = () => {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
        // Генерируем один раз за сессию, сохраняем до закрытия вкладки
        id = crypto.randomUUID();
        sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
};
// =============
// DOM-элементы
// =============
const messagesEl = document.getElementById('chat__messages');
const generateForm = document.getElementById('chat__generate-form');
const generateBtn = document.getElementById('chat__generate-btn');
// =============
// Скролл
// =============
// Прокручивает ленту чата вниз после добавления нового сообщения
const scrollChatToBottom = () => {
    messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
};
// =============
// История чата
// =============
// Загружаем историю из sessionStorage при открытии страницы
const loadHistory = () => {
    try {
        const raw = sessionStorage.getItem(HISTORY_KEY);
        chatHistory = raw ? JSON.parse(raw) : [];
    }
    catch {
        chatHistory = [];
    }
};
// История сессии хранит не более 20 сообщений за раз
const saveHistory = () => {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(chatHistory.slice(-20)));
};
// =============
// Добавление сообщений в чат
// =============
// Создает блок сообщения от бота и добавляет его в ленту
const addBotMessage = (html, isLoading = false) => {
    const div = document.createElement('div');
    div.className = 'generator-chat-message' + (isLoading ? ' generator-chat-message--loading' : '');
    div.innerHTML = isLoading ? '<p>⏳ Генерирую идею...</p>' : html;
    messagesEl.appendChild(div);
    scrollChatToBottom();
    return div;
};
// Блок с кнопками "повторить" и "начать заново" (старые кнопки удаляются)
const addAfterGenButtons = () => {
    document.getElementById('chat__after-gen')?.remove();
    const div = document.createElement('div');
    div.className = 'generator-chat-after-gen';
    div.id = 'chat__after-gen';
    div.innerHTML = `
        <button class="button__accent1-with-icon" id="chat__repeat-btn">
            <img class="icon" src="/static/assets/icons/icon_repeat.svg" alt="" />
            <p class="text__button">Повторить генерацию</p>
        </button>
        <button class="button__accent2-no-icon text__button" id="chat__restart-btn">
            Начать заново
        </button>`;
    messagesEl.appendChild(div);
    scrollChatToBottom();
    // "Повторить" убирает кнопки и запускает генерацию с теми же параметрами
    div.querySelector('#chat__repeat-btn')?.addEventListener('click', () => {
        div.remove();
        sendGeneration();
    });
    // "Начать заново" убирает кнопки, показывает форму выбора параметров
    div.querySelector('#chat__restart-btn')?.addEventListener('click', () => {
        div.remove();
        generateForm.style.display = 'flex';
        // Скролл к выбору павраметров
        messagesEl.scrollTo({
            top: generateForm.offsetTop - 8,
            behavior: 'smooth',
        });
    });
};
// =============
// Кнопки выбора параметров
// =============
// Универсальная функция для групп кнопок-фильтров (хобби / возраст / сложность)
const initFilterGroup = (selector, dataAttr, onSelect) => {
    const btns = document.querySelectorAll(selector);
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Передает выбранное значение (только одно)
            onSelect(btn.getAttribute(dataAttr) ?? '');
        });
    });
};
initFilterGroup('[data-hobby]', 'data-hobby', v => { selectedHobby = v; });
initFilterGroup('[data-age]', 'data-age', v => { selectedAge = v; });
initFilterGroup('[data-difficulty]', 'data-difficulty', v => { selectedDifficulty = v; });
// =============
// Генерация идеи
// =============
const sendGeneration = async () => {
    // Скрывает форму пока идет генерация
    generateForm.style.display = 'none';
    // Показываем анимацию загрузки, пока ответа нет
    const loadingEl = addBotMessage('', true);
    // Запрос: параметры + история для контекста + ID сессии для БД
    const body = {
        hobby: selectedHobby,
        age_group: selectedAge,
        difficulty: selectedDifficulty,
        history: chatHistory,
        session_id: getSessionId(),
    };
    // Если пользователь авторизован, то добавляется токен, чтобы ответ сохранился в БД (только последние 5)
    const headers = { 'Content-Type': 'application/json' };
    if (tok())
        headers['Authorization'] = `Bearer ${tok()}`;
    try {
        // Отправляем запрос к API 
        const res = await fetch('/api/ideas/generate/', {
            method: 'POST', headers, body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
            // Ошибка генерации
            loadingEl.innerHTML = `<p style="color:var(--error)">${data.error || 'Ошибка генерации.'}</p>`;
            loadingEl.classList.remove('generator-chat-message--loading');
            generateForm.style.display = 'flex';
            return;
        }
        // Вставляем HTML-ответ от ИИ вместо анимации загрузки
        loadingEl.innerHTML = data.html;
        loadingEl.classList.remove('generator-chat-message--loading');
        // Сохраняем запрос и ответ в историю для контекста
        chatHistory.push({ role: 'user', content: data.user_message });
        chatHistory.push({ role: 'assistant', content: data.html });
        saveHistory();
        // "Повторить" или "Начать заново"
        addAfterGenButtons();
    }
    catch {
        // Возможная ошибка сети
        loadingEl.innerHTML = '<p style="color:var(--error)">Ошибка сети. Попробуйте ещё раз.</p>';
        loadingEl.classList.remove('generator-chat-message--loading');
        generateForm.style.display = 'flex';
    }
};
generateBtn?.addEventListener('click', sendGeneration);
// =============
// История из БД
// =============
// Загружает последние генерации из базы данных для авторизованных пользователей
const loadHistoryFromDB = async () => {
    if (!tok())
        return false;
    try {
        const res = await fetch('/api/ideas/history/', {
            headers: { 'Authorization': `Bearer ${tok()}` }
        });
        if (!res.ok)
            return false;
        const messages = await res.json();
        if (!messages.length)
            return false;
        // Берем последние 5 генераций
        const recent = messages.slice(0, 5).reverse();
        generateForm.style.display = 'none';
        recent.forEach((m) => {
            addBotMessage(m.ai_response);
            // Добавляем в историю чата, чтобы следующий запрос имел контекст
            chatHistory.push({ role: 'assistant', content: m.ai_response });
        });
        saveHistory();
        addAfterGenButtons();
        return true;
    }
    catch {
        return false;
    }
};
// =============
// Восстановление из sessionStorage
// =============
// Загрузка данных, если пользователь уже был на странице ранее и перешел
const restoreFromSession = () => {
    if (chatHistory.length === 0)
        return false;
    generateForm.style.display = 'none';
    // Показываем сообщения от бота
    chatHistory.forEach(msg => {
        if (msg.role === 'assistant')
            addBotMessage(msg.content);
    });
    // Если последнее сообщение от бота, добавляются кнопки действий
    const lastIsAssistant = chatHistory[chatHistory.length - 1]?.role === 'assistant';
    if (lastIsAssistant)
        addAfterGenButtons();
    else
        generateForm.style.display = 'flex';
    return true;
};
// Загружает шаблоны из БД и отображает их карточками в нижней части страницы
const loadIdeas = async () => {
    const grid = document.getElementById('ideas__grid');
    try {
        const res = await fetch('/api/ideas/');
        if (!res.ok)
            throw new Error();
        const ideas = await res.json();
        grid.innerHTML = '';
        if (!ideas.length) {
            grid.innerHTML = '<p class="text__body-smaller" style="color:var(--dark-gray)">Готовых идей пока нет.</p>';
            return;
        }
        // Шаблон для карточки идеи
        ideas.forEach(idea => {
            const card = document.createElement('div');
            card.className = 'idea-card';
            card.innerHTML = `
                <img src="${idea.result_image ?? '/static/assets/images/product-placeholder.png'}"
                     alt="${idea.title}" loading="lazy" />
                <p class="text__button idea-card__title">${idea.title}</p>
                <p class="text__body-smaller idea-card__attrs">
                    ${idea.hobby_type ? '🎨 ' + idea.hobby_type + '<br>' : ''}
                    ${idea.age_group ? '👤 ' + idea.age_group + '<br>' : ''}
                    ${idea.difficulty ? '⭐ ' + idea.difficulty : ''}
                </p>
            `;
            // По клику переходим на страницу с подробным описанием идеи
            card.addEventListener('click', () => {
                window.location.href = `/pages/idea-page.html?id=${idea.id}`;
            });
            grid.appendChild(card);
        });
    }
    catch {
        grid.innerHTML = '<p class="text__body-smaller" style="color:var(--error)">Не удалось загрузить идеи.</p>';
    }
};
// =============
// Инициализация
// =============
const init = async () => {
    loadHistory();
    // Восстановление сессии, если была
    const restoredFromSession = restoreFromSession();
    // Если сессия пустая, то загружаются данные из БД
    if (!restoredFromSession) {
        await loadHistoryFromDB();
    }
    // Сетка готовых шаблонов внизу страницы
    loadIdeas();
};
init();
export {};
