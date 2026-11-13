from rest_framework.routers import DefaultRouter

from apps.patients.views import (
    PatientDocumentViewSet,
    PatientFeedbackViewSet,
    PatientViewSet,
)

router = DefaultRouter()
router.register(r"documents", PatientDocumentViewSet, basename="patient-document")
router.register(r"feedback", PatientFeedbackViewSet, basename="patient-feedback")
router.register(r"", PatientViewSet, basename="patient")

urlpatterns = router.urls
