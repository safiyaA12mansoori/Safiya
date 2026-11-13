from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE = 'create', 'Create'
        UPDATE = 'update', 'Update'
        DELETE = 'delete', 'Delete'

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='audit_logs',
    )
    action = models.CharField(max_length=10, choices=Action.choices)
    app_label = models.CharField(max_length=50)
    model_name = models.CharField(max_length=50)
    object_id = models.CharField(max_length=64)
    object_repr = models.CharField(max_length=255)
    changes = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['model_name', 'object_id']),
        ]

    def __str__(self):
        return f'{self.action} {self.model_name} {self.object_repr}'
