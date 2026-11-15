from django.contrib import messages
from django.core.exceptions import ValidationError
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from accounts.models import User
from core.access import role_required, student_profile
from core.audit import log_action

from .forms import PaymentForm, StructureForm
from .models import FeeStructure, StudentFee
from .services import generate_dues, record_payment


def _fees(user):
    qs = StudentFee.objects.select_related("student__user", "structure__course", "structure__session")
    if user.role == User.Role.ADMIN:
        return qs
    if user.role == User.Role.STUDENT:
        profile = student_profile(user)
        return qs.filter(student=profile) if profile else qs.none()
    return qs.none()


@role_required("ADMIN", "STUDENT")
def overview(request):
    structures = FeeStructure.objects.select_related("course", "session") if request.user.role == User.Role.ADMIN else []
    fees = _fees(request.user)
    status = request.GET.get("status")
    if status:
        fees = fees.filter(status=status)
    return render(
        request,
        "fees/overview.html",
        {"structures": structures, "fees": fees, "statuses": StudentFee.Status.choices},
    )


@role_required("ADMIN")
def structure_create(request):
    form = StructureForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        form.save()
        messages.success(request, "Fee structure saved.")
        return redirect("fees:overview")
    return render(request, "fees/form.html", {"form": form, "page_title": "New fee structure"})


@role_required("ADMIN")
def generate(request, pk):
    structure = get_object_or_404(FeeStructure, pk=pk)
    if request.method == "POST":
        created = generate_dues(structure)
        log_action(request.user, "fee_generate", f"Generated {created} dues for {structure}", "feestructure", structure.pk)
        messages.success(request, f"Created {created} new student fee rows.")
    return redirect("fees:overview")


@role_required("ADMIN")
def pay(request):
    queryset = StudentFee.objects.exclude(status=StudentFee.Status.PAID).select_related("student__user", "structure")
    form = PaymentForm(request.POST or None, queryset=queryset, initial={"paid_on": timezone.localdate()})
    if request.method == "POST" and form.is_valid():
        try:
            payment = record_payment(actor=request.user, **form.cleaned_data)
            messages.success(request, f"Payment recorded. Receipt {payment.receipt_no}.")
            return redirect("fees:receipt", pk=payment.pk)
        except ValidationError as exc:
            messages.error(request, " ".join(exc.messages))
    return render(request, "fees/pay.html", {"form": form})


@role_required("ADMIN", "STUDENT")
def receipt(request, pk):
    from .models import Payment

    payment = get_object_or_404(Payment.objects.select_related("student_fee__student__user", "student_fee__structure"), pk=pk)
    if request.user.role == User.Role.STUDENT and payment.student_fee.student.user_id != request.user.id:
        from django.core.exceptions import PermissionDenied

        raise PermissionDenied
    if request.GET.get("format") == "pdf":
        from reports.exporters import pdf_response

        return pdf_response(
            f"{payment.receipt_no}.pdf",
            f"Receipt {payment.receipt_no}",
            ["Field", "Value"],
            [
                ["Student", str(payment.student_fee.student)],
                ["Fee", payment.student_fee.structure.name],
                ["Amount", payment.amount],
                ["Method", payment.get_method_display()],
                ["Paid on", payment.paid_on],
                ["Receipt", payment.receipt_no],
            ],
        )
    return render(request, "fees/receipt.html", {"payment": payment})
