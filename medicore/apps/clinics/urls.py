from rest_framework.routers import DefaultRouter

from apps.clinics.views import (
    ClinicMembershipViewSet,
    ClinicViewSet,
    DoctorAvailabilityViewSet,
    DoctorLeaveViewSet,
    DoctorProfileViewSet,
)

router = DefaultRouter()
router.register(r"memberships", ClinicMembershipViewSet, basename="membership")
router.register(r"doctors", DoctorProfileViewSet, basename="doctor")
router.register(r"availability", DoctorAvailabilityViewSet, basename="availability")
router.register(r"leaves", DoctorLeaveViewSet, basename="leave")
router.register(r"", ClinicViewSet, basename="clinic")

urlpatterns = router.urls
