"""
Health check endpoint — GET /api/v1/health/
Источник: promptspace-release.md §8.2
"""
from typing import Literal

from django.db import connection
from ninja import Router
from pydantic import BaseModel

router = Router(tags=["Health"])


class HealthStatus(BaseModel):
    status: Literal["ok", "degraded"]
    db: Literal["ok", "error"]
    redis: Literal["ok", "error"]
    vault: Literal["ok", "error"]


@router.get("/health/", response=HealthStatus, auth=None)
def health_check(request) -> HealthStatus:
    """
    Проверяет доступность db, redis, vault.
    При любом error — HTTP 503, load balancer выводит инстанс из ротации.
    """
    db_status = _check_db()
    redis_status = _check_redis()
    vault_status = _check_vault()

    overall = (
        "ok"
        if all(s == "ok" for s in [db_status, redis_status, vault_status])
        else "degraded"
    )

    return HealthStatus(
        status=overall,
        db=db_status,
        redis=redis_status,
        vault=vault_status,
    )


def _check_db() -> Literal["ok", "error"]:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return "ok"
    except Exception:
        return "error"


def _check_redis() -> Literal["ok", "error"]:
    try:
        import redis as redis_lib
        from django.conf import settings

        r = redis_lib.from_url(settings.REDIS_URL, socket_timeout=1)
        r.ping()
        return "ok"
    except Exception:
        return "error"


def _check_vault() -> Literal["ok", "error"]:
    try:
        import hvac
        from django.conf import settings

        client = hvac.Client(url=settings.VAULT_ADDR, timeout=2)
        # sys.read_health_status() не требует аутентификации — только проверяет доступность
        health = client.sys.read_health_status(method="GET")
        if health.get("sealed", True):
            return "error"
        return "ok"
    except Exception:
        return "error"
