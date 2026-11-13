from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clinics.models import DoctorProfile
from apps.core.permissions import ClinicIsolationMixin, IsClinicalStaff, resolve_clinic_id
from apps.patients.models import Patient
from apps.queue_mgmt.models import QueueSession, QueueToken
from apps.queue_mgmt.serializers import (
    QueueSessionSerializer,
    QueueTokenSerializer,
    TVTokenSerializer,
)
from apps.queue_mgmt import services


class QueueSessionViewSet(ClinicIsolationMixin, viewsets.ModelViewSet):
    serializer_class = QueueSessionSerializer
    permission_classes = [IsAuthenticated, IsClinicalStaff]
    filterset_fields = ["clinic", "doctor", "date", "is_paused"]

    def get_queryset(self):
        return self.filter_clinic(QueueSession.objects.select_related("doctor", "clinic"))

    @action(detail=True, methods=["post"])
    def pause(self, request, pk=None):
        session = self.get_object()
        session.is_paused = True
        session.paused_reason = request.data.get("reason", "")
        session.save(update_fields=["is_paused", "paused_reason"])
        services.broadcast_queue(session.doctor_id, session.date)
        return Response(QueueSessionSerializer(session).data)

    @action(detail=True, methods=["post"])
    def resume(self, request, pk=None):
        session = self.get_object()
        session.is_paused = False
        session.paused_reason = ""
        session.save(update_fields=["is_paused", "paused_reason"])
        services.broadcast_queue(session.doctor_id, session.date)
        return Response(QueueSessionSerializer(session).data)

    @action(detail=True, methods=["post"])
    def call_next(self, request, pk=None):
        session = self.get_object()
        try:
            token = services.call_next(session)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(QueueTokenSerializer(token).data)


class QueueTokenViewSet(ClinicIsolationMixin, viewsets.ModelViewSet):
    serializer_class = QueueTokenSerializer
    permission_classes = [IsAuthenticated, IsClinicalStaff]
    filterset_fields = ["clinic", "doctor", "patient", "status", "is_emergency", "session"]
    http_method_names = ["get", "post", "head", "options", "patch"]

    def get_queryset(self):
        return self.filter_clinic(
            QueueToken.objects.select_related("patient", "doctor", "session")
        )

    def create(self, request, *args, **kwargs):
        clinic_id = request.data.get("clinic") or resolve_clinic_id(request)
        doctor_id = request.data.get("doctor")
        patient_id = request.data.get("patient")
        if not all([clinic_id, doctor_id, patient_id]):
            return Response(
                {"detail": "clinic, doctor, and patient are required."}, status=400
            )
        try:
            doctor = DoctorProfile.objects.get(pk=doctor_id, clinic_id=clinic_id)
            patient = Patient.objects.get(pk=patient_id, clinic_id=clinic_id)
            appointment = None
            appt_id = request.data.get("appointment")
            if appt_id:
                from apps.appointments.models import Appointment

                appointment = Appointment.objects.filter(
                    pk=appt_id, clinic_id=clinic_id
                ).first()
            token = services.issue_token(
                clinic=doctor.clinic,
                doctor=doctor,
                patient=patient,
                appointment=appointment,
                is_emergency=bool(request.data.get("is_emergency")),
                user=request.user,
            )
        except DoctorProfile.DoesNotExist:
            return Response({"detail": "Doctor not found in clinic."}, status=404)
        except Patient.DoesNotExist:
            return Response({"detail": "Patient not found in clinic."}, status=404)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(QueueTokenSerializer(token).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def skip(self, request, pk=None):
        token = services.skip_token(self.get_object())
        return Response(QueueTokenSerializer(token).data)

    @action(detail=True, methods=["post"])
    def recall(self, request, pk=None):
        token = services.recall_token(self.get_object())
        return Response(QueueTokenSerializer(token).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        token = self.get_object()
        token.status = QueueToken.Status.COMPLETED
        token.completed_at = timezone.now()
        token.save(update_fields=["status", "completed_at", "updated_at"])
        services.broadcast_queue(token.doctor_id, token.session.date)
        return Response(QueueTokenSerializer(token).data)

    @action(detail=True, methods=["post"])
    def emergency(self, request, pk=None):
        token = self.get_object()
        token.is_emergency = True
        token.priority = max(token.priority, 100)
        token.save(update_fields=["is_emergency", "priority", "updated_at"])
        services.broadcast_queue(token.doctor_id, token.session.date)
        return Response(QueueTokenSerializer(token).data)


class TVDisplayView(APIView):
    """Public TV board — no patient PII."""

    permission_classes = [AllowAny]

    def get(self, request, doctor_id):
        date = request.query_params.get("date") or timezone.localdate()
        tokens = QueueToken.objects.filter(doctor_id=doctor_id, session__date=date).exclude(
            status__in=[QueueToken.Status.COMPLETED, QueueToken.Status.CANCELLED]
        )
        now_serving = tokens.filter(status=QueueToken.Status.CALLED).first()
        session = QueueSession.objects.filter(doctor_id=doctor_id, date=date).first()
        return Response(
            {
                "is_paused": bool(session and session.is_paused),
                "now_serving": TVTokenSerializer(now_serving).data if now_serving else None,
                "tokens": TVTokenSerializer(tokens, many=True).data,
            }
        )
