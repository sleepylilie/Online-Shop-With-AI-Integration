import os
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

# Секретный ключ Django, используется для шифрования данных
SECRET_KEY = 'your_secret_key'

# Хосты которым разрешен доступ к сайту
ALLOWED_HOSTS = ['localhost', '127.0.0.1']


# =============
# Установленные приложения
# =============

INSTALLED_APPS = [
    'django.contrib.admin',         # встроенная панель администрирования
    'django.contrib.auth',          # система пользователей и авторизации
    'django.contrib.contenttypes',  # нужно для системы прав
    'django.contrib.sessions',      # управление сессиями
    'django.contrib.messages',      # система уведомлений
    'django.contrib.staticfiles',   # раздача статических файлов
    'rest_framework',               # Django REST Framework, создание API
    'rest_framework_simplejwt',     # авторизация через JWT-токены
    'corsheaders',                  # разрешение запросов с других доменов
    'api',                          # приложение с бизнес-логикой
]


# =============
# Промежуточные обработчики запросов
# =============

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# =============
# База данных PostgreSQL
# =============

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'your_db_name',          # имя базы данных
        'USER': 'your_db_user',          # пользователь PostgreSQL
        'PASSWORD': 'your_password',     # пароль
        'HOST': 'localhost',             # адрес сервера БД
        'PORT': '5433',                  # порт PostgreSQL
    }
}


# =============
# Валидация паролей
# =============

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# =============
# Локализация
# =============

LANGUAGE_CODE = 'ru-ru'
TIME_ZONE     = 'Europe/Moscow'
USE_I18N      = True
USE_TZ        = True


# =============
# Статические файлы и медиа
# =============

# Папка с фронтендом: JS, CSS, HTML, изображения
STATICFILES_DIRS = [os.path.join(BASE_DIR, 'frontend')]
STATIC_URL = '/static/'

# Загружаемые медиафайлы
MEDIA_URL  = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# =============
# Настройки авторизации и доступа к токенам
# =============

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        # Аутентификация через JWT-токен 
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        # По умолчанию доступ открыт, закрытые эндпоинты защищаются отдельно
        'rest_framework.permissions.AllowAny',
    ),
}

# Время действия токенов авторизации
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(minutes=30),  # access-токен 30 минут
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),       # refresh-токен 7 дней
}

# Используется своя модель пользователя вместо стандартной Django
AUTH_USER_MODEL = 'api.User'


# =============
# Ключи доступа к YandexGPT API
# =============

YANDEX_API_KEY   = 'your_yandex_api_key'
YANDEX_FOLDER_ID = 'your_folder_id'
