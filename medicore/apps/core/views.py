from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Role
from apps.appointments.models import Appointment
from apps.billing.models import Invoice, Payment
from apps.core.permissions import resolve_clinic_id, user_clinic_ids
from apps.patients.models import Patient
from apps.queue_mgmt.models import QueueToken


class DashboardStatsView(APIView):
    """Role-aware dashboard with real aggregated data (not fake stats)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        clinic_id = resolve_clinic_id(request)
        allowed = user_clinic_ids(user)
        if clinic_id and clinic_id not in allowed and not user.is_super_admin:
            return Response({"detail": "Clinic access denied."}, status=403)

        today = timezone.localdate()
        patient_qs = Patient.objects.filter(is_active=True)
        appt_qs = Appointment.objects.all()
        invoice_qs = Invoice.objects.exclude(status=Invoice.Status.VOID)
        payment_qs = Payment.objects.filter(paid_at__date=today)
        token_qs = QueueToken.objects.filter(session__date=today)

        if clinic_id:
            patient_qs = patient_qs.filter(clinic_id=clinic_id)
            appt_qs = appt_qs.filter(clinic_id=clinic_id)
            invoice_qs = invoice_qs.filter(clinic_id=clinic_id)
            payment_qs = payment_qs.filter(clinic_id=clinic_id)
            token_qs = token_qs.filter(clinic_id=clinic_id)
        elif not user.is_super_admin:
            patient_qs = patient_qs.filter(clinic_id__in=allowed)
            appt_qs = appt_qs.filter(clinic_id__in=allowed)
            invoice_qs = invoice_qs.filter(clinic_id__in=allowed)
            payment_qs = payment_qs.filter(clinic_id__in=allowed)
            token_qs = token_qs.filter(clinic_id__in=allowed)

        role = user.role
        base = {
            "role": role,
            "clinic_id": clinic_id,
            "generated_at": timezone.now().isoformat(),
            "patients_total": patient_qs.count(),
            "appointments_today": appt_qs.filter(start_time__date=today).count(),
            "appointments_by_status": list(
                appt_qs.filter(start_time__date=today)
                .values("status")
                .annotate(count=Count("id"))
                .order_by("status")
            ),
            "queue_waiting": token_qs.filter(status=QueueToken.Status.WAITING).count(),
            "queue_called": token_qs.filter(status=QueueToken.Status.CALLED).count(),
        }

        if role in {Role.SUPER_ADMIN, Role.CLINIC_OWNER, Role.ACCOUNTANT} or user.is_super_admin:
            base["invoices_open"] = invoice_qs.filter(
                status__in=[
                    Invoice.Status.ISSUED,
                    Invoice.Status.PARTIALLY_PAID,
                    Invoice.Status.DRAFT,
                ]
            ).count()
            base["collections_today"] = float(
                payment_qs.aggregate(s=Sum("amount"))["s"] or 0
            )

        if role == Role.DOCTOR and hasattr(user, "doctor_profile"):
            doc = user.doctor_profile
            base["my_appointments_today"] = appt_qs.filter(
                doctor=doc, start_time__date=today
            ).count()
            base["my_queue_waiting"] = token_qs.filter(
                doctor=doc, status=QueueToken.Status.WAITING
            ).count()

        if role == Role.PATIENT:
            my_patients = patient_qs.filter(user=user)
            base["my_appointments_upcoming"] = Appointment.objects.filter(
                patient__in=my_patients,
                start_time__gte=timezone.now(),
                status__in=[
                    Appointment.Status.SCHEDULED,
                    Appointment.Status.CONFIRMED,
                ],
            ).count()

        return Response(base)
