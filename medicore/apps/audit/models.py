from django.conf import settings
from django.db import models

from apps.clinics.models import Clinic


class AuditLog(models.Model):
    clinic = models.ForeignKey(
        Clinic, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=64)
    entity = models.CharField(max_length=64, blank=True)
    entity_id = models.CharField(max_length=64, blank=True)
    detail = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    path = models.CharField(max_length=255, blank=True)
    method = models.CharField(max_length=10, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["clinic", "created_at"])]
