from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from apps.accounts.models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ("username", "email", "role", "is_active", "is_staff")
    list_filter = ("role", "is_active", "is_staff")
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("MediCore", {"fields": ("role", "phone", "must_change_password")}),
    )
    add_fieldsets = DjangoUserAdmin.add_fieldsets + (
        ("MediCore", {"fields": ("role", "phone")}),
    )
