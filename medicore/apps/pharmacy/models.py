from django.db import models

from apps.clinics.models import Clinic


class Medicine(models.Model):
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="medicines")
    name = models.CharField(max_length=200)
    generic_name = models.CharField(max_length=200, blank=True)
    form = models.CharField(max_length=64, blank=True)
    strength = models.CharField(max_length=64, blank=True)
    sku = models.CharField(max_length=64, blank=True)
    stock_quantity = models.PositiveIntegerField(default=0)
    reorder_level = models.PositiveIntegerField(default=10)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        unique_together = ("clinic", "name", "strength")

    def __str__(self):
        return f"{self.name} {self.strength}".strip()


class StockMovement(models.Model):
    class Kind(models.TextChoices):
        IN = "in", "Stock In"
        OUT = "out", "Stock Out"
        ADJUST = "adjust", "Adjustment"

    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE, related_name="movements")
    kind = models.CharField(max_length=10, choices=Kind.choices)
    quantity = models.IntegerField()
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
