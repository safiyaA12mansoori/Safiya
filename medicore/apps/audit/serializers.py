from rest_framework import serializers

from apps.audit.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "clinic",
            "user",
            "username",
            "action",
            "entity",
            "entity_id",
            "detail",
            "ip_address",
            "path",
            "method",
            "created_at",
        ]
