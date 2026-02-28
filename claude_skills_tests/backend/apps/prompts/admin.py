"""Prompts admin — PromptSpace."""
from django.contrib import admin

from apps.prompts.models import Category, Favorite, Prompt, PromptAccess, Tag


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "is_active", "order"]
    prepopulated_fields = {"slug": ("name",)}
    list_editable = ["is_active", "order"]
    search_fields = ["name"]


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "created_at"]
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ["name"]


@admin.register(Prompt)
class PromptAdmin(admin.ModelAdmin):
    list_display = ["title", "seller", "category", "status", "price", "published_at", "created_at"]
    list_filter = ["status", "is_free", "category"]
    search_fields = ["title", "short_description", "slug"]
    readonly_fields = ["id", "slug", "content_hash", "purchases_count", "views_count", "created_at", "updated_at"]
    raw_id_fields = ["seller", "category"]
    filter_horizontal = ["tags"]
    date_hierarchy = "created_at"


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ["user", "prompt", "created_at"]
    raw_id_fields = ["user", "prompt"]


@admin.register(PromptAccess)
class PromptAccessAdmin(admin.ModelAdmin):
    list_display = ["user", "prompt", "purchase", "created_at"]
    raw_id_fields = ["user", "prompt", "purchase"]
