from django.contrib.auth.models import AbstractUser
from django.db import models


class Role(models.TextChoices):
    SUPER_ADMIN = "super_admin", "Super Admin"
    CLINIC_OWNER = "clinic_owner", "Clinic Owner"
    RECEPTIONIST = "receptionist", "Receptionist"
    DOCTOR = "doctor", "Doctor"
    ACCOUNTANT = "accountant", "Accountant"
    NURSE = "nurse", "Nurse"
    PATIENT = "patient", "Patient"


class User(AbstractUser):
    """Clinic staff / patient login accounts. Passwords are hashed via Django auth."""

    role = models.CharField(max_length=32, choices=Role.choices, default=Role.PATIENT)
    phone = models.CharField(max_length=20, blank=True)
    must_change_password = models.BooleanField(default=False)
    is_active_staff_member = models.BooleanField(default=True)

    class Meta:
        ordering = ["username"]

    def __str__(self):
        return f"{self.username} ({self.role})"

    @property
    def is_super_admin(self):
        return self.role == Role.SUPER_ADMIN or self.is_superuser
