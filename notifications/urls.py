from django.urls import path

from . import views

app_name = "notifications"

urlpatterns = [
    path("", views.inbox, name="list"),
    path("read/", views.mark_read, name="read_all"),
    path("<int:pk>/read/", views.mark_read, name="read"),
    path("announcements/", views.announcements, name="announcements"),
    path("announcements/new/", views.announcement_create, name="announcement_create"),
    path("announcements/<int:pk>/toggle/", views.announcement_toggle, name="announcement_toggle"),
]
