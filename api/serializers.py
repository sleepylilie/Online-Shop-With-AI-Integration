from rest_framework import serializers
from .models import Category, Subcategory, Product, BlogPost, Review


# Сериализатор категории 
class CategorySerializer(serializers.ModelSerializer):
    icon_url = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'category_name', 'url_key', 'icon_url', 'sort_order']

    def get_icon_url(self, obj):
        if obj.icon:
            return obj.icon
        return None


# Сериализатор подкатегории
class SubcategorySerializer(serializers.ModelSerializer):
    icon_url = serializers.SerializerMethodField()

    class Meta:
        model = Subcategory
        fields = ['id', 'subcategory_name', 'url_key', 'category_id', 'icon_url', 'sort_order']

    def get_icon_url(self, obj):
        if obj.icon:
            return obj.icon
        return None


# Сериализатор для карточки товара в каталоге
class ProductPreviewSerializer(serializers.ModelSerializer):
    main_image_url  = serializers.SerializerMethodField()
    rating          = serializers.SerializerMethodField()
    reviews_count   = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id',
            'product_name',
            'url_key',
            'price',
            'old_price',
            'rating',
            'reviews_count',
            'main_image_url',
        ]

    def get_rating(self, obj):
        # Подсчет среднего рейтинга из одобренных отзывов
        from django.db.models import Avg
        avg = obj.reviews.filter(status='approved').aggregate(Avg('rating'))['rating__avg']
        if avg is None:
            return None
        return str(round(avg, 2))

    def get_reviews_count(self, obj):
        # Модерируемые и отклоненные отзывы не учитываются
        return obj.reviews.filter(status='approved').count()

    def get_main_image_url(self, obj):
        # Возвращает картинки товара
        images = obj.images.all()
        if not images:
            return None

        first = images[0] # главное изображение
        if not first.image_url:
            return None

        try:
            raw = str(first.image_url)  
            # Если в пути к изображению уже указан /media/, то остается тот же, иначе Django добавляет /media/ в начале
            if raw.startswith('/') or raw.startswith('http'):
                return raw
            return first.image_url.url

        except Exception:
            return None


# Краткий сериализатор публикации для карточки
class BlogPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogPost
        fields = [
            'id',
            'post_type',
            'title',
            'url_key',
            'preview_description',
            'featured_image',
            'created_at',
        ]


# Полный сериализатор публикации для страницы публикации
class BlogPostDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogPost
        fields = [
            'id',
            'post_type',
            'title',
            'url_key',
            'preview_description',
            'content',
            'featured_image',
            'created_at',
            'updated_at',
        ]


# Сериализатор отзыва 
class ReviewSerializer(serializers.ModelSerializer):
    user_name   = serializers.SerializerMethodField()
    user_avatar = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ['id', 'user_name', 'user_avatar', 'rating', 'user_comment', 'created_at']

    def get_user_name(self, obj):
        return obj.user.first_name or obj.user.username

    def get_user_avatar(self, obj):
        avatar = getattr(obj.user, 'avatar', None)
        if not avatar:
            return '/media/profile-avatars/avatar-placeholder.png'
        raw = str(avatar)
        # Исправляет двойной пути /media/
        if raw.startswith('/media/media/'):
            return raw.replace('/media/media/', '/media/', 1)
        return raw
