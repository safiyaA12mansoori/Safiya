from django.urls import path

from . import views

urlpatterns = [
    path('', views.dashboard_redirect, name='home'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('dashboard/', views.dashboard_redirect, name='dashboard'),
    path('account/', views.account_view, name='account'),
    path('principal/', views.principal_dashboard, name='principal-dashboard'),
]
