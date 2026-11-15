from django.contrib import admin

from .models import TeacherAssignment, TeacherProfile

admin.site.register(TeacherProfile)
admin.site.register(TeacherAssignment)
