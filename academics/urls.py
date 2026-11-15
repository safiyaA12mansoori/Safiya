from django.urls import path

from . import views

app_name = "academics"

urlpatterns = [
    path("sessions/", views.SessionList.as_view(), name="sessions"),
    path("sessions/new/", views.SessionCreate.as_view(), name="sessions_create"),
    path("sessions/<int:pk>/edit/", views.SessionUpdate.as_view(), name="sessions_edit"),
    path("sessions/<int:pk>/delete/", views.SessionDelete.as_view(), name="sessions_delete"),
    path("departments/", views.DepartmentList.as_view(), name="departments"),
    path("departments/new/", views.DepartmentCreate.as_view(), name="departments_create"),
    path("departments/<int:pk>/edit/", views.DepartmentUpdate.as_view(), name="departments_edit"),
    path("departments/<int:pk>/delete/", views.DepartmentDelete.as_view(), name="departments_delete"),
    path("courses/", views.CourseList.as_view(), name="courses"),
    path("courses/new/", views.CourseCreate.as_view(), name="courses_create"),
    path("courses/<int:pk>/edit/", views.CourseUpdate.as_view(), name="courses_edit"),
    path("courses/<int:pk>/delete/", views.CourseDelete.as_view(), name="courses_delete"),
    path("classes/", views.ClassList.as_view(), name="classes"),
    path("classes/new/", views.ClassCreate.as_view(), name="classes_create"),
    path("classes/<int:pk>/edit/", views.ClassUpdate.as_view(), name="classes_edit"),
    path("classes/<int:pk>/delete/", views.ClassDelete.as_view(), name="classes_delete"),
    path("subjects/", views.SubjectList.as_view(), name="subjects"),
    path("subjects/new/", views.SubjectCreate.as_view(), name="subject_create"),
    path("subjects/<int:pk>/edit/", views.SubjectUpdate.as_view(), name="subject_edit"),
    path("subjects/<int:pk>/delete/", views.SubjectDelete.as_view(), name="subject_delete"),
    path("subjects/<int:pk>/", views.subject_detail, name="subject_detail"),
    path("subjects/<int:pk>/topics/<int:topic_id>/toggle/", views.toggle_topic, name="toggle_topic"),
    path("units/", views.UnitList.as_view(), name="units"),
    path("units/new/", views.UnitCreate.as_view(), name="units_create"),
    path("units/<int:pk>/edit/", views.UnitUpdate.as_view(), name="units_edit"),
    path("units/<int:pk>/delete/", views.UnitDelete.as_view(), name="units_delete"),
    path("chapters/", views.ChapterList.as_view(), name="chapters"),
    path("chapters/new/", views.ChapterCreate.as_view(), name="chapters_create"),
    path("chapters/<int:pk>/edit/", views.ChapterUpdate.as_view(), name="chapters_edit"),
    path("chapters/<int:pk>/delete/", views.ChapterDelete.as_view(), name="chapters_delete"),
    path("topics/", views.TopicList.as_view(), name="topics"),
    path("topics/new/", views.TopicCreate.as_view(), name="topics_create"),
    path("topics/<int:pk>/edit/", views.TopicUpdate.as_view(), name="topics_edit"),
    path("topics/<int:pk>/delete/", views.TopicDelete.as_view(), name="topics_delete"),
]
