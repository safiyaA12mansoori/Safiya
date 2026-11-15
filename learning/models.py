from django.core.exceptions import ValidationError
from django.db import models

from core.models import TimeStampedModel
from core.validators import validate_material


class StudyMaterial(TimeStampedModel):
    class Kind(models.TextChoices):
        PDF = "PDF", "PDF"
        DOCX = "DOCX", "Word"
        PPT = "PPT", "Presentation"
        VIDEO = "VIDEO", "Video"
        LINK = "LINK", "Link"

    title = models.CharField(max_length=200)
    subject = models.ForeignKey("academics.Subject", on_delete=models.CASCADE, related_name="materials")
    unit = models.ForeignKey(
        "academics.Unit", null=True, blank=True, on_delete=models.SET_NULL, related_name="materials"
    )
    topic = models.ForeignKey(
        "academics.Topic", null=True, blank=True, on_delete=models.SET_NULL, related_name="materials"
    )
    classroom = models.ForeignKey(
        "academics.ClassRoom", null=True, blank=True, on_delete=models.CASCADE, related_name="materials"
    )
    kind = models.CharField(max_length=10, choices=Kind.choices, db_index=True)
    file = models.FileField(upload_to="materials/%Y/%m/", blank=True, validators=[validate_material])
    external_url = models.URLField(blank=True)
    description = models.TextField(blank=True)
    uploaded_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="materials")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    def clean(self):
        if self.kind in {self.Kind.VIDEO, self.Kind.LINK} and not self.external_url:
            raise ValidationError("Add a URL for a video or link.")
        if self.kind in {self.Kind.PDF, self.Kind.DOCX, self.Kind.PPT} and not self.file:
            raise ValidationError("Upload a file for this material.")
        if self.unit_id and self.unit.subject_id != self.subject_id:
            raise ValidationError("Unit does not belong to the selected subject.")
        if self.topic_id and self.topic.chapter.unit.subject_id != self.subject_id:
            raise ValidationError("Topic does not belong to the selected subject.")
