from rest_framework import serializers

from apps.emr.models import Encounter, Prescription, PrescriptionItem


class EncounterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Encounter
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class PrescriptionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrescriptionItem
        fields = [
            "id",
            "medicine_name",
            "dosage",
            "frequency",
            "duration_days",
            "quantity",
            "instructions",
            "pharmacy_medicine",
        ]


class PrescriptionSerializer(serializers.ModelSerializer):
    items = PrescriptionItemSerializer(many=True)

    class Meta:
        model = Prescription
        fields = [
            "id",
            "clinic",
            "patient",
            "doctor",
            "encounter",
            "status",
            "notes",
            "items",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]

    def create(self, validated_data):
        items = validated_data.pop("items", [])
        rx = Prescription.objects.create(**validated_data)
        for item in items:
            PrescriptionItem.objects.create(prescription=rx, **item)
        return rx

    def update(self, instance, validated_data):
        items = validated_data.pop("items", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if items is not None:
            instance.items.all().delete()
            for item in items:
                PrescriptionItem.objects.create(prescription=instance, **item)
        return instance
