// Пути к иконкам в карточке
const ICON = {
    liked: '/static/assets/icons/icon_liked.svg',
    likedFilled: '/static/assets/icons/icon_liked_filled.svg',
    addToCart: '/static/assets/icons/icon_add-to-cart.svg',
    starYellow: '/static/assets/icons/icon_star-filled_yellow.svg',
};
// =============
// Вспомогательные функции
// =============
// Берем токен авторизации из localStorage
const getAuthToken = () => localStorage.getItem('access_token');
// Форматирование цены
const formatPrice = (price) => `${parseFloat(price).toLocaleString('ru-RU')} ₽`;
// Считается процент скидки
const calcDiscount = (price, oldPrice) => {
    const p = parseFloat(price), op = parseFloat(oldPrice);
    if (!op || op <= p)
        return null;
    const pct = Math.round((1 - p / op) * 100);
    return pct > 0 ? `−${pct}%` : null;
};
// Форматирование рейтинга
const formatRating = (rating) => rating ? parseFloat(rating).toFixed(2).replace('.', ',') : '—';
// Исправление двойного пути для файлов фотографий
const fixMediaUrl = (url) => {
    if (!url)
        return null;
    if (url.startsWith('/media/media/'))
        return url.replace('/media/media/', '/media/');
    return url;
};
// =============
// Добавление в корзину
// =============
const addToCart = async (productId, btn) => {
    // Проверяем авторизацию перед запросом
    const token = getAuthToken();
    if (!token) {
        alert('Войдите в аккаунт, чтобы добавить товар в корзину.');
        return;
    }
    // Блокируем кнопку на время запроса, чтобы не добавить товар дважды
    btn.disabled = true;
    btn.innerHTML = '<p class="text__button">Добавляем...</p>';
    try {
        const res = await fetch('/api/cart/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ product_id: productId, quantity: 1 }),
        });
        // Если токен устарел, предлагается войти снова
        if (res.status === 401) {
            alert('Сессия истекла. Пожалуйста, войдите заново.');
            btn.disabled = false;
            btn.innerHTML = `<img class="icon" src="${ICON.addToCart}" alt="" /><p class="text__button">В корзину</p>`;
            return;
        }
        if (!res.ok)
            throw new Error(`${res.status}`);
        // При успехе кнопка блокируется
        btn.classList.add('in-cart');
        btn.disabled = true;
        btn.innerHTML = '<p class="text__button">В корзине</p>';
        btn.style.backgroundColor = 'var(--dark-gray)';
        btn.style.cursor = 'not-allowed';
    }
    catch {
        // При ошибке возвращаем кнопку в исходное состояние
        btn.disabled = false;
        btn.innerHTML = `<img class="icon" src="${ICON.addToCart}" alt="" /><p class="text__button">В корзину</p>`;
        alert('Не удалось добавить товар в корзину. Попробуйте ещё раз.');
    }
};
// =============
// Добавление в избранное
// =============
const toggleFavorite = async (productId, btn) => {
    // Проверяем авторизацию
    const token = getAuthToken();
    if (!token) {
        alert('Войдите в аккаунт, чтобы добавить товар в избранное.');
        return;
    }
    // Смотрим текущее состояние по классу кнопки
    const isFavorite = btn.classList.contains('is-favorite');
    const iconImg = btn.querySelector('.product-card__icon-favorite');
    try {
        if (isFavorite) {
            // Уже в избранном, удаляется из избранного
            const res = await fetch(`/api/favorites/${productId}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            // 404 значит товара и не было
            if (!res.ok && res.status !== 404)
                throw new Error();
            // Обновление иконки на контур сердечка
            btn.classList.remove('is-favorite');
            btn.title = 'Добавить в избранное';
            if (iconImg)
                iconImg.src = ICON.liked;
        }
        else {
            // Еще не в избранном, добавляется в избранное
            const res = await fetch('/api/favorites/add/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ product_id: productId }),
            });
            if (!res.ok)
                throw new Error();
            // Обновление иконки на закрашенное сердечко
            btn.classList.add('is-favorite');
            btn.title = 'Убрать из избранного';
            if (iconImg)
                iconImg.src = ICON.likedFilled;
        }
    }
    catch {
        alert('Не удалось обновить избранное. Попробуйте ещё раз.');
    }
};
// =============
// Кэш статусов корзины и избранного
// =============
// Храним ID товаров в корзине и избранном для загрузки состояния кнопок
let _cartProductIds = null;
let _favoriteProductIds = null;
let _cacheLoading = false;
const _cacheCallbacks = [];
const loadStatusCache = async () => {
    // Если кэш уже загружен, ничего не делаем
    if (_cartProductIds !== null)
        return;
    // Если загрузка уже идет, ожидаем
    if (_cacheLoading) {
        await new Promise(resolve => _cacheCallbacks.push(resolve));
        return;
    }
    _cacheLoading = true;
    // Если пользователь не авторизован, то возвращается пустое множество
    const token = localStorage.getItem('access_token');
    if (!token) {
        _cartProductIds = new Set();
        _favoriteProductIds = new Set();
        _cacheLoading = false;
        // Оповещаем всех, кто был в очереди
        _cacheCallbacks.forEach(cb => cb());
        _cacheCallbacks.length = 0;
        return;
    }
    try {
        // Загружаем корзину и избранное параллельно одним запросом
        const [cartRes, favRes] = await Promise.all([
            fetch('/api/cart/', { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/favorites/', { headers: { 'Authorization': `Bearer ${token}` } }),
        ]);
        const cartItems = cartRes.ok ? await cartRes.json() : [];
        const favItems = favRes.ok ? await favRes.json() : [];
        // Сохраняются только ID товаров
        _cartProductIds = new Set(cartItems.map(i => i.product_id));
        _favoriteProductIds = new Set(favItems.map(i => i.product_id));
    }
    catch {
        // При ошибке кэш останется пустым, состояния кнопок не загрузятся
        _cartProductIds = new Set();
        _favoriteProductIds = new Set();
    }
    // Завершаем загрузку и оповещаем очередь
    _cacheLoading = false;
    _cacheCallbacks.forEach(cb => cb());
    _cacheCallbacks.length = 0;
};
// Сброс кэша для повторной загрузки данных
export const invalidateStatusCache = () => {
    _cartProductIds = null;
    _favoriteProductIds = null;
};
// =============
// Создание карточки товара
// =============
export const createProductCard = (product, _preloaded = false) => {
    // Проверяем есть ли скидка
    const hasDiscount = Boolean(product.old_price &&
        parseFloat(product.old_price) > parseFloat(product.price));
    // Считаем сумму скидки
    const discountLabel = hasDiscount ? calcDiscount(product.price, product.old_price) : null;
    // Исправляем путь к изображению, плейсходжер если нет фото
    const imageSrc = fixMediaUrl(product.main_image_url) ?? '/static/assets/images/product-placeholder.png';
    // Создаем элемент карточки и сохраняем ID для поиска 
    const card = document.createElement('div');
    card.className = 'product-card';
    card.setAttribute('data-product-id', String(product.id));
    card.setAttribute('data-product-url', product.url_key);
    // Собираем HTML карточки по шаблону
    card.innerHTML = `
        <div class="product-card__photo-section">
            <img
                class="product-card__photo"
                src="${imageSrc}"
                alt="${product.product_name}"
                loading="lazy"
            />
            <button class="product-card__btn-favorite" title="Добавить в избранное" aria-label="В избранное">
                <img class="icon product-card__icon-favorite" src="${ICON.liked}" alt="" />
            </button>
        </div>

        <div class="product-card__text-section">
            <div class="text-section__price-container">
                <div class="price-container__prices">
                    <p class="text__price product-card__price">${formatPrice(product.price)}</p>
                    <p class="text__body-smaller product-card__old-price"
                       style="${hasDiscount ? 'display:block' : 'display:none'}">
                        ${hasDiscount ? formatPrice(product.old_price) : ''}
                    </p>
                </div>
                <div class="product-card__sale-tag"
                     style="${discountLabel ? 'display:flex' : 'display:none'}">
                    <p class="text__button product-card__sale-percent">${discountLabel ?? ''}</p>
                </div>
            </div>
            <span class="text__button product-card__name">${product.product_name}</span>
            <div class="text-section__rating-container">
                <img class="icon" src="${ICON.starYellow}" alt="Рейтинг" />
                <p class="text__body-smaller product-card__rating">${formatRating(product.rating)}</p>
            </div>
        </div>

        <div class="product-card__button-section">
            <button class="product-card__btn-cart">
                <img class="icon" src="${ICON.addToCart}" alt="" />
                <p class="text__button">В корзину</p>
            </button>
        </div>
    `;
    // Находим кнопки внутри карточки
    const btnCart = card.querySelector('.product-card__btn-cart');
    const btnFav = card.querySelector('.product-card__btn-favorite');
    // Клик по карточке переходит на страницу товара
    card.addEventListener('click', () => {
        window.location.href = `/pages/product.html?url_key=${product.url_key}`;
    });
    // Клик по кнопке "В корзину"
    btnCart.addEventListener('click', (e) => {
        e.stopPropagation();
        addToCart(product.id, btnCart);
        if (_cartProductIds)
            _cartProductIds.add(product.id);
    });
    // Клик по кнопке-сердечку
    btnFav.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(product.id, btnFav);
        _favoriteProductIds = null;
    });
    // Загрузка кэша и смена состояния кнопок
    loadStatusCache().then(() => {
        // Если товар уже в корзине, кнопка блокируется
        if (_cartProductIds?.has(product.id) && btnCart) {
            btnCart.disabled = true;
            btnCart.innerHTML = '<p class="text__button">В корзине</p>';
            btnCart.style.backgroundColor = 'var(--dark-gray)';
            btnCart.style.cursor = 'not-allowed';
        }
        // Если товар в избранном, сердечко закрашивается
        if (_favoriteProductIds?.has(product.id) && btnFav) {
            const icon = btnFav.querySelector('.product-card__icon-favorite');
            btnFav.classList.add('is-favorite');
            btnFav.title = 'Убрать из избранного';
            if (icon)
                icon.src = ICON.likedFilled;
        }
    });
    return card;
};
// =============
// Загрузка и рендер списка карточек
// =============
// Функция для загрузки карточек товара в сетку-контейнер
export const renderProductList = async (containerId, params = {}) => {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`renderProductList: элемент #${containerId} не найден.`);
        return;
    }
    // Показываем состояние загрузки
    container.innerHTML = '<p class="text__body-smaller" style="color:var(--dark-gray)">Загрузка...</p>';
    try {
        // Собираем строку параметров и делаем запрос
        const query = new URLSearchParams(params).toString();
        const response = await fetch(query ? `/api/products/?${query}` : '/api/products/');
        if (!response.ok)
            throw new Error(`HTTP ${response.status}`);
        const products = await response.json();
        container.innerHTML = '';
        // Если товаров нет, показывается сообщение
        if (products.length === 0) {
            container.innerHTML = '<p class="text__body-smaller" style="color:var(--dark-gray)">Товары не найдены.</p>';
            return;
        }
        // Поочередно создаются карточки и добавляются в сетку
        products.forEach(p => container.appendChild(createProductCard(p)));
    }
    catch (error) {
        console.error(`renderProductList #${containerId}:`, error);
        container.innerHTML = '<p class="text__body-smaller" style="color:var(--error)">Не удалось загрузить товары.</p>';
    }
};
