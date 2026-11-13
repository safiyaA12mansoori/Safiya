from django.urls import path

from . import views

urlpatterns = [
    path('principal/teachers/', views.teacher_list, name='teacher-list'),
    path('principal/teachers/new/', views.teacher_create, name='teacher-create'),
    path('principal/teachers/<int:pk>/', views.teacher_detail, name='teacher-detail'),
    path('principal/teachers/<int:pk>/edit/', views.teacher_edit, name='teacher-edit'),
    path('principal/teachers/<int:pk>/delete/', views.teacher_delete, name='teacher-delete'),
    path(
        'principal/teachers/<int:pk>/reset-password/',
        views.teacher_reset_password,
        name='teacher-reset-password',
    ),
    path('teacher/', views.teacher_dashboard, name='teacher-dashboard'),
    path('teacher/profile/', views.teacher_profile, name='teacher-profile'),
]
