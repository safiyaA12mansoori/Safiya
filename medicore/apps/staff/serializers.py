from rest_framework import serializers

from apps.staff.models import StaffProfile


class StaffProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = StaffProfile
        fields = [
            "id",
            "user",
            "username",
            "full_name",
            "clinic",
            "employee_id",
            "department",
            "designation",
            "role",
            "join_date",
            "is_active",
        ]

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username
