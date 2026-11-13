from django.conf import settings
from django.db import models

from apps.accounts.models import Role
from apps.clinics.models import Clinic


class StaffProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="staff_profile"
    )
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="staff_profiles")
    employee_id = models.CharField(max_length=40)
    department = models.CharField(max_length=100, blank=True)
    designation = models.CharField(max_length=100, blank=True)
    role = models.CharField(max_length=32, choices=Role.choices)
    join_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("clinic", "employee_id")
        ordering = ["employee_id"]
