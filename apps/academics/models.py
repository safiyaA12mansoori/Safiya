from django.core.exceptions import ValidationError
from django.db import models, transaction


class AcademicYear(models.Model):
    name = models.CharField(max_length=20, unique=True)
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_date', 'name']

    def __str__(self):
        return self.name

    def clean(self):
        if self.start_date and self.end_date:
            span = (self.end_date - self.start_date).days
            if self.end_date <= self.start_date:
                raise ValidationError({'end_date': 'End date must be after the start date.'})
            if span < 30:
                raise ValidationError('An academic year must cover at least 30 days.')
            if span > 549:
                raise ValidationError('An academic year cannot be longer than 18 months.')

    def save(self, *args, **kwargs):
        with transaction.atomic():
            super().save(*args, **kwargs)
            if self.is_current:
                AcademicYear.objects.exclude(pk=self.pk).filter(is_current=True).update(is_current=False)


class GradeLevel(models.Model):
    class Stage(models.TextChoices):
        PRIMARY = 'primary', 'Primary'
        SECONDARY = 'secondary', 'Secondary'

    number = models.PositiveSmallIntegerField(unique=True)
    name = models.CharField(max_length=20, unique=True)
    stage = models.CharField(max_length=20, choices=Stage.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['number']
        constraints = [
            models.CheckConstraint(
                check=models.Q(number__gte=1, number__lte=10),
                name='grade_number_between_1_and_10',
            )
        ]

    def __str__(self):
        return self.name


class ClassRoom(models.Model):
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.PROTECT, related_name='classrooms')
    grade_level = models.ForeignKey(GradeLevel, on_delete=models.PROTECT, related_name='classrooms')
    division = models.CharField(max_length=3)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-academic_year__start_date', 'grade_level__number', 'division']
        constraints = [
            models.UniqueConstraint(
                fields=['academic_year', 'grade_level', 'division'],
                name='unique_class_division',
            )
        ]
        indexes = [
            models.Index(fields=['academic_year', 'grade_level']),
        ]

    def __str__(self):
        return f'{self.label} ({self.academic_year.name})'

    @property
    def label(self):
        return f'{self.grade_level.name} - {self.division}'


class Subject(models.Model):
    name = models.CharField(max_length=80, unique=True)
    code = models.CharField(max_length=10, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.code})'


class ClassSubject(models.Model):
    classroom = models.ForeignKey(ClassRoom, on_delete=models.CASCADE, related_name='class_subjects')
    subject = models.ForeignKey(Subject, on_delete=models.PROTECT, related_name='class_subjects')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['subject__name']
        constraints = [
            models.UniqueConstraint(fields=['classroom', 'subject'], name='unique_class_subject')
        ]

    def __str__(self):
        return f'{self.subject.code} in {self.classroom}'
