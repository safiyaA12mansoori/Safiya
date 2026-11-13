from django.conf import settings
from django.db import models
from django.urls import reverse


class Teacher(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='teacher')
    teacher_id = models.CharField(max_length=20, unique=True)
    phone = models.CharField(max_length=20)
    qualification = models.CharField(max_length=120, blank=True)
    joined_on = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['teacher_id']

    def __str__(self):
        return f'{self.teacher_id} {self.user.get_full_name()}'

    def get_absolute_url(self):
        return reverse('teacher-detail', args=[self.pk])


class TeacherAssignment(models.Model):
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='assignments')
    classroom = models.ForeignKey(
        'academics.ClassRoom', on_delete=models.PROTECT, related_name='assignments'
    )
    subject = models.ForeignKey(
        'academics.Subject', on_delete=models.PROTECT, related_name='assignments'
    )
    academic_year = models.ForeignKey(
        'academics.AcademicYear', on_delete=models.PROTECT, related_name='assignments'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['academic_year', 'classroom', 'subject__name']
        constraints = [
            models.UniqueConstraint(
                fields=['teacher', 'classroom', 'subject', 'academic_year'],
                name='unique_teacher_assignment',
            )
        ]
        indexes = [
            models.Index(fields=['teacher', 'academic_year']),
            models.Index(fields=['classroom', 'academic_year']),
        ]

    def __str__(self):
        return f'{self.teacher.teacher_id} · {self.subject.code} · {self.classroom.label}'
