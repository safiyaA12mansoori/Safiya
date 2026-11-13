from django.contrib import admin

from apps.lab.models import LabOrder, LabTest

admin.site.register(LabTest)
admin.site.register(LabOrder)
