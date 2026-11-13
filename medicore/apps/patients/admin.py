from django.contrib import admin

from apps.patients.models import Patient, PatientDocument, PatientFeedback

admin.site.register(Patient)
admin.site.register(PatientDocument)
admin.site.register(PatientFeedback)
