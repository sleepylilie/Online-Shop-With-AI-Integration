export {};

/**
 * blog-page.ts - страница отдельной публикации блога
 *
 * Этот файл читает url_key из адреса, делает запрос к API,
 * и заполняет страницу: заголовок, дату, картинку и текст публикации.
 */


// =============
// Описание структуры данных одной публикации
// =============

// Какие данные Typescript принимает от API
interface BlogPostDetail {
    id:  number;
    post_type: 'article' | 'news' | 'tutorial';
    title: string;
    url_key: string;
    preview_description: string;
    content: string;  // полный текст в формате HTML
    featured_image: string | null;
    created_at: string;
    updated_at: string;
}


// =============
// Вспомогательные данные и функции
// =============

// Тип публикации для отображения
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
// Элементы страницы для заполнения
// =============

const titleEl        = document.getElementById('blog-page__title')           as HTMLElement;
const typeCrumb      = document.getElementById('blog-page__type-crumb')      as HTMLElement;
const dateEl         = document.getElementById('blog-page__date')            as HTMLElement;
const imageContainer = document.getElementById('blog-page__image-container') as HTMLElement;
const imageEl        = document.getElementById('blog-page__image')           as HTMLImageElement;
const contentEl      = document.getElementById('blog-page__content')         as HTMLElement;
const shareBtn       = document.getElementById('blog-page__share-btn')       as HTMLButtonElement;


// =============
// Кнопка "Поделиться"
// =============

shareBtn?.addEventListener('click', async (): Promise<void> => {
    const url = window.location.href;
    const title = document.title;

    // Для мобильных браузеров
    if (navigator.share) {
        try {
            await navigator.share({ title, url });
            return;
        } catch {
            return;
        }
    }

    // На десктопах копирование ссылки в буфер
    try {
        await navigator.clipboard.writeText(url);

        // Временно меняем текст кнопки, чтобы пользователь увидел подтверждение
        const textEl = shareBtn.querySelector('p');
        if (textEl) {
            const original = textEl.textContent;
            textEl.textContent = 'Ссылка скопирована';
            setTimeout(() => { textEl.textContent = original; }, 2000);
        }
    } catch {
        // Если буфер не срабатывает, показывает диалог
        window.prompt('Скопируйте ссылку:', url);
    }
});


// =============
// Загрузка и отображение публикации
// =============

const loadPost = async (): Promise<void> => {
    // Чтение url_key из адресной строки
    const urlKey = new URLSearchParams(window.location.search).get('url_key');

    // Если url_key не передан в адресе, отображается ошибка
    if (!urlKey) {
        titleEl.textContent = 'Публикация не найдена';
        contentEl.textContent = 'Не указан адрес публикации.';
        return;
    }

    try {
        // Запрашиваем публикацию по url_key
        const response = await fetch(`/api/blog/${urlKey}/`);

        // Публикация не найдена
        if (response.status === 404) {
            titleEl.textContent = 'Публикация не найдена';
            contentEl.textContent = 'Такой публикации не существует или она была удалена.';
            return;
        }

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const post: BlogPostDetail = await response.json();

        // Заполняем все элементы страницы данными из API
        document.title = post.title;
        typeCrumb.textContent = postTypeLabel[post.post_type] ?? post.post_type;
        titleEl.textContent = post.title;
        dateEl.textContent = formatDate(post.created_at);
        if (post.featured_image) {
            imageEl.src = post.featured_image;
            imageEl.alt = post.title;
            imageContainer.style.display = 'flex';
        }
        // Вставляем HTML-текст статьи
        contentEl.innerHTML = post.content ?? '';

    } catch (error) {
        console.error('Ошибка загрузки публикации:', error);
        titleEl.textContent = 'Ошибка загрузки';
        contentEl.textContent = 'Не удалось загрузить публикацию. Попробуйте обновить страницу.';
    }
};

loadPost();
