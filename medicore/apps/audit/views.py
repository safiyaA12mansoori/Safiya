from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated

from apps.accounts.models import Role
from apps.audit.models import AuditLog
from apps.audit.serializers import AuditLogSerializer
from apps.core.permissions import ClinicIsolationMixin, IsAuthenticatedRole


class IsAuditReader(IsAuthenticatedRole):
    allowed_roles = [Role.SUPER_ADMIN, Role.CLINIC_OWNER]


class AuditLogViewSet(ClinicIsolationMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsAuditReader]
    filterset_fields = ["clinic", "action", "entity"]
    search_fields = ["path", "entity", "action"]

    def get_queryset(self):
        return self.filter_clinic(AuditLog.objects.select_related("user", "clinic"))
