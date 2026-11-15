from django.db import models

from core.models import TimeStampedModel


class TeacherProfile(TimeStampedModel):
    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="teacher_profile")
    employee_id = models.CharField(max_length=30, unique=True)
    department = models.ForeignKey("academics.Department", on_delete=models.PROTECT, related_name="teachers")
    designation = models.CharField(max_length=120, default="Assistant Professor")
    qualification = models.CharField(max_length=160, blank=True)
    joining_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["employee_id"]

    def __str__(self):
        return f"{self.employee_id} — {self.user.get_full_name() or self.user.username}"


class TeacherAssignment(TimeStampedModel):
    teacher = models.ForeignKey(TeacherProfile, on_delete=models.CASCADE, related_name="assignments")
    subject = models.ForeignKey("academics.Subject", on_delete=models.PROTECT, related_name="teacher_assignments")
    classroom = models.ForeignKey("academics.ClassRoom", on_delete=models.PROTECT, related_name="teacher_assignments")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["teacher", "subject", "classroom"], name="uniq_teacher_load")
        ]

    def __str__(self):
        return f"{self.teacher} · {self.subject} · {self.classroom}"
