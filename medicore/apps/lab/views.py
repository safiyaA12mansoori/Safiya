from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import ClinicIsolationMixin, IsClinicalStaff
from apps.lab.models import LabOrder, LabTest
from apps.lab.serializers import LabOrderSerializer, LabTestSerializer


class LabTestViewSet(ClinicIsolationMixin, viewsets.ModelViewSet):
    serializer_class = LabTestSerializer
    permission_classes = [IsAuthenticated, IsClinicalStaff]
    search_fields = ["name", "code"]
    filterset_fields = ["clinic", "is_active"]

    def get_queryset(self):
        return self.filter_clinic(LabTest.objects.all())


class LabOrderViewSet(ClinicIsolationMixin, viewsets.ModelViewSet):
    serializer_class = LabOrderSerializer
    permission_classes = [IsAuthenticated, IsClinicalStaff]
    filterset_fields = ["clinic", "patient", "test", "status"]
    search_fields = ["patient__first_name", "patient__last_name", "test__name"]

    def get_queryset(self):
        return self.filter_clinic(LabOrder.objects.select_related("patient", "test"))

    def perform_create(self, serializer):
        serializer.save(ordered_by=self.request.user)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        order = self.get_object()
        order.status = LabOrder.Status.COMPLETED
        order.result_text = request.data.get("result_text", order.result_text)
        order.completed_at = timezone.now()
        order.save(update_fields=["status", "result_text", "completed_at"])
        return Response(LabOrderSerializer(order).data)
