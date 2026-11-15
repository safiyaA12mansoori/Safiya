from django.db import models

from core.models import TimeStampedModel


class Attendance(TimeStampedModel):
    class Status(models.TextChoices):
        PRESENT = "PRESENT", "Present"
        ABSENT = "ABSENT", "Absent"
        LEAVE = "LEAVE", "Leave"

    student = models.ForeignKey("students.StudentProfile", on_delete=models.CASCADE, related_name="attendance")
    subject = models.ForeignKey("academics.Subject", on_delete=models.CASCADE, related_name="attendance")
    classroom = models.ForeignKey("academics.ClassRoom", on_delete=models.CASCADE, related_name="attendance")
    teacher = models.ForeignKey(
        "teachers.TeacherProfile", on_delete=models.PROTECT, related_name="attendance_marked"
    )
    date = models.DateField(db_index=True)
    status = models.CharField(max_length=10, choices=Status.choices, db_index=True)
    remarks = models.CharField(max_length=200, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["student", "subject", "date"], name="uniq_attendance")]
        indexes = [
            models.Index(fields=["classroom", "date"]),
            models.Index(fields=["subject", "date"]),
        ]
        ordering = ["-date", "student_id"]

    def __str__(self):
        return f"{self.student} {self.date} {self.status}"
