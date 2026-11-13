from rest_framework import serializers

from apps.clinics.models import (
    Clinic,
    ClinicMembership,
    DoctorAvailability,
    DoctorLeave,
    DoctorProfile,
)


class ClinicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Clinic
        fields = "__all__"


class ClinicMembershipSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    clinic_name = serializers.CharField(source="clinic.name", read_only=True)

    class Meta:
        model = ClinicMembership
        fields = [
            "id",
            "user",
            "username",
            "clinic",
            "clinic_name",
            "role",
            "is_primary",
            "is_active",
            "joined_at",
        ]
        read_only_fields = ["joined_at"]


class DoctorProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = DoctorProfile
        fields = [
            "id",
            "user",
            "username",
            "full_name",
            "clinic",
            "specialty",
            "registration_number",
            "consultation_fee",
            "slot_duration_minutes",
            "is_accepting_patients",
            "bio",
        ]

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorAvailability
        fields = "__all__"


class DoctorLeaveSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorLeave
        fields = "__all__"
