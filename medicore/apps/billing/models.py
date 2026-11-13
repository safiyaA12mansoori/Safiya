from decimal import Decimal

from django.conf import settings
from django.db import models

from apps.appointments.models import Appointment
from apps.clinics.models import Clinic
from apps.patients.models import Patient


class Invoice(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ISSUED = "issued", "Issued"
        PARTIALLY_PAID = "partially_paid", "Partially Paid"
        PAID = "paid", "Paid"
        VOID = "void", "Void"

    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="invoices")
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="invoices")
    appointment = models.ForeignKey(
        Appointment, on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices"
    )
    invoice_number = models.CharField(max_length=40)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    notes = models.TextField(blank=True)
    issued_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("clinic", "invoice_number")

    @property
    def subtotal(self):
        return sum((i.line_total for i in self.items.all()), Decimal("0.00"))

    @property
    def amount_paid(self):
        return sum((p.amount for p in self.payments.all()), Decimal("0.00"))

    @property
    def balance_due(self):
        return self.subtotal - self.amount_paid


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="items")
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    @property
    def line_total(self):
        base = self.quantity * self.unit_price
        return base + (base * self.tax_percent / Decimal("100"))


class Payment(models.Model):
    class Method(models.TextChoices):
        CASH = "cash", "Cash"
        UPI = "upi", "UPI"
        CARD = "card", "Card"
        BANK = "bank", "Bank Transfer"
        OTHER = "other", "Other"

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="payments")
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    method = models.CharField(max_length=20, choices=Method.choices, default=Method.CASH)
    reference = models.CharField(max_length=100, blank=True)
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    paid_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-paid_at"]
