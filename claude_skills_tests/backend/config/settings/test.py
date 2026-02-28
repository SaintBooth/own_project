"""Настройки для тестирования.

Важно: тесты используют прямое подключение к БД (bypasses PgBouncer).
PgBouncer в transaction mode не поддерживает CREATE DATABASE.
"""
from .local import *  # noqa: F401, F403

# Переопределяем default → прямое подключение, иначе CREATE DATABASE зависает
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        **env.db("DATABASE_DIRECT_URL"),  # noqa: F405
        "TEST": {
            "NAME": "test_prompt_marketplace",
        },
    },
    "direct": {
        "ENGINE": "django.db.backends.postgresql",
        **env.db("DATABASE_DIRECT_URL"),  # noqa: F405
    },
}

# Убираем whitenoise из тестового окружения (не нужен для тестов)
MIDDLEWARE = [m for m in MIDDLEWARE if "whitenoise" not in m]  # noqa: F405

# Отключаем статику whitenoise для тестов
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
