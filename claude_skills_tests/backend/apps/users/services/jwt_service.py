"""
JWT сервис — access + refresh tokens, rotation, Redis blacklist.
Источник: promptspace-release.md §5.2

Правила:
- Access: HS256, 15 мин, payload: {sub, jti, type="access", role}
- Refresh: HS256, 7 дней, payload: {sub, jti, type="refresh"}
- Blacklist: jwt:revoked:{jti} в Redis (TTL = оставшееся время жизни токена)
- Fail closed: если Redis недоступен при проверке → 401 (не pass-through)
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID, uuid4

import jwt
import redis as redis_lib
from django.conf import settings

logger = logging.getLogger(__name__)

TOKEN_TYPE_ACCESS = "access"
TOKEN_TYPE_REFRESH = "refresh"


@dataclass
class TokenPair:
    access_token: str
    refresh_token: str
    access_jti: UUID
    refresh_jti: UUID


@dataclass
class TokenPayload:
    sub: str        # user UUID as string
    jti: UUID
    token_type: str
    role: str
    exp: datetime
    iat: datetime


class JWTError(Exception):
    """Базовое исключение JWT."""


class TokenExpiredError(JWTError):
    """Токен истёк."""


class TokenRevokedError(JWTError):
    """Токен отозван (в blacklist)."""


class TokenInvalidError(JWTError):
    """Некорректный токен."""


class RedisUnavailableError(JWTError):
    """Redis недоступен — fail closed."""


def _get_redis() -> redis_lib.Redis:  # type: ignore[type-arg]
    return redis_lib.from_url(
        settings.REDIS_URL,
        decode_responses=True,
        socket_timeout=1,
    )


def _revoked_key(jti: UUID | str) -> str:
    return f"jwt:revoked:{jti}"


def _now() -> datetime:
    return datetime.now(tz=timezone.utc)


def create_token_pair(user_id: UUID | str, role: str) -> TokenPair:
    """Создаёт пару access + refresh токенов."""
    now = _now()
    access_jti = uuid4()
    refresh_jti = uuid4()

    access_payload = {
        "sub": str(user_id),
        "jti": str(access_jti),
        "type": TOKEN_TYPE_ACCESS,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(now.timestamp()) + settings.JWT_ACCESS_TOKEN_TTL,
    }
    refresh_payload = {
        "sub": str(user_id),
        "jti": str(refresh_jti),
        "type": TOKEN_TYPE_REFRESH,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(now.timestamp()) + settings.JWT_REFRESH_TOKEN_TTL,
    }

    access_token = jwt.encode(access_payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    refresh_token = jwt.encode(refresh_payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        access_jti=access_jti,
        refresh_jti=refresh_jti,
    )


def decode_token(token: str) -> TokenPayload:
    """
    Декодирует и валидирует JWT токен.

    Raises:
        TokenExpiredError: токен истёк
        TokenInvalidError: токен невалиден
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except jwt.ExpiredSignatureError as exc:
        raise TokenExpiredError("Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise TokenInvalidError(f"Invalid token: {exc}") from exc

    return TokenPayload(
        sub=payload["sub"],
        jti=UUID(payload["jti"]),
        token_type=payload.get("type", ""),
        role=payload.get("role", ""),
        exp=datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
        iat=datetime.fromtimestamp(payload["iat"], tz=timezone.utc),
    )


def is_token_revoked(jti: UUID) -> bool:
    """
    Проверяет blacklist в Redis.

    Fail closed: при недоступности Redis → RedisUnavailableError → caller возвращает 401.
    """
    try:
        r = _get_redis()
        return bool(r.exists(_revoked_key(jti)))
    except redis_lib.RedisError as exc:
        logger.error("Redis unavailable during token revocation check — fail closed", exc_info=exc)
        raise RedisUnavailableError("Redis unavailable") from exc


def revoke_token(jti: UUID, ttl_seconds: int) -> None:
    """
    Добавляет JTI в Redis blacklist с TTL.

    ttl_seconds: оставшееся время жизни токена.
    """
    if ttl_seconds <= 0:
        return
    try:
        r = _get_redis()
        r.set(_revoked_key(jti), "1", ex=ttl_seconds)
    except redis_lib.RedisError as exc:
        logger.error("Failed to revoke token in Redis — fail closed", exc_info=exc)
        raise RedisUnavailableError("Redis unavailable") from exc


def rotate_refresh_token(
    refresh_token: str,
    user_id: UUID | str,
    role: str,
) -> TokenPair:
    """
    Ротация refresh токена:
    1. Декодирует и проверяет старый refresh токен
    2. Проверяет blacklist (fail closed)
    3. Отзывает старый refresh JTI
    4. Создаёт новую пару токенов

    Raises:
        TokenExpiredError, TokenRevokedError, RedisUnavailableError
    """
    old_payload = decode_token(refresh_token)

    if old_payload.token_type != TOKEN_TYPE_REFRESH:
        raise TokenInvalidError("Not a refresh token")

    if is_token_revoked(old_payload.jti):
        raise TokenRevokedError("Refresh token has been revoked")

    # Отзываем старый refresh token
    now = _now()
    remaining_ttl = int((old_payload.exp - now).total_seconds())
    revoke_token(old_payload.jti, remaining_ttl)

    return create_token_pair(user_id, role)


def logout_user(access_token: str) -> None:
    """
    Логаут: добавляет access JTI в blacklist.

    Fail closed: если Redis недоступен → RedisUnavailableError.
    """
    payload = decode_token(access_token)
    now = _now()
    remaining_ttl = int((payload.exp - now).total_seconds())
    revoke_token(payload.jti, remaining_ttl)
