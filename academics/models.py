from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from core.models import TimeStampedModel


class Department(TimeStampedModel):
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=20, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.code} — {self.name}"


class AcademicSession(TimeStampedModel):
    name = models.CharField(max_length=40, unique=True)
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return self.name

    def clean(self):
        if self.start_date and self.end_date and self.end_date <= self.start_date:
            raise ValidationError("End date must be after the start date.")

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_current:
            AcademicSession.objects.exclude(pk=self.pk).update(is_current=False)


class Course(TimeStampedModel):
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name="courses")
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=20)
    duration_years = models.PositiveSmallIntegerField(default=2, validators=[MinValueValidator(1), MaxValueValidator(6)])

    class Meta:
        ordering = ["name"]
        constraints = [models.UniqueConstraint(fields=["department", "code"], name="uniq_course_code")]

    def __str__(self):
        return f"{self.code} — {self.name}"


class ClassRoom(TimeStampedModel):
    course = models.ForeignKey(Course, on_delete=models.PROTECT, related_name="classrooms")
    session = models.ForeignKey(AcademicSession, on_delete=models.PROTECT, related_name="classrooms")
    name = models.CharField(max_length=40)
    division = models.CharField(max_length=10, default="A")
    year = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(6)])

    class Meta:
        ordering = ["year", "name", "division"]
        constraints = [
            models.UniqueConstraint(fields=["course", "session", "name", "division"], name="uniq_classroom")
        ]

    def __str__(self):
        return f"{self.name}-{self.division} ({self.session})"


class Subject(TimeStampedModel):
    course = models.ForeignKey(Course, on_delete=models.PROTECT, related_name="subjects")
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=120)
    semester = models.PositiveSmallIntegerField(default=1, validators=[MinValueValidator(1), MaxValueValidator(12)])
    credits = models.PositiveSmallIntegerField(default=4, validators=[MinValueValidator(1), MaxValueValidator(10)])

    class Meta:
        ordering = ["semester", "code"]
        constraints = [models.UniqueConstraint(fields=["course", "code"], name="uniq_subject_code")]

    def __str__(self):
        return f"{self.code} — {self.name}"

    def completion_percent(self):
        topics = Topic.objects.filter(chapter__unit__subject=self)
        total = topics.count()
        if not total:
            return 0
        done = topics.filter(is_completed=True).count()
        return round(100 * done / total)


class Unit(TimeStampedModel):
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="units")
    number = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=200)

    class Meta:
        ordering = ["number"]
        constraints = [models.UniqueConstraint(fields=["subject", "number"], name="uniq_unit_number")]

    def __str__(self):
        return f"Unit {self.number}: {self.title}"


class Chapter(TimeStampedModel):
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name="chapters")
    number = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=200)

    class Meta:
        ordering = ["number"]
        constraints = [models.UniqueConstraint(fields=["unit", "number"], name="uniq_chapter_number")]

    def __str__(self):
        return f"Chapter {self.number}: {self.title}"


class Topic(TimeStampedModel):
    chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name="topics")
    number = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=200)
    is_completed = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ["number"]
        constraints = [models.UniqueConstraint(fields=["chapter", "number"], name="uniq_topic_number")]

    def __str__(self):
        return self.title
