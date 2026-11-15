from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        TEACHER = "TEACHER", "Teacher"
        STUDENT = "STUDENT", "Student"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT, db_index=True)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    photo = models.ImageField(upload_to="profiles/", blank=True)

    def __str__(self):
        return self.get_full_name() or self.username


class AdminProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="admin_profile")
    designation = models.CharField(max_length=120, default="Administrator")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Admin {self.user}"
