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
