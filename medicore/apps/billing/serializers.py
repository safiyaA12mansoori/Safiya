from rest_framework import serializers

from apps.billing.models import Invoice, InvoiceItem, Payment


class InvoiceItemSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = InvoiceItem
        fields = ["id", "description", "quantity", "unit_price", "tax_percent", "line_total"]


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id",
            "invoice",
            "clinic",
            "amount",
            "method",
            "reference",
            "received_by",
            "paid_at",
        ]
        read_only_fields = ["received_by", "paid_at"]


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True)
    payments = PaymentSerializer(many=True, read_only=True)
    subtotal = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    amount_paid = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    balance_due = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id",
            "clinic",
            "patient",
            "patient_name",
            "appointment",
            "invoice_number",
            "status",
            "notes",
            "issued_at",
            "items",
            "payments",
            "subtotal",
            "amount_paid",
            "balance_due",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["invoice_number", "created_by", "created_at", "updated_at", "issued_at"]

    def create(self, validated_data):
        items = validated_data.pop("items", [])
        clinic = validated_data["clinic"]
        count = Invoice.objects.filter(clinic=clinic).count() + 1
        validated_data["invoice_number"] = f"INV-{clinic.code.upper()}-{count:05d}"
        invoice = Invoice.objects.create(**validated_data)
        for item in items:
            InvoiceItem.objects.create(invoice=invoice, **item)
        return invoice

    def update(self, instance, validated_data):
        items = validated_data.pop("items", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if items is not None:
            instance.items.all().delete()
            for item in items:
                InvoiceItem.objects.create(invoice=instance, **item)
        return instance
