from django.contrib import admin

from .models import Company, Placement, PlacementApplication

admin.site.register(Company)
admin.site.register(Placement)
admin.site.register(PlacementApplication)
