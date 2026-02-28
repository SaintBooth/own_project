"""Настройки для локальной разработки."""
from .base import *  # noqa: F401, F403

DEBUG = True

ALLOWED_HOSTS = ["*"]

# ── Email: выводить в консоль ──────────────────────────────────────────────
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# ── Debug Toolbar ──────────────────────────────────────────────────────────
INSTALLED_APPS += ["debug_toolbar"]  # noqa: F405
MIDDLEWARE.insert(0, "debug_toolbar.middleware.DebugToolbarMiddleware")  # noqa: F405
INTERNAL_IPS = ["127.0.0.1"]

# ── CORS: разрешить все origin в dev ──────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = True

# ── Django Ninja: docs доступны в dev ─────────────────────────────────────
NINJA_DOCS_URL = "/docs"  # Относительно mount point → итого /api/v1/docs

# ── Celery: выполнять синхронно в тестах ──────────────────────────────────
CELERY_TASK_ALWAYS_EAGER = False  # Включи True для отладки без брокера
