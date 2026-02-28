"""Настройки для staging окружения."""
from .base import *  # noqa: F401, F403

DEBUG = False

# ── CORS: только наш домен ────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = [
    "https://staging.promptspace.ru",
]

# ── Sentry ────────────────────────────────────────────────────────────────
import sentry_sdk  # noqa: E402

if SENTRY_DSN:  # noqa: F405
    sentry_sdk.init(
        dsn=SENTRY_DSN,  # noqa: F405
        environment="staging",
        traces_sample_rate=0.3,
    )

# ── Django Ninja: docs доступны на staging для QA ─────────────────────────
NINJA_DOCS_URL = "/api/docs"

# ── Безопасность ──────────────────────────────────────────────────────────
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
