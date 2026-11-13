from django.urls import path

from . import views

urlpatterns = [
    path('principal/students/', views.student_list, name='student-list'),
    path('principal/students/new/', views.student_create, name='student-create'),
    path('principal/students/<int:pk>/', views.student_detail, name='student-detail'),
    path('principal/students/<int:pk>/edit/', views.student_edit, name='student-edit'),
    path('principal/students/<int:pk>/delete/', views.student_delete, name='student-delete'),
    path(
        'principal/students/<int:pk>/reset-password/',
        views.student_reset_password,
        name='student-reset-password',
    ),
    path('student/', views.student_dashboard, name='student-dashboard'),
    path('student/profile/', views.student_profile, name='student-profile'),
]
