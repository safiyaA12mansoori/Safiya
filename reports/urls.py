from django.urls import path

from . import views

app_name = "reports"

urlpatterns = [
    path("", views.hub, name="hub"),
    path("<slug:kind>/", views.report, name="report"),
]
