from django.core.exceptions import ValidationError
from django.db import models

from core.models import TimeStampedModel
from core.validators import validate_material, validate_submission


class Assignment(TimeStampedModel):
    title = models.CharField(max_length=200)
    subject = models.ForeignKey("academics.Subject", on_delete=models.PROTECT, related_name="assignments")
    classroom = models.ForeignKey("academics.ClassRoom", on_delete=models.PROTECT, related_name="assignments")
    teacher = models.ForeignKey("teachers.TeacherProfile", on_delete=models.PROTECT, related_name="assignments_created")
    description = models.TextField(blank=True)
    file = models.FileField(upload_to="assignments/%Y/%m/", blank=True, validators=[validate_material])
    deadline = models.DateTimeField(db_index=True)
    max_marks = models.PositiveSmallIntegerField(default=20)
    is_published = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["-deadline"]

    def __str__(self):
        return self.title


class AssignmentSubmission(TimeStampedModel):
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name="submissions")
    student = models.ForeignKey("students.StudentProfile", on_delete=models.CASCADE, related_name="submissions")
    file = models.FileField(upload_to="submissions/%Y/%m/", blank=True, validators=[validate_submission])
    text = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    marks = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    feedback = models.TextField(blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["assignment", "student"], name="uniq_submission")]
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"{self.student} → {self.assignment}"

    def clean(self):
        if not self.file and not (self.text or "").strip():
            raise ValidationError("Add a file or a written answer.")
        if self.marks is not None:
            if self.marks < 0:
                raise ValidationError("Marks cannot be negative.")
            if self.marks > self.assignment.max_marks:
                raise ValidationError("Marks cannot exceed the assignment maximum.")
