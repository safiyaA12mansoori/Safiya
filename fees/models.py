from django.db import models
from django.db.models import Sum

from core.models import TimeStampedModel


class FeeStructure(TimeStampedModel):
    course = models.ForeignKey("academics.Course", on_delete=models.PROTECT, related_name="fee_structures")
    session = models.ForeignKey("academics.AcademicSession", on_delete=models.PROTECT, related_name="fee_structures")
    name = models.CharField(max_length=120)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["name"]
        constraints = [models.UniqueConstraint(fields=["course", "session", "name"], name="uniq_fee_structure")]

    def __str__(self):
        return f"{self.name} · {self.course.code} · {self.session}"


class StudentFee(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PARTIAL = "PARTIAL", "Partial"
        PAID = "PAID", "Paid"

    student = models.ForeignKey("students.StudentProfile", on_delete=models.CASCADE, related_name="fees")
    structure = models.ForeignKey(FeeStructure, on_delete=models.PROTECT, related_name="student_fees")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["student", "structure"], name="uniq_student_fee")]

    def __str__(self):
        return f"{self.student} · {self.structure.name}"

    @property
    def paid_amount(self):
        return self.payments.aggregate(total=Sum("amount"))["total"] or 0

    @property
    def balance(self):
        return self.amount - self.paid_amount


class Payment(TimeStampedModel):
    class Method(models.TextChoices):
        CASH = "CASH", "Cash"
        UPI = "UPI", "UPI"
        CARD = "CARD", "Card"
        BANK = "BANK", "Bank transfer"

    student_fee = models.ForeignKey(StudentFee, on_delete=models.PROTECT, related_name="payments")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=10, choices=Method.choices, default=Method.CASH)
    reference = models.CharField(max_length=80, blank=True)
    paid_on = models.DateField()
    receipt_no = models.CharField(max_length=30, unique=True)
    received_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="payments_received"
    )

    class Meta:
        ordering = ["-paid_on", "-id"]

    def __str__(self):
        return self.receipt_no
