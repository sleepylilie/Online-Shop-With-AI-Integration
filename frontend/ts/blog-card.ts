export {};

/**
 * blog-card.ts - карточка публикации блога
 *
 * Здесь описано как выглядит и работает одна карточка статьи/новости/урока.
 * Этот файл используется на двух страницах:
 *  - главная (index.html) - показывает 3 последних публикации
 *  - блог (blog.html) - показывает все публикации с фильтрами
 */


// =============
// Описание структуры данных публикации
// =============

// Описание полей данных от API
export interface BlogPost {
    id: number;
    title: string;
    url_key: string;
    post_type: 'article' | 'news' | 'tutorial';
    preview_description: string;
    featured_image: string | null;
    created_at: string;
}


// =============
// Вспомогательные данные и функции
// =============

// Словарь для перевода типа на русский 
const postTypeLabel: Record<string, string> = {
    article: 'Статья',
    news: 'Новость',
    tutorial: 'Урок',
};

// Корректировка даты в формат ДД.ММ.ГГГГ
const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });


// =============
// Создание одной карточки
// =============

// Принимает данные одной публикации, возвращает готовый HTML-элемент
export const createBlogCard = (post: BlogPost): HTMLElement => {
    const card = document.createElement('div');
    card.className = 'blog-card';

    // Если у публикации нет картинки показывается плейсхолдер
    const img   = post.featured_image ?? '/static/assets/images/blog-placeholder.jpg';
    // Загрузка типа
    const label = postTypeLabel[post.post_type] ?? post.post_type;

    // Собираем HTML карточки
    card.innerHTML = `
        <img src="${img}" alt="${post.title}" loading="lazy" />
        <p class="text__small-text" style="color:var(--dark-gray)">${label} | ${formatDate(post.created_at)}</p>
        <p class="text__button">${post.title}</p>
        <p class="text__body-smaller">${post.preview_description}</p>
    `;

    // По клику на карточку переходим на страницу этой публикации
    card.addEventListener('click', (): void => {
        window.location.href = `/pages/blog-page.html?url_key=${post.url_key}`;
    });

    return card;
};


// =============
// Загрузка списка публикаций в контейнер
// =============

// Универсальная функция запроса данных по API по параметру
export const renderBlogList = async (
    containerId: string,
    params: Record<string, string> = {}
): Promise<void> => {
    const container = document.getElementById(containerId);
    // Если контейнер не найден, выход
    if (!container) {
        console.warn(`renderBlogList: элемент #${containerId} не найден на странице.`);
        return;
    }

    container.innerHTML = '<p class="text__body-smaller" style="color:var(--dark-gray)">Загрузка...</p>';

    try {
        // Собираем строку параметров и делаем запрос к API
        const query = new URLSearchParams(params).toString();
        const response = await fetch(query ? `/api/blog/?${query}` : '/api/blog/');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const posts: BlogPost[] = await response.json();
        // Очищаем плейсхолдер загрузки
        container.innerHTML = '';

        if (posts.length === 0) {
            container.innerHTML = '<p class="text__body-smaller" style="color:var(--dark-gray)">Публикаций пока нет.</p>';
            return;
        }

        // Вставляем карточку для каждой публикации
        posts.forEach(post => container.appendChild(createBlogCard(post)));

    } catch (error) {
        console.error(`renderBlogList #${containerId}:`, error);
        container.innerHTML = '<p class="text__body-smaller" style="color:var(--error)">Не удалось загрузить публикации.</p>';
    }
};
