from django.urls import path

from . import views

app_name = "analytics"

urlpatterns = [
    path("", views.overview, name="overview"),
    path("students/<int:pk>/", views.student_detail, name="student"),
]
