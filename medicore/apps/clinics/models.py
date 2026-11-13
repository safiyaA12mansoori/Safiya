from django.conf import settings
from django.db import models

from apps.accounts.models import Role


class Clinic(models.Model):
    name = models.CharField(max_length=200)
    code = models.SlugField(max_length=32, unique=True)
    address_line1 = models.CharField(max_length=255, blank=True)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=12, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    gstin = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class ClinicMembership(models.Model):
    """Links a user to a clinic with a role (clinic-wise isolation + RBAC)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="memberships")
    role = models.CharField(max_length=32, choices=Role.choices)
    is_primary = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "clinic", "role")
        ordering = ["clinic__name", "user__username"]

    def __str__(self):
        return f"{self.user.username} @ {self.clinic.code} ({self.role})"


class DoctorProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="doctor_profile",
    )
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="doctors")
    specialty = models.CharField(max_length=120, blank=True)
    registration_number = models.CharField(max_length=64, blank=True)
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    slot_duration_minutes = models.PositiveIntegerField(default=15)
    is_accepting_patients = models.BooleanField(default=True)
    bio = models.TextField(blank=True)

    class Meta:
        ordering = ["user__last_name", "user__first_name"]

    def __str__(self):
        return f"Dr. {self.user.get_full_name() or self.user.username}"


class DoctorAvailability(models.Model):
    class Weekday(models.IntegerChoices):
        MON = 0, "Monday"
        TUE = 1, "Tuesday"
        WED = 2, "Wednesday"
        THU = 3, "Thursday"
        FRI = 4, "Friday"
        SAT = 5, "Saturday"
        SUN = 6, "Sunday"

    doctor = models.ForeignKey(
        DoctorProfile, on_delete=models.CASCADE, related_name="availabilities"
    )
    weekday = models.IntegerField(choices=Weekday.choices)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["weekday", "start_time"]
        verbose_name_plural = "doctor availabilities"

    def __str__(self):
        return f"{self.doctor} {self.get_weekday_display()} {self.start_time}-{self.end_time}"


class DoctorLeave(models.Model):
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name="leaves")
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.doctor} leave {self.start_date}–{self.end_date}"
