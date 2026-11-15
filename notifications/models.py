from django.db import models

from core.models import TimeStampedModel


class Announcement(TimeStampedModel):
    class Audience(models.TextChoices):
        ALL = "ALL", "Everyone"
        TEACHERS = "TEACHERS", "Teachers"
        STUDENTS = "STUDENTS", "Students"
        CLASS = "CLASS", "One class"

    title = models.CharField(max_length=200)
    body = models.TextField()
    audience = models.CharField(max_length=20, choices=Audience.choices, default=Audience.ALL)
    classroom = models.ForeignKey(
        "academics.ClassRoom", null=True, blank=True, on_delete=models.CASCADE, related_name="announcements"
    )
    author = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="announcements")
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class Notification(TimeStampedModel):
    recipient = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    link = models.CharField(max_length=240, blank=True)
    is_read = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["recipient", "is_read"])]

    def __str__(self):
        return self.title
