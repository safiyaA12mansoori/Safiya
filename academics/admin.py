from django.contrib import admin

from .models import AcademicSession, Chapter, ClassRoom, Course, Department, Subject, Topic, Unit

for model in (Department, AcademicSession, Course, ClassRoom, Subject, Unit, Chapter, Topic):
    admin.site.register(model)
