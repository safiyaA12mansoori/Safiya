from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from core.audit import log_action

from .models import BookIssue, LibraryBook

FINE_PER_DAY = Decimal("10")


@transaction.atomic
def issue_book(*, book, student, due_on, actor):
    locked = LibraryBook.objects.select_for_update().get(pk=book.pk)
    if locked.available < 1:
        raise ValidationError("No copies are available.")
    if BookIssue.objects.filter(book=locked, student=student, returned_on__isnull=True).exists():
        raise ValidationError("This student already has an open issue for that book.")
    if due_on < timezone.localdate():
        raise ValidationError("The due date cannot be in the past.")
    locked.available -= 1
    locked.save(update_fields=["available", "updated_at"])
    issue = BookIssue.objects.create(
        book=locked, student=student, due_on=due_on, issued_by=actor, issued_on=timezone.localdate()
    )
    log_action(actor, "book_issue", f"Issued {locked.title} to {student}", "bookissue", issue.pk)
    return issue


@transaction.atomic
def return_book(*, issue, actor):
    if issue.returned_on:
        raise ValidationError("This book is already returned.")
    locked = LibraryBook.objects.select_for_update().get(pk=issue.book_id)
    today = timezone.localdate()
    fine = Decimal("0")
    if issue.due_on < today:
        fine = FINE_PER_DAY * (today - issue.due_on).days
    issue.returned_on = today
    issue.fine = fine
    issue.save(update_fields=["returned_on", "fine", "updated_at"])
    locked.available = min(locked.total_copies, locked.available + 1)
    locked.save(update_fields=["available", "updated_at"])
    log_action(actor, "book_return", f"Returned {locked.title} from {issue.student}", "bookissue", issue.pk)
    return issue
