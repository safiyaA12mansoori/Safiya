from django.urls import path

from . import views

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("jobs/", views.job_list, name="job_list"),
    path("jobs/<int:pk>/edit/", views.job_edit, name="job_edit"),
    path("applicants/", views.applicant_list, name="applicant_list"),
    path("applications/", views.application_list, name="application_list"),
    path("applications/<int:pk>/screen/", views.screen_one, name="screen_one"),
    path("interviews/", views.interview_list, name="interview_list"),
]
