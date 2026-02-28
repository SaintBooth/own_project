"""Users admin."""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from apps.users.models import ApiKey, OTPRequest, RefreshToken, SellerProfile, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["username", "email", "role", "is_active", "is_deleted", "created_at"]
    list_filter = ["role", "is_active", "is_deleted", "is_staff"]
    search_fields = ["username", "email"]
    ordering = ["-created_at"]
    readonly_fields = ["id", "created_at", "updated_at", "deleted_at"]

    fieldsets = (
        (None, {"fields": ("id", "username", "email", "password")}),
        ("Роль", {"fields": ("role",)}),
        ("Права", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("152-ФЗ", {"fields": ("consent_pd_at", "is_deleted", "deleted_at")}),
        ("Медиа", {"fields": ("avatar_object_key",)}),
        ("Даты", {"fields": ("created_at", "updated_at", "last_login")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("username", "email", "password1", "password2", "role"),
        }),
    )


@admin.register(SellerProfile)
class SellerProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "inn", "legal_type", "kyc_status", "created_at"]
    list_filter = ["kyc_status", "legal_type"]
    search_fields = ["user__username", "user__email", "inn"]
    readonly_fields = ["created_at", "updated_at", "kyc_verified_at"]

    actions = ["approve_kyc", "reject_kyc"]

    @admin.action(description="Одобрить KYC вручную")
    def approve_kyc(self, request, queryset):
        from django.utils import timezone
        queryset.update(kyc_status="VERIFIED", kyc_verified_at=timezone.now())

    @admin.action(description="Отклонить KYC")
    def reject_kyc(self, request, queryset):
        queryset.update(kyc_status="REJECTED")


@admin.register(ApiKey)
class ApiKeyAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "is_active", "created_at", "last_used_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "user__username"]
    readonly_fields = ["id", "key_hash", "created_at", "last_used_at"]

    # key_hash доступен только для чтения — plaintext не хранится
    def get_readonly_fields(self, request, obj=None):
        if obj:
            return self.readonly_fields + ["user"]
        return self.readonly_fields


@admin.register(OTPRequest)
class OTPRequestAdmin(admin.ModelAdmin):
    list_display = ["email", "ip_address", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["email"]
    readonly_fields = ["email", "ip_address", "created_at"]


@admin.register(RefreshToken)
class RefreshTokenAdmin(admin.ModelAdmin):
    list_display = ["user", "jti", "is_revoked", "created_at", "expires_at"]
    list_filter = ["is_revoked"]
    search_fields = ["user__username", "user__email"]
    readonly_fields = ["id", "jti", "created_at"]
