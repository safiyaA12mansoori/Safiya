from django.conf import settings
from django.db import models

from apps.appointments.models import Appointment
from apps.clinics.models import Clinic, DoctorProfile
from apps.patients.models import Patient


class Encounter(models.Model):
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="encounters")
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="encounters")
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name="encounters")
    appointment = models.ForeignKey(
        Appointment, on_delete=models.SET_NULL, null=True, blank=True, related_name="encounters"
    )
    chief_complaint = models.TextField(blank=True)
    history = models.TextField(blank=True)
    examination = models.TextField(blank=True)
    diagnosis = models.TextField(blank=True)
    plan = models.TextField(blank=True)
    vitals_json = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]


class Prescription(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        FULFILLED = "fulfilled", "Fulfilled"
        CANCELLED = "cancelled", "Cancelled"

    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="prescriptions")
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="prescriptions")
    doctor = models.ForeignKey(
        DoctorProfile, on_delete=models.CASCADE, related_name="prescriptions"
    )
    encounter = models.ForeignKey(
        Encounter, on_delete=models.SET_NULL, null=True, blank=True, related_name="prescriptions"
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]


class PrescriptionItem(models.Model):
    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name="items")
    medicine_name = models.CharField(max_length=200)
    dosage = models.CharField(max_length=100)
    frequency = models.CharField(max_length=100)
    duration_days = models.PositiveIntegerField(default=1)
    quantity = models.PositiveIntegerField(default=1)
    instructions = models.CharField(max_length=255, blank=True)
    pharmacy_medicine = models.ForeignKey(
        "pharmacy.Medicine",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prescription_items",
    )
