from django.contrib import admin

from apps.clinics.models import (
    Clinic,
    ClinicMembership,
    DoctorAvailability,
    DoctorLeave,
    DoctorProfile,
)

admin.site.register(Clinic)
admin.site.register(ClinicMembership)
admin.site.register(DoctorProfile)
admin.site.register(DoctorAvailability)
admin.site.register(DoctorLeave)
