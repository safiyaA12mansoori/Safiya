from rest_framework import serializers

from apps.pharmacy.models import Medicine, StockMovement


class MedicineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medicine
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class StockMovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockMovement
        fields = "__all__"
        read_only_fields = ["created_at"]
