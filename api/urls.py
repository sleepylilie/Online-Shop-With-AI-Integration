from django.urls import path
from . import views

urlpatterns = [
    # Категории
    path('categories/',          views.get_categories,       name='get_categories'),
    path('categories/<slug:url_key>/', views.get_category_detail, name='get_category_detail'),

    # Подкатегории
    path('subcategories/',             views.get_subcategories,      name='get_subcategories'),
    path('subcategories/<slug:url_key>/', views.get_subcategory_detail, name='get_subcategory_detail'),

    # Товары
    path('products/',                  views.get_products,        name='get_products'),
    path('products/<slug:url_key>/',   views.get_product_detail,  name='get_product_detail'),

    # Авторизация
    path('auth/register/', views.register,    name='register'),
    path('auth/login/',    views.login_view,  name='login'),

    # Корзина
    path('cart/',                         views.cart,                      name='cart'),
    path('cart/remove-multiple/',         views.remove_multiple_from_cart, name='remove_multiple_from_cart'),
    path('cart/<int:cart_item_id>/',      views.cart_item,                 name='cart_item'),


    # Профиль
    path('auth/me/',                   views.get_me,                    name='get_me'),
    path('auth/me/update/',            views.update_me,                 name='update_me'),
    path('auth/me/avatar/',            views.upload_avatar,             name='upload_avatar'),
    path('auth/change-password/',      views.change_password,           name='change_password'),
    path('reviews/reviewed-ids/',      views.get_reviewed_product_ids,  name='get_reviewed_product_ids'),
    path('auth/delete-account/',      views.delete_account,            name='delete_account'),
    path('auth/verify-password/',      views.verify_password,           name='verify_password'),

    # Заказы пользователя
    path('orders/my/',                 views.get_my_orders,             name='get_my_orders'),
    path('orders/',                    views.place_order,               name='place_order'),

    # Избранное
    path('favorites/',                 views.get_favorites,             name='get_favorites_list'),
    path('favorites/add/',             views.add_favorite,              name='add_favorite'),
    path('favorites/<int:product_id>/', views.remove_favorite,          name='remove_favorite'),

    # Отзывы пользователя
    path('reviews/my/',                views.get_my_reviews,            name='get_my_reviews'),
    path('reviews/',                   views.submit_review,             name='submit_review'),
    path('products/<int:product_id>/reviews/', views.get_product_reviews, name='get_product_reviews'),

    # Уведомления
    path('notifications/',             views.get_notifications,         name='get_notifications'),
    path('notifications/mark-all-read/', views.mark_all_notifications_read, name='mark_all_read'),
    path('notifications/delete-read/',   views.delete_read_notifications,   name='delete_read'),
    path('notifications/<int:notification_id>/', views.mark_notification_read, name='mark_notif_read'),
    path('notifications/<int:notification_id>/delete/', views.delete_notification, name='delete_notif'),

    # Генератор идей
    path('ideas/',                      views.get_idea_templates,      name='get_idea_templates'),
    path('ideas/<int:pk>/',             views.get_idea_template_detail, name='get_idea_template_detail'),
    path('ideas/history/',  views.get_ai_chat_history,  name='ai_chat_history'),
    path('ideas/history/clear/', views.clear_ai_chat_history, name='ai_chat_clear'),
    path('ideas/generate/',             views.generate_idea,            name='generate_idea'),

    # Блог
    path('blog/',                      views.get_blog_posts,      name='get_blog_posts'),
    path('blog/<slug:url_key>/',       views.get_blog_post_detail, name='get_blog_post_detail'),
]
