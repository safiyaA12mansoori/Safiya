from django.http import HttpResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import ClinicIsolationMixin, IsClinicalStaff, IsDoctorOrAbove
from apps.emr.models import Encounter, Prescription
from apps.emr.serializers import EncounterSerializer, PrescriptionSerializer
from apps.emr.pdf import build_prescription_pdf


class EncounterViewSet(ClinicIsolationMixin, viewsets.ModelViewSet):
    serializer_class = EncounterSerializer
    permission_classes = [IsAuthenticated, IsClinicalStaff]
    filterset_fields = ["clinic", "patient", "doctor"]
    search_fields = ["chief_complaint", "diagnosis"]

    def get_queryset(self):
        return self.filter_clinic(Encounter.objects.select_related("patient", "doctor"))


class PrescriptionViewSet(ClinicIsolationMixin, viewsets.ModelViewSet):
    serializer_class = PrescriptionSerializer
    permission_classes = [IsAuthenticated, IsDoctorOrAbove]
    filterset_fields = ["clinic", "patient", "doctor", "status"]

    def get_queryset(self):
        return self.filter_clinic(
            Prescription.objects.prefetch_related("items").select_related("patient", "doctor")
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        rx = self.get_object()
        pdf_bytes = build_prescription_pdf(rx)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="prescription-{rx.id}.pdf"'
        return response
