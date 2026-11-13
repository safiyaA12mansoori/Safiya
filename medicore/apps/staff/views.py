from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import ClinicIsolationMixin, IsClinicStaff
from apps.staff.models import StaffProfile
from apps.staff.serializers import StaffProfileSerializer


class StaffProfileViewSet(ClinicIsolationMixin, viewsets.ModelViewSet):
    serializer_class = StaffProfileSerializer
    permission_classes = [IsAuthenticated, IsClinicStaff]
    search_fields = ["employee_id", "user__first_name", "user__last_name", "department"]
    filterset_fields = ["clinic", "role", "is_active", "department"]

    def get_queryset(self):
        return self.filter_clinic(StaffProfile.objects.select_related("user", "clinic"))
