/**
 * idea-page.ts - страница конкретного шаблона идеи
 *
 * Сюда попадают по клику на карточку в сетке готовых идей.
 * На странице показывается:
 * - название,
 * - хобби/возраст/сложность,
 * - фото результата,
 * - подробное описание,
 * - список товаров, которые понадобятся для реализации идеи.
 */
// =============
// Элементы страницы
// =============
const titleEl = document.getElementById('idea-page__title');
const typeCrumb = document.getElementById('idea-page__type-crumb');
const imageContainer = document.getElementById('idea-page__image-container');
const imageEl = document.getElementById('idea-page__image');
const contentEl = document.getElementById('idea-page__content');
const attrsEl = document.getElementById('idea-page__attrs');
const productsEl = document.getElementById('idea-page__products');
// =============
// Загрузка и отображение шаблона
// =============
const init = async () => {
    // Читаем id шаблона идеи из адресной строки
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
        titleEl.textContent = 'Идея не найдена';
        return;
    }
    try {
        // Загружаем шаблон идеи по ID
        const res = await fetch(`/api/ideas/${id}/`);
        // Ошибка, если шаблон удален
        if (res.status === 404) {
            titleEl.textContent = 'Идея не найдена';
            return;
        }
        if (!res.ok)
            throw new Error();
        const t = await res.json();
        // Заполняем заголовок вкладки браузера и заголовок страницы
        document.title = t.title;
        titleEl.textContent = t.title;
        // Хлебные крошки
        typeCrumb.textContent = t.hobby_type || 'Идея';
        // Строка с параметрами хобби/возраст/сложность
        if (attrsEl && (t.age_group || t.difficulty)) {
            attrsEl.innerHTML = [
                t.hobby_type ? `<span>🎨 ${t.hobby_type}</span>` : '',
                t.age_group ? `<span>👤 ${t.age_group}</span>` : '',
                t.difficulty ? `<span>⭐ ${t.difficulty}</span>` : '',
            ].filter(Boolean).join(' &nbsp;·&nbsp; ');
        }
        // Загрузка фото идеи
        if (t.result_image) {
            imageEl.src = t.result_image;
            imageEl.alt = t.title;
            imageContainer.style.display = 'flex';
        }
        // Описание может быть HTML (с тегами) или обычным текстом (вставить тег <br>)
        const desc = t.description ?? '';
        contentEl.innerHTML = desc.startsWith('<') ? desc : desc.replace(/\n/g, '<br>');
        // Блок с товарами, которые нужны для идеи
        if (productsEl && t.products?.length) {
            productsEl.style.display = 'block';
            // Импортируем динамически — нужен только здесь, не на каждой странице
            const { createProductCard } = await import('./product-card.js');
            // Создаем карточку для каждого связанного товара
            t.products.forEach((p) => {
                productsEl.appendChild(createProductCard(p));
            });
        }
    }
    catch (e) {
        console.error(e);
        titleEl.textContent = 'Ошибка загрузки';
    }
};
init();
export {};
