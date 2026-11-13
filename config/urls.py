from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path

urlpatterns = [
    path('', include('apps.accounts.urls')),
    path('', include('apps.students.urls')),
    path('', include('apps.teachers.urls')),
    path('', include('apps.academics.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
