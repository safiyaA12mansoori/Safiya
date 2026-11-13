from django.conf import settings
from django.db import models

from apps.clinics.models import Clinic


class Patient(models.Model):
    class Gender(models.TextChoices):
        MALE = "male", "Male"
        FEMALE = "female", "Female"
        OTHER = "other", "Other"
        UNSPECIFIED = "unspecified", "Prefer not to say"

    class BloodGroup(models.TextChoices):
        A_POS = "A+", "A+"
        A_NEG = "A-", "A-"
        B_POS = "B+", "B+"
        B_NEG = "B-", "B-"
        AB_POS = "AB+", "AB+"
        AB_NEG = "AB-", "AB-"
        O_POS = "O+", "O+"
        O_NEG = "O-", "O-"
        UNKNOWN = "unknown", "Unknown"

    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="patients")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="patient_profiles",
    )
    mrn = models.CharField(max_length=32, help_text="Medical record number (clinic-scoped)")
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=20, choices=Gender.choices, default=Gender.UNSPECIFIED)
    blood_group = models.CharField(
        max_length=10, choices=BloodGroup.choices, default=BloodGroup.UNKNOWN
    )
    phone = models.CharField(max_length=20)
    alternate_phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    aadhaar_last4 = models.CharField(
        max_length=4,
        blank=True,
        help_text="Store only last 4 digits for privacy (Indian DPDP-minded).",
    )
    address_line1 = models.CharField(max_length=255, blank=True)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=12, blank=True)
    emergency_contact_name = models.CharField(max_length=120, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    allergies = models.TextField(blank=True)
    chronic_conditions = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="patients_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("clinic", "mrn")
        indexes = [
            models.Index(fields=["clinic", "phone"]),
            models.Index(fields=["clinic", "email"]),
            models.Index(fields=["clinic", "first_name", "last_name", "date_of_birth"]),
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.mrn})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()


class PatientDocument(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="documents")
    title = models.CharField(max_length=200)
    document_type = models.CharField(max_length=64, blank=True)
    file = models.FileField(upload_to="patient_docs/%Y/%m/")
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-uploaded_at"]


class PatientFeedback(models.Model):
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="feedback")
    patient = models.ForeignKey(
        Patient, on_delete=models.SET_NULL, null=True, blank=True, related_name="feedback"
    )
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
