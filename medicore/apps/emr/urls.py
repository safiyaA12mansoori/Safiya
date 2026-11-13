from rest_framework.routers import DefaultRouter

from apps.emr.views import EncounterViewSet, PrescriptionViewSet

router = DefaultRouter()
router.register(r"encounters", EncounterViewSet, basename="encounter")
router.register(r"prescriptions", PrescriptionViewSet, basename="prescription")

urlpatterns = router.urls
