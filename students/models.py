from django.db import models

from core.models import TimeStampedModel


class StudentProfile(TimeStampedModel):
    class Gender(models.TextChoices):
        FEMALE = "F", "Female"
        MALE = "M", "Male"
        OTHER = "O", "Other"

    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="student_profile")
    admission_number = models.CharField(max_length=30, unique=True)
    student_id = models.CharField(max_length=30, unique=True)
    department = models.ForeignKey("academics.Department", on_delete=models.PROTECT, related_name="students")
    course = models.ForeignKey("academics.Course", on_delete=models.PROTECT, related_name="students")
    classroom = models.ForeignKey("academics.ClassRoom", on_delete=models.PROTECT, related_name="students")
    academic_year = models.PositiveSmallIntegerField(default=1)
    guardian_name = models.CharField(max_length=120, blank=True)
    guardian_phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=80, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=1, choices=Gender.choices, blank=True)

    class Meta:
        ordering = ["admission_number"]
        indexes = [
            models.Index(fields=["admission_number"]),
            models.Index(fields=["student_id"]),
        ]

    def __str__(self):
        return f"{self.student_id} — {self.user.get_full_name() or self.user.username}"
