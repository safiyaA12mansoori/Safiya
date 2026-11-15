import uuid
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from core.audit import log_action
from students.models import StudentProfile

from .models import Payment, StudentFee


def refresh_status(student_fee):
    paid = student_fee.paid_amount or Decimal("0")
    if paid <= 0:
        status = StudentFee.Status.PENDING
    elif paid + Decimal("0.001") < student_fee.amount:
        status = StudentFee.Status.PARTIAL
    else:
        status = StudentFee.Status.PAID
    if student_fee.status != status:
        student_fee.status = status
        student_fee.save(update_fields=["status", "updated_at"])
    return student_fee


@transaction.atomic
def record_payment(*, student_fee, amount, method, reference, paid_on, actor):
    locked = StudentFee.objects.select_for_update().get(pk=student_fee.pk)
    amount = Decimal(amount)
    if amount <= 0:
        raise ValidationError("Enter a payment greater than zero.")
    balance = locked.amount - (locked.paid_amount or Decimal("0"))
    if amount - balance > Decimal("0.001"):
        raise ValidationError("That payment is more than the balance.")
    payment = Payment.objects.create(
        student_fee=locked,
        amount=amount,
        method=method,
        reference=reference or "",
        paid_on=paid_on or timezone.localdate(),
        receipt_no=f"RCP-{timezone.localdate():%Y}-{uuid.uuid4().hex[:10].upper()}",
        received_by=actor,
    )
    refresh_status(locked)
    log_action(actor, "fee_payment", f"Receipt {payment.receipt_no} for {locked.student}", "payment", payment.pk)
    return payment


@transaction.atomic
def generate_dues(structure):
    students = StudentProfile.objects.filter(course=structure.course, classroom__session=structure.session, user__is_active=True)
    created = 0
    for student in students:
        _, was_created = StudentFee.objects.get_or_create(
            student=student,
            structure=structure,
            defaults={"amount": structure.amount, "status": StudentFee.Status.PENDING},
        )
        created += int(was_created)
    return created
