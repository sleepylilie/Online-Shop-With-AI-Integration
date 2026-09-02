export {};

/**
 * product.ts - страница отдельного товара
 *
 * Читает ?url_key= из адресной строки и загружает данные товара из API.
 * На странице: 
 * - хлебные крошки, 
 * - фото товаров, 
 * - цену, 
 * - характеристики,
 * - вкладки описание / характеристики / отзывы 
 * - блок похожих товаров.
 */

import { createProductCard, ProductPreview } from './product-card.js';


// =============
// Описание структуры данных
// =============

// ProductDetail расширяет ProductPreview (карточку товара)
interface ProductDetail extends ProductPreview {
    product_description: string;
    attributes: Record<string, string> | null;  // характеристики в виле JSON
    stock: number;
    reviews_count: number;
    subcategory: { id: number; name: string; url_key: string } | null;
    category:    { id: number; name: string; url_key: string } | null;
    images: { url: string; alt: string }[];
}

interface Review {
    id: number;
    user_name: string;
    user_avatar: string | null;
    rating: number;
    user_comment: string | null;
    created_at: string;
}

// Путь к медиа файлам для товаров
const fixMediaUrl = (url: string | null): string | null => {
    if (!url) return null;
    if (url.startsWith('/media/media/')) return url.replace('/media/media/', '/media/');
    return url;
};


// =============
// Вспомогательные функции
// =============

// Форматирование цены со значком рубля
const formatPrice = (price: string): string =>
    `${parseFloat(price).toLocaleString('ru-RU')} ₽`;

// Форматирование рейтинга
const formatRating = (rating: string | null): string =>
    rating && parseFloat(rating) > 0
        ? parseFloat(rating).toFixed(2).replace('.', ',')
        : '—';

// Форматируем дату в ДД.ММ.ГГГГ
const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

// Берём токен авторизации из localStorage
const getAuthToken = (): string | null => localStorage.getItem('access_token');


// =============
// Элементы страницы
// =============

const breadcrumbsEl   = document.getElementById('product__breadcrumbs')   as HTMLElement;
const titleEl         = document.getElementById('product__title')          as HTMLElement;
const mainImageEl     = document.getElementById('product__main-image')     as HTMLImageElement;
const thumbnailsEl    = document.getElementById('product__thumbnails')     as HTMLElement;
const prevBtn         = document.getElementById('product__prev-image')     as HTMLButtonElement;
const nextBtn         = document.getElementById('product__next-image')     as HTMLButtonElement;
const tagsContainer   = document.getElementById('product__tags')           as HTMLElement;
const tagNew          = document.getElementById('product__tag-new')        as HTMLElement;
const tagSale         = document.getElementById('product__tag-sale')       as HTMLElement;
const descShortEl     = document.getElementById('product__desc-short')     as HTMLElement;
const ratingShortEl   = document.getElementById('product__rating-short')   as HTMLElement;
const attrsShortEl    = document.getElementById('product__attrs-short')    as HTMLElement;
const goToReviewsLink = document.getElementById('product__go-to-reviews')  as HTMLAnchorElement;
const goToAttrsLink   = document.getElementById('product__go-to-attrs')    as HTMLAnchorElement;
const oldPriceEl      = document.getElementById('product__old-price')      as HTMLElement;
const saleTagEl       = document.getElementById('product__sale-tag')       as HTMLElement;
const salePercentEl   = document.getElementById('product__sale-percent')   as HTMLElement;
const priceEl         = document.getElementById('product__price')          as HTMLElement;
const stockEl         = document.getElementById('product__stock')          as HTMLElement;
const btnCart         = document.getElementById('product__btn-cart')       as HTMLButtonElement;
const btnFavorite     = document.getElementById('product__btn-favorite')   as HTMLButtonElement;
const iconFavorite    = btnFavorite?.querySelector<HTMLImageElement>('.product__icon-favorite');
const btnShare        = document.getElementById('product__btn-share')      as HTMLButtonElement;
const relatedList     = document.getElementById('product__related-list')   as HTMLElement;
const tabButtons      = document.querySelectorAll<HTMLButtonElement>('.about-product__controller-button');
const descFullEl      = document.getElementById('product__desc-full')      as HTMLElement;
const attrsFullEl     = document.getElementById('product__attrs-full')     as HTMLElement;
const reviewsListEl   = document.getElementById('product__reviews-list')   as HTMLElement;
const ratingTotalEl   = document.getElementById('product__rating-total')   as HTMLElement;
const reviewsCountEl  = document.getElementById('product__reviews-count')  as HTMLElement;


// =============
// 1. Хлебные крошки
// =============

const renderBreadcrumbs = (product: ProductDetail): void => {
    // Ссылка на главную
    const parts: string[] = [
        `<a href="/index.html" class="text__body-smaller">Главная</a>`,
    ];

    // Категория товара
    if (product.category) {
        parts.push(`<p class="text__body-smaller">›</p>`);
        parts.push(`<a href="/pages/catalog.html?category=${product.category.url_key}" class="text__body-smaller">${product.category.name}</a>`);
    }

    // Подкатегория товара
    if (product.subcategory) {
        parts.push(`<p class="text__body-smaller">›</p>`);
        parts.push(`<a href="/pages/catalog.html?category=${product.category?.url_key}&subcategory=${product.subcategory.url_key}" class="text__body-smaller">${product.subcategory.name}</a>`);
    }

    // Название текущего товара (не ссылка)
    parts.push(`<p class="text__body-smaller">›</p>`);
    parts.push(`<span class="text__body-smaller">${product.product_name}</span>`);

    // Все вставляется в DOM
    breadcrumbsEl.innerHTML = parts.join('');
};


// =============
// 2. Галерея фотографий
// =============

// Храним индекс текущего фото и весь массив фотографий
let currentImageIndex = 0;
let productImages: { url: string; alt: string }[] = [];

const setMainImage = (index: number): void => {
    if (productImages.length === 0) return;

    // Ограничиваем индекс, чтобы не выйти за пределы
    currentImageIndex = Math.max(0, Math.min(index, productImages.length - 1));

    // Меняем главное (показываемое) фото
    const img = productImages[currentImageIndex];
    mainImageEl.src = img.url;
    mainImageEl.alt = img.alt;

    // Подсвечиваем активную миниатюру
    thumbnailsEl.querySelectorAll('.product-thumbnail').forEach((t, i) =>
        t.classList.toggle('active', i === currentImageIndex)
    );

    // Скрываем стрелку, если листать в эту сторону больше некуда
    prevBtn.style.visibility = currentImageIndex === 0 ? 'hidden' : 'visible';
    nextBtn.style.visibility = currentImageIndex === productImages.length - 1 ? 'hidden' : 'visible';
};

const renderGallery = (images: { url: string; alt: string }[], productName: string): void => {
    // Если фото нет, показывается плейсхолдер
    productImages = images.length > 0
        ? images
        : [{ url: '/static/assets/images/product-placeholder.png', alt: productName }];

    // Проработка миниатюр фото
    thumbnailsEl.innerHTML = '';
    productImages.forEach((img, i) => {
        const thumb = document.createElement('div');
        thumb.className = 'product-thumbnail';
        thumb.innerHTML = `<img src="${img.url}" alt="${img.alt}" loading="lazy" />`;
        // Клик по миниатюре меняет главное фото
        thumb.addEventListener('click', () => setMainImage(i));
        thumbnailsEl.appendChild(thumb);
    });

    // Показываем первое фото при первой загрузке
    setMainImage(0);
};

// Стрелки листают галерею влево и вправо
prevBtn?.addEventListener('click', () => setMainImage(currentImageIndex - 1));
nextBtn?.addEventListener('click', () => setMainImage(currentImageIndex + 1));


// =============
// 3. Характеристики
// =============

// Таблица характеристик JSON в формате: {название_характеристики}  {характеристика}
const renderAttributes = (
    container: HTMLElement,
    attrs: Record<string, string> | null,
    limit: number = 0
): void => {
    // Если характеристик нет, сообщение об этом
    if (!attrs || Object.keys(attrs).length === 0) {
        container.innerHTML = '<p class="text__body-smaller" style="color:var(--dark-gray)">Характеристики не указаны.</p>';
        return;
    }

    // Преобразуем объект в массив пар [ключ, значение]
    const entries = Object.entries(attrs);

    // Обрезаем лимит характеристик для их краткого перечисления
    const shown = limit > 0 ? entries.slice(0, limit) : entries;

    // Шаблон для каждой строки характеристики
    container.innerHTML = shown.map(([key, val]) => `
        <div class="product-attribute">
            <p class="text__body-smaller product-attribute__name">${key}</p>
            <p class="text__body-smaller product-attribute__value">${val}</p>
        </div>
    `).join('');
};


// =============
// 4. Вкладки (описание / характеристики / отзывы)
// =============

const showTab = (tabName: string): void => {
    // Снимаем активность со всех кнопок и ставим на нужную
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    // Скрываем все блоки вкладок и показываем только выбранный
    const tabs: Record<string, HTMLElement | null> = {
        description: document.getElementById('tab__description'),
        attributes:  document.getElementById('tab__attributes'),
        reviews:     document.getElementById('tab__reviews'),
    };

    Object.entries(tabs).forEach(([name, el]) => {
        if (el) el.style.display = name === tabName ? 'block' : 'none';
    });
};

// Переключение вкладок по кнопкам
tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        showTab(btn.getAttribute('data-tab') ?? 'description');
    });
});

// Ссылки "Смотреть все отзывы" и "Все характеристики" переходят на вкладку и скроллят к ней
goToReviewsLink?.addEventListener('click', (e) => {
    e.preventDefault();
    showTab('reviews');
    document.getElementById('product__about-section')?.scrollIntoView({ behavior: 'smooth' });
});

goToAttrsLink?.addEventListener('click', (e) => {
    e.preventDefault();
    showTab('attributes');
    document.getElementById('product__about-section')?.scrollIntoView({ behavior: 'smooth' });
});


// =============
// 5. Отзывы
// =============

const loadReviews = async (productId: number): Promise<void> => {
    // Показываем состояние загрузки
    ratingTotalEl.textContent = '...';
    reviewsCountEl.textContent = '...';
    reviewsListEl.innerHTML = '<p class="text__body-smaller" style="color:var(--dark-gray)">Загрузка...</p>';

    try {
        // Запрашиваем только одобренные отзывы для этого товара
        const res = await fetch(`/api/products/${productId}/reviews/`);
        if (!res.ok) throw new Error();

        const reviews: Review[] = await res.json();
        reviewsListEl.innerHTML = '';

        // Обновляем счетчик отзывов
        const count = reviews.length;
        reviewsCountEl.textContent = `${count} отзывов`;

        // Сообщение, если отзывов нет
        if (count === 0) {
            ratingTotalEl.textContent = '—';
            reviewsListEl.innerHTML = '<p class="text__body-smaller" style="color:var(--dark-gray)">На товар еще нет отзывов.</p>';
            return;
        }

        // Считаем средний рейтинг товара
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / count;
        const ratingFormatted = avgRating.toFixed(2).replace('.', ',');
        ratingTotalEl.textContent = ratingFormatted;

        // Обновляем краткий рейтинг в верхнем блоке страницы
        const ratingShortRef = document.getElementById('product__rating-short');
        if (ratingShortRef) ratingShortRef.textContent = ratingFormatted;

        // Шаблон для карточек отзывов
        reviews.forEach(r => {
            // Звездочки рейтинга
            const stars = Array.from({ length: 5 }, (_, i) =>
                `<img src="/static/assets/icons/icon_star-filled_${i < r.rating ? 'yellow' : 'gray'}.svg" style="width:16px;height:16px" alt="" />`
            ).join('');

            // Путь к аватару пользователей
            const avatarSrc = fixMediaUrl((r as any).user_avatar) ?? '/media/profile-avatars/avatar-placeholder.png';

            // HTML карточки отзыва
            const card = document.createElement('div');
            card.className = 'review-card';
            card.innerHTML = `
                <div class="review-info">
                    <div class="review-card__user-info">
                        <img src="${avatarSrc}" style="width:36px;height:36px;border-radius:50%;object-fit:cover" alt="" />
                        <div class="user-info__review-details">
                            <p class="text__body-smaller">${r.user_name}</p>
                            <div class="review__star-count">${stars}</div>
                        </div>
                        <p class="text__body-smaller" style="color:var(--dark-gray);margin-left:auto">${formatDate(r.created_at)}</p>
                    </div>
                </div>
                ${r.user_comment ? `<div class="review-content"><p class="text__body-smaller">${r.user_comment}</p></div>` : ''}
            `;
            reviewsListEl.appendChild(card);
        });

    } catch {
        reviewsListEl.innerHTML = '<p class="text__body-smaller" style="color:var(--error)">Не удалось загрузить отзывы.</p>';
    }
};


// =============
// 6. Корзина
// =============

const addToCart = async (productId: number): Promise<void> => {
    // Проверяем авторизацию перед добавлением
    const token = getAuthToken();
    if (!token) { alert('Войдите в аккаунт, чтобы добавить товар в корзину.'); return; }

    // Блокируем кнопку на время запроса
    btnCart.disabled = true;
    btnCart.innerHTML = '<p class="text__button">Добавляем...</p>';

    try {
        const res = await fetch('/api/cart/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ product_id: productId, quantity: 1 }),
        });

        // Сессия истекла — просим войти заново
        if (res.status === 401) { alert('Сессия истекла. Войдите заново.'); return; }
        if (!res.ok) throw new Error();

        // Товар добавился в корзину, кнопка блокируется
        btnCart.classList.add('in-cart');
        btnCart.innerHTML = '<p class="text__button">В корзине</p>';
    } catch {
        // При ошибке возвращаем кнопку в исходное состояние
        btnCart.disabled = false;
        btnCart.innerHTML = `<img class="icon" src="/static/assets/icons/icon_add-to-cart.svg" alt="" /><p class="text__button">В корзину</p>`;
        alert('Не удалось добавить товар. Попробуйте ещё раз.');
    }
};


// =============
// 7. Избранное
// =============

const toggleFavorite = async (productId: number): Promise<void> => {
    // Проверяем авторизацию
    const token = getAuthToken();
    if (!token) { alert('Войдите в аккаунт, чтобы добавить в избранное.'); return; }

    // Смотрим текущее состояние по классу кнопки
    const isFav = btnFavorite.classList.contains('is-favorite');

    try {
        if (isFav) {
            // Убираем из избранного
            await fetch(`/api/favorites/${productId}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Обновляем иконку для кнопки на контурное сердечко
            btnFavorite.classList.remove('is-favorite');
            if (iconFavorite) iconFavorite.src = '/static/assets/icons/icon_liked.svg';
        } else {
            // Добавляем в избранное
            await fetch('/api/favorites/add/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ product_id: productId }),
            });
            // Обновляем иконку для кнопки за закрашенное сердечко
            btnFavorite.classList.add('is-favorite');
            if (iconFavorite) iconFavorite.src = '/static/assets/icons/icon_liked_filled.svg';
        }
    } catch {
        alert('Не удалось обновить избранное.');
    }
};


// =============
// 8. Поделиться
// =============

btnShare?.addEventListener('click', async () => {
    const url = window.location.href;

    // Для мобильных устройств
    if (navigator.share) {
        try { await navigator.share({ title: document.title, url }); return; } catch {}
    }

    // На компьютерах ссылка копируется в буфер
    try {
        await navigator.clipboard.writeText(url);
        // Временно меняем текст кнопки как подтверждение
        const t = btnShare.querySelector('p');
        if (t) {
            const orig = t.textContent;
            t.textContent = 'Скопировано!';
            setTimeout(() => { t.textContent = orig; }, 2000);
        }
    } catch {
        // Если буфер не срабатывает, предлагается скопировать ссылку
        window.prompt('Ссылка:', url);
    }
});


// =============
// 9. Блок дополнительных товаров
// =============

// Оборачивает список в контейнер и добавляет кнопки-стрелки для прокрутки
const setupScrollArrows = (list: HTMLElement): void => {
    // Создание обертки для товаров
    const wrapper = document.createElement('div');
    wrapper.className = 'product-list-scroll-wrapper';
    list.parentNode!.insertBefore(wrapper, list);
    wrapper.appendChild(list);

    // Создаем кнопки стрелок
    const arrowLeft = document.createElement('button');
    arrowLeft.className = 'scroll-arrow scroll-arrow--left hidden';
    arrowLeft.innerHTML = `<img class="icon" src="/static/assets/icons/icon_arrow-left_swipe.svg" alt="" />`;

    const arrowRight = document.createElement('button');
    arrowRight.className = 'scroll-arrow scroll-arrow--right';
    arrowRight.innerHTML = `<img class="icon" src="/static/assets/icons/icon_arrow-right_swipe.svg" alt="" />`;

    wrapper.appendChild(arrowLeft);
    wrapper.appendChild(arrowRight);

    // Шаг прокрутки = ширина одной карточки + отступ
    const step = () => { const c = list.querySelector<HTMLElement>('.product-card'); return c ? c.offsetWidth + 20 : 300; };
    arrowLeft.addEventListener('click',  () => list.scrollBy({ left: -step(), behavior: 'smooth' }));
    arrowRight.addEventListener('click', () => list.scrollBy({ left:  step(), behavior: 'smooth' }));

    // Показываем/скрываем стрелки в зависимости от позиции прокрутки
    const update = () => {
        arrowLeft.classList.toggle('hidden',  list.scrollLeft <= 4);
        arrowRight.classList.toggle('hidden', list.scrollLeft + list.clientWidth >= list.scrollWidth - 4);
    };
    list.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
};

const loadRelatedProducts = async (categoryId: number, currentProductId: number): Promise<void> => {
    relatedList.innerHTML = '';

    try {
        // Запрашиваем товары из той же категории
        const res = await fetch(`/api/products/?category_id=${categoryId}&limit=8`);
        if (!res.ok) return;

        const products: ProductPreview[] = await res.json();

        // Товар не должен повторять тот же, на странице которого пользователь находится
        const filtered = products.filter(p => p.id !== currentProductId);
        if (filtered.length === 0) return;

        // Стили для скролла
        relatedList.style.display = 'flex';
        relatedList.style.overflowX = 'auto';
        relatedList.style.scrollSnapType = 'x mandatory';
        relatedList.style.scrollBehavior = 'smooth';
        relatedList.style.gap = '20px';
        relatedList.style.paddingBottom = '4px';

        filtered.forEach(p => {
            const card = createProductCard(p) as HTMLElement;
            // Смена сетки в зависимости от ширины экрана
            const isTablet  = window.innerWidth >= 768 && window.innerWidth < 1280;
            const isMobileS = window.innerWidth < 768;
            card.style.flexShrink = '0';
            card.style.width = isMobileS ? '85%' : isTablet ? 'calc((100% - 20px) / 2)' : 'calc((100% - 60px) / 4)';
            relatedList.appendChild(card);
        });

        // Добавляем стрелки после карточек товаров
        if (relatedList.querySelector('.product-card')) {
            setupScrollArrows(relatedList);
        }
    } catch {
        // Блок скрывается, если возникла ошибка
        relatedList.closest('section')!.style.display = 'none';
    }
};


// =============
// 10. Инициализация
// =============

const init = async (): Promise<void> => {
    // Читаем url_key из адресной строки
    const urlKey = new URLSearchParams(window.location.search).get('url_key');
    if (!urlKey) { titleEl.textContent = 'Товар не найден'; return; }

    try {
        // Загружаем данные товара
        const res = await fetch(`/api/products/${urlKey}/`);
        if (res.status === 404) { titleEl.textContent = 'Товар не найден'; return; }
        if (!res.ok) throw new Error();

        const product: ProductDetail = await res.json();

        // Заголовок вкладки браузера и заголовок на странице
        document.title = product.product_name;
        titleEl.textContent = product.product_name;

        // Хлебные крошки
        renderBreadcrumbs(product);

        // Фотографии товара
        const fixedImages = (product.images ?? []).map(img => ({
            ...img,
            url: fixMediaUrl(img.url) ?? img.url,
        }));
        renderGallery(fixedImages, product.product_name);

        // Проверяется наличие скидки
        const hasDiscount = parseFloat(product.old_price ?? '0') > parseFloat(product.price);

        // Тег скидки показывается, если скидка на товар есть
        if (hasDiscount) {
            tagSale.style.display = 'flex';
            tagsContainer.style.display = 'flex';
        }

        // Основная цена
        priceEl.textContent = formatPrice(product.price);

        // Старая цена и процент скидки (если есть скидка)
        if (hasDiscount) {
            oldPriceEl.textContent = formatPrice(product.old_price!);
            oldPriceEl.style.display = 'block';
            saleTagEl.style.display = 'flex';
            const p = parseFloat(product.price);
            const op = parseFloat(product.old_price!);
            salePercentEl.textContent = `−${Math.round((1 - p / op) * 100)}%`;
        }

        // Остаток на складе
        stockEl.textContent = String(product.stock);

        // Краткое описание обрезается до 200 символов
        const desc = product.product_description ?? '';
        descShortEl.textContent = desc.length > 200 ? desc.slice(0, 200) + '...' : desc;

        // Общий рейтинг
        ratingShortEl.textContent = product.rating && parseFloat(product.rating) > 0
            ? parseFloat(product.rating).toFixed(2).replace('.', ',')
            : '...';

        // Кратко о характеристиках
        renderAttributes(attrsShortEl, product.attributes, 3);

        // Полное описание и характеристики в специальных блоках
        descFullEl.textContent = product.product_description ?? '';
        renderAttributes(attrsFullEl, product.attributes, 0);

        // Подключаем кнопки корзины и избранного
        btnCart?.addEventListener('click', () => addToCart(product.id));
        btnFavorite?.addEventListener('click', () => toggleFavorite(product.id));

        // Проверяем состояние корзины и избранного 
        const authToken = getAuthToken();
        if (authToken) {
            // Проверяем избранное, если товар уже туда добавлен
            fetch('/api/favorites/', { headers: { 'Authorization': `Bearer ${authToken}` } })
                .then(r => r.ok ? r.json() : [])
                .then((favs: { product_id: number }[]) => {
                    if (favs.some(f => f.product_id === product.id) && btnFavorite && iconFavorite) {
                        btnFavorite.classList.add('is-favorite');
                        iconFavorite.src = '/static/assets/icons/icon_liked_filled.svg';
                    }
                })
                .catch(() => {});

            // Проверяем корзину, кнопка блокируется если товар добавлен
            fetch('/api/cart/', { headers: { 'Authorization': `Bearer ${authToken}` } })
                .then(r => r.ok ? r.json() : [])
                .then((cartItems: { product_id: number }[]) => {
                    if (cartItems.some(i => i.product_id === product.id) && btnCart) {
                        btnCart.classList.add('in-cart');
                        btnCart.disabled = true;
                        btnCart.innerHTML = '<p class="text__button">В корзине</p>';
                        btnCart.style.backgroundColor = 'var(--dark-gray)';
                    }
                })
                .catch(() => {});
        }

        // Загрузка отзывов
        await loadReviews(product.id);

        // Загрузка похожих товаров
        if (product.category) {
            await loadRelatedProducts(product.category.id, product.id);
        }

    } catch (error) {
        console.error('Ошибка загрузки товара:', error);
        titleEl.textContent = 'Ошибка загрузки товара';
    }
};

init();
