from django.contrib import admin

from .models import Applicant, Application, Interview, JobOpening


@admin.register(JobOpening)
class JobOpeningAdmin(admin.ModelAdmin):
    list_display = ("title", "department", "status", "min_education", "min_experience_years")
    list_filter = ("status", "department")
    search_fields = ("title", "department", "required_skills")


@admin.register(Applicant)
class ApplicantAdmin(admin.ModelAdmin):
    list_display = ("full_name", "email", "education", "experience_years", "location")
    search_fields = ("full_name", "email", "skills")


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ("applicant", "job", "status", "screened_at")
    list_filter = ("status",)
    search_fields = ("applicant__full_name", "job__title")


@admin.register(Interview)
class InterviewAdmin(admin.ModelAdmin):
    list_display = ("application", "scheduled_at", "interviewer_name", "status")
    list_filter = ("status",)
