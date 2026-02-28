"""Настройки для production окружения."""
from .base import *  # noqa: F401, F403

DEBUG = False

# ── Безопасность ──────────────────────────────────────────────────────────
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

# ── CORS: только production домен ─────────────────────────────────────────
CORS_ALLOWED_ORIGINS = [
    "https://promptspace.ru",
    "https://www.promptspace.ru",
]

# ── Django Ninja: docs ОТКЛЮЧЕНЫ в production (§27.2) ────────────────────
NINJA_DOCS_URL = None  # type: ignore[assignment]

# ── Sentry ────────────────────────────────────────────────────────────────
import sentry_sdk  # noqa: E402

if SENTRY_DSN:  # noqa: F405
    sentry_sdk.init(
        dsn=SENTRY_DSN,  # noqa: F405
        environment="production",
        traces_sample_rate=0.1,
    )
