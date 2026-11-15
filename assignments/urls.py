from django.urls import path

from . import views

app_name = "assignments"

urlpatterns = [
    path("", views.assignment_list, name="list"),
    path("new/", views.assignment_create, name="create"),
    path("<int:pk>/", views.assignment_detail, name="detail"),
    path("<int:pk>/edit/", views.assignment_edit, name="edit"),
    path("<int:pk>/submit/", views.assignment_submit, name="submit"),
    path("<int:pk>/brief/", views.download_brief, name="brief"),
    path("<int:pk>/grade/<int:submission_id>/", views.assignment_grade, name="grade"),
    path("<int:pk>/files/<int:submission_id>/", views.download_submission, name="submission_file"),
]
