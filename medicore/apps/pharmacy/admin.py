from django.contrib import admin

from apps.pharmacy.models import Medicine, StockMovement

admin.site.register(Medicine)
admin.site.register(StockMovement)
