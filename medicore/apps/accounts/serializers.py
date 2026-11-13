from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.accounts.models import User
from apps.clinics.models import ClinicMembership


class UserSerializer(serializers.ModelSerializer):
    clinics = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "phone",
            "is_active",
            "clinics",
        ]
        read_only_fields = fields

    def get_clinics(self, obj):
        qs = ClinicMembership.objects.filter(user=obj, is_active=True).select_related("clinic")
        return [
            {
                "id": m.clinic_id,
                "name": m.clinic.name,
                "code": m.clinic.code,
                "role": m.role,
                "is_primary": m.is_primary,
            }
            for m in qs
        ]


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(
            username=attrs["username"],
            password=attrs["password"],
        )
        if not user:
            raise serializers.ValidationError("Invalid credentials.")
        if not user.is_active:
            raise serializers.ValidationError("Account is disabled.")
        attrs["user"] = user
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        validate_password(value)
        return value
