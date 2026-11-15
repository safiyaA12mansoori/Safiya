from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import AdminProfile, User


@admin.register(User)
class UserAdmin(UserAdmin):
    list_display = ("username", "email", "role", "is_active", "is_staff")
    list_filter = ("role", "is_active")
    fieldsets = UserAdmin.fieldsets + (("Campus", {"fields": ("role", "phone", "photo")}),)


admin.site.register(AdminProfile)
