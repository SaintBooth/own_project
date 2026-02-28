"""Sprint 0 smoke tests — health check endpoint.

Источник: promptspace-release.md §8.2
DoD Sprint 0: pytest green
"""
import pytest


@pytest.mark.django_db
def test_health_endpoint_ok(client):
    """GET /api/v1/health/ возвращает 200 и статус ok."""
    response = client.get("/api/v1/health/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["db"] == "ok"
    assert data["redis"] == "ok"
    assert data["vault"] == "ok"


def test_health_status_model():
    """HealthStatus pydantic-модель валидируется корректно."""
    from apps.core.api import HealthStatus
    status = HealthStatus(status="ok", db="ok", redis="ok", vault="ok")
    assert status.status == "ok"


def test_health_status_degraded():
    """HealthStatus принимает значение degraded."""
    from apps.core.api import HealthStatus
    status = HealthStatus(status="degraded", db="error", redis="ok", vault="ok")
    assert status.status == "degraded"
    assert status.db == "error"
