from rest_framework.routers import DefaultRouter

from apps.pharmacy.views import MedicineViewSet, StockMovementViewSet

router = DefaultRouter()
router.register(r"medicines", MedicineViewSet, basename="medicine")
router.register(r"stock-movements", StockMovementViewSet, basename="stock-movement")

urlpatterns = router.urls
