from django.conf import settings
from django.db import models
from django.urls import reverse


class Student(models.Model):
    class Gender(models.TextChoices):
        FEMALE = 'female', 'Female'
        MALE = 'male', 'Male'
        OTHER = 'other', 'Other'

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='student')
    student_id = models.CharField(max_length=20, unique=True)
    admission_number = models.CharField(max_length=20, unique=True)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=10, choices=Gender.choices)
    address = models.TextField(blank=True)
    parent_name = models.CharField(max_length=150)
    parent_phone = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['student_id']
        indexes = [
            models.Index(fields=['parent_name']),
        ]

    def __str__(self):
        return f'{self.student_id} {self.user.get_full_name()}'

    def get_absolute_url(self):
        return reverse('student-detail', args=[self.pk])

    def current_enrollment(self):
        enrollments = list(self.enrollments.all())
        for enrollment in enrollments:
            if enrollment.academic_year.is_current:
                return enrollment
        return enrollments[0] if enrollments else None


class StudentEnrollment(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='enrollments')
    academic_year = models.ForeignKey(
        'academics.AcademicYear', on_delete=models.PROTECT, related_name='enrollments'
    )
    classroom = models.ForeignKey(
        'academics.ClassRoom', on_delete=models.PROTECT, related_name='enrollments'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-academic_year__start_date']
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'academic_year'],
                name='one_enrollment_per_year',
            )
        ]
        indexes = [
            models.Index(fields=['academic_year', 'classroom']),
        ]

    def __str__(self):
        return f'{self.student.student_id} in {self.classroom}'
