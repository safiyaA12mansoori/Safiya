from django.urls import path

from . import views

app_name = "placements"

urlpatterns = [
    path("", views.jobs, name="jobs"),
    path("companies/new/", views.company_create, name="company_create"),
    path("jobs/new/", views.job_create, name="job_create"),
    path("<int:pk>/apply/", views.apply, name="apply"),
    path("applications/", views.applications, name="applications"),
    path("applications/<int:pk>/", views.update_application, name="update_application"),
]
