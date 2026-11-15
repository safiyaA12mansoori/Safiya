from django.db import models

from core.models import TimeStampedModel


class StudentPerformance(TimeStampedModel):
    student = models.ForeignKey("students.StudentProfile", on_delete=models.CASCADE, related_name="performances")
    subject = models.ForeignKey(
        "academics.Subject", null=True, blank=True, on_delete=models.SET_NULL, related_name="performances"
    )
    topic_label = models.CharField(max_length=200, blank=True)
    assessment_type = models.CharField(max_length=20, db_index=True)
    title = models.CharField(max_length=200)
    score = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    max_score = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    accuracy = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    correct_count = models.PositiveSmallIntegerField(default=0)
    incorrect_count = models.PositiveSmallIntegerField(default=0)
    recorded_on = models.DateField(db_index=True)
    source_key = models.CharField(max_length=40)

    class Meta:
        ordering = ["-recorded_on", "-id"]
        constraints = [models.UniqueConstraint(fields=["student", "source_key"], name="uniq_performance_source")]

    def __str__(self):
        return f"{self.student} · {self.title}"


class StudyRecommendation(TimeStampedModel):
    class Kind(models.TextChoices):
        MATERIAL = "material", "Material"
        CHAPTER = "chapter", "Chapter"
        TOPIC = "topic", "Topic"
        PRACTICE = "practice", "Practice"
        REVISION = "revision", "Revision"
        ATTENDANCE = "attendance", "Attendance"

    student = models.ForeignKey("students.StudentProfile", on_delete=models.CASCADE, related_name="recommendations")
    subject = models.ForeignKey(
        "academics.Subject", null=True, blank=True, on_delete=models.SET_NULL, related_name="recommendations"
    )
    topic = models.ForeignKey(
        "academics.Topic", null=True, blank=True, on_delete=models.SET_NULL, related_name="recommendations"
    )
    material = models.ForeignKey(
        "learning.StudyMaterial", null=True, blank=True, on_delete=models.SET_NULL, related_name="recommendations"
    )
    kind = models.CharField(max_length=20, choices=Kind.choices)
    title = models.CharField(max_length=200)
    detail = models.TextField(blank=True)
    priority = models.PositiveSmallIntegerField(default=2)
    is_done = models.BooleanField(default=False)

    class Meta:
        ordering = ["priority", "-created_at"]

    def __str__(self):
        return self.title
