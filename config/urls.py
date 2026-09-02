import os
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.static import serve
from django.conf import settings
from django.http import HttpRequest, HttpResponse, Http404


# Абсолютный путь к папке с фронтендом
FRONTEND_DIR = os.path.join(settings.BASE_DIR, 'frontend')

# Путь к HTML-страницам из папки frontend/
def serve_frontend(request: HttpRequest, path: str = '') -> HttpResponse:
    # Корневой маршрут — главная страница
    if path == '' or path == '/':
        path = 'index.html'

    # Добавляем .html, если расширение не указано
    if not path.endswith('.html'):
        path = path + '.html'

    full_path = os.path.join(FRONTEND_DIR, path)

    # Защита от попытки выйти за пределы папки
    if not os.path.abspath(full_path).startswith(os.path.abspath(FRONTEND_DIR)):
        raise Http404('Недопустимый путь')

    # Если файл не найден, возвращается ошибка 404
    if not os.path.isfile(full_path):
        raise Http404(f'Страница не найдена: {path}')

    return serve(request, path, document_root=FRONTEND_DIR)


urlpatterns = [
    # Административная панель Django /admin/
    path('admin/', admin.site.urls),

    # API, все запросы api передаются в api/urls.py
    path('api/', include('api.urls')),

    # Статические файлы фронтенда (CSS, JS, изображения, шрифты)
    re_path(r'^static/(?P<path>.*)$', serve, {'document_root': FRONTEND_DIR}),

    # Медиафайлы
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),

    # HTML-страницы фронтенда
    re_path(r'^(?P<path>.*)$', serve_frontend),
]
