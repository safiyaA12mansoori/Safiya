from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models import TimeStampedModel


class BookCategory(TimeStampedModel):
    name = models.CharField(max_length=80, unique=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "Book categories"

    def __str__(self):
        return self.name


class LibraryBook(TimeStampedModel):
    title = models.CharField(max_length=200)
    author = models.CharField(max_length=160)
    isbn = models.CharField(max_length=20, unique=True)
    category = models.ForeignKey(BookCategory, on_delete=models.PROTECT, related_name="books")
    publisher = models.CharField(max_length=160, blank=True)
    total_copies = models.PositiveIntegerField(default=1)
    available = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["title"]

    def __str__(self):
        return f"{self.title} ({self.isbn})"

    def clean(self):
        if self.available > self.total_copies:
            raise ValidationError("Available copies cannot exceed total copies.")


class BookIssue(TimeStampedModel):
    book = models.ForeignKey(LibraryBook, on_delete=models.PROTECT, related_name="issues")
    student = models.ForeignKey("students.StudentProfile", on_delete=models.CASCADE, related_name="book_issues")
    issued_on = models.DateField(default=timezone.localdate)
    due_on = models.DateField()
    returned_on = models.DateField(null=True, blank=True)
    fine = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    issued_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="book_issues_made"
    )

    class Meta:
        ordering = ["-issued_on"]

    def __str__(self):
        return f"{self.book} → {self.student}"

    @property
    def is_overdue(self):
        if self.returned_on:
            return False
        return self.due_on < timezone.localdate()
