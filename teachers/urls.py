from django.urls import path

from . import views

app_name = "teachers"

urlpatterns = [
    path("", views.teacher_list, name="list"),
    path("classes/", views.my_classes, name="classes"),
    path("new/", views.teacher_create, name="create"),
    path("<int:pk>/", views.teacher_detail, name="detail"),
    path("<int:pk>/edit/", views.teacher_edit, name="edit"),
    path("<int:pk>/active/", views.teacher_toggle, name="toggle"),
    path("<int:pk>/unassign/<int:load_id>/", views.teacher_unassign, name="unassign"),
]
