from rest_framework import serializers

from apps.patients.models import Patient, PatientDocument, PatientFeedback


class PatientSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Patient
        fields = [
            "id",
            "clinic",
            "user",
            "mrn",
            "first_name",
            "last_name",
            "full_name",
            "date_of_birth",
            "gender",
            "blood_group",
            "phone",
            "alternate_phone",
            "email",
            "aadhaar_last4",
            "address_line1",
            "address_line2",
            "city",
            "state",
            "pincode",
            "emergency_contact_name",
            "emergency_contact_phone",
            "allergies",
            "chronic_conditions",
            "notes",
            "is_active",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at", "mrn"]

    def validate_aadhaar_last4(self, value):
        if value and (len(value) != 4 or not value.isdigit()):
            raise serializers.ValidationError("Provide exactly 4 digits.")
        return value


class PatientDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientDocument
        fields = "__all__"
        read_only_fields = ["uploaded_by", "uploaded_at"]


class PatientFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientFeedback
        fields = "__all__"
        read_only_fields = ["created_at"]

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be 1–5.")
        return value
