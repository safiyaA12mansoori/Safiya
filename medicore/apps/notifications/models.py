from django.conf import settings
from django.db import models

from apps.clinics.models import Clinic


class Notification(models.Model):
    class Level(models.TextChoices):
        INFO = "info", "Info"
        SUCCESS = "success", "Success"
        WARNING = "warning", "Warning"
        ERROR = "error", "Error"

    clinic = models.ForeignKey(
        Clinic, on_delete=models.CASCADE, null=True, blank=True, related_name="notifications"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    level = models.CharField(max_length=20, choices=Level.choices, default=Level.INFO)
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
