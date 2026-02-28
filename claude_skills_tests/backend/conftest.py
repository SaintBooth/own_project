"""Pytest configuration for PromptSpace backend."""
import pytest
from django.test import Client


def pytest_configure(config):
    import django
    from django.conf import settings
    if not settings.configured:
        settings.configure()


@pytest.fixture
def api_client():
    return Client()
