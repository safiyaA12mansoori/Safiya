from django.urls import path

from . import views

app_name = "attendance"

urlpatterns = [
    path("", views.mark, name="mark"),
    path("monthly/", views.monthly, name="monthly"),
    path("mine/", views.mine, name="mine"),
]
