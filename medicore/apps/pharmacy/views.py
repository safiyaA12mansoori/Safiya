from django.db import transaction
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import ClinicIsolationMixin, IsClinicStaff
from apps.pharmacy.models import Medicine, StockMovement
from apps.pharmacy.serializers import MedicineSerializer, StockMovementSerializer


class MedicineViewSet(ClinicIsolationMixin, viewsets.ModelViewSet):
    serializer_class = MedicineSerializer
    permission_classes = [IsAuthenticated, IsClinicStaff]
    search_fields = ["name", "generic_name", "sku"]
    filterset_fields = ["clinic", "is_active"]

    def get_queryset(self):
        return self.filter_clinic(Medicine.objects.all())


class StockMovementViewSet(viewsets.ModelViewSet):
    serializer_class = StockMovementSerializer
    permission_classes = [IsAuthenticated, IsClinicStaff]
    filterset_fields = ["medicine", "kind"]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        from apps.core.permissions import user_clinic_ids

        qs = StockMovement.objects.select_related("medicine")
        if self.request.user.is_super_admin:
            return qs
        return qs.filter(medicine__clinic_id__in=user_clinic_ids(self.request.user))

    @transaction.atomic
    def perform_create(self, serializer):
        movement = serializer.save()
        med = movement.medicine
        if movement.kind == StockMovement.Kind.IN:
            med.stock_quantity += abs(movement.quantity)
        elif movement.kind == StockMovement.Kind.OUT:
            med.stock_quantity = max(0, med.stock_quantity - abs(movement.quantity))
        else:
            med.stock_quantity = max(0, med.stock_quantity + movement.quantity)
        med.save(update_fields=["stock_quantity", "updated_at"])
