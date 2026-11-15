from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from ai_quiz.api import SaveQuizAnswer
from examinations.api import SaveExamAnswer
from notifications.api import RecentNotifications

handler403 = "core.views.error_403"
handler404 = "core.views.error_404"
handler500 = "core.views.error_500"

urlpatterns = [
    path("", include("core.urls")),
    path("", include("accounts.urls")),
    path("academics/", include("academics.urls")),
    path("students/", include("students.urls")),
    path("teachers/", include("teachers.urls")),
    path("learning/", include("learning.urls")),
    path("assignments/", include("assignments.urls")),
    path("attendance/", include("attendance.urls")),
    path("exams/", include("examinations.urls")),
    path("quizzes/", include("ai_quiz.urls")),
    path("analytics/", include("analytics.urls")),
    path("library/", include("library.urls")),
    path("fees/", include("fees.urls")),
    path("timetable/", include("timetable.urls")),
    path("placements/", include("placements.urls")),
    path("notifications/", include("notifications.urls")),
    path("reports/", include("reports.urls")),
    path("api/exams/attempts/<int:attempt_id>/save/", SaveExamAnswer.as_view(), name="api_exam_save"),
    path("api/quizzes/attempts/<int:attempt_id>/save/", SaveQuizAnswer.as_view(), name="api_quiz_save"),
    path("api/notifications/", RecentNotifications.as_view(), name="api_notifications"),
    path("django-admin/", admin.site.urls),
]

if settings.DEBUG:
    urlpatterns += static("media/profiles/", document_root=settings.MEDIA_ROOT / "profiles")
    urlpatterns += static("media/college/", document_root=settings.MEDIA_ROOT / "college")

admin.site.site_header = "Safiya College ERP"
admin.site.site_title = "Safiya College ERP"
