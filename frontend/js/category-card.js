// js/category-card.js

function setActiveCategoryByUrl() {
    // Получаем параметр category из URL
    const urlParams = new URLSearchParams(window.location.search);
    const currentCategory = urlParams.get('category');
    
    if (!currentCategory) return;
    
    // Находим все карточки категорий
    const categoryCards = document.querySelectorAll('.category_card');
    
    categoryCards.forEach(card => {
        const cardCategoryUrl = card.getAttribute('data-category-url');
        
        if (cardCategoryUrl === currentCategory) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
}

// Вызываем после загрузки страницы
document.addEventListener('DOMContentLoaded', setActiveCategoryByUrl);