from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.billing.models import Invoice, Payment
from apps.billing.serializers import InvoiceSerializer, PaymentSerializer
from apps.core.permissions import ClinicIsolationMixin, IsFinanceStaff


class InvoiceViewSet(ClinicIsolationMixin, viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, IsFinanceStaff]
    search_fields = ["invoice_number", "patient__first_name", "patient__last_name"]
    filterset_fields = ["clinic", "patient", "status"]

    def get_queryset(self):
        return self.filter_clinic(
            Invoice.objects.prefetch_related("items", "payments").select_related("patient")
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def issue(self, request, pk=None):
        invoice = self.get_object()
        invoice.status = Invoice.Status.ISSUED
        invoice.issued_at = timezone.now()
        invoice.save(update_fields=["status", "issued_at", "updated_at"])
        return Response(InvoiceSerializer(invoice).data)

    @action(detail=True, methods=["post"])
    def void(self, request, pk=None):
        invoice = self.get_object()
        invoice.status = Invoice.Status.VOID
        invoice.save(update_fields=["status", "updated_at"])
        return Response(InvoiceSerializer(invoice).data)


class PaymentViewSet(ClinicIsolationMixin, viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, IsFinanceStaff]
    filterset_fields = ["clinic", "invoice", "method"]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return self.filter_clinic(Payment.objects.select_related("invoice"))

    def perform_create(self, serializer):
        payment = serializer.save(received_by=self.request.user)
        invoice = payment.invoice
        paid = invoice.amount_paid
        total = invoice.subtotal
        if paid <= 0:
            pass
        elif paid >= total:
            invoice.status = Invoice.Status.PAID
        else:
            invoice.status = Invoice.Status.PARTIALLY_PAID
        invoice.save(update_fields=["status", "updated_at"])
