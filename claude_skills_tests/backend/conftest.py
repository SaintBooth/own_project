"""Pytest configuration for PromptSpace backend."""
import os

import django
import pytest
from django.test import Client

# Устанавливаем тестовые настройки ДО импорта Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.test")


def pytest_configure(config: pytest.Config) -> None:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.test")


@pytest.fixture
def client() -> Client:
    return Client()


@pytest.fixture
def api_client() -> Client:
    return Client()
