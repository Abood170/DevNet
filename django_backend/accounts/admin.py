from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("Role & Status", {"fields": ("role", "is_disabled")}),
    )
    list_display = ("username", "email", "role", "is_disabled", "is_staff", "is_superuser")
    list_filter = ("role", "is_disabled", "is_staff", "is_superuser")
