# Файл, регистрирующий модели в административной панели сервера Django
# Передаются следующие модели:
# 1. Модель: User (пользователь, базирован на AbstractUser от Django)
# 2. Модель: Category (категории)
# 3. Модель: Subcategory (подкатегории)
# 4. Модель: Product (товары)
# 5. Модель: ProductImage (фотографии товаров)
# 6. Модель: Cart (корзина)
# 7. Модель: Order (заказы)
# 8. Модель: Order_item (товары в заказе)
# 9. Модель: Favorite (избранные)
# 10. Модель: Review (отзывы)
# 11. Модель: Notification (уведомления)
# 12. Модель: IdeaTemplate (шаблоны идей)
# 13. Модель: BlogPost (статьи, новости и уроки в блоге)
# 14. Модель: AiChatMessage (история сообщений чата с ИИ)
# ------------------------------
# Параметры для передаваемых данных:
# list_display: какие поля показывать в списке объектов
# list_filter: фильтр по полям
# search_fields: поисковая строка для полей
# list_editable: редактируемые поля
# prepopulated_fields: автоматическое заполнение поля
# ====================================

from django.contrib import admin
from .models import (
    User, Category, Subcategory, Product, ProductImage,
    Cart, Order, OrderItem, Favorite, Review,
    Notification, IdeaTemplate, BlogPost, AiChatMessage
)

# Регистрация модели пользователя
@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'user_role', 'is_active']
    list_filter = ['user_role', 'is_active']
    search_fields = ['username', 'email', 'first_name', 'last_name']


# Категории
@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['category_name', 'url_key', 'sort_order', 'is_active']
    list_editable = ['sort_order', 'is_active']
    prepopulated_fields = {'url_key': ('category_name',)}


# Подкатегории
@admin.register(Subcategory)
class SubcategoryAdmin(admin.ModelAdmin):
    list_display = ['subcategory_name', 'category', 'url_key', 'sort_order', 'is_active']
    list_filter = ['category', 'is_active']
    list_editable = ['sort_order', 'is_active']
    prepopulated_fields = {'url_key': ('subcategory_name',)}


# Товары
@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['product_name', 'subcategory', 'price', 'stock', 'is_active']
    list_filter = ['subcategory__category', 'is_active']
    search_fields = ['product_name', 'product_description']
    list_editable = ['price', 'stock', 'is_active']
    prepopulated_fields = {'url_key': ('product_name',)}


# Фото товаров 
@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ['product', 'sort_order'] 
    list_editable = ['sort_order']            
    list_filter = ['product']


# Корзина
@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ['user', 'product', 'quantity']
    list_filter = ['user']


# Заказы
@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'user', 'order_status', 'total_amount', 'created_at']
    list_filter = ['order_status', 'payment_status']
    search_fields = ['order_number', 'user__username', 'recipient_full_name', 'recipient_email']


# Товары в заказе
@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['order', 'product_name', 'quantity', 'product_price']


# Избранное
@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ['user', 'product', 'created_at']
    list_filter = ['user']


# Отзывы
@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['product', 'user', 'rating', 'status', 'created_at']
    list_filter = ['rating', 'status']
    list_editable = ['status']
    search_fields = ['user_comment']


# Уведомления
@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'title', 'notification_type', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read']
    search_fields = ['title', 'notification_message']


# Шаблоны идей 
@admin.register(IdeaTemplate)
class IdeaTemplateAdmin(admin.ModelAdmin):
    list_display = ['title', 'hobby_type', 'age_group', 'difficulty', 'sort_order']
    list_filter = ['hobby_type', 'age_group', 'difficulty']
    list_editable = ['sort_order']
    search_fields = ['title', 'idea_description']


# Блог
@admin.register(BlogPost)
class BlogPostAdmin(admin.ModelAdmin):
    list_display = ['title', 'post_type', 'created_at']
    list_filter = ['post_type']
    prepopulated_fields = {'url_key': ('title',)}
    search_fields = ['title', 'preview_description', 'content']


# Чат с ИИ
@admin.register(AiChatMessage)
class AiChatMessageAdmin(admin.ModelAdmin):
    list_display = ['user', 'hobby_type', 'age_group', 'difficulty', 'was_accepted', 'created_at']
    list_filter = ['hobby_type', 'age_group', 'difficulty', 'was_accepted']
    search_fields = ['user__username', 'ai_response']