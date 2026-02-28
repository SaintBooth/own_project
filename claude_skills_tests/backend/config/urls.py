"""PromptSpace URL configuration."""
from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from ninja import NinjaAPI

from apps.core.api import router as health_router
from apps.users.api.auth import router as auth_router
from apps.prompts.api.catalog import router as catalog_router

api = NinjaAPI(
    title="PromptSpace API",
    version="1.0.0",
    docs_url=getattr(settings, "NINJA_DOCS_URL", None),
)

api.add_router("/", health_router)
api.add_router("/auth", auth_router)
api.add_router("/catalog", catalog_router)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", api.urls),
]

if settings.DEBUG:
    try:
        import debug_toolbar
        urlpatterns = [path("__debug__/", include(debug_toolbar.urls))] + urlpatterns
    except ImportError:
        pass
