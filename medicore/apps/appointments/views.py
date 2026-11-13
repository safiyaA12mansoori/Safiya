from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.appointments.models import Appointment
from apps.appointments.serializers import AppointmentSerializer
from apps.core.permissions import ClinicIsolationMixin, IsClinicalStaff


class AppointmentViewSet(ClinicIsolationMixin, viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated, IsClinicalStaff]
    search_fields = ["patient__first_name", "patient__last_name", "reason"]
    filterset_fields = ["clinic", "doctor", "patient", "status"]
    ordering_fields = ["start_time", "created_at"]

    def get_queryset(self):
        return self.filter_clinic(
            Appointment.objects.select_related("patient", "doctor", "doctor__user", "clinic")
        )

    def perform_create(self, serializer):
        try:
            serializer.save(created_by=self.request.user)
        except DjangoValidationError as exc:
            raise self._to_drf(exc)

    def perform_update(self, serializer):
        try:
            serializer.save()
        except DjangoValidationError as exc:
            raise self._to_drf(exc)

    @staticmethod
    def _to_drf(exc):
        from rest_framework.exceptions import ValidationError

        if hasattr(exc, "message_dict"):
            return ValidationError(exc.message_dict)
        return ValidationError(exc.messages if hasattr(exc, "messages") else str(exc))

    @action(detail=True, methods=["post"])
    def set_status(self, request, pk=None):
        appt = self.get_object()
        new_status = request.data.get("status")
        if new_status not in Appointment.Status.values:
            return Response({"detail": "Invalid status."}, status=400)
        appt.status = new_status
        try:
            appt.save()
        except DjangoValidationError as exc:
            raise self._to_drf(exc)
        return Response(AppointmentSerializer(appt).data)

    @action(detail=False, methods=["get"])
    def today(self, request):
        from django.utils import timezone

        today = timezone.localdate()
        qs = self.get_queryset().filter(start_time__date=today)
        page = self.paginate_queryset(qs)
        ser = AppointmentSerializer(page or qs, many=True)
        if page is not None:
            return self.get_paginated_response(ser.data)
        return Response(ser.data)
