/**
 * profile.ts - страница личного кабинета
 *
 * Страница содержит несколько вкладок:
 * - личная информация,
 * - уведомления,
 * - заказы,
 * - избранное,
 * - отзывы.
 */
// =============
// Утилиты
// =============
// Берем токен авторизации из localStorage
const tok = () => localStorage.getItem('access_token');
// Форматирование даты в ДД.ММ.ГГГГ
const fmtDate = (iso) => new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
// Проверяем ширину экрана для переключения мобильной/десктопной версии
const isDesktop = () => window.innerWidth >= 1280;
// Текущая активная вкладка
let activeTab = '';
// Данные пользователя (нужно для отслеживания изменений в форме профиля)
let currentUser = {};
// =============
// 1. Переключение вкладок
// =============
const profileNav = document.getElementById('profile__nav');
const profileContent = document.getElementById('profile__content');
const showTab = (tabName) => {
    activeTab = tabName;
    // Скрываем все вкладки
    document.querySelectorAll('.profile__tab').forEach(t => {
        t.style.display = 'none';
    });
    // Показываем нужную
    const tab = document.getElementById(`profile-tab__${tabName}`);
    if (tab)
        tab.style.display = 'flex';
    // Подсвечиваем активную кнопку в навигации
    document.querySelectorAll('.profile__nav-option').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });
    // На мобильном скрываем навигацию и показываем контент вкладки
    if (!isDesktop()) {
        profileNav.style.display = 'none';
        profileContent.style.display = 'block';
    }
    // Загружаем данные для вкладки
    loadTabData(tabName);
};
// Возврат к навигации на мобильном скрывает контент и показывает меню
const showNav = () => {
    profileNav.style.display = 'flex';
    profileContent.style.display = 'none';
    activeTab = '';
};
// Добавляется клик на кнопки навигации
document.querySelectorAll('.profile__nav-option').forEach(btn => {
    // Элемент с именем пользователя пропускается (не кликабельный)
    if (btn.classList.contains('profile__nav-option--user'))
        return;
    btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab)
            showTab(tab);
    });
});
// Кнопки "Назад" внутри вкладок возвращают к навигации
document.querySelectorAll('.profile__back-btn').forEach(btn => {
    btn.addEventListener('click', showNav);
});
// При изменении размера окна адаптируем отображение
window.addEventListener('resize', () => {
    if (isDesktop()) {
        // На десктопе показывает оба блока
        profileNav.style.display = '';
        profileContent.style.display = '';
        if (!activeTab)
            showTab('personal');
    }
});
// =============
// 2. Ленивая загрузка данных вкладок
// =============
// Отслеживается, какие вкладки уже были загружены, чтобы не загружать повторно
const tabLoaded = {};
const loadTabData = (tab) => {
    // Если вкладка уже загружалась, не делаем повторный запрос
    if (tabLoaded[tab])
        return;
    tabLoaded[tab] = true;
    // Вызов нужной функции загрузки в зависимости от вкладки
    switch (tab) {
        case 'personal':
            loadPersonalInfo();
            break;
        case 'notifications':
            loadNotifications('all');
            break;
        case 'orders':
            loadOrders('all');
            break;
        case 'favorites':
            loadFavorites();
            break;
        case 'reviews':
            loadReviews('all');
            break;
    }
};
// =============
// 3. Личная информация
// =============
const loadPersonalInfo = async () => {
    // Если пользователь не авторизован, отправляем на главную
    if (!tok()) {
        window.location.href = '/index.html';
        return;
    }
    try {
        const res = await fetch('/api/auth/me/', { headers: { 'Authorization': `Bearer ${tok()}` } });
        if (res.status === 401) {
            window.location.href = '/index.html';
            return;
        }
        const user = await res.json();
        // Сохраняем данные для последующего сравнения при изменении полей
        currentUser = user;
        // Вспомогательная функция для заполнения полей формы информацией из БД
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el)
                el.value = val || '';
        };
        // Заполняем все поля данными из БД
        set('profile__first-name', user.first_name);
        set('profile__last-name', user.last_name);
        set('profile__email', user.email);
        set('profile__phone', user.phone);
        // Выбор нужной радио-кнопки для пола
        if (user.gender) {
            const radio = document.querySelector(`input[name="profile-gender"][value="${user.gender}"]`);
            if (radio)
                radio.checked = true;
        }
        // Подставляется нужный аватар пользователя
        const avatarImg = document.getElementById('profile__avatar-img');
        if (avatarImg && user.avatar)
            avatarImg.src = user.avatar;
        // Для отображения имени в навигации
        const navName = document.getElementById('profile__nav-username');
        if (navName)
            navName.textContent = user.first_name || 'Профиль';
        // Блокируем кнопку "Сохранить" пока нет изменений
        setTimeout(updateSaveButtonState, 0);
    }
    catch (e) {
        console.error(e);
    }
};
// =============
// Маска телефона в профиле
// =============
// Строит маску +7(XXX) XXX-XX-XX из введенных цифр
const applyPhoneMaskProfile = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    if (!digits)
        return '';
    let r = '+7(';
    r += digits.slice(0, Math.min(3, digits.length));
    if (digits.length > 3)
        r += ') ' + digits.slice(3, Math.min(6, digits.length));
    else if (digits.length === 3)
        r += ')';
    if (digits.length > 6)
        r += '-' + digits.slice(6, Math.min(8, digits.length));
    else if (digits.length === 6)
        r += '-';
    if (digits.length > 8)
        r += '-' + digits.slice(8, 10);
    else if (digits.length === 8)
        r += '-';
    return r;
};
// Проверка, что телефон введен полностью
const isPhoneComplete = (masked) => {
    return masked.replace(/\D/g, '').length === 11;
};
const phoneInput = document.getElementById('profile__phone');
// При вводе применяется маска
phoneInput?.addEventListener('input', () => {
    // Извлекаем цифры и сразу убираем ведущую 7 от префикса +7
    let digits = phoneInput.value.replace(/\D/g, '');
    if (digits.startsWith('7'))
        digits = digits.slice(1);
    phoneInput.value = applyPhoneMaskProfile(digits);
    updateSaveButtonState();
});
// Настройка, чтобы элементы маски не стирались, а цифры
phoneInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace') {
        e.preventDefault();
        if (!phoneInput)
            return;
        const digits = phoneInput.value.replace(/\D/g, '');
        const local = digits.startsWith('7') ? digits.slice(1) : digits;
        // Убираем последнюю цифру и перестраиваем маску
        phoneInput.value = local.length > 1
            ? applyPhoneMaskProfile(local.slice(0, -1))
            : '';
        updateSaveButtonState();
        return;
    }
    // Разрешаем только цифры и навигационные клавиши
    const allowed = ['Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
    if (!allowed.includes(e.key) && !/^\d$/.test(e.key) && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
    }
});
// Для имени/фамилии убираются недопустимые символы при вводе
['profile__first-name', 'profile__last-name'].forEach(id => {
    const inp = document.getElementById(id);
    inp?.addEventListener('input', () => {
        const cleaned = inp.value.replace(/[^a-zA-Zа-яёА-ЯЁ\s\-]/g, '');
        if (cleaned !== inp.value)
            inp.value = cleaned;
    });
});
// =============
// Сохранение личной информации
// =============
// Сравниваем текущие значения полей с загруженными данными
const hasFormChanged = () => {
    const get = (id) => document.getElementById(id)?.value.trim() ?? '';
    const gender = (document.querySelector('input[name="profile-gender"]:checked'))?.value ?? '';
    return (get('profile__first-name') !== (currentUser['first_name'] ?? '') ||
        get('profile__last-name') !== (currentUser['last_name'] ?? '') ||
        get('profile__email') !== (currentUser['email'] ?? '') ||
        get('profile__phone') !== (currentUser['phone'] ?? '') ||
        gender !== (currentUser['gender'] ?? ''));
};
// Обновление состояния кнопки "Сохранить"
const updateSaveButtonState = () => {
    const btn = document.getElementById('profile__save-btn');
    if (!btn)
        return;
    const changed = hasFormChanged();
    btn.disabled = !changed;
    btn.style.backgroundColor = changed ? '' : 'var(--dark-gray)';
    btn.style.cursor = changed ? 'pointer' : 'not-allowed';
};
// Следим за изменениями каждого поля и пересчитываем состояние кнопки
['profile__first-name', 'profile__last-name', 'profile__email', 'profile__phone'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateSaveButtonState);
});
document.querySelectorAll('input[name="profile-gender"]').forEach(r => {
    r.addEventListener('change', updateSaveButtonState);
});
document.getElementById('profile__save-btn')?.addEventListener('click', async () => {
    const saveMsg = document.getElementById('profile__save-msg');
    // Читаем значения всех полей
    const firstName = document.getElementById('profile__first-name').value.trim();
    const lastName = document.getElementById('profile__last-name').value.trim();
    const email = document.getElementById('profile__email').value.trim();
    const phone = document.getElementById('profile__phone').value.trim();
    const gender = (document.querySelector('input[name="profile-gender"]:checked'))?.value ?? '';
    // Проверка заполненности поля телефона
    if (phone && !isPhoneComplete(phone)) {
        const phoneMsg = document.getElementById('profile__phone-msg');
        phoneMsg.textContent = 'Введите номер полностью: +7(999) 999-99-99';
        phoneMsg.style.display = 'block';
        phoneMsg.style.color = 'var(--error)';
        return;
    }
    try {
        // Обновление измененных полей
        const res = await fetch('/api/auth/me/update/', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok()}` },
            body: JSON.stringify({ first_name: firstName, last_name: lastName, email, phone, gender }),
        });
        const data = await res.json();
        if (res.ok) {
            // Показываем подтверждение
            saveMsg.textContent = 'Изменения сохранены';
            saveMsg.style.color = 'var(--success)';
            saveMsg.style.display = 'block';
            // Обновляем currentUser чтобы кнопка снова заблокировалась
            currentUser['first_name'] = firstName;
            currentUser['last_name'] = lastName;
            currentUser['email'] = email;
            currentUser['phone'] = phone;
            currentUser['gender'] = gender;
            // Обновляем имя в хедере и в боковой навигации
            localStorage.setItem('user_name', firstName);
            const headerSpan = document.querySelector('#header__btn-profile span');
            if (headerSpan)
                headerSpan.textContent = firstName;
            const navName = document.getElementById('profile__nav-username');
            if (navName)
                navName.textContent = firstName;
            // Блокируем кнопку "Сохранить"
            updateSaveButtonState();
            // Скрываем сообщение через 3 секунды
            setTimeout(() => { saveMsg.style.display = 'none'; }, 3000);
        }
        else {
            // Показываем ошибку от сервера при неудаче
            saveMsg.textContent = data.errors?.email || 'Ошибка сохранения.';
            saveMsg.style.color = 'var(--error)';
            saveMsg.style.display = 'block';
        }
    }
    catch {
        saveMsg.textContent = 'Ошибка сети.';
        saveMsg.style.display = 'block';
    }
});
// =============
// Загрузка аватара
// =============
// Клик по кнопке обновления аватара открывает скрытый инпут для файла
document.getElementById('profile__avatar-btn')?.addEventListener('click', () => {
    document.getElementById('profile__avatar-input')?.click();
});
document.getElementById('profile__avatar-input')?.addEventListener('change', async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file)
        return;
    const avatarMsg = document.getElementById('profile__avatar-msg');
    // Проверяем размер файла (не более 4 Мб)
    if (file.size > 4 * 1024 * 1024) {
        avatarMsg.textContent = 'Файл слишком большой (макс. 4 МБ).';
        avatarMsg.style.display = 'block';
        return;
    }
    // Отправка файла на сервер
    const form = new FormData();
    form.append('avatar', file);
    try {
        const res = await fetch('/api/auth/me/avatar/', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${tok()}` },
            body: form,
        });
        const data = await res.json();
        if (res.ok) {
            // Обновление аватара на странице
            const img = document.getElementById('profile__avatar-img');
            if (img)
                img.src = data.avatar + '?v=' + Date.now();
            avatarMsg.style.display = 'none';
        }
        else {
            avatarMsg.textContent = data.error || 'Ошибка загрузки.';
            avatarMsg.style.display = 'block';
        }
    }
    catch {
        avatarMsg.textContent = 'Ошибка сети.';
        avatarMsg.style.display = 'block';
    }
});
// =============
// Смена пароля
// =============
// Показываем/скрываем блок с вводом текущего пароля
document.getElementById('profile__show-change-pwd')?.addEventListener('click', () => {
    const block = document.getElementById('profile__change-pwd-block');
    block.style.display = block.style.display === 'none' ? 'flex' : 'none';
});
// Проверяем текущий пароль перед переходом на страницу смены
document.getElementById('profile__confirm-pwd-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('profile__current-pwd');
    const msg = document.getElementById('profile__pwd-msg');
    const pwd = input?.value ?? '';
    if (!pwd) {
        msg.textContent = 'Введите пароль.';
        msg.style.display = 'block';
        return;
    }
    try {
        // Проверяем пароль через специальный эндпоинт 
        const res = await fetch('/api/auth/verify-password/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok()}` },
            body: JSON.stringify({ password: pwd }),
        });
        const data = await res.json();
        if (data.valid) {
            // Если пароль верный, переход на страницу смены пароля
            window.location.href = '/pages/change-password.html';
        }
        else {
            msg.textContent = data.error || 'Неверный пароль.';
            msg.style.color = 'var(--error)';
            msg.style.display = 'block';
        }
    }
    catch {
        msg.textContent = 'Ошибка сети.';
        msg.style.display = 'block';
    }
});
// =============
// Удаление аккаунта
// =============
document.getElementById('profile__delete-account-btn')?.addEventListener('click', async () => {
    // Двойное подтверждение удаления аккаунта
    if (!confirm('Вы уверены что хотите удалить аккаунт?\nЭто действие необратимо, все ваши данные будут удалены.'))
        return;
    const pwd = prompt('Для подтверждения введите ваш текущий пароль:');
    if (!pwd)
        return;
    try {
        // Проверка пароля
        const checkRes = await fetch('/api/auth/verify-password/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok()}` },
            body: JSON.stringify({ password: pwd }),
        });
        const checkData = await checkRes.json();
        if (!checkData.valid) {
            alert('Неверный пароль. Удаление отменено.');
            return;
        }
        // Пароль верный, профиль удаляется
        const res = await fetch('/api/auth/delete-account/', {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${tok()}` },
        });
        if (res.ok) {
            // Очищаем все локальные данные и отправляем на главную
            localStorage.clear();
            alert('Аккаунт удален.');
            window.location.href = '/index.html';
        }
        else {
            alert('Ошибка удаления аккаунта. Свяжитесь с поддержкой.');
        }
    }
    catch {
        alert('Ошибка сети.');
    }
});
// =============
// 4. Уведомления
// =============
// Фильтр для уведомлений (дефолтное значение "все")
let notifType = 'all';
const loadNotifications = async (type) => {
    notifType = type;
    const list = document.getElementById('profile__notifications-list');
    list.innerHTML = '<p class="text__body-smaller" style="color:var(--dark-gray)">Загрузка...</p>';
    // Формируем параметр фильтра
    const params = type !== 'all' ? `?type=${type}` : '';
    try {
        const res = await fetch(`/api/notifications/${params}`, { headers: { 'Authorization': `Bearer ${tok()}` } });
        const data = await res.json();
        list.innerHTML = '';
        if (!data.length) {
            list.innerHTML = '<p class="text__body-smaller" style="color:var(--dark-gray)">Уведомлений нет.</p>';
            return;
        }
        // Шаблон для карточки уведомления
        data.forEach((n) => {
            const card = document.createElement('div');
            // Прочитанные получают отдельный класс для визуального отличия
            card.className = 'notification-card' + (n['is_read'] ? ' notification-card--read' : '');
            card.innerHTML = `
                <div class="notification-card__left-container">
                    <div class="notification-card__marker"></div>
                    <div class="notification-card__text">
                        <p class="text__button">${n['title']}</p>
                        <p class="text__body-smaller">${n['message']}</p>
                    </div>
                </div>
                <div class="notification-card__right-container">
                    <p class="text__body-smaller" style="color:var(--dark-gray)">${fmtDate(String(n['created_at']))}</p>
                    <button class="button__icon-only notif-delete-btn" data-id="${n['id']}">
                        <img class="icon" src="/static/assets/icons/icon_bin.svg" alt="Удалить" />
                    </button>
                </div>`;
            // Клик на карточку помечает уведомление как прочитанное
            card.addEventListener('click', async () => {
                if (!n['is_read']) {
                    await fetch(`/api/notifications/${n['id']}/`, {
                        method: 'PATCH',
                        headers: { 'Authorization': `Bearer ${tok()}` }
                    });
                    // Обновление вида без перезагрузки списка
                    card.classList.add('notification-card--read');
                    card.querySelector('.notification-card__marker').setAttribute('style', 'background:var(--light-gray)');
                    n['is_read'] = true;
                }
            });
            // Кнопка удаления уведомления
            card.querySelector('.notif-delete-btn')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                await fetch(`/api/notifications/${n['id']}/delete/`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${tok()}` }
                });
                card.remove();
            });
            list.appendChild(card);
        });
    }
    catch {
        list.innerHTML = '<p class="text__body-smaller" style="color:var(--error)">Ошибка загрузки.</p>';
    }
};
// Кнопки фильтра уведомлений переключает активность фильтра
document.querySelectorAll('[data-notif-type]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('[data-notif-type]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tabLoaded['notifications'] = false;
        loadNotifications(btn.getAttribute('data-notif-type') ?? 'all');
    });
});
// Отметить все как прочитанные
document.getElementById('profile-notifications__mark-all-read')?.addEventListener('click', async () => {
    await fetch('/api/notifications/mark-all-read/', { method: 'PATCH', headers: { 'Authorization': `Bearer ${tok()}` } });
    tabLoaded['notifications'] = false;
    loadNotifications(notifType);
});
// Удалить все прочитанные
document.getElementById('profile-notifications__delete-read')?.addEventListener('click', async () => {
    await fetch('/api/notifications/delete-read/', { method: 'DELETE', headers: { 'Authorization': `Bearer ${tok()}` } });
    tabLoaded['notifications'] = false;
    loadNotifications(notifType);
});
// =============
// 5. Заказы
// =============
const loadOrders = async (filter) => {
    const list = document.getElementById('profile__orders-list');
    list.innerHTML = '<p class="text__body-smaller" style="color:var(--dark-gray)">Загрузка...</p>';
    // Добавляем фильтр по статусу
    const params = filter !== 'all' ? `?status=${filter}` : '';
    try {
        const res = await fetch(`/api/orders/my/${params}`, { headers: { 'Authorization': `Bearer ${tok()}` } });
        const data = await res.json();
        list.innerHTML = '';
        if (!data.length) {
            list.innerHTML = '<p class="text__body-smaller" style="color:var(--dark-gray)">Заказов пока нет.</p>';
            return;
        }
        data.forEach((order) => {
            const card = document.createElement('div');
            card.className = 'order-card';
            const isDelivered = order['order_status'] === 'доставлен';
            const items = order['items'];
            // Миниатюры товаров заказа
            const itemImgs = items.map((item) => `<div class="order-item" style="cursor:pointer" data-url-key="${item['url_key'] || ''}">
                    <img src="${item['image_url'] || '/static/assets/images/product-placeholder.png'}"
                         title="${item['product_name']}" />
                 </div>`).join('');
            // Кнопка "Оценить товар", показывается только для доставленных товаров
            card.innerHTML = `
                <div class="order-card__order-info">
                    <p class="text__button">Заказ №${order['order_number']}</p>
                    <div class="order-card__order-details">
                        <p class="text__body-smaller">Дата: ${fmtDate(String(order['created_at']))}</p>
                        <p class="text__body-smaller">Стоимость: ${parseFloat(String(order['total_amount'])).toLocaleString('ru-RU')} ₽</p>
                        <p class="text__body-smaller">Статус: <strong>${order['order_status']}</strong></p>
                    </div>
                    ${isDelivered
                ? `<button class="button__accent1-with-icon rate-order-btn" data-order-id="${order['id']}">
                               <img class="icon" src="/static/assets/icons/icon_star-outline-white.svg" alt="" />
                               <p class="text__button">Оценить товар</p>
                           </button>`
                : ''}
                </div>
                <div class="order-card__order-items">
                    <p class="text__button">Товары (${items.length})</p>
                    <div class="order-card__order-items-list">${itemImgs}</div>
                </div>`;
            // Блокировка кнопки отзыва, если отзывы уже есть
            const rateBtn = card.querySelector('.rate-order-btn');
            if (rateBtn) {
                const allReviewed = items.every(i => reviewedInSession.has(Number(i['product_id'])));
                if (allReviewed) {
                    rateBtn.disabled = true;
                    rateBtn.textContent = 'Отзывы оставлены';
                    rateBtn.style.opacity = '0.5';
                    rateBtn.style.cursor = 'not-allowed';
                }
                else {
                    // Открываем поп-ап оценки
                    rateBtn.addEventListener('click', () => {
                        openRatePopup(items);
                    });
                }
            }
            list.appendChild(card);
        });
    }
    catch {
        list.innerHTML = '<p class="text__body-smaller" style="color:var(--error)">Ошибка загрузки заказов.</p>';
    }
};
// Кнопки фильтра заказов
document.querySelectorAll('[data-order-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('[data-order-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tabLoaded['orders'] = false;
        loadOrders(btn.getAttribute('data-order-filter') ?? 'all');
    });
});
// =============
// 6. Избранное
// =============
const loadFavorites = async () => {
    const grid = document.getElementById('profile__favorites-grid');
    grid.innerHTML = '<p class="text__body-smaller" style="color:var(--dark-gray)">Загрузка...</p>';
    try {
        const res = await fetch('/api/favorites/', { headers: { 'Authorization': `Bearer ${tok()}` } });
        const data = await res.json();
        grid.innerHTML = '';
        if (!data.length) {
            grid.innerHTML = '<p class="text__body-smaller" style="color:var(--dark-gray)">В избранном пусто.</p>';
            return;
        }
        // Импорт карточек товара
        const { createProductCard } = await import('./product-card.js');
        data.forEach((item) => {
            // Преобразуем данные из БД в формат ProductPreview карточки
            const card = createProductCard({
                id: Number(item['product_id']),
                product_name: String(item['product_name']),
                url_key: String(item['url_key']),
                price: String(item['price']),
                old_price: item['old_price'] ? String(item['old_price']) : null,
                rating: item['rating'] ? String(item['rating']) : null,
                main_image_url: item['image_url'] ? String(item['image_url']) : null,
            });
            // Если товар в избранном, иконка закрашивается
            const favBtn = card.querySelector('.product-card__btn-favorite');
            const favIcon = card.querySelector('.product-card__icon-favorite');
            if (favBtn && favIcon) {
                favBtn.classList.add('is-favorite');
                favIcon.src = '/static/assets/icons/icon_liked_filled.svg';
            }
            grid.appendChild(card);
        });
    }
    catch {
        grid.innerHTML = '<p class="text__body-smaller" style="color:var(--error)">Ошибка загрузки.</p>';
    }
};
// =============
// 7. Отзывы
// =============
const loadReviews = async (filter) => {
    const list = document.getElementById('profile__reviews-list');
    list.innerHTML = '<p class="text__body-smaller" style="color:var(--dark-gray)">Загрузка...</p>';
    const params = filter !== 'all' ? `?status=${filter}` : '';
    try {
        const res = await fetch(`/api/reviews/my/${params}`, { headers: { 'Authorization': `Bearer ${tok()}` } });
        const data = await res.json();
        list.innerHTML = '';
        if (!data.length) {
            list.innerHTML = '<p class="text__body-smaller" style="color:var(--dark-gray)">Отзывов пока нет.</p>';
            return;
        }
        // Метки статуса отзыва
        const statusLabels = {
            approved: '<span class="review-status-badge review-status-badge--approved">Опубликован</span>',
            moderation: '<span class="review-status-badge review-status-badge--moderation">На модерации</span>',
            rejected: '<span class="review-status-badge review-status-badge--rejected">Отклонён</span>',
        };
        data.forEach((r) => {
            // Звезды для рейтинга
            const stars = Array.from({ length: 5 }, (_, i) => `<img src="/static/assets/icons/icon_star-filled_${i < Number(r['rating']) ? 'yellow' : 'gray'}.svg"
                     style="width:16px;height:16px;" alt="" />`).join('');
            const card = document.createElement('div');
            card.className = 'profile-review-card';
            card.innerHTML = `
                <div class="profile-review-card__image">
                    <img src="${r['image_url'] || '/static/assets/images/product-placeholder.png'}"
                         alt="${r['product_name']}" />
                </div>
                <div class="profile-review-card__info">
                    <p class="text__button">${r['product_name']}</p>
                    <div style="display:flex;gap:4px;">${stars}</div>
                    ${statusLabels[String(r['status'])] || ''}
                    ${r['comment'] ? `<p class="text__body-smaller">${r['comment']}</p>` : ''}
                    <p class="text__body-smaller" style="color:var(--dark-gray)">${fmtDate(String(r['created_at']))}</p>
                </div>`;
            list.appendChild(card);
        });
    }
    catch {
        list.innerHTML = '<p class="text__body-smaller" style="color:var(--error)">Ошибка загрузки.</p>';
    }
};
// Фильтры отзывов
document.querySelectorAll('[data-review-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('[data-review-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tabLoaded['reviews'] = false;
        loadReviews(btn.getAttribute('data-review-filter') ?? 'all');
    });
});
// =============
// 8. Поп-ап оценки товара
// =============
let reviewProductId = 0;
let reviewRating = 0;
const starYellow = '/static/assets/icons/icon_star-filled_yellow.svg';
const starGray = '/static/assets/icons/icon_star-filled_gray.svg';
// Настройка для закраски цвета звезд при ховере и оценке
const updateStars = (rating) => {
    document.querySelectorAll('.review-star').forEach(star => {
        const n = parseInt(star.getAttribute('data-star') ?? '0');
        star.src = n <= rating ? starYellow : starGray;
    });
};
// Навешиваем клик и наведение на каждую звезду
document.querySelectorAll('.review-star').forEach(star => {
    // Клик фиксирует выбранный рейтинг
    star.addEventListener('click', () => {
        reviewRating = parseInt(star.getAttribute('data-star') ?? '0');
        updateStars(reviewRating);
    });
    // Ховер показывает предпросмотр
    star.addEventListener('mouseenter', () => {
        updateStars(parseInt(star.getAttribute('data-star') ?? '0'));
    });
    // Уход мыши убирает рейтинг
    star.addEventListener('mouseleave', () => {
        updateStars(reviewRating);
    });
});
// =============
// Оцененные товары
// =============
// Храним ID оцененных товаров в localStorage (чтобы блокировать кнопку для оценивания товаров)
const REVIEWED_KEY = 'reviewed_products';
const saveReviewedToStorage = (set) => {
    localStorage.setItem(REVIEWED_KEY, JSON.stringify(Array.from(set)));
};
// Загружаем из localStorage при старте
const loadReviewedFromStorage = () => {
    try {
        const raw = localStorage.getItem(REVIEWED_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return new Set(arr);
    }
    catch {
        return new Set();
    }
};
const reviewedInSession = loadReviewedFromStorage();
// Синхрон с сервером
const syncReviewedFromAPI = async () => {
    if (!tok())
        return;
    try {
        const res = await fetch('/api/reviews/reviewed-ids/', {
            headers: { 'Authorization': `Bearer ${tok()}` }
        });
        if (!res.ok)
            return;
        const data = await res.json();
        const ids = data.reviewed_product_ids || [];
        ids.forEach(id => reviewedInSession.add(id));
        saveReviewedToStorage(reviewedInSession);
    }
    catch { }
};
let pendingReviewItems = [];
let pendingReviewIndex = 0;
// Открывает поп-ап для оценки товаров из заказа
const openRatePopup = (items) => {
    const pending = items.filter(i => !reviewedInSession.has(Number(i['product_id'])));
    if (!pending.length) {
        alert('Вы уже оставили отзывы на все товары из этого заказа.');
        return;
    }
    pendingReviewItems = pending;
    pendingReviewIndex = 0;
    openNextReview();
};
// Настройка поведения поп-апа оценивания товаров
const openNextReview = () => {
    if (pendingReviewIndex >= pendingReviewItems.length) {
        document.getElementById('review-popup-overlay').style.display = 'none';
        return;
    }
    const item = pendingReviewItems[pendingReviewIndex];
    const overlay = document.getElementById('review-popup-overlay');
    overlay.style.display = 'flex';
    reviewProductId = Number(item['product_id']);
    reviewRating = 0;
    updateStars(0);
    // Показываем название товара и счетчик
    const nameEl = document.getElementById('review-popup__product-name');
    const total = pendingReviewItems.length;
    nameEl.textContent = `(${pendingReviewIndex + 1}/${total}) ${String(item['product_name'] ?? '')}`;
    // Очищаем поле комментария
    const comment = document.getElementById('review-popup__comment');
    if (comment)
        comment.value = '';
    const msg = document.getElementById('review-popup__msg');
    msg.style.display = 'none';
};
// Закрытие поп-апа по кнопке
document.getElementById('review-popup__close')?.addEventListener('click', () => {
    document.getElementById('review-popup-overlay').style.display = 'none';
});
document.getElementById('review-popup__submit')?.addEventListener('click', async () => {
    const msg = document.getElementById('review-popup__msg');
    const comment = document.getElementById('review-popup__comment').value.trim();
    // Обязательно выбрать рейтинг перед отправкой
    if (reviewRating === 0) {
        msg.textContent = 'Выберите оценку.';
        msg.style.display = 'block';
        return;
    }
    try {
        const res = await fetch('/api/reviews/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok()}` },
            body: JSON.stringify({ product_id: reviewProductId, rating: reviewRating, comment }),
        });
        if (res.ok) {
            // Добавляем в локальный set для блокировки кнопки
            reviewedInSession.add(reviewProductId);
            saveReviewedToStorage(reviewedInSession);
            pendingReviewIndex++;
            // Обновление списка отзывов
            tabLoaded['reviews'] = false;
            if (activeTab === 'reviews')
                loadReviews('all');
            // Блокировка кнопки оценки, если все товары оценены
            if (pendingReviewIndex >= pendingReviewItems.length) {
                document.querySelectorAll('.rate-order-btn').forEach(btn => {
                    const allReviewed = pendingReviewItems.every(i => reviewedInSession.has(Number(i['product_id'])));
                    if (allReviewed) {
                        btn.disabled = true;
                        btn.textContent = 'Отзывы оставлены';
                        btn.style.backgroundColor = 'var(--dark-gray)';
                        btn.style.cursor = 'not-allowed';
                    }
                });
            }
            // Переход к следующему товару или закрытие поп-апп
            openNextReview();
        }
        else {
            const data = await res.json();
            msg.textContent = data.error || 'Ошибка отправки.';
            msg.style.display = 'block';
        }
    }
    catch {
        msg.textContent = 'Ошибка сети.';
        msg.style.display = 'block';
    }
});
// Закрытие поп-апа кликом на заднюю область
document.getElementById('review-popup-overlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('review-popup-overlay')) {
        document.getElementById('review-popup-overlay').style.display = 'none';
    }
});
// =============
// Инициализация
// =============
const init = async () => {
    // Если пользователь не авторизован, отправляем на главную
    if (!tok()) {
        window.location.href = '/index.html';
        return;
    }
    const urlTab = new URLSearchParams(window.location.search).get('tab');
    // Синхрон списка оцененных товаров с сервером
    await syncReviewedFromAPI();
    // Загрузка персональных данных профиля в хедер и навигацию
    loadPersonalInfo();
    if (isDesktop()) {
        // На десктопе сразу показывается контент
        showTab(urlTab || 'personal');
    }
    else {
        // На мобильном показывается навигация, контент скрыт
        profileContent.style.display = 'none';
        // Если указан параметр для открытия конкретного контента, загружается именно он
        if (urlTab)
            showTab(urlTab);
    }
};
init();
export {};
