// =============
// Утилиты
// =============
// Берем токен из localStorage для авторизации запросов
const token = () => localStorage.getItem('access_token');
// Форматирование числа как цены с символом
const fmt = (n) => n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₽';
// Быстрый доступ к элементам страницы через функции
const getContainer = () => document.getElementById('cart__items-container');
const getSelectAll = () => document.getElementById('cart__select-all');
const getTotalCount = () => document.getElementById('cart__total-count');
const getItemsPrice = () => document.getElementById('cart__items-price');
const getDiscount = () => document.getElementById('cart__discount');
const getFinalPrice = () => document.getElementById('cart__final-price');
// =============
// Состояние корзины
// =============
// Все товары загруженные из API
let cartItems = [];
// Set хранит ID выбранных товаров (мгновенно работает и нет дублей)
const selectedIds = new Set();
// =============
// Подсчет суммы
// =============
const recalcSummary = () => {
    let totalItems = 0;
    let totalFull = 0; // сумма по ценам без скидки
    let totalActual = 0; // сумма по ценам со скидкой
    // Считаем только выбранные товары
    cartItems.forEach(item => {
        if (!selectedIds.has(item.cart_item_id))
            return;
        const price = parseFloat(item.price);
        // Если скидки нет, старая цена приравнивается к текущей
        const oldPrice = item.old_price ? parseFloat(item.old_price) : price;
        totalItems += item.quantity;
        totalFull += oldPrice * item.quantity;
        totalActual += price * item.quantity;
    });
    // Расчет скидки
    const discount = totalFull - totalActual;
    // Обновляем блок итогов
    getTotalCount().textContent = String(totalItems);
    getItemsPrice().textContent = fmt(totalFull);
    getDiscount().textContent = discount > 0 ? `−${fmt(discount)}` : fmt(0);
    getFinalPrice().textContent = fmt(totalActual);
    // Кнопка "Перейти к оформлению" блокируется, если товары не выбраны
    const proceedBtn = document.getElementById('cart__proceed-to-order');
    if (proceedBtn) {
        const hasSelected = selectedIds.size > 0;
        proceedBtn.disabled = !hasSelected;
        proceedBtn.style.backgroundColor = hasSelected ? '' : 'var(--dark-gray)';
        proceedBtn.style.opacity = hasSelected ? '1' : '0.7';
        proceedBtn.style.cursor = hasSelected ? 'pointer' : 'not-allowed';
    }
};
// =============
// Создание карточки одного товара
// =============
const createCartItemEl = (item) => {
    const hasDiscount = Boolean(item.old_price && parseFloat(item.old_price) > parseFloat(item.price));
    const imgSrc = item.image_url ?? '/static/assets/images/product-placeholder.png';
    const el = document.createElement('div');
    el.className = 'cart-item';
    // Атрибуты ID для удаления из корзины или добавления в избранные
    el.setAttribute('data-cart-item-id', String(item.cart_item_id));
    el.setAttribute('data-product-id', String(item.product_id));
    // Шаюлон для карточки
    el.innerHTML = `
        <div class="cart-item__container-left">
            <!-- Чекбокс для выбора товара -->
            <div class="cart-item__select">
                <input type="checkbox" class="cart-item__checkbox"
                       id="cart-item-${item.cart_item_id}" checked />
                <label for="cart-item-${item.cart_item_id}" class="cart-item__checkbox-label"></label>
            </div>

            <!-- Фото товара -->
            <div class="cart-item__image" style="cursor:pointer">
                <img src="${imgSrc}" alt="${item.product_name}" />
            </div>

            <!-- Название и кнопки действий -->
            <div class="cart-item__info">
                <div class="cart-item__header">
                    <p class="cart-item__title text__button" style="cursor:pointer">${item.product_name}</p>
                </div>
                <div class="cart-item__actions">
                    <button class="cart-item__favorite" title="В избранное">
                        <img class="icon cart-item__icon-favorite"
                             src="/static/assets/icons/icon_liked.svg" alt="В избранное" />
                    </button>
                    <button class="cart-item__remove" title="Удалить из корзины">
                        <img class="icon" src="/static/assets/icons/icon_bin.svg" alt="Удалить" />
                    </button>
                </div>
            </div>
        </div>

        <!-- Цена и счетчик количества -->
        <div class="cart-item__amount">
            <div class="cart-item__prices">
                <p class="cart-item__price text__price">${parseFloat(item.price).toLocaleString('ru-RU')} ₽</p>
                <p class="cart-item__old-price text__body-smaller"
                   style="${hasDiscount ? '' : 'display:none'}">
                   ${hasDiscount ? parseFloat(item.old_price).toLocaleString('ru-RU') + ' ₽' : ''}
                </p>
            </div>
            <div class="cart-item__quantity">
                <button class="quantity__button quantity__button-minus">
                    <img class="icon" src="/static/assets/icons/icon_minus_gray.svg" alt="−" />
                </button>
                <span class="quantity__value text__body-smaller">${item.quantity}</span>
                <button class="quantity__button quantity__button-plus">
                    <img class="icon" src="/static/assets/icons/icon_plus_gray.svg" alt="+" />
                </button>
            </div>
        </div>
    `;
    // Чекбокс убирает или добавляет товар в список оформления заказа
    const checkbox = el.querySelector('.cart-item__checkbox');
    checkbox.addEventListener('change', () => {
        if (checkbox.checked)
            selectedIds.add(item.cart_item_id);
        else
            selectedIds.delete(item.cart_item_id);
        syncSelectAll();
        recalcSummary();
    });
    // Клик по фото или названию ведет на страницу товара
    const goToProduct = () => {
        window.location.href = `/pages/product.html?url_key=${item.url_key}`;
    };
    el.querySelector('.cart-item__image')?.addEventListener('click', goToProduct);
    el.querySelector('.cart-item__title')?.addEventListener('click', goToProduct);
    // Кнопка удаления 
    el.querySelector('.cart-item__remove')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        await removeItem(item.cart_item_id);
    });
    // Кнопка избранного
    el.querySelector('.cart-item__favorite')?.addEventListener('click', async () => {
        await toggleFavorite(item.product_id, el);
    });
    // Кнопки + и − с ограничениями: не меньше 1, не больше 999
    const minusBtn = el.querySelector('.quantity__button-minus');
    const plusBtn = el.querySelector('.quantity__button-plus');
    const updateBtnStates = () => {
        if (minusBtn) {
            minusBtn.disabled = item.quantity <= 1;
            minusBtn.style.opacity = item.quantity <= 1 ? '0.3' : '1';
            minusBtn.style.cursor = item.quantity <= 1 ? 'not-allowed' : 'pointer';
        }
        if (plusBtn) {
            plusBtn.disabled = item.quantity >= 999;
            plusBtn.style.opacity = item.quantity >= 999 ? '0.3' : '1';
            plusBtn.style.cursor = item.quantity >= 999 ? 'not-allowed' : 'pointer';
        }
    };
    // Применяем начальное состояние кнопок сразу при создании карточки
    updateBtnStates();
    minusBtn?.addEventListener('click', async () => {
        if (item.quantity <= 1)
            return;
        await updateQuantity(item.cart_item_id, item.quantity - 1, el, item);
        updateBtnStates();
    });
    plusBtn?.addEventListener('click', async () => {
        if (item.quantity >= 999)
            return;
        await updateQuantity(item.cart_item_id, Math.min(999, item.quantity + 1), el, item);
        updateBtnStates();
    });
    return el;
};
// =============
// Запросы к API
// =============
// Обновляем количество товара 
const updateQuantity = async (cartItemId, newQty, el, item) => {
    try {
        const res = await fetch(`/api/cart/${cartItemId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
            body: JSON.stringify({ quantity: newQty }),
        });
        if (!res.ok)
            return;
        // Обновляем количество в памяти и в DOM без перезагрузки страницы
        item.quantity = newQty;
        const qEl = el.querySelector('.quantity__value');
        if (qEl)
            qEl.textContent = String(newQty);
        recalcSummary();
    }
    catch (e) {
        console.error(e);
    }
};
// Удаляем один товар из корзины
const removeItem = async (cartItemId) => {
    try {
        const res = await fetch(`/api/cart/${cartItemId}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token()}` },
        });
        if (!res.ok)
            return;
        // Убираем товар из массива в памяти и из DOM
        cartItems = cartItems.filter(i => i.cart_item_id !== cartItemId);
        selectedIds.delete(cartItemId);
        document.querySelector(`[data-cart-item-id="${cartItemId}"]`)?.remove();
        syncSelectAll();
        recalcSummary();
        showEmptyIfNeeded();
    }
    catch (e) {
        console.error(e);
    }
};
// Добавляем или убираем товар из избранного
const toggleFavorite = async (productId, el) => {
    if (!token()) {
        alert('Сессия истекла. Войдите в аккаунт.');
        return;
    }
    const btn = el.querySelector('.cart-item__favorite');
    const iconImg = btn.querySelector('.cart-item__icon-favorite');
    const isFav = btn.classList.contains('is-favorite');
    try {
        if (isFav) {
            // Уже в избранном, убирается
            await fetch(`/api/favorites/${productId}/`, {
                method: 'DELETE', headers: { 'Authorization': `Bearer ${token()}` }
            });
            btn.classList.remove('is-favorite');
            iconImg.src = '/static/assets/icons/icon_liked.svg';
        }
        else {
            // Не в избранном, добавляется
            await fetch('/api/favorites/add/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
                body: JSON.stringify({ product_id: productId }),
            });
            btn.classList.add('is-favorite');
            iconImg.src = '/static/assets/icons/icon_liked_filled.svg';
        }
    }
    catch (e) {
        console.error(e);
    }
};
// =============
// Синхронизация чекбокса "Выбрать все"
// =============
const syncSelectAll = () => {
    const selectAll = getSelectAll();
    if (!selectAll)
        return;
    // Отмечен только если все товары выбраны
    selectAll.checked = cartItems.length > 0 && selectedIds.size === cartItems.length;
    selectAll.indeterminate = false;
};
// Показываем сообщение "корзина пуста", если товаров не осталось
const showEmptyIfNeeded = () => {
    if (cartItems.length === 0) {
        getContainer().innerHTML =
            '<p class="text__body-smaller cart__empty">Ваша корзина пуста. <a href="/pages/catalog.html" style="color:var(--accent2)">Перейти в каталог</a></p>';
    }
};
// =============
// Загрузка корзины
// =============
// Если сессия истекла, чистим данные и отправляем на главную
const handleSessionExpired = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_name');
    alert('Ваша сессия истекла. Пожалуйста, войдите снова.');
    window.location.href = '/index.html';
};
const loadCart = async () => {
    const container = getContainer();
    // Если пользователь не авторизован, то просим войти
    if (!token()) {
        container.innerHTML = '<p class="text__body-smaller cart__empty">Войдите в аккаунт, чтобы увидеть корзину.</p>';
        return;
    }
    try {
        const res = await fetch('/api/cart/', {
            headers: { 'Authorization': `Bearer ${token()}` }
        });
        if (res.status === 401) {
            handleSessionExpired();
            return;
        }
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        cartItems = await res.json();
        container.innerHTML = '';
        if (cartItems.length === 0) {
            showEmptyIfNeeded();
            recalcSummary();
            return;
        }
        // По умолчанию все товары выбраны
        cartItems.forEach(item => selectedIds.add(item.cart_item_id));
        // Добавляем карточки всех товаров
        cartItems.forEach(item => container.appendChild(createCartItemEl(item)));
        syncSelectAll();
        recalcSummary();
        // Отдельным запросом проверяем избранное и сразу закрашиваем сердечки
        const authTok = token();
        if (authTok) {
            fetch('/api/favorites/', { headers: { 'Authorization': `Bearer ${authTok}` } })
                .then(r => r.ok ? r.json() : [])
                .then((favs) => {
                // Собираем Set из ID избранных для быстрой проверки
                const favSet = new Set(favs.map((f) => f.product_id));
                container.querySelectorAll('.cart-item').forEach(el => {
                    const pid = parseInt(el.getAttribute('data-product-id') ?? '0');
                    if (favSet.has(pid)) {
                        const btn = el.querySelector('.cart-item__favorite');
                        const icon = el.querySelector('.cart-item__icon-favorite');
                        if (btn && icon) {
                            btn.classList.add('is-favorite');
                            icon.src = '/static/assets/icons/icon_liked_filled.svg';
                            btn.title = 'Убрать из избранного';
                        }
                    }
                });
            })
                .catch(() => { });
        }
    }
    catch (e) {
        console.error(e);
        container.innerHTML = '<p class="text__body-smaller" style="color:var(--error)">Не удалось загрузить корзину.</p>';
    }
};
// =============
// Обработчики кнопок страницы
// =============
// Чекбокс "Выбрать все" отмечает или снимает все товары разом
document.getElementById('cart__select-all')?.addEventListener('change', (e) => {
    const checked = e.target.checked;
    selectedIds.clear();
    if (checked)
        cartItems.forEach(item => selectedIds.add(item.cart_item_id));
    document.querySelectorAll('.cart-item__checkbox').forEach(cb => {
        cb.checked = checked;
    });
    recalcSummary();
});
// "Удалить выбранные" отправляет один запрос со списком ID
document.getElementById('cart__delete-selected')?.addEventListener('click', async () => {
    if (selectedIds.size === 0)
        return;
    const ids = Array.from(selectedIds);
    try {
        const res = await fetch('/api/cart/remove-multiple/', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
            body: JSON.stringify({ cart_item_ids: ids }),
        });
        if (!res.ok)
            return;
        // Убираем каждый удаленный товар из массива в памяти и из DOM
        ids.forEach(id => {
            cartItems = cartItems.filter(i => i.cart_item_id !== id);
            document.querySelector(`[data-cart-item-id="${id}"]`)?.remove();
        });
        selectedIds.clear();
        syncSelectAll();
        recalcSummary();
        showEmptyIfNeeded();
    }
    catch (e) {
        console.error(e);
    }
});
// "Перейти к оформлению" передает ID выбранных товаров в URL
document.getElementById('cart__proceed-to-order')?.addEventListener('click', () => {
    if (selectedIds.size === 0) {
        alert('Выберите товары для оформления заказа.');
        return;
    }
    const ids = Array.from(selectedIds).join(',');
    window.location.href = `/pages/order.html?cart_items=${ids}`;
});
loadCart();
export {};
