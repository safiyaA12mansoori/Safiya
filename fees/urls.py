from django.urls import path

from . import views

app_name = "fees"

urlpatterns = [
    path("", views.overview, name="overview"),
    path("structures/new/", views.structure_create, name="structure_create"),
    path("structures/<int:pk>/generate/", views.generate, name="generate"),
    path("pay/", views.pay, name="pay"),
    path("receipts/<int:pk>/", views.receipt, name="receipt"),
]
