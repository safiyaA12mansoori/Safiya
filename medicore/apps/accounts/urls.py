from django.urls import path

from apps.accounts.views import ChangePasswordView, CsrfView, LoginView, MeView

urlpatterns = [
    path("login/", LoginView.as_view(), name="auth-login"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("change-password/", ChangePasswordView.as_view(), name="auth-change-password"),
    path("csrf/", CsrfView.as_view(), name="auth-csrf"),
]
