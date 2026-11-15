from django.contrib import admin

from .models import BookCategory, BookIssue, LibraryBook

admin.site.register(BookCategory)
admin.site.register(LibraryBook)
admin.site.register(BookIssue)
