from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.queue_mgmt.views import QueueSessionViewSet, QueueTokenViewSet, TVDisplayView

router = DefaultRouter()
router.register(r"sessions", QueueSessionViewSet, basename="queue-session")
router.register(r"tokens", QueueTokenViewSet, basename="queue-token")

urlpatterns = router.urls + [
    path("tv/<int:doctor_id>/", TVDisplayView.as_view(), name="queue-tv"),
]
