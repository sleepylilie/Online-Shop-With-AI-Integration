"use strict";
/**
 * load_components.ts - загрузчик HTML-компонентов
 *
 * Подключается на каждой странице. Находит все элементы с атрибутом
 * data-component, загружает соответствующий HTML-файл и вставляет его.
 */
// Определяем путь к папке компонентов относительно текущей страницы
const isRoot = !window.location.pathname.includes('/pages/');
const COMPONENTS_PATH = '/static/components/';
// Словарь: имя компонента к имени HTML-файла
const componentsMap = {
    'header': 'header.html',
    'footer': 'footer.html',
    'product-card': 'product-card.html',
    'cart-item': 'cart-item.html',
    'category-card': 'category-card.html',
    'blog-card': 'blog-card.html',
    'idea-card': 'idea-card.html',
    'review-card': 'review-card.html',
    'notification-card': 'notification-card.html',
    'order-card': 'order-card.html',
    'profile-review-card': 'profile-review-card.html',
    'login-popup': 'login-popup.html',
    'register-popup': 'register-popup.html',
    'rate-product': 'rate-product.html',
    'change-password-popup': 'change-password-popup.html',
    'generator-chat-message': 'generator-chat-message.html',
    'generator-chat-after-gen': 'generator-chat-after-gen.html',
    'generator-chat-generate': 'generator-chat-generate.html',
};
// Загружает один компонент и вставляет его в DOM
async function loadSingleComponent(element) {
    // Читаем имя компонента из атрибута data-component
    const componentName = element.getAttribute('data-component');
    if (!componentName)
        return;
    // Ищем имя файла по имени компонента
    const filePath = componentsMap[componentName];
    // Если компонент не зарегистрирован в словаре, сообщаем об ошибке
    if (!filePath) {
        console.error(`Компонент "${componentName}" не найден в componentsMap`);
        return;
    }
    try {
        // Загружаем HTML-файл компонента с сервера
        const response = await fetch(COMPONENTS_PATH + filePath);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        // Вставляем HTML в DOM и убираем атрибут, чтобы не загружать повторно
        const html = await response.text();
        element.innerHTML = html;
        element.removeAttribute('data-component');
        // Хедер отдельно подключается со своим файлом header.js
        if (componentName === 'header') {
            // Загружаем header.js динамически 
            await loadScript('/static/js/header.js?v=' + Date.now());
            if (typeof initHeader === 'function') {
                initHeader();
            }
            // Для корректного отображенияпоп-апа каталога
            const catalogPopupEl = document.getElementById('catalog-popup');
            if (catalogPopupEl) {
                document.body.appendChild(catalogPopupEl);
            }
        }
        if (componentName === 'footer') {
            // Обрабатываем ссылки футера
            initFooterLinks();
        }
    }
    catch (error) {
        console.error(`Ошибка загрузки компонента "${componentName}":`, error);
        element.innerHTML = `<p style="color: var(--error)">Ошибка загрузки: ${componentName}</p>`;
    }
}
// Динамически подключает JS-файл и ждет загрузки
function loadScript(src) {
    return new Promise((resolve) => {
        // Не добавляем скрипт повторно, если он уже есть на странице
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        // Создаем тег <script> и добавляем в <head>
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => {
            console.error(`Не удалось загрузить скрипт: ${src}`);
            resolve();
        };
        document.head.appendChild(script);
    });
}
// Инициализация ссылок футера на поп-ап авторизации
function initFooterLinks() {
    // Открываем поп-ап 
    const openAuthPopup = (popupId) => {
        const overlay = document.getElementById('auth-overlay');
        const popup = document.getElementById(popupId);
        if (overlay && popup) {
            overlay.style.display = 'flex';
            popup.style.display = 'flex';
            popup.style.flexDirection = 'column';
        }
    };
    document.getElementById('footer__open-register')?.addEventListener('click', (e) => {
        e.preventDefault();
        openAuthPopup('popup__register');
    });
    document.getElementById('footer__open-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        openAuthPopup('popup__login');
    });
}
// Загружает все компоненты на странице и инициализирует скрипт
async function loadAllComponents() {
    // Находим все элементы с атрибутом data-component и загружаем параллельно
    const elements = document.querySelectorAll('[data-component]');
    await Promise.all(Array.from(elements).map(loadSingleComponent));
    // После загрузки всех компонентов запускаем инициализацию
    initComponentScripts();
}
// Инициализация после загрузки всех компонентов
function initComponentScripts() {
    // Хедер (поиск, каталог, тап-бар)
    if (typeof initHeader === 'function') {
        initHeader();
    }
    // Подсветка активной категории
    if (typeof setActiveCategoryByUrl === 'function') {
        setActiveCategoryByUrl();
    }
}
// Запускаем загрузку после готовности DOM
document.addEventListener('DOMContentLoaded', loadAllComponents);
