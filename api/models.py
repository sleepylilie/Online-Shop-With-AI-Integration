# Файл, содержащий информацию (модели) данных из базы данных PostgreSQL
# Создаются следующие модели:
# 1. Модель: User (пользователь, базирован на AbstractUser от Django)
# 2. Модель: Category (категории)
# 3. Модель: Subcategory (подкатегории)
# 4. Модель: Product (товары)
# 5. Модель: ProductImage (фотографии товаров)
# 6. Модель: Cart (корзина)
# 7. Модель: Order (заказы)
# 8. Модель: OrderItem (товары в заказе)
# 9. Модель: Favorite (избранные)
# 10. Модель: Review (отзывы)
# 11. Модель: Notification (уведомления)
# 12. Модель: IdeaTemplate (шаблоны идей)
# 13. Модель: BlogPost (статьи, новости и уроки в блоге)
# 14. Модель: AiChatMessage (история сообщений чата с ИИ)
# ====================================

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator

# 1. Пользователь - расширение AbstractUser функционала Django
# переносятся следующие данные:
# - id (SERIAL PRIMARY KEY): идентификатор, автоматически в Django
# - username (VARCHAR(100) NOT NULL UNIQUE): имя пользователя, из AbstractUser
# - email (VARCHAR(255) NOT NULL UNIQUE): почта, из AbstractUser
# - password (VARCHAR(255) NOT NULL): пароль (хеш), из AbstractUser
# - first_name (VARCHAR(100)): имя, из AbstractUser
# - last_name (VARCHAR(100)): фамилия, из AbstractUser
# - birth_date (DATE): дата рождения
# - gender (VARCHAR(10)): пол (с ограничениями)
# - phone (VARCHAR(20)): номер телефона
# - avatar (VARCHAR(500)): путь к аватару
# - user_role (VARCHAR(50) DEFAULT 'customer'): роль пользователя (с проверкой)
# - is_active (BOOLEAN DEFAULT TRUE): активен или не активен, из AbstractUser
# - email_notifications_enabled (BOOLEAN DEFAULT FALSE): разрешение на отправку сообщений на почту
# - notify_order_status (BOOLEAN DEFAULT TRUE): для оповещений о статусе заказа
# - notify_promo (BOOLEAN DEFAULT FALSE): для рекламных оповещений
# - notify_system (BOOLEAN DEFAULT TRUE): для системных оповещений
# - date_joined (TIMESTAMP DEFAULT CURRENT_TIMESTAMP): дата создания, из AbstractUser
# - last_login (TIMESTAMP): последний логин, из AbstractUser
# - is_superuser (BOOLEAN DEFAULT FALSE): статус суперпользователя, из AbstractUser
# - is_staff (BOOLEAN DEFAULT FALSE): статус сотрудника, из AbstractUser
class User(AbstractUser):
    # о пользователе
    birth_date = models.DateField('Дата рождения', blank=True, null=True)
    gender = models.CharField('Пол', max_length=10, choices=[('мужской', 'Мужской'), ('женский', 'Женский')], blank=True, null=True)
    phone = models.CharField('Телефон', max_length=20, blank=True, null=True)
    avatar = models.CharField('Аватар', max_length=500, blank=True, null=True)
    user_role = models.CharField('Роль', max_length=50, default='customer', choices=[('customer', 'Покупатель'), ('admin', 'Администратор')])
    
    # настройки уведомлений
    email_notifications_enabled = models.BooleanField('Email-уведомления', default=False)
    notify_order_status = models.BooleanField('Статус заказа',default=True)
    notify_promo = models.BooleanField('Акции и скидки', default=False)
    notify_system = models.BooleanField('Системные уведомления', default=True)
    
    class Meta:
        db_table = 'users'  # имя таблицы в БД
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'
        ordering = ['-date_joined'] # сортировка по дате создания аккаунта
    
    def __str__(self): # что возвращает при обращении
        return self.username

# 2. Категории товаров
# переносятся следующие данные:
# - id (SERIAL PRIMARY KEY): уникальный идентификатор, автоматически в Django
# - category_name (VARCHAR(150) NOT NULL): название категории
# - url_key (VARCHAR(150) NOT NULL UNIQUE): уникальный ключ для понятных ссылок
# - icon (VARCHAR(255)): путь к иконке категории
# - sort_order (INT DEFAULT 0): порядок сортировки (не может быть отрицательным)
# - is_active (BOOLEAN DEFAULT TRUE): активна ли категория (можно скрыть без удаления)
class Category(models.Model):
    category_name = models.CharField('Название', max_length=150)  # название категории
    url_key = models.SlugField('URL-ключ', max_length=150, unique=True)  # уникальный ключ для ЧПУ-ссылок
    icon = models.CharField('Иконка', max_length=255, blank=True, null=True)  # путь к иконке категории
    sort_order = models.IntegerField('Порядок сортировки', default=0, validators=[MinValueValidator(0)])  # порядок сортировки (не может быть отрицательным)
    is_active = models.BooleanField('Активна', default=True)  # активна ли категория
    
    class Meta:
        db_table = 'categories'  # имя таблицы в БД
        verbose_name = 'Категория'
        verbose_name_plural = 'Категории'
        ordering = ['sort_order', 'category_name']  # сортировка по порядку, затем по имени
    
    def __str__(self):  # что возвращает при обращении
        return self.category_name

# 3. Подкатегории товаров
# переносятся следующие данные:
# - id (SERIAL PRIMARY KEY): уникальный идентификатор, автоматически в Django
# - category_id (INT NOT NULL REFERENCES categories ON DELETE CASCADE): ссылка на родительскую категорию
# - subcategory_name (VARCHAR(150) NOT NULL): название подкатегории
# - url_key (VARCHAR(150) NOT NULL): уникальный ключ для понятной ссылки
# - icon (VARCHAR(255)): путь к иконке подкатегории
# - sort_order (INT DEFAULT 0): порядок сортировки внутри категории (не может быть отрицательным)
# - is_active (BOOLEAN DEFAULT TRUE): активна ли подкатегория
# - UNIQUE(category_id, url_key): внутри одной категории url_key должен быть уникальным
class Subcategory(models.Model):
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,  # при удалении категории удаляются и её подкатегории
        related_name='subcategories',
        verbose_name='Категория'
    )
    subcategory_name = models.CharField('Название', max_length=150) 
    url_key = models.SlugField('URL-ключ', max_length=150) 
    icon = models.CharField('Иконка', max_length=255, blank=True, null=True) 
    sort_order = models.IntegerField('Порядок сортировки', default=0, validators=[MinValueValidator(0)])
    is_active = models.BooleanField('Активна', default=True)
    
    class Meta:
        db_table = 'subcategories'  # имя таблицы в БД
        verbose_name = 'Подкатегория'
        verbose_name_plural = 'Подкатегории'
        ordering = ['category__sort_order', 'sort_order', 'subcategory_name']  # сортировка по категории, затем по порядку, затем по имени
        unique_together = [['category', 'url_key']]  # внутри одной категории url_key должен быть уникальным
    
    def __str__(self):  # что возвращает при обращении
        return f"{self.category.category_name} > {self.subcategory_name}" if self.category else self.subcategory_name

# 4. Товары
# переносятся следующие данные:
# - id (SERIAL PRIMARY KEY): уникальный идентификатор, автоматически в Django
# - subcategory_id (INT REFERENCES subcategories ON DELETE SET NULL): ссылка на подкатегорию, при удалении подкатегории товар остаётся, но связь обнуляется
# - product_name (VARCHAR(255) NOT NULL): название товара
# - url_key (VARCHAR(255) NOT NULL UNIQUE): уникальный ключ для понятных ссылок
# - product_description (TEXT NOT NULL): полное описание товара
# - attributes (JSONB): характеристики товара в формате JSON
# - price (DECIMAL(10,2) NOT NULL): текущая цена (не может быть отрицательной)
# - old_price (DECIMAL(10,2) DEFAULT 0): старая цена для отображения скидки
# - stock (INT DEFAULT 0): количество на складе
# - rating (DECIMAL(3,2) DEFAULT 0): средний рейтинг товара (0-5)
# - reviews_count (INT DEFAULT 0): количество отзывов о товаре
# - is_active (BOOLEAN DEFAULT TRUE): активен ли товар (можно скрыть без удаления)
# - created_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP): дата создания (для сортировки "новинки")
# - updated_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP): дата последнего обновления
class Product(models.Model):
    subcategory = models.ForeignKey(
        Subcategory,
        on_delete=models.SET_NULL,  # при удалении подкатегории товар остаётся, но связь обнуляется
        null=True,
        blank=True,
        related_name='products',
        verbose_name='Подкатегория'
    )
    product_name = models.CharField('Название', max_length=255)  
    url_key = models.SlugField('URL-ключ', max_length=255, unique=True)
    product_description = models.TextField('Описание') 
    attributes = models.JSONField('Характеристики', blank=True, null=True) 
    price = models.DecimalField('Цена', max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    old_price = models.DecimalField('Старая цена', max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])  
    stock = models.IntegerField('Остаток', default=0, validators=[MinValueValidator(0)]) 
    rating = models.DecimalField('Рейтинг', max_digits=3, decimal_places=2, default=0, validators=[MinValueValidator(0), MaxValueValidator(5)]) 
    reviews_count = models.IntegerField('Количество отзывов', default=0)  
    is_active = models.BooleanField('Активен', default=True)  
    created_at = models.DateTimeField('Создан', auto_now_add=True) 
    updated_at = models.DateTimeField('Обновлён', auto_now=True) 
    
    class Meta:
        db_table = 'products'  # имя таблицы в БД
        verbose_name = 'Товар'
        verbose_name_plural = 'Товары'
        ordering = ['-created_at']  # сортировка по дате создания (сначала новые)
    
    def __str__(self):  # что возвращает при обращении
        return self.product_name

# 5. Фотографии товаров
# переносятся следующие данные:
# - id (SERIAL PRIMARY KEY): уникальный идентификатор, автоматически в Django
# - product_id (INT NOT NULL REFERENCES products ON DELETE CASCADE): ссылка на товар, при удалении товара фото тоже удаляются
# - image_url (VARCHAR(500) NOT NULL): путь к файлу изображения
# - alt_text (VARCHAR(255)): описание фото 
# - sort_order (INT DEFAULT 0): порядок показа в галерее
class ProductImage(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,  # при удалении товара фото тоже удаляются
        related_name='images',
        verbose_name='Товар'
    )
    image_url = models.ImageField('Изображение', upload_to='products/')  
    alt_text = models.CharField('Alt-текст', max_length=255, blank=True, null=True)  
    sort_order = models.IntegerField('Порядок', default=0, validators=[MinValueValidator(0)]) 
    
    class Meta:
        db_table = 'product_images'  # имя таблицы в БД
        verbose_name = 'Фото товара'
        verbose_name_plural = 'Фото товаров'
        ordering = ['sort_order']  # сортировка по порядку показа
    
    def __str__(self):  # что возвращает при обращении
        return f"Фото для {self.product.product_name}"

# 6. Корзина
# переносятся следующие данные:
# - id (SERIAL PRIMARY KEY): уникальный идентификатор записи в корзине, автоматически в Django
# - user_id (INT NOT NULL REFERENCES users ON DELETE CASCADE): ссылка на пользователя, при удалении пользователя его корзина очищается
# - product_id (INT NOT NULL REFERENCES products ON DELETE CASCADE): ссылка на товар, при удалении товара он исчезает из корзин
# - quantity (INT NOT NULL DEFAULT 1): количество товара (не может быть меньше 1, максимум 999)
# - UNIQUE(user_id, product_id): один товар может быть в корзине пользователя только один раз
class Cart(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,  # при удалении пользователя его корзина очищается
        related_name='cart_items',
        verbose_name='Пользователь'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,  # при удалении товара он исчезает из корзин
        related_name='cart_items',
        verbose_name='Товар'
    )
    quantity = models.PositiveIntegerField('Количество', default=1, validators=[MinValueValidator(1), MaxValueValidator(999)])
    
    class Meta:
        db_table = 'cart_items'  # имя таблицы в БД
        verbose_name = 'Товар в корзине'
        verbose_name_plural = 'Товары в корзине'
        unique_together = [['user', 'product']]  # один товар может быть в корзине пользователя только один раз
    
    def __str__(self):  # что возвращает при обращении
        return f"{self.user.username} в корзине: {self.product.product_name} x{self.quantity}"


# 7. Заказы
# переносятся следующие данные:
# - id (SERIAL PRIMARY KEY): уникальный идентификатор заказа, автоматически в Django
# - user_id (INT REFERENCES users ON DELETE SET NULL): ссылка на пользователя (при удалении пользователя заказ остаётся)
# - order_number (VARCHAR(50) NOT NULL UNIQUE): уникальный номер заказа
# - order_status (VARCHAR(50) DEFAULT 'новый'): статус заказа (новый, в обработке, оплачен, отправлен, доставлен, отменён)
# - total_amount (DECIMAL(10,2) NOT NULL): итоговая сумма заказа
# - recipient_full_name (VARCHAR(255) NOT NULL): полное имя получателя (Фамилия Имя)
# - recipient_email (VARCHAR(255) NOT NULL): email получателя для уведомлений
# - recipient_phone (VARCHAR(20) NOT NULL): телефон получателя для связи курьера
# - delivery_address (TEXT NOT NULL): полный адрес доставки
# - delivery_date (DATE): желаемая дата доставки
# - delivery_time_slot (VARCHAR(20)): временной слот (10-14, 14-17, 17-20)
# - payment_method (VARCHAR(50) NOT NULL): способ оплаты (картой онлайн, наличными при получении, картой при получении)
# - payment_status (VARCHAR(50) DEFAULT 'в процессе'): статус оплаты (в процессе, оплачено, ошибка)
# - customer_comment (TEXT): комментарий пользователя к заказу
# - created_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP): дата создания заказа
# - updated_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP): дата последнего обновления
class Order(models.Model):
    # статусы заказа
    STATUS_CHOICES = [
        ('новый', 'Новый'),
        ('в обработке', 'В обработке'),
        ('оплачен', 'Оплачен'),
        ('отправлен', 'Отправлен'),
        ('доставлен', 'Доставлен'),
        ('отменён', 'Отменён'),
    ]
    
    # способы оплаты
    PAYMENT_METHOD_CHOICES = [
        ('картой онлайн', 'Картой онлайн'),
        ('наличными при получении', 'Наличными при получении'),
        ('картой при получении', 'Картой при получении'),
    ]
    
    # статусы оплаты
    PAYMENT_STATUS_CHOICES = [
        ('в процессе', 'В процессе'),
        ('оплачено', 'Оплачено'),
        ('ошибка', 'Ошибка'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,  # при удалении пользователя заказ остаётся
        null=True,
        related_name='orders',
        verbose_name='Пользователь'
    )
    order_number = models.CharField('Номер заказа', max_length=50, unique=True) 
    order_status = models.CharField('Статус', max_length=50, default='новый', choices=STATUS_CHOICES)  
    total_amount = models.DecimalField('Сумма', max_digits=10, decimal_places=2, validators=[MinValueValidator(0)]) 
    recipient_full_name = models.CharField('Получатель', max_length=255)  
    recipient_email = models.EmailField('Email получателя', max_length=255)  
    recipient_phone = models.CharField('Телефон получателя', max_length=20)  
    delivery_address = models.TextField('Адрес доставки')  
    delivery_date = models.DateField('Дата доставки', blank=True, null=True)  
    delivery_time_slot = models.CharField('Временной слот', max_length=20, blank=True, null=True)  
    payment_method = models.CharField('Способ оплаты', max_length=50, choices=PAYMENT_METHOD_CHOICES)  
    payment_status = models.CharField('Статус оплаты', max_length=50, default='в процессе', choices=PAYMENT_STATUS_CHOICES)  
    customer_comment = models.TextField('Комментарий', blank=True, null=True)  
    created_at = models.DateTimeField('Создан', auto_now_add=True) 
    updated_at = models.DateTimeField('Обновлён', auto_now=True)  
    
    class Meta:
        db_table = 'orders'  # имя таблицы в БД
        verbose_name = 'Заказ'
        verbose_name_plural = 'Заказы'
        ordering = ['-created_at']  # сортировка по дате создания (сначала новые)
    
    def __str__(self):  # что возвращает при обращении
        return f"Заказ №{self.order_number}"

# 8. Товары в заказе
# переносятся следующие данные:
# - id (SERIAL PRIMARY KEY): уникальный идентификатор записи, автоматически в Django
# - order_id (INT NOT NULL REFERENCES orders ON DELETE CASCADE): ссылка на заказ (при удалении заказа его товары тоже удаляются)
# - product_id (INT NOT NULL REFERENCES products ON DELETE CASCADE): ссылка на товар в каталоге (для перехода на карточку)
# - product_name (VARCHAR(255) NOT NULL): название товара на момент покупки 
# - product_price (DECIMAL(10,2) NOT NULL): цена товара на момент покупки 
# - quantity (INT NOT NULL): количество купленных товаров 
# - product_image (VARCHAR(500)): путь к фото товара на момент покупки 
# - created_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP): дата добавления записи
class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,  # при удалении заказа его товары тоже удаляются
        related_name='items',
        verbose_name='Заказ'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,  # при удалении товара из каталога запись в заказе остаётся? НЕТ, удаляется (CASCADE)
        related_name='order_items',
        verbose_name='Товар'
    )
    product_name = models.CharField('Название товара', max_length=255)  
    product_price = models.DecimalField('Цена', max_digits=10, decimal_places=2, validators=[MinValueValidator(0)]) 
    quantity = models.PositiveIntegerField('Количество', validators=[MinValueValidator(1), MaxValueValidator(999)])  
    product_image = models.CharField('Фото', max_length=500, blank=True, null=True)  
    created_at = models.DateTimeField('Создан', auto_now_add=True)  
    
    class Meta:
        db_table = 'order_items'  # имя таблицы в БД
        verbose_name = 'Товар в заказе'
        verbose_name_plural = 'Товары в заказах'
    
    def __str__(self):  # что возвращает при обращении
        return f"{self.product_name} x{self.quantity}"

# 9. Избранные товары
# переносятся следующие данные:
# - id (SERIAL PRIMARY KEY): уникальный идентификатор записи, автоматически в Django
# - user_id (INT NOT NULL REFERENCES users ON DELETE CASCADE): ссылка на пользователя (при удалении пользователя его избранное очищается)
# - product_id (INT NOT NULL REFERENCES products ON DELETE CASCADE): ссылка на товар (при удалении товара он исчезает из избранного)
# - created_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP): дата добавления товара в избранное
# - UNIQUE(user_id, product_id): пользователь не может добавить один и тот же товар в избранное дважды
class Favorite(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,  # при удалении пользователя его избранное очищается
        related_name='favorites',
        verbose_name='Пользователь'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,  # при удалении товара он исчезает из избранного
        related_name='favorited_by',
        verbose_name='Товар'
    )
    created_at = models.DateTimeField('Добавлен', auto_now_add=True) 
    
    class Meta:
        db_table = 'favorites'  # имя таблицы в БД
        verbose_name = 'Избранное'
        verbose_name_plural = 'Избранное'
        unique_together = [['user', 'product']]  # пользователь не может добавить один товар дважды
    
    def __str__(self):  # что возвращает при обращении
        return f"{self.user.username} добавил(а) в избранное {self.product.product_name}"

# 10. Отзывы
# переносятся следующие данные:
# - id (SERIAL PRIMARY KEY): уникальный идентификатор отзыва, автоматически в Django
# - product_id (INT NOT NULL REFERENCES products ON DELETE CASCADE): ссылка на товар (при удалении товара его отзывы удаляются)
# - user_id (INT NOT NULL REFERENCES users ON DELETE CASCADE): ссылка на пользователя (при удалении пользователя его отзывы удаляются)
# - rating (INT NOT NULL): оценка товара от 1 до 5 звёзд
# - user_comment (TEXT): текст отзыва (максимум 2000 символов)
# - status (VARCHAR(20) DEFAULT 'moderation'): статус отзыва (moderation, approved, rejected)
# - created_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP): дата создания отзыва
# - updated_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP): дата последнего обновления
# - UNIQUE(product_id, user_id): один пользователь может оставить только один отзыв на товар
class Review(models.Model):
    # статусы отзыва
    STATUS_CHOICES = [
        ('moderation', 'На модерации'),
        ('approved', 'Опубликован'),
        ('rejected', 'Отклонён'),
    ]
    
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,  # при удалении товара его отзывы удаляются
        related_name='reviews',
        verbose_name='Товар'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,  # при удалении пользователя его отзывы удаляются
        related_name='reviews',
        verbose_name='Пользователь'
    )
    rating = models.IntegerField('Оценка', validators=[MinValueValidator(1), MaxValueValidator(5)]) 
    user_comment = models.TextField('Комментарий', blank=True, null=True) 
    status = models.CharField('Статус', max_length=20, default='moderation', choices=STATUS_CHOICES) 
    created_at = models.DateTimeField('Создан', auto_now_add=True) 
    updated_at = models.DateTimeField('Обновлён', auto_now=True) 
    
    class Meta:
        db_table = 'reviews'  # имя таблицы в БД
        verbose_name = 'Отзыв'
        verbose_name_plural = 'Отзывы'
        ordering = ['-created_at']  # сортировка по дате создания (сначала новые)
        unique_together = [['product', 'user']]  # один пользователь — один отзыв на товар
    
    def __str__(self):  # что возвращает при обращении
        return f"{self.user.username} оценил(а): {self.product.product_name} - {self.rating}"

# 11. Уведомления
# переносятся следующие данные:
# - id (SERIAL PRIMARY KEY): уникальный идентификатор уведомления, автоматически в Django
# - user_id (INT NOT NULL REFERENCES users ON DELETE CASCADE): ссылка на пользователя (при удалении пользователя его уведомления удаляются)
# - notification_type (VARCHAR(50) NOT NULL): тип уведомления (order_status, promo, system, reminder)
# - title (VARCHAR(255) NOT NULL): заголовок уведомления
# - notification_message (TEXT NOT NULL): текст уведомления
# - link (VARCHAR(500)): ссылка для перехода (если необходимо)
# - is_read (BOOLEAN DEFAULT FALSE): прочитано ли уведомление
# - email_sent (BOOLEAN DEFAULT FALSE): отправлено ли уведомление на email
# - created_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP): дата и время создания уведомления
class Notification(models.Model):
    # типы уведомлений
    TYPE_CHOICES = [
        ('order_status', 'Статус заказа'),
        ('promo', 'Акция'),
        ('system', 'Системное'),
        ('reminder', 'Напоминание'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,  # при удалении пользователя его уведомления удаляются
        related_name='notifications',
        verbose_name='Пользователь'
    )
    notification_type = models.CharField('Тип', max_length=50, choices=TYPE_CHOICES)  
    title = models.CharField('Заголовок', max_length=255)  
    notification_message = models.TextField('Сообщение')  
    link = models.CharField('Ссылка', max_length=500, blank=True, null=True)  
    is_read = models.BooleanField('Прочитано', default=False)  
    email_sent = models.BooleanField('Отправлено на email', default=False)  
    created_at = models.DateTimeField('Создано', auto_now_add=True) 
    
    class Meta:
        db_table = 'notifications'  # имя таблицы в БД
        verbose_name = 'Уведомление'
        verbose_name_plural = 'Уведомления'
        ordering = ['-created_at']  # сортировка по дате создания (сначала новые)
    
    def __str__(self):  # что возвращает при обращении
        return f"{self.user.username}: {self.title}"

# 12. Шаблоны идей
# переносятся следующие данные:
# - id (SERIAL PRIMARY KEY): уникальный идентификатор шаблона идеи, автоматически в Django
# - hobby_type (VARCHAR(100) NOT NULL): тип творчества/хобби (рисование, шитьё, вязание и т.д.)
# - title (VARCHAR(255) NOT NULL): название идеи
# - idea_description (TEXT NOT NULL): подробное пошаговое описание идеи
# - result_image (VARCHAR(500)): путь к фото готового результата
# - product_ids (JSONB NOT NULL): JSON-массив с ID товаров из каталога
# - sort_order (INT DEFAULT 0): порядок сортировки (не может быть отрицательным)
# - age_group (VARCHAR(50)): возрастная группа (дети, молодежь, взрослые, все)
# - difficulty (VARCHAR(50)): уровень сложности (легкий, средний, сложный)
class IdeaTemplate(models.Model):
    # типы хобби 
    HOBBY_TYPE_CHOICES = [
        ('рисование', 'Рисование'),
        ('шитьё', 'Шитьё'),
        ('вышивание', 'Вышивание'),
        ('вязание', 'Вязание'),
        ('валяние', 'Валяние'),
        ('лепка', 'Лепка'),
        ('скрапбукинг', 'Скрапбукинг'),
        ('бисероплетение', 'Бисероплетение'),
        ('декорирование', 'Декорирование'),
        ('мыловарение', 'Мыловарение'),
        ('свечеварение', 'Свечеварение'),
        ('флористика', 'Флористика'),
        ('эпоксидная смола', 'Эпоксидная смола'),
        ('кулинария', 'Кулинария'),
    ]
    
    # возрастные группы
    AGE_GROUP_CHOICES = [
        ('дети', 'Дети'),
        ('молодежь', 'Молодежь'),
        ('взрослые', 'Взрослые'),
        ('все', 'Все'),
    ]
    
    # уровни сложности
    DIFFICULTY_CHOICES = [
        ('легкий', 'Легкий'),
        ('средний', 'Средний'),
        ('сложный', 'Сложный'),
    ]
    
    hobby_type = models.CharField('Тип хобби', max_length=100, choices=HOBBY_TYPE_CHOICES)  
    title = models.CharField('Название', max_length=255)  
    idea_description = models.TextField('Описание')  
    result_image = models.CharField('Фото результата', max_length=500, blank=True, null=True)  # путь к фото
    product_ids = models.JSONField('ID товаров') 
    sort_order = models.IntegerField('Порядок', default=0, validators=[MinValueValidator(0)])  # порядок сортировки
    age_group = models.CharField('Возрастная группа', max_length=50, choices=AGE_GROUP_CHOICES, blank=True, null=True)  # возрастная группа
    difficulty = models.CharField('Сложность', max_length=50, choices=DIFFICULTY_CHOICES, blank=True, null=True)  # уровень сложности
    
    class Meta:
        db_table = 'idea_templates'  # имя таблицы в БД
        verbose_name = 'Шаблон идеи'
        verbose_name_plural = 'Шаблоны идей'
        ordering = ['sort_order']  # сортировка по порядку
    
    def __str__(self):  # что возвращает при обращении
        return self.title
    
# 13. Блог с новостями, статьями и уроками
# переносятся следующие данные:
# - id (SERIAL PRIMARY KEY): уникальный идентификатор записи, автоматически в Django
# - post_type (VARCHAR(50) NOT NULL): тип публикации (article, news, tutorial)
# - title (VARCHAR(255) NOT NULL): заголовок публикации
# - url_key (VARCHAR(255) NOT NULL UNIQUE): уникальный ключ для понятных ссылок
# - preview_description (TEXT NOT NULL): краткое описание для карточки в списке блога
# - content (TEXT NOT NULL): полный текст статьи/новости/урока
# - featured_image (VARCHAR(500)): путь к главному изображению
# - created_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP): дата создания
# - updated_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP): дата последнего обновления
class BlogPost(models.Model):
    # типы публикаций
    POST_TYPE_CHOICES = [
        ('article', 'Статья'),
        ('news', 'Новость'),
        ('tutorial', 'Урок'),
    ]
    
    post_type = models.CharField('Тип публикации', max_length=50, choices=POST_TYPE_CHOICES)
    title = models.CharField('Заголовок', max_length=255)  
    url_key = models.SlugField('URL-ключ', max_length=255, unique=True)  
    preview_description = models.TextField('Краткое описание') 
    content = models.TextField('Полный текст')  
    featured_image = models.CharField('Главное изображение', max_length=500, blank=True, null=True) 
    created_at = models.DateTimeField('Создано', auto_now_add=True)  
    updated_at = models.DateTimeField('Обновлено', auto_now=True)  
    
    class Meta:
        db_table = 'blog_posts'  # имя таблицы в БД
        verbose_name = 'Запись блога'
        verbose_name_plural = 'Записи блога'
        ordering = ['-created_at']  # сортировка по дате создания (сначала новые)
    
    def __str__(self):  # что возвращает при обращении
        return self.title
    
# 14. Чат ИИ
# переносятся следующие данные:
# - id (SERIAL PRIMARY KEY): уникальный идентификатор сообщения, автоматически в Django
# - user_id (INT NOT NULL REFERENCES users ON DELETE CASCADE): ссылка на пользователя
# - session_id (UUID NOT NULL): уникальный идентификатор сессии (один диалог)
# - hobby_type (VARCHAR(100) NOT NULL): тип хобби, выбранный пользователем
# - age_group (VARCHAR(50) NOT NULL): возрастная группа, выбранная пользователем
# - difficulty (VARCHAR(50) NOT NULL): уровень сложности, выбранный пользователем
# - ai_response (TEXT NOT NULL): ответ ИИ (текст сгенерированной идеи)
# - suggested_products (JSONB): JSON-массив с предложенными товарами
# - was_accepted (BOOLEAN DEFAULT FALSE): добавил ли пользователь товары в корзину
# - was_regenerated (BOOLEAN DEFAULT FALSE): нажал ли кнопку "перегенерировать"
# - created_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP): дата и время создания сообщения

class AiChatMessage(models.Model):
    # типы хобби 
    HOBBY_TYPE_CHOICES = [
        ('рисование', 'Рисование'),
        ('шитьё', 'Шитьё'),
        ('вышивание', 'Вышивание'),
        ('вязание', 'Вязание'),
        ('валяние', 'Валяние'),
        ('лепка', 'Лепка'),
        ('скрапбукинг', 'Скрапбукинг'),
        ('бисероплетение', 'Бисероплетение'),
        ('декорирование', 'Декорирование'),
        ('мыловарение', 'Мыловарение'),
        ('свечеварение', 'Свечеварение'),
        ('флористика', 'Флористика'),
        ('эпоксидная смола', 'Эпоксидная смола'),
        ('кулинария', 'Кулинария'),
    ]
    
    # возрастные группы
    AGE_GROUP_CHOICES = [
        ('дети', 'Дети'),
        ('молодежь', 'Молодежь'),
        ('взрослые', 'Взрослые'),
        ('все', 'Все'),
    ]
    
    # уровни сложности
    DIFFICULTY_CHOICES = [
        ('легкий', 'Легкий'),
        ('средний', 'Средний'),
        ('сложный', 'Сложный'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,  # при удалении пользователя его сообщения удаляются
        related_name='ai_messages',
        verbose_name='Пользователь'
    )
    session_id = models.UUIDField('ID сессии')  
    hobby_type = models.CharField('Тип хобби', max_length=100, choices=HOBBY_TYPE_CHOICES)  
    age_group = models.CharField('Возрастная группа', max_length=50, choices=AGE_GROUP_CHOICES)  
    difficulty = models.CharField('Сложность', max_length=50, choices=DIFFICULTY_CHOICES)  
    ai_response = models.TextField('Ответ ИИ')  
    suggested_products = models.JSONField('Предложенные товары', blank=True, null=True)  
    was_accepted = models.BooleanField('Добавлено в корзину', default=False)  
    was_regenerated = models.BooleanField('Перегенерировано', default=False)  
    created_at = models.DateTimeField('Создано', auto_now_add=True)  
    
    class Meta:
        db_table = 'ai_chat_messages'  # имя таблицы в БД
        verbose_name = 'Сообщение чата с ИИ'
        verbose_name_plural = 'Сообщения чата с ИИ'
        ordering = ['-created_at']  # сортировка по дате (сначала новые)
    
    def __str__(self):  # что возвращает при обращении
        return f"{self.user.username} - {self.hobby_type} ({self.created_at.strftime('%d.%m.%Y %H:%M')})"