# Файл, содержащий логику обработки всех HTTP-запросов к API
#
# Реализованные функции:
# -----------------------
# Авторизация и профиль:
#  1. register               - POST   регистрация нового пользователя
#  2. login_view             - POST   вход, возвращает JWT-токены
#  3. get_me                 - GET    данные текущего пользователя
#  4. update_me              - PATCH  обновление профиля
#  5. upload_avatar          - POST   загрузка аватара
#  6. verify_password        - POST   проверка текущего пароля перед сменой
#  7. change_password        - POST   смена пароля
#  8. delete_account         - DELETE удаление аккаунта
#
# Каталог:
#  9. get_categories         - GET    список категорий
# 10. get_category_detail    - GET    одна категория по url_key
# 11. get_subcategories      - GET    список подкатегорий
# 12. get_subcategory_detail - GET    одна подкатегория по url_key
# 13. get_products           - GET    список товаров
# 14. get_product_detail     - GET    данные одного товара
# 15. get_product_reviews    - GET    одобренные отзывы на товар
#
# Корзина:
# 16. cart                   - GET/POST     список корзины / добавить товар
# 17. cart_item              - PATCH/DELETE обновить количество / удалить позицию
# 18. remove_multiple_from_cart - DELETE    удалить несколько позиций сразу
#
# Заказы:
# 19. place_order            - POST   создать заказ из выбранных позиций корзины
# 20. get_my_orders          - GET    заказы текущего пользователя
#
# Избранное:
# 21. get_favorites          - GET    список избранных товаров
# 22. add_favorite           - POST   добавить товар в избранное
# 23. remove_favorite        - DELETE убрать товар из избранного
#
# Отзывы:
# 24. submit_review          - POST   оставить отзыв на товар
# 25. get_my_reviews         - GET    отзывы текущего пользователя
# 26. get_reviewed_product_ids - GET  ID товаров на которые уже есть отзыв
#
# Уведомления:
# 27. get_notifications      - GET    уведомления пользователя
# 28. mark_notification_read - PATCH  пометить уведомление прочитанным
# 29. delete_notification    - DELETE удалить уведомление
# 30. mark_all_notifications_read - PATCH  отметить все как прочитанные
# 31. delete_read_notifications   - DELETE удалить все прочитанные
#
# Блог:
# 32. get_blog_posts         - GET    список публикаций
# 33. get_blog_post_detail   - GET    одна публикация по url_key
#
# Генератор идей:
# 34. get_idea_templates     - GET    список шаблонов идей
# 35. get_idea_template_detail - GET  один шаблон идеи
# 36. generate_idea          - POST   генерация идеи через ИИ
# 37. get_ai_chat_history    - GET    история генераций пользователя
# 38. clear_ai_chat_history  - DELETE очистить историю генераций
# ====================================

# Импорты Django REST Framework
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken

# Импорты Django
from django.shortcuts import get_object_or_404
from django.contrib.auth import authenticate
from django.db.models import F

# Модели и сериализаторы
from .models import (
    Category, Subcategory, Product, BlogPost, Review,
    User, Cart, Order, OrderItem, Favorite, Notification,
    IdeaTemplate, AiChatMessage,
)
from .serializers import (
    CategorySerializer, SubcategorySerializer,
    ProductPreviewSerializer, ReviewSerializer,
    BlogPostSerializer, BlogPostDetailSerializer,
)


# =====================
# Авторизация
# =====================

@api_view(['POST'])
def register(request):
    # Регистрация нового пользователя
    first_name = request.data.get('first_name', '').strip()
    email = request.data.get('email', '').strip().lower()
    password = request.data.get('password', '')

    # Валидация
    errors = {}
    if not first_name:
        errors['first_name'] = 'Введите имя.'
    if not email:
        errors['email'] = 'Введите email.'
    elif User.objects.filter(email=email).exists():
        errors['email'] = 'Пользователь с таким email уже существует.'
    elif User.objects.filter(username=email).exists():
        errors['email'] = 'Пользователь с таким email уже существует.'
    if len(password) < 6:
        errors['password'] = 'Пароль должен содержать не менее 6 символов.'

    if errors:
        return Response({'errors': errors}, status=400)

    # Попытка создать пользователя
    try:
        user = User.objects.create_user(
            username = email,
            email = email,
            password = password,
            first_name = first_name,
        )
    except Exception:
        return Response({'errors': {'email': 'Пользователь с таким email уже существует.'}}, status=400)

    # Выдаем JWT-токены сразу после регистрации
    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': user.id,
            'first_name': user.first_name,
            'email': user.email,
        }
    }, status=201)


@api_view(['POST'])
def login_view(request):
    # Вход по email и паролю
    email = request.data.get('email', '').strip().lower()
    password = request.data.get('password', '')

    errors = {}
    if not email:
        errors['email'] = 'Введите email.'
    if not password:
        errors['password'] = 'Введите пароль.'

    if errors:
        return Response({'errors': errors}, status=400)

    # Проверка аутентификации по email и паролю
    user = authenticate(request, username=email, password=password)
    if not user:
        return Response({'errors': {'general': 'Неверный email или пароль.'}}, status=401)

    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': user.id,
            'first_name': user.first_name,
            'email': user.email,
        }
    })


# =====================
# Категории
# =====================

@api_view(['GET'])
def get_categories(request):
    categories = Category.objects.filter(is_active=True).order_by('sort_order')
    return Response(CategorySerializer(categories, many=True).data)


@api_view(['GET'])
def get_category_detail(request, url_key):
    category = get_object_or_404(Category, url_key=url_key, is_active=True)
    return Response(CategorySerializer(category).data)


# =====================
# Подкатегории
# =====================

@api_view(['GET'])
def get_subcategories(request):
    qs = Subcategory.objects.filter(is_active=True)
    category_id = request.GET.get('category_id')
    if category_id:
        qs = qs.filter(category_id=category_id)
    return Response(SubcategorySerializer(qs.order_by('sort_order'), many=True).data)


@api_view(['GET'])
def get_subcategory_detail(request, url_key):
    sub = get_object_or_404(Subcategory, url_key=url_key, is_active=True)
    return Response(SubcategorySerializer(sub).data)


# =====================
# Товары
# =====================

@api_view(['GET'])
def get_products(request):
    # Список товаров с фильтрацией и сортировкой
    qs = Product.objects.filter(is_active=True)

    # Фильтр по категории
    category_id = request.GET.get('category_id')
    if category_id:
        qs = qs.filter(subcategory__category_id=category_id)

    # Фильтр по подкатегории
    subcategory_id = request.GET.get('subcategory_id')
    if subcategory_id:
        qs = qs.filter(subcategory_id=subcategory_id)

    # Фильтр по поисковому запросу
    search = request.GET.get('search')
    if search:
        qs = qs.filter(product_name__icontains=search)

    # Фильтр "только со скидкой"
    has_discount = request.GET.get('has_discount')
    if has_discount == 'true':
        qs = qs.filter(old_price__isnull=False).filter(old_price__gt=F('price'))

    # Фильтр по цене
    price_from = request.GET.get('price_from')
    price_to = request.GET.get('price_to')
    if price_from:
        try:
            qs = qs.filter(price__gte=float(price_from))
        except ValueError:
            pass
    if price_to:
        try:
            qs = qs.filter(price__lte=float(price_to))
        except ValueError:
            pass

    # Фильтр "в наличии"
    in_stock = request.GET.get('in_stock')
    if in_stock == 'true':
        qs = qs.filter(stock__gt=0)

    # Фильтр по минимальному рейтингу
    min_rating = request.GET.get('min_rating')
    if min_rating:
        try:
            from django.db.models import Avg as _Avg, Q as _Q
            qs = qs.annotate(
                _avg_rating=_Avg('reviews__rating', filter=_Q(reviews__status='approved'))
            ).filter(_avg_rating__gte=float(min_rating))
        except (ValueError, Exception):
            pass

    sort_map = {
        'price_asc': 'price',
        'price_desc': '-price',
        'rating': '-rating',
        'newest': '-created_at',
    }
    sort = request.GET.get('sort', 'newest')
    qs = qs.order_by(sort_map.get(sort, '-created_at'))

    try:
        limit = int(request.GET.get('limit', 20))
    except ValueError:
        limit = 20

    qs = qs.prefetch_related('images')[:limit]

    return Response(ProductPreviewSerializer(qs, many=True).data)


@api_view(['GET'])
def get_product_detail(request, url_key):
    # Возвращает подробную информаю о товаре: описание, характеристики, отзывы, наличие, путь к товару, фотографии
    product = get_object_or_404(
        Product.objects.prefetch_related('images'),
        url_key=url_key,
        is_active=True
    )

    data = ProductPreviewSerializer(product).data
    data['product_description'] = product.product_description
    data['attributes']  = product.attributes
    data['stock'] = product.stock
    data['reviews_count'] = product.reviews_count

    if product.subcategory:
        data['subcategory'] = {
            'id': product.subcategory.id,
            'name': product.subcategory.subcategory_name,
            'url_key': product.subcategory.url_key,
        }
        if product.subcategory.category:
            data['category'] = {
                'id': product.subcategory.category.id,
                'name': product.subcategory.category.category_name,
                'url_key': product.subcategory.category.url_key,
            }

    data['images'] = [
        {
            'url': img.image_url.url if img.image_url else None,
            'alt': product.product_name,
        }
        for img in product.images.all()
    ]

    return Response(data)


@api_view(['GET'])
def get_product_reviews(request, product_id):
    # Возвращает только одобренные отзывы
    reviews = Review.objects.filter(
        product_id=product_id,
        status='approved'
    ).select_related('user').order_by('-created_at')
    return Response(ReviewSerializer(reviews, many=True).data)


# =====================
# Корзина
# =====================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def cart(request):
    # GET возвращает список позиций корзины с данными товаров
    if request.method == 'GET':
        items = Cart.objects.filter(user=request.user).select_related(
            'product', 'product__subcategory__category'
        ).prefetch_related('product__images')

        result = []
        for item in items:
            product = item.product
            images = product.images.all()
            image_url = None
            if images:
                raw = str(images[0].image_url)
                image_url = raw if raw.startswith('/') or raw.startswith('http') else (images[0].image_url.url if images[0].image_url else None)

            has_discount = (
                product.old_price is not None and
                float(product.old_price) > float(product.price) and
                float(product.old_price) > 0
            )
            result.append({
                'cart_item_id': item.id,
                'product_id': product.id,
                'product_name': product.product_name,
                'url_key': product.url_key,
                'price': str(product.price),
                'old_price': str(product.old_price) if has_discount else None,
                'image_url': image_url,
                'quantity': item.quantity,
                'stock': product.stock,
            })
        return Response(result)

    # POST добавляет товар в корзину или увеличивает количество, если уже есть
    product_id = request.data.get('product_id')
    quantity = int(request.data.get('quantity', 1))
    if not product_id:
        return Response({'error': 'product_id обязателен'}, status=400)
    try:
        product = Product.objects.get(id=product_id, is_active=True)
    except Product.DoesNotExist:
        return Response({'error': 'Товар не найден'}, status=404)

    quantity = max(1, min(999, quantity))
    cart_item, created = Cart.objects.get_or_create(
        user=request.user, product=product, defaults={'quantity': quantity}
    )
    if not created:
        cart_item.quantity = max(1, min(999, cart_item.quantity + quantity))
        cart_item.save()

    return Response({
        'cart_item_id': cart_item.id,
        'quantity': cart_item.quantity,
        'created': created,
    }, status=201 if created else 200)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def cart_item(request, cart_item_id):
    # DELETE удаляет позицию из корзины
    try:
        item = Cart.objects.get(id=cart_item_id, user=request.user)
    except Cart.DoesNotExist:
        return Response({'error': 'Позиция не найдена'}, status=404)

    if request.method == 'DELETE':
        item.delete()
        return Response({'deleted': True})

    # PATCH обновляет количество товара в корзине
    quantity = request.data.get('quantity')
    if quantity is None:
        return Response({'error': 'quantity обязателен'}, status=400)
    quantity = int(quantity)
    if quantity < 1:
        item.delete()
        return Response({'deleted': True})
    item.quantity = min(999, quantity)
    item.save()
    return Response({'cart_item_id': item.id, 'quantity': item.quantity})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_multiple_from_cart(request):
    # Удаляет сразу несколько позиций корзины 
    ids = request.data.get('cart_item_ids', [])
    if not ids:
        return Response({'error': 'cart_item_ids обязателен'}, status=400)

    deleted = Cart.objects.filter(id__in=ids, user=request.user).delete()
    return Response({'deleted_count': deleted[0]})


# =====================
# Заказы
# =====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def place_order(request):
    # Создает заказ
    from datetime import date
    from django.db.models import Max

    data = request.data

    # Получаем позиции корзины
    cart_item_ids = data.get('cart_item_ids', [])
    if not cart_item_ids:
        return Response({'error': 'Выберите товары для оформления заказа.'}, status=400)

    cart_items = Cart.objects.filter(
        id__in=cart_item_ids, user=request.user
    ).select_related('product').prefetch_related('product__images')

    if not cart_items.exists():
        return Response({'error': 'Товары корзины не найдены.'}, status=404)

    # Валидация обязательных полей
    required = ['first_name', 'last_name', 'email', 'phone', 'city', 'street', 'apartment', 'delivery_date', 'delivery_time_slot', 'payment_method']
    errors = {}
    for field in required:
        if not data.get(field, '').strip():
            errors[field] = f'Поле обязательно для заполнения.'
    if errors:
        return Response({'errors': errors}, status=400)

    # Считаем стоимость
    delivery_cost = 100  # фиксированная стоимость доставки для теста
    items_total = sum(float(item.product.price) * item.quantity for item in cart_items)
    total_amount  = items_total + delivery_cost

    # Адрес формируется из всех отдельных полей ввода: город, улица, квартира, подъезд, этаж
    address_parts = [
        f"г. {data['city']}",
        f"ул. {data['street']}",
        f"кв. {data['apartment']}",
    ]
    if data.get('entrance', '').strip():
        address_parts.append(f"подъезд {data['entrance']}")
    if data.get('floor', '').strip():
        address_parts.append(f"этаж {data['floor']}")
    delivery_address = ', '.join(address_parts)

    # Номер заказа
    last = Order.objects.aggregate(Max('id'))['id__max'] or 0
    order_number = str(last + 1).zfill(8)

    # Попытка создать заказ
    try:
        order = Order.objects.create(
            user = request.user,
            order_number = order_number,
            total_amount = total_amount,
            recipient_full_name = f"{data['last_name']} {data['first_name']}", # фамилия и имя объединяются в одно значение
            recipient_email = data['email'],
            recipient_phone = data['phone'],
            delivery_address = delivery_address,
            delivery_date = data['delivery_date'],
            delivery_time_slot = data['delivery_time_slot'],
            payment_method = data['payment_method'],
            customer_comment = data.get('comment', '') or '',
            order_status = 'новый',
            payment_status = 'в процессе',
        )

        # Создаем позиции заказа
        for item in cart_items:
            product = item.product
            images = product.images.all()
            img_url = None
            if images:
                raw = str(images[0].image_url)
                img_url = raw if raw.startswith('/') or raw.startswith('http') else None

            OrderItem.objects.create(
                order = order,
                product = product,
                product_name = product.product_name,
                product_price = product.price,
                quantity = item.quantity,
                product_image = img_url,
            )

        # Уменьшаем остаток на складе для каждого заказанного товара
        for item in cart_items:
            product = item.product
            product.stock = max(0, product.stock - item.quantity)
            product.save(update_fields=['stock'])

        # Удаляем оформленные позиции из корзины
        cart_items.delete()

        return Response({
            'order_number': order.order_number,
            'order_id': order.id,
            'total_amount': str(total_amount),
        }, status=201)

    except Exception as e:
        return Response({'error': f'Ошибка при создании заказа: {str(e)}'}, status=500)


# =====================
# Блог
# =====================

@api_view(['GET'])
def get_blog_posts(request):
    # Список публикаций блога
    qs = BlogPost.objects.all().order_by('-created_at')

    # Фильтр по типу публикации (статья / новость / урок)
    post_type = request.GET.get('type')
    if post_type in ('article', 'news', 'tutorial'):
        qs = qs.filter(post_type=post_type)

    try:
        limit = int(request.GET.get('limit', 10))
    except ValueError:
        limit = 10

    return Response(BlogPostSerializer(qs[:limit], many=True).data)


@api_view(['GET'])
def get_blog_post_detail(request, url_key):
    # Конкретная публикация
    post = get_object_or_404(BlogPost, url_key=url_key)
    return Response(BlogPostDetailSerializer(post).data)


# =====================
# Профиль пользователя
# =====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_me(request):
    # Информация о пользователе
    u = request.user
    avatar = u.avatar or '/media/profile-avatars/avatar-placeholder.png'
    return Response({'id': u.id, 'first_name': u.first_name, 'last_name': u.last_name or '',
                     'email': u.email, 'phone': u.phone or '', 'gender': u.gender or '', 'avatar': avatar})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_me(request):
    # Обновление информации о пользователе
    u = request.user
    data = request.data
    for field in ['first_name', 'last_name', 'phone', 'gender']:
        if field in data:
            setattr(u, field, data[field])
    if 'email' in data:
        new_email = data['email'].strip().lower()
        if new_email != u.email:
            if User.objects.filter(email=new_email).exclude(id=u.id).exists():
                return Response({'errors': {'email': 'Этот email уже используется.'}}, status=400)
            u.email = new_email
            u.username = new_email
    u.save()
    return Response({'success': True})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_avatar(request):
    # Для загрузки аватара
    import os
    from django.core.files.storage import default_storage
    if 'avatar' not in request.FILES:
        return Response({'error': 'Файл не передан.'}, status=400)
    file = request.FILES['avatar']
    if file.size > 4 * 1024 * 1024:
        return Response({'error': 'Файл слишком большой. Максимум 4 МБ.'}, status=400)
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in ['.jpg', '.jpeg', '.png']:
        return Response({'error': 'Допустимые форматы: .jpg, .jpeg, .png'}, status=400)
    filename = f'profile-avatars/user_{request.user.id}{ext}'
    path = default_storage.save(filename, file)
    url = f'/media/{path}'
    request.user.avatar = url
    request.user.save(update_fields=['avatar'])
    return Response({'avatar': url})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_password(request):
    # Проверка пароля перед сменой
    from django.contrib.auth import authenticate
    password = request.data.get('password', '')
    user = authenticate(request, username=request.user.username, password=password)
    if user:
        return Response({'valid': True})
    return Response({'valid': False, 'error': 'Неверный пароль.'}, status=400)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_account(request):
    # Удаление аккаунта пользователя
    user = request.user
    user.delete()
    return Response({'deleted': True})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    # Задание нового пароля
    new_pwd = request.data.get('new_password', '')

    if not new_pwd:
        return Response({'error': 'Введите новый пароль.'}, status=400)
    if len(new_pwd) < 6:
        return Response({'error': 'Пароль должен содержать не менее 6 символов.'}, status=400)

    request.user.set_password(new_pwd)
    request.user.save()
    return Response({'success': True})


# =====================
# Заказы пользователя
# =====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_orders(request):
    # Информация о заказах пользователя
    status_filter = request.GET.get('status', '')
    qs = Order.objects.filter(user=request.user).prefetch_related('items__product__images')
    # Для фильтра незавершенных заказов исключить статус "доставлен" или "отменен"
    if status_filter == 'active':
        qs = qs.exclude(order_status__in=['доставлен', 'отменен'])
    # Для фильтра завершенных заказов оставить
    elif status_filter == 'finished':
        qs = qs.filter(order_status__in=['доставлен', 'отменен'])
    result = []
    for order in qs:
        items = []
        for item in order.items.all():
            imgs = item.product.images.all() if item.product else []
            img_url = item.product_image
            if not img_url and imgs:
                raw = str(imgs[0].image_url)
                img_url = raw if raw.startswith('/') or raw.startswith('http') else None
            items.append({'product_id': item.product_id, 'product_name': item.product_name,
                          'product_price': str(item.product_price), 'quantity': item.quantity, 'image_url': img_url})
        result.append({'id': order.id, 'order_number': order.order_number, 'order_status': order.order_status,
                       'total_amount': str(order.total_amount), 'created_at': order.created_at.isoformat(), 'items': items})
    return Response(result)


# =====================
# Избранное
# =====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_favorites(request):
    # Список избранных товаров пользователя
    favs = Favorite.objects.filter(user=request.user).select_related('product').prefetch_related('product__images')
    result = []
    for fav in favs:
        p = fav.product
        imgs = p.images.all()
        img_url = None
        if imgs:
            raw = str(imgs[0].image_url)
            img_url = raw if raw.startswith('/') or raw.startswith('http') else None
        # Подсчет рейтинга из одобренных отзывов
        from django.db.models import Avg as _Avg
        avg = p.reviews.filter(status='approved').aggregate(_Avg('rating'))['rating__avg']
        real_rating = str(round(avg, 2)) if avg else None
        result.append({'favorite_id': fav.id, 'product_id': p.id, 'product_name': p.product_name,
                       'url_key': p.url_key, 'price': str(p.price),
                       'old_price': str(p.old_price) if p.old_price and float(p.old_price) > float(p.price) else None,
                       'rating': real_rating, 'image_url': img_url})
    return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_favorite(request):
    # Добавить в избранное
    product_id = request.data.get('product_id')
    if not product_id:
        return Response({'error': 'product_id обязателен'}, status=400)
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'Товар не найден'}, status=404)
    fav, created = Favorite.objects.get_or_create(user=request.user, product=product)
    return Response({'favorite_id': fav.id, 'created': created}, status=201 if created else 200)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_favorite(request, product_id):
    # Убрать из избранных
    Favorite.objects.filter(user=request.user, product_id=product_id).delete()
    return Response({'deleted': True})


# =====================
# Отзывы пользователя
# =====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_reviews(request):
    # Все отзывы пользователя
    status_filter = request.GET.get('status', '')
    qs = Review.objects.filter(user=request.user).select_related('product').prefetch_related('product__images')
    # Фильтр по статусу отзыва (одобрен / на модерации / отклонен)
    if status_filter in ('approved', 'moderation', 'rejected'):
        qs = qs.filter(status=status_filter)
    result = []
    for r in qs:
        imgs = r.product.images.all() if r.product else []
        img_url = None
        if imgs:
            raw = str(imgs[0].image_url)
            img_url = raw if raw.startswith('/') or raw.startswith('http') else None
        result.append({'id': r.id, 'product_id': r.product_id, 'product_name': r.product.product_name if r.product else '',
                       'product_url_key': r.product.url_key if r.product else '', 'image_url': img_url,
                       'rating': r.rating, 'comment': r.user_comment or '', 'status': r.status,
                       'created_at': r.created_at.isoformat()})
    return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_review(request):
    # Отправка отзыва
    product_id = request.data.get('product_id')
    rating = request.data.get('rating')
    comment = request.data.get('comment', '').strip()
    if not product_id or not rating:
        return Response({'error': 'product_id и rating обязательны.'}, status=400)
    rating = int(rating)
    if not (1 <= rating <= 5):
        return Response({'error': 'Рейтинг от 1 до 5.'}, status=400)
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'Товар не найден.'}, status=404)
    review, created = Review.objects.update_or_create(
        user=request.user, product=product,
        defaults={'rating': rating, 'user_comment': comment[:2000] if comment else None, 'status': 'moderation'})
    from django.db.models import Avg
    from decimal import Decimal
    approved_reviews = Review.objects.filter(product=product, status='approved')
    avg = approved_reviews.aggregate(Avg('rating'))['rating__avg']
    product.rating = round(Decimal(str(avg)), 2) if avg else Decimal('0')
    product.reviews_count = approved_reviews.count()
    product.save(update_fields=['rating', 'reviews_count'])
    return Response({'review_id': review.id, 'created': created}, status=201 if created else 200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_reviewed_product_ids(request):
    # Список товаров, на которые пользователь уже оставил отзыв
    ids = list(
        Review.objects.filter(user=request.user)
        .values_list('product_id', flat=True)
    )
    return Response({'reviewed_product_ids': ids})


# =====================
# Уведомления
# =====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    # Уведомления пользователя
    n_type = request.GET.get('type', '')
    qs = Notification.objects.filter(user=request.user)
    # Фильтры уведомлений (статус заказа / напоминания/ системные / рекламные)
    type_map = {'orders': 'order_status', 'reminders': 'reminder', 'system': 'system', 'marketing': 'promo'}
    if n_type in type_map:
        qs = qs.filter(notification_type=type_map[n_type])
    return Response([{'id': n.id, 'type': n.notification_type, 'title': n.title, 'message': n.notification_message,
                      'is_read': n.is_read, 'link': n.link or '', 'created_at': n.created_at.isoformat()} for n in qs])


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    # Обновить статус прочитанности
    Notification.objects.filter(id=notification_id, user=request.user).update(is_read=True)
    return Response({'success': True})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_notification(request, notification_id):
    # Удалить уведомление
    Notification.objects.filter(id=notification_id, user=request.user).delete()
    return Response({'deleted': True})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    # Пометить все уведомления прочитанными
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'success': True})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_read_notifications(request):
    # Удалить все прочитанные уведомления
    Notification.objects.filter(user=request.user, is_read=True).delete()
    return Response({'deleted': True})


# =====================
# Генератор идей
# =====================

@api_view(['GET'])
def get_idea_templates(request):
    # Возвращает шаблоны идей
    qs = IdeaTemplate.objects.all()

    # Фильтры (тип хобби / возрастная категория / сложность)
    hobby_type = request.GET.get('hobby_type')
    age_group = request.GET.get('age_group')
    difficulty = request.GET.get('difficulty')

    if hobby_type:
        qs = qs.filter(hobby_type__iexact=hobby_type)
    if age_group:
        qs = qs.filter(age_group__iexact=age_group)
    if difficulty:
        qs = qs.filter(difficulty__iexact=difficulty)

    try:
        limit = int(request.GET.get('limit', 12))
    except ValueError:
        limit = 12

    result = []
    for t in qs[:limit]:
        img = t.result_image or None
        if img and img.startswith('/media/media/'):
            img = img.replace('/media/media/', '/media/', 1)
        result.append({
            'id': t.id,
            'title': t.title,
            'hobby_type': t.hobby_type,
            'age_group': t.age_group  or '',
            'difficulty': t.difficulty or '',
            'description': t.idea_description[:200] + ('...' if len(t.idea_description) > 200 else ''),
            'result_image': img,
            'product_ids': t.product_ids or [],
        })
    return Response(result)


@api_view(['GET'])
def get_idea_template_detail(request, pk):
    # Детальная информация по шаблону идеи
    try:
        t = IdeaTemplate.objects.get(pk=pk)
    except IdeaTemplate.DoesNotExist:
        return Response({'error': 'Шаблон не найден.'}, status=404)

    img = t.result_image or None
    if img and img.startswith('/media/media/'):
        img = img.replace('/media/media/', '/media/', 1)

    # Также загружает связанные товары для идеи
    products = []
    if t.product_ids:
        product_qs = Product.objects.filter(id__in=t.product_ids, is_active=True).prefetch_related('images')
        products = list(ProductPreviewSerializer(product_qs, many=True).data)

    return Response({
        'id': t.id,
        'title': t.title,
        'hobby_type': t.hobby_type,
        'age_group': t.age_group  or '',
        'difficulty': t.difficulty or '',
        'description': t.idea_description,
        'result_image': img,
        'product_ids': t.product_ids or [],
        'products': products,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def generate_idea(request):
    # Генерация идеи с помощью внешнего запроса API
    from django.conf import settings

    # Параметры генерации
    hobby = request.data.get('hobby', '')
    age_group = request.data.get('age_group', 'все возрасты')
    difficulty = request.data.get('difficulty', 'средний')
    history = request.data.get('history', [])

    if not hobby:
        return Response({'error': 'Выберите хобби.'}, status=400)
    
    # Промпт от пользователя
    user_message = (
        f'Придумай один конкретный творческий проект для хобби "{hobby}". '
        f'Параметры: возрастная категория — {age_group}, уровень сложности — {difficulty}. '
        f'Ответ строго в формате чистого HTML без markdown и без ```html```. '
        f'Обязательная структура: '
        f'1) <p><strong>🎨 Хобби:</strong> {hobby} &nbsp;|&nbsp; '
        f'<strong>👤 Возраст:</strong> {age_group} &nbsp;|&nbsp; '
        f'<strong>⭐ Сложность:</strong> {difficulty}</p> '
        f'2) <h4>Название идеи</h4> '
        f'3) <p>Краткое описание что это и зачем (1-2 предложения)</p> '
        f'4) <p><strong>Шаги выполнения:</strong></p>'
        f'<ol><li>подробный шаг 1</li><li>подробный шаг 2</li>...</ol> — каждый шаг в отдельном li '
        f'5) <p><strong>Для этого вам понадобятся:</strong></p>'
        f'<ul><li>материал — количество или объем (например: шерсть — 100 г, нитки — 2 мотка)</li></ul> '
        f'6) <p><strong>⏱ Время выполнения:</strong> X–Y часов</p> '
        f'Будь конкретным: указывай точное количество материалов. Не используй markdown, только HTML.'
    )

    import requests as _requests

    # Параметры для настройки внешнего API (settings.py)
    api_key = getattr(settings, 'YANDEX_API_KEY', '').strip()
    folder_id = getattr(settings, 'YANDEX_FOLDER_ID', '').strip()
    # Сообщение для консоли сервера 
    print(f'[YandexGPT] key={api_key[:8]}... folder={folder_id[:8]}...')

    # Сообщение если не указаны нужные токены
    if not api_key or not folder_id:
        return Response({
            'html': (
                f'<h4>Идея для хобби "{hobby}"</h4>'
                f'<p>Уровень "{difficulty}", категория "{age_group}".</p>'
                f'<p><em>Для получения реальных идей добавьте '
                f'YANDEX_API_KEY и YANDEX_FOLDER_ID в settings.py.</em></p>'
            ),
            'user_message': user_message,
        })

    # Системная настройка
    messages = [
        {
            'role': 'system',
            'text': (
                'Ты - творческий помощник для хобби-магазина. '
                'Предлагаешь конкретные проекты для рукоделия. '
                'Отвечаешь ТОЛЬКО на русском языке. '
                'Формат - чистый HTML, без markdown, без ```html```.'
            ),
        }
    ]

    # Добавляем историю разговора для контекста (последние 6 генераций)
    for msg in history[-6:]:
        role = msg.get('role', '')
        text = msg.get('content', '')
        if role == 'user':
            messages.append({'role': 'user', 'text': text})
        elif role == 'assistant':
            messages.append({'role': 'assistant', 'text': text})

    messages.append({'role': 'user', 'text': user_message})

    # Отправка запроса ИИ
    try:
        response = _requests.post(
            'https://llm.api.cloud.yandex.net/foundationModels/v1/completion',
            headers={
                'Authorization': f'Api-Key {api_key}',
                'Content-Type':  'application/json',
                'x-folder-id':   folder_id,
            },
            json={
                'modelUri':          f'gpt://{folder_id}/yandexgpt-lite',
                'completionOptions': {
                    'stream':      False,
                    'temperature': 0.7,
                    'maxTokens':   '800',
                },
                'messages': messages,
            },
            timeout=60,
        )

        print(f'[YandexGPT] status={response.status_code}')

        if response.status_code != 200:
            try:
                err_body = response.json()
                err = err_body.get('message', str(err_body))
            except Exception:
                err = response.text[:500]
            print(f'[YandexGPT] ERROR: {err}')
            return Response({'error': f'Ошибка YandexGPT {response.status_code}: {err}'}, status=502)

        # Результат от ИИ
        data = response.json()
        ai_text = data['result']['alternatives'][0]['message']['text']

        # Если добавилась html-разметка, убираем
        import re as _re
        ai_text = _re.sub(r'^```(?:html)?\s*', '', ai_text.strip())
        ai_text = _re.sub(r'\s*```$', '', ai_text.strip())

        # Сохраняем ответ в БД если пользователь авторизован
        if request.user.is_authenticated:
            import uuid as _uuid

            session_id = request.data.get('session_id', str(_uuid.uuid4()))

            AiChatMessage.objects.create(
                user = request.user,
                session_id = session_id,
                hobby_type = hobby.lower()[:100],
                age_group = age_group.lower()[:50],
                difficulty = difficulty.lower()[:50],
                ai_response = ai_text,
                was_regenerated = bool(history),
            )

            # Остаются только 5 последних генераций пользователя
            all_msgs = AiChatMessage.objects.filter(
                user=request.user
            ).order_by('-created_at').values_list('id', flat=True)

            if all_msgs.count() > 5:
                ids_to_delete = list(all_msgs)[5:]
                AiChatMessage.objects.filter(id__in=ids_to_delete).delete()

        return Response({
            'html': ai_text,
            'user_message': user_message,
        })

    except _requests.Timeout:
        return Response({'error': 'Время ожидания истекло. Попробуйте еще раз.'}, status=504)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_ai_chat_history(request):
    # Возвращает историю генераций
    messages = AiChatMessage.objects.filter(user=request.user)[:20]
    result = [{
        'id': m.id,
        'session_id': str(m.session_id),
        'hobby_type': m.hobby_type,
        'age_group': m.age_group,
        'difficulty': m.difficulty,
        'ai_response': m.ai_response,
        'created_at': m.created_at.isoformat(),
    } for m in messages]
    return Response(result)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def clear_ai_chat_history(request):
    # Очистка истории генераций
    AiChatMessage.objects.filter(user=request.user).delete()
    return Response({'deleted': True})