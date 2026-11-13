from rest_framework import serializers

from apps.appointments.models import Appointment
from apps.clinics.models import DoctorLeave


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    doctor_name = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            "id",
            "clinic",
            "patient",
            "patient_name",
            "doctor",
            "doctor_name",
            "start_time",
            "end_time",
            "status",
            "reason",
            "notes",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]

    def get_doctor_name(self, obj):
        return str(obj.doctor)

    def validate(self, attrs):
        doctor = attrs.get("doctor") or getattr(self.instance, "doctor", None)
        start = attrs.get("start_time") or getattr(self.instance, "start_time", None)
        end = attrs.get("end_time") or getattr(self.instance, "end_time", None)
        if doctor and start and end:
            if DoctorLeave.objects.filter(
                doctor=doctor, start_date__lte=start.date(), end_date__gte=start.date()
            ).exists():
                raise serializers.ValidationError("Doctor is on leave for this date.")
            avails = list(doctor.availabilities.filter(weekday=start.weekday(), is_active=True))
            if avails:
                start_t = start.time()
                end_t = end.time()
                if not any(a.start_time <= start_t and a.end_time >= end_t for a in avails):
                    raise serializers.ValidationError(
                        "Selected time is outside doctor availability."
                    )
        return attrs
