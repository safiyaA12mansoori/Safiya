from django.contrib import admin

from apps.emr.models import Encounter, Prescription, PrescriptionItem

admin.site.register(Encounter)
admin.site.register(Prescription)
admin.site.register(PrescriptionItem)
