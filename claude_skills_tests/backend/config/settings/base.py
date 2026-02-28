"""
PromptSpace — Django Base Settings
Источник: promptspace-release.md §19, §8, §5, §6
"""
from pathlib import Path

import environ

# ── Пути ──────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, []),
)

# Читаем .env из корня монорепо
environ.Env.read_env(BASE_DIR.parent / ".env")

# ── Безопасность ──────────────────────────────────────────────────────────
SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")

# ── Приложения ────────────────────────────────────────────────────────────
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "ninja",
    "corsheaders",
    "django_celery_beat",
    "django_celery_results",
]

LOCAL_APPS = [
    "apps.users",
    "apps.prompts",
    "apps.payments",
    "apps.notifications",
    "apps.moderation",
    "apps.core",
    "apps.analytics",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ── Middleware ─────────────────────────────────────────────────────────────
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # OpenTelemetry correlation
    "config.middleware.RequestIdMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# ── База данных ───────────────────────────────────────────────────────────
# Основное подключение через PgBouncer (transaction mode)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "OPTIONS": {
            "pool": False,  # PgBouncer управляет пулом
        },
        **env.db("DATABASE_URL"),
    },
    # Прямое подключение для migrate, bypasses PgBouncer
    "direct": {
        "ENGINE": "django.db.backends.postgresql",
        **env.db("DATABASE_DIRECT_URL", default=env("DATABASE_URL", default="")),
    },
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ── Кастомная модель пользователя ─────────────────────────────────────────
AUTH_USER_MODEL = "users.User"

# ── Пароли ────────────────────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ── Интернационализация ───────────────────────────────────────────────────
LANGUAGE_CODE = "ru-RU"
TIME_ZONE = "UTC"  # Хранение в UTC, отображение в MSK (Europe/Moscow)
USE_I18N = True
USE_TZ = True

# ── Статика ───────────────────────────────────────────────────────────────
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# ── Redis ─────────────────────────────────────────────────────────────────
REDIS_URL = env("REDIS_URL", default="redis://localhost:6379/0")

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": REDIS_URL,
        "TIMEOUT": 300,
    }
}

# ── Celery ────────────────────────────────────────────────────────────────
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default="redis://localhost:6379/1")
CELERY_RESULT_BACKEND = "django-db"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "UTC"
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 60 * 30  # 30 минут

# 5 изолированных очередей (§13.2, ADR-006)
CELERY_TASK_ROUTES = {
    "apps.payments.*": {"queue": "payments"},
    "apps.notifications.*": {"queue": "notifications"},
    "apps.prompts.tasks.generate_embedding": {"queue": "embeddings"},
    "apps.prompts.tasks.check_plagiarism": {"queue": "embeddings"},
    "apps.users.tasks.anonymize_account": {"queue": "gdpr"},
    "apps.users.tasks.process_dsr_request": {"queue": "gdpr"},
}
CELERY_TASK_DEFAULT_QUEUE = "default"

# ── JWT (§5.2, ADR: PyJWT 2.x) ───────────────────────────────────────────
JWT_ACCESS_TOKEN_TTL = env.int("JWT_ACCESS_TOKEN_TTL", default=900)      # 15 мин
JWT_REFRESH_TOKEN_TTL = env.int("JWT_REFRESH_TOKEN_TTL", default=604800)  # 7 дней
JWT_ALGORITHM = "HS256"

# ── HashiCorp Vault (KMS, ADR-001) ────────────────────────────────────────
VAULT_ADDR = env("VAULT_ADDR", default="http://localhost:8200")
VAULT_TRANSIT_KEY_NAME = env("VAULT_TRANSIT_KEY_NAME", default="promptspace-kek")
VAULT_TRANSIT_MOUNT = env("VAULT_TRANSIT_MOUNT", default="transit")

# ── Yandex Object Storage ─────────────────────────────────────────────────
YOS_ACCESS_KEY_ID = env("YOS_ACCESS_KEY_ID", default="")
YOS_SECRET_ACCESS_KEY = env("YOS_SECRET_ACCESS_KEY", default="")
YOS_BUCKET_NAME = env("YOS_BUCKET_NAME", default="promptspace-media")
YOS_ENDPOINT_URL = env("YOS_ENDPOINT_URL", default="https://storage.yandexcloud.net")
YOS_REGION = env("YOS_REGION", default="ru-central1")

# ── Robokassa ─────────────────────────────────────────────────────────────
ROBOKASSA_MERCHANT_LOGIN = env("ROBOKASSA_MERCHANT_LOGIN", default="")
ROBOKASSA_PASSWORD1 = env("ROBOKASSA_PASSWORD1", default="")
ROBOKASSA_PASSWORD2 = env("ROBOKASSA_PASSWORD2", default="")
ROBOKASSA_IS_TEST = env.bool("ROBOKASSA_IS_TEST", default=True)
ROBOKASSA_IP_WHITELIST: list[str] = env.list("ROBOKASSA_IP_WHITELIST", default=[])

# ── Платформа ─────────────────────────────────────────────────────────────
PLATFORM_COMMISSION_RATE = env.float("PLATFORM_COMMISSION_RATE", default=0.20)
SITE_URL = env("SITE_URL", default="http://localhost:3000")

# ── Django Ninja (§10, ADR-015) ───────────────────────────────────────────
NINJA_DOCS_URL = env("DJANGO_NINJA_DOCS_URL", default=None)  # None = отключено
NINJA_PAGINATION_PER_PAGE = 20

# ── AISP Security Scan (ADR-016) ──────────────────────────────────────────
AISP_PROVIDER = env("AISP_PROVIDER", default="stub")

# ── Telegram (опционально, 152-ФЗ: без ПДн) ─────────────────────────────
TELEGRAM_ENABLED = env.bool("TELEGRAM_ENABLED", default=False)
TELEGRAM_BOT_TOKEN = env("TELEGRAM_BOT_TOKEN", default="")
TELEGRAM_ALERT_CHAT_ID = env("TELEGRAM_ALERT_CHAT_ID", default="")

# ── Email / Unisender ─────────────────────────────────────────────────────
UNISENDER_API_KEY = env("UNISENDER_API_KEY", default="")
UNISENDER_LIST_ID = env.int("UNISENDER_LIST_ID", default=0)

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = env("EMAIL_HOST", default="smtp.yandex.ru")
EMAIL_PORT = env.int("EMAIL_PORT", default=465)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_SSL = env.bool("EMAIL_USE_SSL", default=True)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@promptspace.ru")

# ── YandexGPT Embeddings (152-ФЗ: только РФ) ─────────────────────────────
YANDEX_API_KEY = env("YANDEX_API_KEY", default="")
YANDEX_FOLDER_ID = env("YANDEX_FOLDER_ID", default="")
YANDEX_EMBEDDINGS_MODEL = env("YANDEX_EMBEDDINGS_MODEL", default="text-search-doc/latest")
EMBEDDING_DIMENSION = env.int("EMBEDDING_DIMENSION", default=256)

# ── Sentry ────────────────────────────────────────────────────────────────
SENTRY_DSN = env("SENTRY_DSN", default="")
SENTRY_ENVIRONMENT = env("SENTRY_ENVIRONMENT", default="local")

# ── Logging ───────────────────────────────────────────────────────────────
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "format": "%(asctime)s %(name)s %(levelname)s %(message)s %(trace_id)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {"handlers": ["console"], "level": "WARNING", "propagate": False},
        "celery": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "apps": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}
