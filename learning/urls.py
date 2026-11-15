from django.urls import path

from . import views

app_name = "learning"

urlpatterns = [
    path("", views.material_list, name="list"),
    path("new/", views.material_create, name="create"),
    path("<int:pk>/", views.material_detail, name="detail"),
    path("<int:pk>/edit/", views.material_edit, name="edit"),
    path("<int:pk>/download/", views.material_download, name="download"),
]
