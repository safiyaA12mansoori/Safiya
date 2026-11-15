from django.urls import path

from . import views

app_name = "students"

urlpatterns = [
    path("", views.student_list, name="list"),
    path("new/", views.student_create, name="create"),
    path("import/", views.import_students, name="import"),
    path("import/template/", views.import_template, name="import_template"),
    path("<int:pk>/", views.student_detail, name="detail"),
    path("<int:pk>/edit/", views.student_edit, name="edit"),
    path("<int:pk>/active/", views.student_toggle, name="toggle"),
]
