from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import ClinicIsolationMixin, IsClinicalStaff, IsClinicStaff
from apps.patients.models import Patient, PatientDocument, PatientFeedback
from apps.patients.serializers import (
    PatientDocumentSerializer,
    PatientFeedbackSerializer,
    PatientSerializer,
)
from apps.patients.services import find_duplicate_patients, next_mrn


class PatientViewSet(ClinicIsolationMixin, viewsets.ModelViewSet):
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated, IsClinicStaff]
    search_fields = [
        "first_name",
        "last_name",
        "phone",
        "email",
        "mrn",
        "city",
    ]
    filterset_fields = ["clinic", "gender", "is_active", "blood_group"]
    ordering_fields = ["created_at", "last_name", "mrn"]

    def get_queryset(self):
        return self.filter_clinic(Patient.objects.select_related("clinic"))

    def create(self, request, *args, **kwargs):
        force = str(request.data.get("force", "")).lower() in {"1", "true", "yes"}
        clinic_id = request.data.get("clinic") or self.get_clinic_id()
        if not clinic_id:
            return Response({"detail": "Clinic is required."}, status=400)
        dupes = find_duplicate_patients(
            clinic_id,
            phone=request.data.get("phone"),
            email=request.data.get("email") or None,
            first_name=request.data.get("first_name"),
            last_name=request.data.get("last_name"),
            date_of_birth=request.data.get("date_of_birth"),
        )
        if dupes.exists() and not force:
            return Response(
                {
                    "detail": "Possible duplicate patient(s) found. Pass force=true to create anyway.",
                    "duplicates": PatientSerializer(dupes[:5], many=True).data,
                },
                status=status.HTTP_409_CONFLICT,
            )
        data = (
            request.data.copy()
            if hasattr(request.data, "copy")
            else {**dict(request.data)}
        )
        data["clinic"] = clinic_id
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        clinic = serializer.validated_data["clinic"]
        patient = serializer.save(created_by=request.user, mrn=next_mrn(clinic))
        return Response(PatientSerializer(patient).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def check_duplicates(self, request):
        clinic_id = self.get_clinic_id()
        dupes = find_duplicate_patients(
            clinic_id,
            phone=request.query_params.get("phone"),
            email=request.query_params.get("email"),
            first_name=request.query_params.get("first_name"),
            last_name=request.query_params.get("last_name"),
            date_of_birth=request.query_params.get("date_of_birth"),
        )
        return Response({"count": dupes.count(), "results": PatientSerializer(dupes[:20], many=True).data})

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        patient = self.get_object()
        from apps.appointments.serializers import AppointmentSerializer
        from apps.billing.serializers import InvoiceSerializer
        from apps.emr.serializers import EncounterSerializer, PrescriptionSerializer

        return Response(
            {
                "patient": PatientSerializer(patient).data,
                "appointments": AppointmentSerializer(
                    patient.appointments.order_by("-start_time")[:50], many=True
                ).data,
                "encounters": EncounterSerializer(
                    patient.encounters.order_by("-created_at")[:50], many=True
                ).data,
                "prescriptions": PrescriptionSerializer(
                    patient.prescriptions.order_by("-created_at")[:50], many=True
                ).data,
                "invoices": InvoiceSerializer(
                    patient.invoices.order_by("-created_at")[:50], many=True
                ).data,
            }
        )


class PatientDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = PatientDocumentSerializer
    permission_classes = [IsAuthenticated, IsClinicalStaff]
    filterset_fields = ["patient", "document_type"]

    def get_queryset(self):
        from apps.core.permissions import user_clinic_ids

        qs = PatientDocument.objects.select_related("patient")
        if self.request.user.is_super_admin:
            return qs
        return qs.filter(patient__clinic_id__in=user_clinic_ids(self.request.user))

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class PatientFeedbackViewSet(ClinicIsolationMixin, viewsets.ModelViewSet):
    serializer_class = PatientFeedbackSerializer
    permission_classes = [IsAuthenticated, IsClinicStaff]
    filterset_fields = ["clinic", "rating"]

    def get_queryset(self):
        return self.filter_clinic(PatientFeedback.objects.all())
