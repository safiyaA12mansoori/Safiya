from rest_framework import serializers

from apps.queue_mgmt.models import QueueSession, QueueToken


class QueueSessionSerializer(serializers.ModelSerializer):
    doctor_name = serializers.SerializerMethodField()

    class Meta:
        model = QueueSession
        fields = [
            "id",
            "clinic",
            "doctor",
            "doctor_name",
            "date",
            "is_paused",
            "paused_reason",
            "created_at",
        ]
        read_only_fields = ["created_at"]

    def get_doctor_name(self, obj):
        return str(obj.doctor)


class QueueTokenSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)

    class Meta:
        model = QueueToken
        fields = [
            "id",
            "session",
            "clinic",
            "doctor",
            "patient",
            "patient_name",
            "appointment",
            "token_number",
            "display_label",
            "status",
            "is_emergency",
            "priority",
            "called_at",
            "completed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "token_number",
            "display_label",
            "called_at",
            "completed_at",
            "created_at",
            "updated_at",
        ]


class TVTokenSerializer(serializers.ModelSerializer):
    """No PII — safe for waiting-room displays."""

    doctor_label = serializers.SerializerMethodField()

    class Meta:
        model = QueueToken
        fields = [
            "display_label",
            "token_number",
            "status",
            "is_emergency",
            "doctor_label",
            "called_at",
        ]

    def get_doctor_label(self, obj):
        # Specialty / short code only — avoid full patient or staff personal details on TV
        name = obj.doctor.user.get_full_name() or obj.doctor.user.username
        # Mask surname for privacy on public TV
        parts = name.split()
        if len(parts) > 1:
            return f"Dr. {parts[0]} {parts[-1][:1]}."
        return f"Dr. {name[:1]}***"
