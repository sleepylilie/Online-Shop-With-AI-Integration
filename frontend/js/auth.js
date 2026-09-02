/**
 * auth.ts - управление авторизацией
 *
 * Отвечает за:
 * - поп-апы входа и регистрации,
 * - валидацию полей,
 * - хранение JWT-токенов,
 * - обновление кнопки профиля в хедере.
 */
// =============
// Хранение токенов
// =============
// Сохраняем токены и имя пользователя после успешного входа
const saveTokens = (access, refresh, firstName) => {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('user_name', firstName);
};
// Удаляем все данные пользователя при выходе
const clearTokens = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_name');
};
// Проверяем авторизацию по наличию токена
export const isLoggedIn = () => Boolean(localStorage.getItem('access_token'));
export const getUserName = () => localStorage.getItem('user_name') ?? '';
// =============
// Оверлей 
// =============
// Создаем оверлей один раз и переиспользуем 
let overlay = null;
const getOverlay = () => {
    if (!overlay) {
        // Создаем элемент затемнения и добавляем в body
        overlay = document.createElement('div');
        overlay.className = 'popup-overlay';
        overlay.addEventListener('click', closeAllPopups);
        document.body.appendChild(overlay);
    }
    return overlay;
};
const showOverlay = () => { getOverlay().style.display = 'flex'; };
const hideOverlay = () => { if (overlay)
    overlay.style.display = 'none'; };
// =============
// Открытие / закрытие поп-апов
// =============
let currentPopup = null;
const openPopup = (popup) => {
    // Закрываем предыдущий поп-ап если был открыт
    closeAllPopups();
    // Показываем оверлей и перемещаем поп-ап внутрь него
    showOverlay();
    getOverlay().appendChild(popup);
    popup.style.display = 'flex';
    currentPopup = popup;
    // Сбрасываем ошибки от предыдущего открытия
    clearErrors(popup);
};
const closeAllPopups = () => {
    if (currentPopup) {
        // Возвращаем поп-ап в body, чтобы не потерять элемент из DOM
        document.body.appendChild(currentPopup);
        currentPopup.style.display = 'none';
        currentPopup = null;
    }
    hideOverlay();
};
// Закрытие на Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape')
        closeAllPopups();
});
// =============
// Валидация и отображение ошибок
// =============
// Показывает ошибку под полем и подсвечивает его нижнюю границу
const showFieldError = (msgId, text) => {
    const el = document.getElementById(msgId);
    if (!el)
        return;
    el.textContent = text;
    el.style.display = text ? 'block' : 'none';
    el.style.color = 'var(--error)';
    // Подсвечиваем поле ввода красным
    const input = el.closest('.text-input')?.querySelector('.text-input__field');
    if (input)
        input.style.borderBottomColor = text ? 'var(--error)' : '';
};
// Сбрасываем все ошибки в поп-апе при его открытии
const clearErrors = (popup) => {
    popup.querySelectorAll('.text-input__message').forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
    // Убираем красную подсветку у всех полей
    popup.querySelectorAll('.text-input__field').forEach(input => {
        input.style.borderBottomColor = '';
    });
    // Очищаем общее сообщение об ошибке
    const general = popup.querySelector('[id$="__general-msg"]');
    if (general) {
        general.textContent = '';
        general.style.display = 'none';
    }
};
const showGeneralError = (msgId, text) => {
    const el = document.getElementById(msgId);
    if (!el)
        return;
    el.textContent = text;
    el.style.display = text ? 'block' : 'none';
};
// Проверяем email регулярным выражением
const validateEmail = (email) => {
    if (!email)
        return 'Введите email.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return 'Неверный формат email. Пример: user@mail.ru';
    return '';
};
// Проверяем длину пароля — минимум 6 символов
const validatePassword = (password) => {
    if (!password)
        return 'Введите пароль.';
    if (password.length < 6)
        return 'Пароль должен содержать не менее 6 символов.';
    return '';
};
// =============
// Обновление хедера после входа
// =============
// Меняем текст кнопки "Профиль" на имя пользователя
const updateHeaderAfterLogin = (firstName) => {
    const profileBtn = document.getElementById('header__btn-profile');
    if (!profileBtn)
        return;
    const span = profileBtn.querySelector('span');
    if (span)
        span.textContent = firstName || 'Профиль';
};
// =============
// Поп-ап входа
// =============
const initLoginPopup = () => {
    const popup = document.getElementById('popup__login');
    const submitBtn = document.getElementById('login__submit');
    const emailInput = document.getElementById('login__email');
    const passInput = document.getElementById('login__password');
    const closeBtn = document.getElementById('login__close-btn');
    const goRegister = document.getElementById('login__go-to-register');
    if (!popup)
        return;
    // Закрытие по крестику
    closeBtn?.addEventListener('click', closeAllPopups);
    // Переход на форму регистрации
    goRegister?.addEventListener('click', (e) => { e.preventDefault(); openRegisterPopup(); });
    // Сбрасываем ошибки при вводе
    emailInput?.addEventListener('input', () => showFieldError('login__email-msg', ''));
    passInput?.addEventListener('input', () => showFieldError('login__password-msg', ''));
    submitBtn?.addEventListener('click', async () => {
        if (!emailInput || !passInput)
            return;
        const email = emailInput.value.trim();
        const password = passInput.value;
        // Проверяем поля на клиенте до отправки запроса
        let hasErrors = false;
        const emailErr = validateEmail(email);
        const passErr = validatePassword(password);
        if (emailErr) {
            showFieldError('login__email-msg', emailErr);
            hasErrors = true;
        }
        if (passErr) {
            showFieldError('login__password-msg', passErr);
            hasErrors = true;
        }
        if (hasErrors)
            return;
        // Блокируем кнопку на время запроса
        submitBtn.disabled = true;
        submitBtn.textContent = 'Входим...';
        try {
            const res = await fetch('/api/auth/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) {
                // Показываем ошибки от сервера под нужными полями
                submitBtn.disabled = false;
                submitBtn.textContent = 'Войти';
                if (data.errors?.email)
                    showFieldError('login__email-msg', data.errors.email);
                if (data.errors?.password)
                    showFieldError('login__password-msg', data.errors.password);
                if (data.errors?.general)
                    showGeneralError('login__general-msg', data.errors.general);
                return;
            }
            // Успех, сохраняем токены, обновляем хедер и закрываем поп-ап
            saveTokens(data.access, data.refresh, data.user.first_name);
            updateHeaderAfterLogin(data.user.first_name);
            closeAllPopups();
        }
        catch {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Войти';
            showGeneralError('login__general-msg', 'Ошибка сети. Проверьте подключение.');
        }
    });
    // Enter в любом поле отправляет форму
    [emailInput, passInput].forEach(input => {
        input?.addEventListener('keydown', (e) => { if (e.key === 'Enter')
            submitBtn?.click(); });
    });
};
export const openLoginPopup = () => {
    const popup = document.getElementById('popup__login');
    if (popup)
        openPopup(popup);
};
// =============
// Поп-ап регистрации
// =============
const initRegisterPopup = () => {
    const popup = document.getElementById('popup__register');
    const submitBtn = document.getElementById('register__submit');
    const nameInput = document.getElementById('register__first-name');
    const emailInput = document.getElementById('register__email');
    const passInput = document.getElementById('register__password');
    const confirmInput = document.getElementById('register__password-confirm');
    const closeBtn = document.getElementById('register__close-btn');
    const goLogin = document.getElementById('register__go-to-login');
    if (!popup)
        return;
    // Закрытие и переход на вход
    closeBtn?.addEventListener('click', closeAllPopups);
    goLogin?.addEventListener('click', (e) => { e.preventDefault(); openLoginPopup(); });
    // Сбрасываем ошибки при вводе
    nameInput?.addEventListener('input', () => showFieldError('register__first-name-msg', ''));
    emailInput?.addEventListener('input', () => showFieldError('register__email-msg', ''));
    passInput?.addEventListener('input', () => showFieldError('register__password-msg', ''));
    confirmInput?.addEventListener('input', () => showFieldError('register__password-confirm-msg', ''));
    submitBtn?.addEventListener('click', async () => {
        if (!nameInput || !emailInput || !passInput || !confirmInput)
            return;
        const firstName = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passInput.value;
        const confirm = confirmInput.value;
        // Клиентская валидация всех полей
        let hasErrors = false;
        if (!firstName) {
            showFieldError('register__first-name-msg', 'Введите имя.');
            hasErrors = true;
        }
        const emailErr = validateEmail(email);
        if (emailErr) {
            showFieldError('register__email-msg', emailErr);
            hasErrors = true;
        }
        const passErr = validatePassword(password);
        if (passErr) {
            showFieldError('register__password-msg', passErr);
            hasErrors = true;
        }
        if (password !== confirm) {
            showFieldError('register__password-confirm-msg', 'Пароли не совпадают.');
            hasErrors = true;
        }
        if (hasErrors)
            return;
        // Блокируем кнопку на время запроса
        submitBtn.disabled = true;
        submitBtn.textContent = 'Регистрируемся...';
        try {
            const res = await fetch('/api/auth/register/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ first_name: firstName, email, password }),
            });
            const data = await res.json();
            if (!res.ok) {
                // Показываем ошибки от сервера
                submitBtn.disabled = false;
                submitBtn.textContent = 'Зарегистрироваться';
                if (data.errors?.first_name)
                    showFieldError('register__first-name-msg', data.errors.first_name);
                if (data.errors?.email)
                    showFieldError('register__email-msg', data.errors.email);
                if (data.errors?.password)
                    showFieldError('register__password-msg', data.errors.password);
                if (data.errors?.general)
                    showGeneralError('register__general-msg', data.errors.general);
                return;
            }
            // Успех, сохраняем токены и закрываем поп-ап
            saveTokens(data.access, data.refresh, data.user.first_name);
            updateHeaderAfterLogin(data.user.first_name);
            closeAllPopups();
        }
        catch {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Зарегистрироваться';
            showGeneralError('register__general-msg', 'Ошибка сети. Проверьте подключение.');
        }
    });
    // Enter в любом поле отправляет форму
    [nameInput, emailInput, passInput, confirmInput].forEach(input => {
        input?.addEventListener('keydown', (e) => { if (e.key === 'Enter')
            submitBtn?.click(); });
    });
};
export const openRegisterPopup = () => {
    const popup = document.getElementById('popup__register');
    if (popup)
        openPopup(popup);
};
// =============
// Кнопки хедера
// =============
const initHeaderButtons = () => {
    const profileBtn = document.getElementById('header__btn-profile');
    const favoritesBtn = document.getElementById('header__btn-favorites');
    const cartBtn = document.getElementById('header__btn-cart');
    // Переходим на страницу если авторизованы, иначе открываем поп-ап входа
    const guardedNavigate = (path) => {
        if (isLoggedIn())
            window.location.href = path;
        else
            openLoginPopup();
    };
    // Срабатывает раньше обработчиков из header.ts
    profileBtn?.addEventListener('click', (e) => { e.stopImmediatePropagation(); guardedNavigate('/pages/profile.html'); }, true);
    favoritesBtn?.addEventListener('click', (e) => { e.stopImmediatePropagation(); guardedNavigate('/pages/profile.html?tab=liked'); }, true);
    cartBtn?.addEventListener('click', (e) => { e.stopImmediatePropagation(); guardedNavigate('/pages/cart.html'); }, true);
    // Если уже вошел, показывается имя в кнопке профиля
    if (isLoggedIn())
        updateHeaderAfterLogin(getUserName());
};
// =============
// Инициализация
// =============
// Загружает HTML поп-апа с сервера и добавляет в body, если его еще нет
const ensurePopupsInDom = async () => {
    if (!document.getElementById('popup__login')) {
        const res = await fetch('/static/components/login-popup.html');
        const html = await res.text();
        const div = document.createElement('div');
        div.innerHTML = html;
        const popup = div.firstElementChild;
        if (popup) {
            popup.style.display = 'none';
            document.body.appendChild(popup);
        }
    }
    if (!document.getElementById('popup__register')) {
        const res = await fetch('/static/components/register-popup.html');
        const html = await res.text();
        const div = document.createElement('div');
        div.innerHTML = html;
        const popup = div.firstElementChild;
        if (popup) {
            popup.style.display = 'none';
            document.body.appendChild(popup);
        }
    }
};
// Запускаем все после загрузки поп-апов
(async () => {
    await ensurePopupsInDom();
    initLoginPopup();
    initRegisterPopup();
    initHeaderButtons();
})();
window.openLoginPopup = openLoginPopup;
window.openRegisterPopup = openRegisterPopup;
