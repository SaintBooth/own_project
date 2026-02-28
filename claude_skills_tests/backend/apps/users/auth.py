"""
Django Ninja JWT аутентификация.
Источник: §5.2, §10.4

Реализует HttpBearer для Django Ninja.
Fail closed: Redis недоступен → 401.
"""
from __future__ import annotations

import logging

from django.http import HttpRequest
from ninja.security import HttpBearer

from apps.users.services.jwt_service import (
    RedisUnavailableError,
    TokenInvalidError,
    TokenRevokedError,
    decode_token,
    is_token_revoked,
)

logger = logging.getLogger(__name__)


class JWTAuth(HttpBearer):
    """Bearer token аутентификация через JWT."""

    def authenticate(self, request: HttpRequest, token: str) -> object | None:
        """
        Возвращает объект User если токен валиден, иначе None → 401.

        Fail closed: исключения Redis → None (не pass-through).
        """
        try:
            payload = decode_token(token)
        except (TokenInvalidError, Exception):
            return None

        try:
            if is_token_revoked(payload.jti):
                return None
        except RedisUnavailableError:
            # Fail closed — нельзя определить, отозван ли токен
            logger.warning("Redis unavailable — fail closed for JWT check")
            return None

        # Прикрепляем payload к request для использования в view
        try:
            from apps.users.models import User
            user = User.objects.select_related("seller_profile").get(
                id=payload.sub,
                is_active=True,
                is_deleted=False,
            )
            request.jwt_payload = payload  # type: ignore[attr-defined]
            return user
        except Exception:
            return None


class OptionalJWTAuth(HttpBearer):
    """JWT аутентификация, не обязательная (для публичных эндпоинтов с опциональным auth)."""

    openapi_name = "OptionalBearer"

    def authenticate(self, request: HttpRequest, token: str) -> object | None:
        return JWTAuth().authenticate(request, token)
