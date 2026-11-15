from django.urls import path

from . import views

app_name = "library"

urlpatterns = [
    path("", views.books, name="books"),
    path("new/", views.book_create, name="book_create"),
    path("<int:pk>/edit/", views.book_edit, name="book_edit"),
    path("categories/new/", views.category_create, name="category_create"),
    path("issues/", views.issues, name="issues"),
    path("issues/<int:pk>/return/", views.do_return, name="return"),
]
