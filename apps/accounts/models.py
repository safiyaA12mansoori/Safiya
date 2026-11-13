from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    class Role(models.TextChoices):
        PRINCIPAL = 'principal', 'Principal/Admin'
        TEACHER = 'teacher', 'Teacher'
        STUDENT = 'student', 'Student'

    role = models.CharField(max_length=20, choices=Role.choices, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(role__in=['principal', 'teacher', 'student']),
                name='user_role_valid',
            )
        ]

    def __str__(self):
        return self.get_full_name() or self.username


class UserProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Profile for {self.user}'


class IdSequence(models.Model):
    prefix = models.CharField(max_length=3)
    year = models.PositiveIntegerField()
    last_value = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['prefix', 'year'], name='unique_id_sequence')
        ]

    def __str__(self):
        return f'{self.prefix}{self.year}:{self.last_value}'


class LoginAttempt(models.Model):
    username_key = models.CharField(max_length=150)
    ip_address = models.GenericIPAddressField()
    attempted_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['username_key', 'ip_address', 'attempted_at']),
        ]

    def __str__(self):
        return f'{self.username_key} @ {self.attempted_at:%Y-%m-%d %H:%M}'
