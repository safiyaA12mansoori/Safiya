from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.clinics.models import (
    Clinic,
    ClinicMembership,
    DoctorAvailability,
    DoctorLeave,
    DoctorProfile,
)
from apps.clinics.serializers import (
    ClinicMembershipSerializer,
    ClinicSerializer,
    DoctorAvailabilitySerializer,
    DoctorLeaveSerializer,
    DoctorProfileSerializer,
)
from apps.core.permissions import ClinicIsolationMixin, IsClinicStaff, user_clinic_ids


class ClinicViewSet(viewsets.ModelViewSet):
    serializer_class = ClinicSerializer
    permission_classes = [IsAuthenticated, IsClinicStaff]
    search_fields = ["name", "code", "city"]
    filterset_fields = ["is_active", "city", "state"]

    def get_queryset(self):
        qs = Clinic.objects.all()
        user = self.request.user
        if user.is_super_admin:
            return qs
        return qs.filter(id__in=user_clinic_ids(user))


class ClinicMembershipViewSet(ClinicIsolationMixin, viewsets.ModelViewSet):
    serializer_class = ClinicMembershipSerializer
    permission_classes = [IsAuthenticated, IsClinicStaff]
    clinic_field = "clinic_id"
    filterset_fields = ["clinic", "role", "is_active"]

    def get_queryset(self):
        return self.filter_clinic(ClinicMembership.objects.select_related("user", "clinic"))


class DoctorProfileViewSet(ClinicIsolationMixin, viewsets.ModelViewSet):
    serializer_class = DoctorProfileSerializer
    permission_classes = [IsAuthenticated, IsClinicStaff]
    clinic_field = "clinic_id"
    search_fields = ["user__first_name", "user__last_name", "specialty"]
    filterset_fields = ["clinic", "is_accepting_patients", "specialty"]

    def get_queryset(self):
        return self.filter_clinic(DoctorProfile.objects.select_related("user", "clinic"))


class DoctorAvailabilityViewSet(viewsets.ModelViewSet):
    serializer_class = DoctorAvailabilitySerializer
    permission_classes = [IsAuthenticated, IsClinicStaff]
    filterset_fields = ["doctor", "weekday", "is_active"]

    def get_queryset(self):
        qs = DoctorAvailability.objects.select_related("doctor")
        allowed = user_clinic_ids(self.request.user)
        if self.request.user.is_super_admin:
            return qs
        return qs.filter(doctor__clinic_id__in=allowed)


class DoctorLeaveViewSet(viewsets.ModelViewSet):
    serializer_class = DoctorLeaveSerializer
    permission_classes = [IsAuthenticated, IsClinicStaff]
    filterset_fields = ["doctor"]

    def get_queryset(self):
        qs = DoctorLeave.objects.select_related("doctor")
        allowed = user_clinic_ids(self.request.user)
        if self.request.user.is_super_admin:
            return qs
        return qs.filter(doctor__clinic_id__in=allowed)
