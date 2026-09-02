/**
 * blog.ts - страница блога
 *
 * Этот файл отвечат за страницу блога:
 * - загружает статьи из базы данных через API и показывает их в виде карточек;
 * - возможность фильтровать публикации по типу (все / статьи / новости / уроки).
 * Карточки создаются через функцию createBlogCard из blog-card.ts.
 */
import { createBlogCard } from './blog-card.js';
// =============
// Находим нужные элементы на странице
// =============
// Сетка куда вставляем карточки статей
const blogGrid = document.getElementById('blog__grid');
// Счетчик "Найдено N публикаций"
const blogCount = document.getElementById('blog__count');
// Все кнопки фильтра ("Все", "Статьи", "Новости", "Уроки")
const filterBtns = document.querySelectorAll('.blog-filter__category');
// =============
// Текущий фильтр
// =============
// Смотрим есть ли в адресе ?type=article/?type=news для ссылок в футере
const urlParams = new URLSearchParams(window.location.search);
let activeType = urlParams.get('type') ?? 'all';
// =============
// Загрузка и отображение публикаций
// =============
const loadPosts = async () => {
    // Показываем состояние загрузки пока данные не пришли
    blogGrid.innerHTML = '<p class="text__body-smaller" style="color:var(--dark-gray)">Загрузка...</p>';
    blogCount.textContent = '...';
    try {
        // Запрос данных (все или фильтрованные)
        const params = new URLSearchParams();
        if (activeType !== 'all') {
            params.set('type', activeType);
        }
        const url = params.toString() ? `/api/blog/?${params}` : '/api/blog/';
        // Загружаем публикации с учетом фильтра
        const response = await fetch(url);
        if (!response.ok)
            throw new Error(`HTTP ${response.status}`);
        const posts = await response.json();
        // Обновляем счетчик и очищаем старые карточки
        blogGrid.innerHTML = '';
        blogCount.textContent = String(posts.length);
        if (posts.length === 0) {
            blogGrid.innerHTML = '<p class="text__body-smaller" style="color:var(--dark-gray);grid-column:1/-1">Публикаций пока нет.</p>';
            return;
        }
        // Создаем карточку для каждой статьи и добавляем в сетку
        posts.forEach(post => blogGrid.appendChild(createBlogCard(post)));
    }
    catch (error) {
        console.error('Ошибка загрузки блога:', error);
        blogGrid.innerHTML = '<p class="text__body-smaller" style="color:var(--error);grid-column:1/-1">Не удалось загрузить публикации. Попробуйте обновить страницу.</p>';
        blogCount.textContent = '0';
    }
};
// =============
// Кнопки фильтра
// =============
// Подсвечиваем активную кнопку классом .active
const updateFilterButtons = () => {
    filterBtns.forEach(btn => {
        const type = btn.getAttribute('data-type') ?? 'all';
        btn.classList.toggle('active', type === activeType);
    });
};
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-type') ?? 'all';
        // Если нажали ту же кнопку что уже активна, ничего не делаем
        if (type === activeType)
            return;
        // Обновляем состояние и перезагружаем список
        activeType = type;
        updateFilterButtons();
        loadPosts();
    });
});
// =============
// Запуск при загрузке страницы
// =============
// Сначала выставляем кнопки (с учетом ?type= в URL), потом загружаем публикации
updateFilterButtons();
loadPosts();
