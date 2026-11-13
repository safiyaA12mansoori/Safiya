from django.conf import settings
from django.db import models

from apps.clinics.models import Clinic
from apps.patients.models import Patient


class LabTest(models.Model):
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="lab_tests")
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=40, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sample_type = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        unique_together = ("clinic", "name")


class LabOrder(models.Model):
    class Status(models.TextChoices):
        ORDERED = "ordered", "Ordered"
        SAMPLE_COLLECTED = "sample_collected", "Sample Collected"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="lab_orders")
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="lab_orders")
    test = models.ForeignKey(LabTest, on_delete=models.PROTECT, related_name="orders")
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.ORDERED)
    result_text = models.TextField(blank=True)
    ordered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    ordered_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-ordered_at"]
