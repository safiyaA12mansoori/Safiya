from django.urls import path

from . import views

app_name = "examinations"

urlpatterns = [
    path("", views.exam_list, name="list"),
    path("new/", views.exam_create, name="create"),
    path("history/", views.history, name="history"),
    path("programming/", views.programming_list, name="programming"),
    path("programming/new/", views.programming_create, name="programming_create"),
    path("programming/<int:pk>/", views.programming_detail, name="programming_detail"),
    path("<int:pk>/", views.exam_detail, name="detail"),
    path("<int:pk>/edit/", views.exam_edit, name="edit"),
    path("<int:pk>/questions/", views.add_question, name="add_question"),
    path("<int:pk>/questions/<int:link_id>/remove/", views.remove_question, name="remove_question"),
    path("<int:pk>/publish/", views.publish, name="publish"),
    path("<int:pk>/results/", views.toggle_results, name="toggle_results"),
    path("<int:pk>/take/", views.take, name="take"),
    path("<int:pk>/result/", views.result, name="result"),
]
