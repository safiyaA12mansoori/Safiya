from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from apps.clinics.models import Clinic, DoctorProfile
from apps.patients.models import Patient


class Appointment(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        CONFIRMED = "confirmed", "Confirmed"
        CHECKED_IN = "checked_in", "Checked In"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
        NO_SHOW = "no_show", "No Show"
        RESCHEDULED = "rescheduled", "Rescheduled"

    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="appointments")
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="appointments")
    doctor = models.ForeignKey(
        DoctorProfile, on_delete=models.CASCADE, related_name="appointments"
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.SCHEDULED, db_index=True
    )
    reason = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="appointments_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["start_time"]
        indexes = [
            models.Index(fields=["clinic", "start_time"]),
            models.Index(fields=["doctor", "start_time"]),
        ]

    def __str__(self):
        return f"{self.patient} with {self.doctor} @ {self.start_time}"

    def clean(self):
        if self.end_time <= self.start_time:
            raise ValidationError({"end_time": "End time must be after start time."})
        if self.patient_id and self.clinic_id and self.patient.clinic_id != self.clinic_id:
            raise ValidationError("Patient must belong to the same clinic.")
        if self.doctor_id and self.clinic_id and self.doctor.clinic_id != self.clinic_id:
            raise ValidationError("Doctor must belong to the same clinic.")
        # Double-booking prevention for active statuses
        active = [
            self.Status.SCHEDULED,
            self.Status.CONFIRMED,
            self.Status.CHECKED_IN,
            self.Status.IN_PROGRESS,
        ]
        if self.status in active:
            overlap = Appointment.objects.filter(
                doctor_id=self.doctor_id,
                status__in=active,
            ).filter(Q(start_time__lt=self.end_time) & Q(end_time__gt=self.start_time))
            if self.pk:
                overlap = overlap.exclude(pk=self.pk)
            if overlap.exists():
                raise ValidationError(
                    "Doctor already has an overlapping appointment (double-booking prevented)."
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)
