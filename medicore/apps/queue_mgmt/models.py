from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.appointments.models import Appointment
from apps.clinics.models import Clinic, DoctorProfile
from apps.patients.models import Patient


class QueueSession(models.Model):
    """Per-doctor daily queue session (can be paused/resumed)."""

    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="queue_sessions")
    doctor = models.ForeignKey(
        DoctorProfile, on_delete=models.CASCADE, related_name="queue_sessions"
    )
    date = models.DateField(default=timezone.localdate)
    is_paused = models.BooleanField(default=False)
    paused_reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("doctor", "date")
        ordering = ["-date"]

    def __str__(self):
        return f"Queue {self.doctor} {self.date}"


class QueueToken(models.Model):
    class Status(models.TextChoices):
        WAITING = "waiting", "Waiting"
        CALLED = "called", "Called"
        SERVING = "serving", "Serving"
        SKIPPED = "skipped", "Skipped"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    session = models.ForeignKey(QueueSession, on_delete=models.CASCADE, related_name="tokens")
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="queue_tokens")
    doctor = models.ForeignKey(
        DoctorProfile, on_delete=models.CASCADE, related_name="queue_tokens"
    )
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="queue_tokens")
    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="queue_tokens",
    )
    token_number = models.PositiveIntegerField()
    display_label = models.CharField(
        max_length=32,
        help_text="TV-safe label e.g. T-12 (no PII).",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.WAITING)
    is_emergency = models.BooleanField(default=False)
    priority = models.IntegerField(default=0, help_text="Higher = sooner; emergency boosts this.")
    called_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tokens_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_emergency", "-priority", "token_number"]
        unique_together = ("session", "token_number")
        indexes = [
            models.Index(fields=["clinic", "doctor", "status"]),
        ]

    def __str__(self):
        return f"{self.display_label} ({self.status})"

    def mark_called(self):
        self.status = self.Status.CALLED
        self.called_at = timezone.now()
        self.save(update_fields=["status", "called_at", "updated_at"])
