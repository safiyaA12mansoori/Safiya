from django.urls import path

from . import views

app_name = "ai_quiz"

urlpatterns = [
    path("", views.quiz_list, name="list"),
    path("generate/", views.generate, name="generate"),
    path("adaptive/", views.adaptive, name="adaptive"),
    path("adaptive/me/", views.adaptive_student, name="adaptive_me"),
    path("bank/", views.bank, name="bank"),
    path("bank/new/", views.bank_create, name="bank_create"),
    path("bank/<int:pk>/delete/", views.bank_delete, name="bank_delete"),
    path("<int:pk>/review/", views.review, name="review"),
    path("<int:pk>/preview/", views.preview, name="preview"),
    path("<int:pk>/publish/", views.publish, name="publish"),
    path("<int:pk>/regenerate/", views.regenerate_all, name="regenerate_all"),
    path("<int:pk>/questions/new/", views.add_question, name="add_question"),
    path("<int:pk>/questions/<int:question_id>/edit/", views.edit_question, name="edit_question"),
    path("<int:pk>/questions/<int:question_id>/delete/", views.delete_question, name="delete_question"),
    path("<int:pk>/questions/<int:question_id>/regenerate/", views.regenerate_one, name="regenerate_one"),
    path("<int:pk>/take/", views.take, name="take"),
    path("<int:pk>/result/", views.result, name="result"),
]
