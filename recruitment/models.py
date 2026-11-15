from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from .eligibility import EducationLevel, skills_from_csv


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class JobOpening(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        OPEN = "OPEN", "Open"
        CLOSED = "CLOSED", "Closed"

    title = models.CharField(max_length=160)
    department = models.CharField(max_length=120, blank=True)
    location = models.CharField(max_length=120, blank=True)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN, db_index=True
    )

    # Eligibility criteria (decision-table inputs)
    min_education = models.PositiveSmallIntegerField(
        choices=[(level.value, level.name.replace("_", " ").title()) for level in EducationLevel],
        default=EducationLevel.BACHELOR,
    )
    min_experience_years = models.FloatField(default=0.0, validators=[MinValueValidator(0.0)])
    required_skills = models.CharField(
        max_length=500,
        blank=True,
        help_text="Comma-separated skills the applicant must have",
    )
    max_notice_period_days = models.PositiveIntegerField(default=90)
    require_work_authorization = models.BooleanField(default=True)
    min_age = models.PositiveIntegerField(default=18)
    max_age = models.PositiveIntegerField(default=65)
    remote_ok = models.BooleanField(default=True)
    allowed_locations = models.CharField(
        max_length=500,
        blank=True,
        help_text="Comma-separated on-site locations; blank means no location restriction",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.title} ({self.status})"

    @property
    def required_skills_list(self) -> tuple[str, ...]:
        return skills_from_csv(self.required_skills)

    @property
    def allowed_locations_list(self) -> tuple[str, ...]:
        return skills_from_csv(self.allowed_locations)


class Applicant(TimeStampedModel):
    full_name = models.CharField(max_length=160)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=40, blank=True)
    education = models.PositiveSmallIntegerField(
        choices=[(level.value, level.name.replace("_", " ").title()) for level in EducationLevel],
        default=EducationLevel.BACHELOR,
    )
    experience_years = models.FloatField(default=0.0, validators=[MinValueValidator(0.0)])
    skills = models.CharField(max_length=500, blank=True)
    notice_period_days = models.PositiveIntegerField(default=0)
    work_authorized = models.BooleanField(default=True)
    age = models.PositiveIntegerField(default=25)
    location = models.CharField(max_length=120, blank=True)
    prefers_remote = models.BooleanField(default=False)

    class Meta:
        ordering = ["full_name"]

    def __str__(self) -> str:
        return f"{self.full_name} <{self.email}>"

    @property
    def skills_list(self) -> tuple[str, ...]:
        return skills_from_csv(self.skills)


class Application(TimeStampedModel):
    class Status(models.TextChoices):
        APPLIED = "APPLIED", "Applied"
        SCREENING = "SCREENING", "Screening"
        PASSED = "PASSED", "Passed Screening"
        FAILED = "FAILED", "Failed Screening"
        INTERVIEW_SCHEDULED = "INTERVIEW_SCHEDULED", "Interview Scheduled"
        WITHDRAWN = "WITHDRAWN", "Withdrawn"

    job = models.ForeignKey(JobOpening, on_delete=models.CASCADE, related_name="applications")
    applicant = models.ForeignKey(Applicant, on_delete=models.CASCADE, related_name="applications")
    status = models.CharField(
        max_length=32, choices=Status.choices, default=Status.APPLIED, db_index=True
    )
    cover_letter = models.TextField(blank=True)
    screening_reasons = models.TextField(blank=True)
    screened_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["job", "applicant"], name="uniq_job_applicant")
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.applicant} → {self.job} [{self.status}]"


class Interview(TimeStampedModel):
    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Scheduled"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"
        NO_SHOW = "NO_SHOW", "No show"

    application = models.OneToOneField(
        Application, on_delete=models.CASCADE, related_name="interview"
    )
    scheduled_at = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=60)
    interviewer_name = models.CharField(max_length=160)
    location_or_link = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.SCHEDULED, db_index=True
    )

    class Meta:
        ordering = ["scheduled_at"]

    def __str__(self) -> str:
        when = timezone.localtime(self.scheduled_at).strftime("%Y-%m-%d %H:%M")
        return f"Interview {self.application.applicant.full_name} @ {when}"
