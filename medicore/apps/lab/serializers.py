from rest_framework import serializers

from apps.lab.models import LabOrder, LabTest


class LabTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTest
        fields = "__all__"


class LabOrderSerializer(serializers.ModelSerializer):
    test_name = serializers.CharField(source="test.name", read_only=True)
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)

    class Meta:
        model = LabOrder
        fields = [
            "id",
            "clinic",
            "patient",
            "patient_name",
            "test",
            "test_name",
            "status",
            "result_text",
            "ordered_by",
            "ordered_at",
            "completed_at",
        ]
        read_only_fields = ["ordered_by", "ordered_at", "completed_at"]
