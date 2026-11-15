from django.urls import path

from . import views

app_name = "timetable"

urlpatterns = [
    path("", views.grid, name="grid"),
    path("new/", views.create, name="create"),
    path("<int:pk>/delete/", views.delete, name="delete"),
]
