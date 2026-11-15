from django.db import models

from core.models import TimeStampedModel


class Company(TimeStampedModel):
    name = models.CharField(max_length=160, unique=True)
    website = models.URLField(blank=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "Companies"

    def __str__(self):
        return self.name


class Placement(TimeStampedModel):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="jobs")
    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    package = models.CharField(max_length=80, blank=True)
    ctc_lpa = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    location = models.CharField(max_length=120, blank=True)
    deadline = models.DateField()
    min_cgpa = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    is_open = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["-deadline"]

    def __str__(self):
        return f"{self.title} · {self.company}"


class PlacementApplication(TimeStampedModel):
    class Status(models.TextChoices):
        APPLIED = "APPLIED", "Applied"
        SHORTLISTED = "SHORTLISTED", "Shortlisted"
        INTERVIEW = "INTERVIEW", "Interview"
        SELECTED = "SELECTED", "Selected"
        REJECTED = "REJECTED", "Rejected"

    placement = models.ForeignKey(Placement, on_delete=models.CASCADE, related_name="applications")
    student = models.ForeignKey("students.StudentProfile", on_delete=models.CASCADE, related_name="applications")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.APPLIED, db_index=True)
    interview_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["placement", "student"], name="uniq_application")]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.student} · {self.placement} · {self.status}"
