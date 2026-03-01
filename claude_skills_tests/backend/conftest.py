"""Pytest configuration for PromptSpace backend."""
import os

import pytest
from django.test import Client

# Принудительно устанавливаем тестовые настройки, переопределяя env var контейнера.
# setdefault() нельзя использовать — контейнер имеет DJANGO_SETTINGS_MODULE=local.
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings.test"


def pytest_configure(config: pytest.Config) -> None:
    os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings.test"


@pytest.fixture
def client() -> Client:
    return Client()


@pytest.fixture
def api_client() -> Client:
    return Client()
