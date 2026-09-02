/**
 * home.ts — главная страница
 *
 * Загружает все данные для главной: 
 * - категории товаров;
 * - товары со скидкой;
 * - новинки;
 * - последние статьи блога.
 * Использует готовые функции из других файлов:
 * - renderProductList из product-card.ts - список карточек товаров
 * - renderBlogList из blog-card.ts       - список карточек статей
 */

import { renderProductList } from './product-card.js';
import { renderBlogList } from './blog-card.js';


// =============
// Описание структуры категории
// =============

interface Category {
    id: number;
    category_name: string;
    url_key: string;
    icon_url: string | null;
    sort_order: number;
}


// =============
// Горизонтальный скролл со стрелками
// =============

// Оборачивает список товаров и добавляет кнопки для перемещения по карточкам
const setupScrollArrows = (list: HTMLElement): void => {
    // Оборачиваем список в div чтобы стрелки позиционировались относительно него
    const wrapper = document.createElement('div');
    wrapper.className = 'product-list-scroll-wrapper';
    list.parentNode!.insertBefore(wrapper, list);
    wrapper.appendChild(list);

    // Добавляем кнопки для прокрутки
    const arrowLeft = document.createElement('button');
    arrowLeft.className = 'scroll-arrow scroll-arrow--left hidden';
    arrowLeft.setAttribute('aria-label', 'Прокрутить влево');
    arrowLeft.innerHTML = `<img class="icon" src="/static/assets/icons/icon_arrow-left_swipe.svg" alt="" />`;

    const arrowRight = document.createElement('button');
    arrowRight.className = 'scroll-arrow scroll-arrow--right';
    arrowRight.setAttribute('aria-label', 'Прокрутить вправо');
    arrowRight.innerHTML = `<img class="icon" src="/static/assets/icons/icon_arrow-right_swipe.svg" alt="" />`;

    wrapper.appendChild(arrowLeft);
    wrapper.appendChild(arrowRight);

    // Шаг прокрутки = ширина одной карточки товара + отступ
    const getStep = (): number => {
        const card = list.querySelector<HTMLElement>('.product-card');
        return card ? card.offsetWidth + 20 : 300;
    };

    // Клик по стрелке прокручивает список на ширину одной карточки
    arrowLeft.addEventListener('click', () => list.scrollBy({ left: -getStep(), behavior: 'smooth' }));
    arrowRight.addEventListener('click', () => list.scrollBy({ left:  getStep(), behavior: 'smooth' }));

    // Показываем или скрываем стрелки в зависимости от позиции прокрутки
    const update = (): void => {
        arrowLeft.classList.toggle('hidden', list.scrollLeft <= 4);
        arrowRight.classList.toggle('hidden', list.scrollLeft + list.clientWidth >= list.scrollWidth - 4);
    };

    list.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
};

// Загружаем товары в контейнер и добавляем к нему стрелки прокрутки
const loadScrollableProducts = async (
    containerId: string,
    params: Record<string, string>
): Promise<void> => {
    const container = document.getElementById(containerId);
    if (!container) return;
    await renderProductList(containerId, params);
    // Стрелки добавляем только если товары загрузились
    if (container.querySelector('.product-card')) {
        setupScrollArrows(container);
    }
};


// =============
// Сетка категорий
// =============

const loadCategories = async (): Promise<void> => {
    const grid = document.getElementById('home__categories-grid');
    if (!grid) return;

    grid.innerHTML = '<p class="text__body-smaller" style="color:var(--dark-gray)">Загрузка...</p>';

    try {
        // Загружаем список всех категорий
        const res = await fetch('/api/categories/');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const categories: Category[] = await res.json();
        // Очищаем заглушку и добавляем карточки
        grid.innerHTML = '';

        if (categories.length === 0) {
            grid.innerHTML = '<p class="text__body-smaller" style="color:var(--dark-gray)">Категории не найдены.</p>';
            return;
        }

        // Каждая категория ведет на страницу каталога этой категории
        categories.forEach(cat => {
            const card = document.createElement('a');
            card.className = 'category-card';
            card.href = `/pages/catalog.html?category=${cat.url_key}`;
            card.setAttribute('data-category-url', cat.url_key);
            card.innerHTML = `
                ${cat.icon_url
                    ? `<img src="${cat.icon_url}" alt="${cat.category_name}" class="category-card__icon" />`
                    : `<span class="category-card__icon">📁</span>`
                }
                <span class="text__button">${cat.category_name}</span>
            `;
            grid.appendChild(card);
        });

    } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
        grid.innerHTML = '<p class="text__body-smaller" style="color:var(--error)">Не удалось загрузить категории.</p>';
    }
};


// =============
// Навигационные кнопки
// =============

// Подключаем переходы к кнопкам на баннерах главной страницы
const initNavButtons = (): void => {
    document.getElementById('home__go-to-generator')?.addEventListener('click', () => {
        window.location.href = '/pages/idea-generator.html';
    });
    document.getElementById('home__go-to-blog')?.addEventListener('click', () => {
        window.location.href = '/pages/blog.html';
    });
};


// =============
// Инициализация главной страницы
// =============

const initHomePage = async (): Promise<void> => {
    initNavButtons();

    // Запускаем все блоки параллельно 
    await Promise.all([
        loadScrollableProducts('home__sales-product-list', { has_discount: 'true', limit: '8' }),
        loadScrollableProducts('home__new-product-list', { sort: 'newest', limit: '8' }),
        loadCategories(),
        renderBlogList('home__blog-grid', { limit: '3' }), // 3 последние статьи
    ]);
};

initHomePage();
