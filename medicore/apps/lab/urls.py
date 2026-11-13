from rest_framework.routers import DefaultRouter

from apps.lab.views import LabOrderViewSet, LabTestViewSet

router = DefaultRouter()
router.register(r"tests", LabTestViewSet, basename="lab-test")
router.register(r"orders", LabOrderViewSet, basename="lab-order")

urlpatterns = router.urls
