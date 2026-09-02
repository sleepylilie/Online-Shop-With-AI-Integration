export {};

/**
 * catalog.ts - страница каталога товаров
 *
 * Страница работает в трех режимах:
 *  - /pages/catalog.html                    -  все товары без фильтра
 *  - /pages/catalog.html?category=vyazanie  -  товары определенной категории
 *  - /pages/catalog.html?search=акварель    -  результаты поиска
 *
 * На странице есть:
 *  - хлебные крошки;
 *  - карточки подкатегорий для быстрого фильтра кликом;
 *  - счетчик "Найдено N товаров";
 *  - сортировка и поп-ап с расширенными фильтрами;
 *  - сами карточки товаров через createProductCard из product-card.ts
 */

import { createProductCard, ProductPreview } from './product-card.js';


// =============
// Описание структуры данных
// =============

interface Category {
    id: number;
    category_name: string;
    url_key: string;
    icon_url: string | null;
    sort_order: number;
}

interface Subcategory {
    id: number;
    subcategory_name: string;
    url_key: string;
    category_id: number;
    sort_order: number;
}


// =============
// Читаем параметры из адресной строки
// =============

const urlParams = new URLSearchParams(window.location.search);
const categoryUrlKey = urlParams.get('category') ?? '';  // категория
const subUrlKey = urlParams.get('subcategory') ?? '';    // подкатегория
const searchQuery = urlParams.get('search') ?? '';       // поисковый запрос


// =============
// Находим элементы страницы
// =============

const breadcrumbs            = document.getElementById('catalog__breadcrumbs')        as HTMLElement;
const titleEl                = document.getElementById('catalog__title')              as HTMLElement;
const subcategoryGrid        = document.getElementById('catalog__subcategory-grid')   as HTMLElement;
const productList            = document.getElementById('catalog__product-list')       as HTMLElement;
const productCount           = document.getElementById('catalog__product-count')      as HTMLElement;
const sortSelector           = document.getElementById('catalog__sort-selector')      as HTMLSelectElement;
const filterToggleBtn        = document.getElementById('filters__toggle')             as HTMLButtonElement;
const filterPanel            = document.getElementById('catalog__filter-panel')       as HTMLElement;
const filterCloseBtn         = document.getElementById('filters__close-panel')        as HTMLButtonElement;
const filterApplyBtn         = document.getElementById('filters__apply')              as HTMLButtonElement;
const filterResetBtn         = document.getElementById('filters__reset')              as HTMLButtonElement;
const filterSubcategoryList  = document.getElementById('filter__subcategory-list')    as HTMLElement;
const filterSubcategoryGroup = document.getElementById('filter-group__subcategory')   as HTMLElement;
const priceFromInput         = document.getElementById('filters__price-from')         as HTMLInputElement;
const priceToInput           = document.getElementById('filters__price-to')           as HTMLInputElement;
const inStockCheckbox        = document.getElementById('filter__in-stock')            as HTMLInputElement;
const highRatingCheckbox     = document.getElementById('filter__high-rating')         as HTMLInputElement;


// =============
// Состояние страницы
// =============

// Текущая категория и подкатегория (находится по url_key после загрузки данных)
let currentCategory: Category | null = null;
let currentSubcategory: Subcategory | null = null;
let allSubcategories: Subcategory[] = [];
let allCategories: Category[] = [];

// Активная подкатегория может меняться кликом на карточку
let activeSubUrlKey: string = subUrlKey;

// Фильтры применяются только после нажатия кнопки "Применить" и хранятся отдельно
let appliedFilters: {
    subcategoryUrlKey: string;
    priceFrom: string;
    priceTo: string;
    inStock: boolean;
    highRating: boolean;
} = {
    subcategoryUrlKey: subUrlKey,
    priceFrom: '',
    priceTo: '',
    inStock: false,
    highRating: false,
};


// =============
// 1. Хлебные крошки
// =============

const renderBreadcrumbs = (): void => {
    const parts: string[] = [
        `<a href="/" class="text__body-smaller">Главная</a>`,
    ];

    if (searchQuery) {
        parts.push(`<p class="text__body-smaller">›</p>`);
        parts.push(`<span class="text__body-smaller">Поиск: «${searchQuery}»</span>`);
    } else if (currentCategory) {
        parts.push(`<p class="text__body-smaller">›</p>`);
        parts.push(`<a href="/pages/catalog.html?category=${currentCategory.url_key}" class="text__body-smaller">${currentCategory.category_name}</a>`);

        // Если выбрана подкатегория, то добавляем еще один уровень
        if (currentSubcategory) {
            parts.push(`<p class="text__body-smaller">›</p>`);
            parts.push(`<span class="text__body-smaller">${currentSubcategory.subcategory_name}</span>`);
        }
    } else {
        parts.push(`<p class="text__body-smaller">›</p>`);
        parts.push(`<span class="text__body-smaller">Все товары</span>`);
    }

    // Вставляем все части в DOM
    breadcrumbs.innerHTML = parts.join('');
};


// =============
// 2. Заголовок страницы
// =============

const renderTitle = (): void => {
    if (searchQuery) {
        titleEl.textContent = `Результаты поиска`;
        document.title = `Поиск: ${searchQuery}`;
    } else if (currentSubcategory) {
        titleEl.textContent = currentSubcategory.subcategory_name;
        document.title = currentSubcategory.subcategory_name;
    } else if (currentCategory) {
        titleEl.textContent = currentCategory.category_name;
        document.title = currentCategory.category_name;
    } else {
        titleEl.textContent = 'Каталог';
    }
};


// =============
// 3. Карточки подкатегорий под заголовком
// =============

const renderSubcategoryGrid = (): void => {
    // При поиске скрываем блок подкатегорий
    if (searchQuery) {
        if (subcategoryGrid) subcategoryGrid.style.display = 'none';
        return;
    }

    // Если список категорий и подкатегорий пуст, блок также скрывается
    if (!currentCategory || allSubcategories.length === 0) {
        subcategoryGrid.style.display = 'none';
        return;
    }

    // Очистка сетки подкатегорий
    subcategoryGrid.innerHTML = '';
    subcategoryGrid.style.display = 'grid';

    // Загрузка карточек для подкатегорий
    allSubcategories.forEach(sub => {
        const card = document.createElement('a');
        card.className = 'category-card' + (sub.url_key === activeSubUrlKey ? ' active' : '');
        card.href = '#';
        card.setAttribute('data-subcategory-url', sub.url_key);
        card.innerHTML = `<span class="text__button">${sub.subcategory_name}</span>`;

        card.addEventListener('click', (e): void => {
            e.preventDefault();

            // Повторный клик на активную подкатегорию снимает фильтр
            if (activeSubUrlKey === sub.url_key) {
                activeSubUrlKey = '';
                appliedFilters.subcategoryUrlKey = '';
            } else {
                activeSubUrlKey = sub.url_key;
                appliedFilters.subcategoryUrlKey = sub.url_key;
            }

            // Обновляем подсветку активной карточки
            subcategoryGrid.querySelectorAll('.category-card').forEach(c =>
                c.classList.toggle('active', c.getAttribute('data-subcategory-url') === activeSubUrlKey)
            );

            // Синхрон чекбоксов в поп-апе фильтров
            syncSubcategoryCheckboxes();
            loadProducts();
        });

        subcategoryGrid.appendChild(card);
    });
};


// =============
// 5. Чекбоксы подкатегорий в поп-апе фильтров
// =============

// Заполняет список чекбоксов подкатегорий в поп-апе
const renderSubcategoryCheckboxes = (): void => {
    if (!currentCategory || allSubcategories.length === 0) {
        filterSubcategoryGroup.classList.add('hidden');
        return;
    }

    filterSubcategoryGroup.classList.remove('hidden');
    filterSubcategoryList.innerHTML = '';

    allSubcategories.forEach(sub => {
        const label = document.createElement('label');
        label.className = 'checkbox';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = sub.url_key;
        input.checked = sub.url_key === appliedFilters.subcategoryUrlKey;
        input.setAttribute('data-subcategory-url', sub.url_key);

        // Работают как радио-кнопки (только один выбор)
        input.addEventListener('change', (): void => {
            if (input.checked) {
                filterSubcategoryList.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
                    .forEach(cb => { if (cb !== input) cb.checked = false; });
            }
        });

        label.appendChild(input);
        label.append(` ${sub.subcategory_name}`);
        filterSubcategoryList.appendChild(label);
    });
};

// Синхрон чекбоксов с текущей активной подкатегорией
const syncSubcategoryCheckboxes = (): void => {
    filterSubcategoryList.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
        .forEach(cb => { cb.checked = cb.value === activeSubUrlKey; });
};


// =============
// Сетка товаров
// =============

// Задание сетки
const applyGridStyles = (): void => {
    const isTablet  = window.innerWidth >= 768 && window.innerWidth <= 1279;
    const isMobileS = window.innerWidth < 768;

    productList.style.display = 'grid';
    productList.style.width = '100%';
    productList.style.gap = isMobileS ? '12px' : isTablet ? '16px' : '20px';
    productList.style.gridTemplateColumns = isMobileS
        ? 'repeat(1, 1fr)'
        : isTablet
        ? 'repeat(2, 1fr)'
        : 'repeat(4, 1fr)';
};

// Пересчитываем колонки при изменении размера окна
window.addEventListener('resize', (): void => {
    if (productList.querySelector('.product-card')) {
        applyGridStyles();
    }
});


// =============
// 6. Загрузка товаров из API
// =============

const loadProducts = async (): Promise<void> => {
    applyGridStyles();
    productList.innerHTML = '<p class="text__body-smaller" style="color:var(--dark-gray)">Загрузка...</p>';
    productCount.textContent = '...';

    // Собираем параметры для запроса к API
    const params: Record<string, string> = {};

    if (currentCategory) {
        params.category_id = String(currentCategory.id);
    }

    // Ищем ID подкатегории по url_key
    const subKey = appliedFilters.subcategoryUrlKey || activeSubUrlKey;
    if (subKey) {
        const sub = allSubcategories.find(s => s.url_key === subKey);
        if (sub) params.subcategory_id = String(sub.id);
    }

    if (searchQuery) params.search = searchQuery;

    params.sort = sortSelector.value || 'newest';

    // Фильтры из поп-апа применяются только после нажатия кнопки
    if (appliedFilters.priceFrom) params.price_from = appliedFilters.priceFrom;
    if (appliedFilters.priceTo) params.price_to = appliedFilters.priceTo;
    if (appliedFilters.inStock) params.in_stock = 'true';
    if (appliedFilters.highRating) params.min_rating = '4';

    params.limit = '40';

    try {
        // Собираем строку параметров и отправляем запрос
        const query = new URLSearchParams(params).toString();
        const response = await fetch(`/api/products/?${query}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const products: ProductPreview[] = await response.json();

        productList.innerHTML = '';
        productCount.textContent = String(products.length);

        if (products.length === 0) {
            productList.innerHTML = '<p class="text__body-smaller" style="color:var(--dark-gray);grid-column:1/-1">По вашему запросу ничего не найдено. Попробуйте изменить фильтры.</p>';
            return;
        }

        // Добавление карточек товаров по шаблону (из product.ts)
        products.forEach(p => productList.appendChild(createProductCard(p)));

    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        productList.innerHTML = '<p class="text__body-smaller" style="color:var(--error);grid-column:1/-1">Не удалось загрузить товары. Попробуйте обновить страницу.</p>';
        productCount.textContent = '0';
    }
};


// =============
// 7. Поп-ап фильтров
// =============

const openFilterPanel = (): void => {
    // На мобильном растягиваем на всю ширину экрана
    if (window.innerWidth < 768) {
        filterPanel.style.width = '100%';
        filterPanel.style.left  = '0';
        filterPanel.style.right = '0';
    } else {
        filterPanel.style.width = '280px';
        filterPanel.style.right = 'auto';
    }
    filterPanel.style.display       = 'flex';
    filterPanel.style.flexDirection = 'column';
    filterToggleBtn.classList.add('active');
};

const closeFilterPanel = (): void => {
    filterPanel.style.display = 'none';
    filterToggleBtn.classList.remove('active');
};

if (filterToggleBtn && filterPanel) {
    filterToggleBtn.addEventListener('click', (e): void => {
        e.stopPropagation();
        filterPanel.style.display === 'flex' ? closeFilterPanel() : openFilterPanel();
    });
} else {
    console.error('Элементы фильтра не найдены.');
}

filterCloseBtn.addEventListener('click', closeFilterPanel);

// Закрываем поп-ап при клике вне него
document.addEventListener('click', (e): void => {
    if (!filterPanel.contains(e.target as Node) && !filterToggleBtn.contains(e.target as Node)) {
        closeFilterPanel();
    }
});


// =============
// Ограничения для полей цены: от 1 до 10000
// =============

const constrainPriceInput = (inp: HTMLInputElement): void => {
    if (!inp) return;
    inp.setAttribute('type', 'number');
    inp.setAttribute('min', '1');
    inp.setAttribute('max', '10000');
    inp.setAttribute('step', '1');

    inp.addEventListener('input', (): void => {
        let val = parseInt(inp.value) || 0;
        if (val < 0) val = 0;
        if (val > 10000) { val = 10000; inp.value = '10000'; }

        // Подсвечиваем красным, если "от" больше, чем "до"
        const from = parseInt(priceFromInput?.value) || 0;
        const to = parseInt(priceToInput?.value) || 0;
        if (from > 0 && to > 0 && from > to) {
            priceFromInput.style.borderBottomColor = 'var(--error)';
            priceToInput.style.borderBottomColor = 'var(--error)';
        } else {
            priceFromInput.style.borderBottomColor = '';
            priceToInput.style.borderBottomColor = '';
        }
    });
};

if (priceFromInput) constrainPriceInput(priceFromInput);
if (priceToInput)   constrainPriceInput(priceToInput);


// Кнопка "Применить фильтры"
filterApplyBtn.addEventListener('click', (): void => {
    // Считываем выбранную подкатегорию из чекбоксов
    const checkedSub = filterSubcategoryList.querySelector<HTMLInputElement>('input:checked');
    appliedFilters.subcategoryUrlKey = checkedSub?.value ?? '';
    activeSubUrlKey = appliedFilters.subcategoryUrlKey;

    // Синхронизируем подсветку карточек подкатегорий
    subcategoryGrid.querySelectorAll('.category-card').forEach(c =>
        c.classList.toggle('active', c.getAttribute('data-subcategory-url') === activeSubUrlKey)
    );

    // Валидация ограничений цены
    let priceFrom = parseInt(priceFromInput.value) || 0;
    let priceTo = parseInt(priceToInput.value) || 0;

    if (priceFrom < 1)     priceFrom = 0;
    if (priceFrom > 10000) priceFrom = 10000;
    if (priceTo < 1)       priceTo = 0;
    if (priceTo > 10000)   priceTo = 10000;

    // Если минимум больше максимума, поменять местами значения
    if (priceFrom > 0 && priceTo > 0 && priceFrom > priceTo) {
        [priceFrom, priceTo] = [priceTo, priceFrom];
    }

    // Обновляем поля значениями после коррекции
    priceFromInput.value = priceFrom > 0 ? String(priceFrom) : '';
    priceToInput.value = priceTo > 0 ? String(priceTo) : '';

    // Сохраняем откорректированные значения в состояние фильтров
    appliedFilters.priceFrom = priceFrom > 0 ? String(priceFrom) : '';
    appliedFilters.priceTo = priceTo > 0 ? String(priceTo) : '';
    appliedFilters.inStock = inStockCheckbox?.checked ?? false;
    appliedFilters.highRating = highRatingCheckbox?.checked ?? false;

    closeFilterPanel();
    loadProducts();
});

// Кнопка "Сбросить фильтры" очищает все и перезагружает товары
filterResetBtn.addEventListener('click', (): void => {
    filterSubcategoryList.querySelectorAll<HTMLInputElement>('input').forEach(cb => cb.checked = false);
    priceFromInput.value = '';
    priceToInput.value = '';
    inStockCheckbox.checked = false;
    highRatingCheckbox.checked = false;

    appliedFilters = {
        subcategoryUrlKey: '',
        priceFrom: '',
        priceTo: '',
        inStock: false,
        highRating: false,
    };
    activeSubUrlKey = '';

    // Снимаем подсветку с карточек подкатегорий
    subcategoryGrid.querySelectorAll('.category-card').forEach(c => c.classList.remove('active'));

    closeFilterPanel();
    loadProducts();
});


// =============
// 8. Сортировка
// =============

// При изменении сортировки сразу перезагружаем список товаров
sortSelector.addEventListener('change', (): void => {
    loadProducts();
});


// =============
// 9. Инициализация 
// =============

const init = async (): Promise<void> => {
    try {
        // Сначала загружаем список всех категорий
        const catsRes = await fetch('/api/categories/');
        if (!catsRes.ok) throw new Error('Ошибка загрузки категорий');
        allCategories = await catsRes.json() as Category[];

        // Находим текущую категорию по url_key из адресной строки
        if (categoryUrlKey) {
            currentCategory = allCategories.find(c => c.url_key === categoryUrlKey) ?? null;
        }

        // Загружаем подкатегории, если категория выбрана
        if (currentCategory) {
            const subsRes = await fetch(`/api/subcategories/?category_id=${currentCategory.id}`);
            if (subsRes.ok) {
                allSubcategories = await subsRes.json() as Subcategory[];

                // Если в URL была подкатегория, находим и запоминанием
                if (subUrlKey) {
                    currentSubcategory = allSubcategories.find(s => s.url_key === subUrlKey) ?? null;
                    if (currentSubcategory) {
                        appliedFilters.subcategoryUrlKey = subUrlKey;
                    }
                }
            }
        }

        // Подгрузка всех данных
        renderBreadcrumbs();
        renderTitle();
        renderSubcategoryGrid();
        renderSubcategoryCheckboxes();

        // Загрузка товаров
        await loadProducts();

    } catch (error) {
        console.error('Ошибка инициализации каталога:', error);
        productList.innerHTML = '<p class="text__body-smaller" style="color:var(--error)">Не удалось загрузить данные. Попробуйте обновить страницу.</p>';
    }
};

init();
