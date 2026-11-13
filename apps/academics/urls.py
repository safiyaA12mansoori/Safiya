from django.urls import path

from . import views

urlpatterns = [
    path('principal/academic-years/', views.year_list, name='year-list'),
    path('principal/academic-years/new/', views.year_create, name='year-create'),
    path('principal/academic-years/<int:pk>/edit/', views.year_edit, name='year-edit'),
    path('principal/academic-years/<int:pk>/delete/', views.year_delete, name='year-delete'),
    path('principal/academic-years/<int:pk>/set-current/', views.year_set_current, name='year-set-current'),
    path('principal/classes/', views.class_list, name='class-list'),
    path('principal/classes/new/', views.class_create, name='class-create'),
    path('principal/classes/<int:pk>/', views.class_detail, name='class-detail'),
    path('principal/classes/<int:pk>/edit/', views.class_edit, name='class-edit'),
    path('principal/classes/<int:pk>/delete/', views.class_delete, name='class-delete'),
    path('principal/classes/<int:pk>/subjects/add/', views.class_add_subject, name='class-add-subject'),
    path(
        'principal/classes/<int:pk>/subjects/<int:subject_pk>/remove/',
        views.class_remove_subject,
        name='class-remove-subject',
    ),
    path('principal/subjects/', views.subject_list, name='subject-list'),
    path('principal/subjects/new/', views.subject_create, name='subject-create'),
    path('principal/subjects/<int:pk>/', views.subject_detail, name='subject-detail'),
    path('principal/subjects/<int:pk>/edit/', views.subject_edit, name='subject-edit'),
    path('principal/subjects/<int:pk>/delete/', views.subject_delete, name='subject-delete'),
    path('principal/allocations/', views.allocation_list, name='allocation-list'),
    path('principal/allocations/new/', views.allocation_create, name='allocation-create'),
    path('principal/allocations/<int:pk>/edit/', views.allocation_edit, name='allocation-edit'),
    path('principal/allocations/<int:pk>/delete/', views.allocation_delete, name='allocation-delete'),
]
