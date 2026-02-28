"""
Auth API — /api/v1/auth/
Источник: promptspace-release.md §10.4

Endpoints:
  POST /auth/otp/send
  POST /auth/otp/verify
  POST /auth/refresh
  POST /auth/logout
  GET  /auth/yandex/callback
"""
from __future__ import annotations

import logging
from typing import Any

from django.conf import settings
from django.http import HttpRequest, HttpResponse
from ninja import Router, Schema
from ninja.responses import Response
from pydantic import EmailStr, field_validator

from apps.users.models import OTPRequest, RefreshToken, User
from apps.users.services.jwt_service import (
    RedisUnavailableError,
    TokenExpiredError,
    TokenInvalidError,
    TokenRevokedError,
    create_token_pair,
    logout_user,
    rotate_refresh_token,
)
from apps.users.services.otp_service import (
    OTPVerifyResult,
    is_blocked,
    get_block_ttl,
    send_otp,
    verify_otp,
)

logger = logging.getLogger(__name__)

router = Router(tags=["Auth"])


# ── Schemas ───────────────────────────────────────────────────────────────

class OTPSendIn(Schema):
    email: EmailStr


class OTPSendOut(Schema):
    message: str
    retry_after: int = 0  # секунд до следующей попытки (если заблокирован)


class OTPVerifyIn(Schema):
    email: EmailStr
    code: str

    @field_validator("code")
    @classmethod
    def code_must_be_digits(cls, v: str) -> str:
        if not v.isdigit() or len(v) != 6:
            raise ValueError("OTP must be exactly 6 digits")
        return v


class TokenOut(Schema):
    access_token: str
    token_type: str = "bearer"


class RefreshIn(Schema):
    refresh_token: str


class ErrorOut(Schema):
    detail: str


# ── Endpoints ─────────────────────────────────────────────────────────────

@router.post(
    "/otp/send",
    response={200: OTPSendOut, 429: OTPSendOut},
    auth=None,
    summary="Отправить OTP на email",
)
def otp_send(request: HttpRequest, payload: OTPSendIn) -> tuple[int, OTPSendOut]:
    """
    Генерирует OTP и отправляет на email.
    Если email заблокирован → 429 с retry_after.
    """
    if is_blocked(payload.email):
        return 429, OTPSendOut(
            message="Too many attempts. Try again later.",
            retry_after=get_block_ttl(payload.email),
        )

    otp_code = send_otp(payload.email)

    # Аудит в БД
    ip = _get_client_ip(request)
    OTPRequest.objects.create(email=payload.email, ip_address=ip)

    # В реальной системе — отправка через Unisender/SMTP
    # TODO Sprint 3: интеграция с Unisender (SPEC-008)
    if settings.DEBUG:
        # Только в dev: code в логах (не в production!)
        logger.debug("OTP for %s: %s", payload.email, otp_code)

    return 200, OTPSendOut(message="OTP sent to email")


@router.post(
    "/otp/verify",
    response={200: TokenOut, 401: ErrorOut, 403: ErrorOut, 429: ErrorOut},
    auth=None,
    summary="Проверить OTP и получить JWT",
)
def otp_verify(request: HttpRequest, payload: OTPVerifyIn) -> tuple[int, Any]:
    """
    Атомарная Lua-проверка OTP.
    При успехе — создаёт/ищет User, возвращает access token.
    Refresh token устанавливается как HttpOnly cookie.
    """
    result = verify_otp(payload.email, payload.code)

    if result.result == OTPVerifyResult.BLOCKED:
        return 429, ErrorOut(detail="Too many attempts. Try again in 15 minutes.")

    if result.result == OTPVerifyResult.BLOCKED_NOW:
        return 429, ErrorOut(detail="Too many attempts. You are now blocked for 15 minutes.")

    if result.result == OTPVerifyResult.NOT_FOUND:
        return 401, ErrorOut(detail="OTP expired or not found. Please request a new one.")

    if result.result == OTPVerifyResult.WRONG:
        return 401, ErrorOut(
            detail=f"Invalid OTP. {result.remaining_attempts} attempts remaining."
        )

    # SUCCESS — найти или создать пользователя
    user, _ = User.objects.get_or_create(
        email=payload.email,
        defaults={"username": _email_to_username(payload.email)},
    )

    tokens = create_token_pair(user.id, user.role)

    # Сохраняем refresh token в БД для аудита
    from datetime import datetime, timezone, timedelta
    expires_at = datetime.now(tz=timezone.utc) + timedelta(seconds=settings.JWT_REFRESH_TOKEN_TTL)
    RefreshToken.objects.create(
        user=user,
        jti=tokens.refresh_jti,
        expires_at=expires_at,
    )

    response = Response(TokenOut(access_token=tokens.access_token))
    response.set_cookie(
        key="refresh_token",
        value=tokens.refresh_token,
        max_age=settings.JWT_REFRESH_TOKEN_TTL,
        httponly=True,
        samesite="Lax",
        secure=not settings.DEBUG,
        path="/api/v1/auth/refresh",
    )
    return response  # type: ignore[return-value]


@router.post(
    "/refresh",
    response={200: TokenOut, 401: ErrorOut},
    auth=None,
    summary="Обновить access token по refresh token",
)
def token_refresh(request: HttpRequest, payload: RefreshIn) -> tuple[int, Any]:
    """
    Refresh token rotation.
    Старый refresh отзывается, выдаётся новая пара токенов.
    """
    # Принимаем refresh_token из body или cookie
    refresh_token = payload.refresh_token or request.COOKIES.get("refresh_token", "")
    if not refresh_token:
        return 401, ErrorOut(detail="Refresh token required")

    try:
        from apps.users.services.jwt_service import decode_token, TOKEN_TYPE_REFRESH
        old_payload = decode_token(refresh_token)
        user = User.objects.get(id=old_payload.sub, is_active=True, is_deleted=False)
        tokens = rotate_refresh_token(refresh_token, user.id, user.role)
    except (TokenExpiredError, TokenRevokedError, TokenInvalidError, User.DoesNotExist):
        return 401, ErrorOut(detail="Invalid or expired refresh token")
    except RedisUnavailableError:
        return 401, ErrorOut(detail="Authentication service unavailable")

    # Обновляем запись в БД
    from datetime import datetime, timezone, timedelta
    expires_at = datetime.now(tz=timezone.utc) + timedelta(seconds=settings.JWT_REFRESH_TOKEN_TTL)
    RefreshToken.objects.create(
        user=user,
        jti=tokens.refresh_jti,
        expires_at=expires_at,
    )

    response = Response(TokenOut(access_token=tokens.access_token))
    response.set_cookie(
        key="refresh_token",
        value=tokens.refresh_token,
        max_age=settings.JWT_REFRESH_TOKEN_TTL,
        httponly=True,
        samesite="Lax",
        secure=not settings.DEBUG,
        path="/api/v1/auth/refresh",
    )
    return response  # type: ignore[return-value]


@router.post(
    "/logout",
    response={200: OTPSendOut, 401: ErrorOut},
    summary="Выйти и отозвать токены",
)
def logout(request: HttpRequest) -> tuple[int, Any]:
    """
    Добавляет access JTI в Redis blacklist.
    Fail closed: Redis недоступен → 401.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return 401, ErrorOut(detail="Bearer token required")

    token = auth_header.removeprefix("Bearer ")
    try:
        logout_user(token)
    except (TokenInvalidError, TokenExpiredError):
        return 401, ErrorOut(detail="Invalid token")
    except RedisUnavailableError:
        return 401, ErrorOut(detail="Authentication service unavailable")

    response = Response(OTPSendOut(message="Logged out successfully"))
    response.delete_cookie("refresh_token", path="/api/v1/auth/refresh")
    return response  # type: ignore[return-value]


@router.get(
    "/yandex/callback",
    response={302: None, 400: ErrorOut},
    auth=None,
    summary="Yandex ID OAuth callback",
    include_in_schema=False,
)
def yandex_callback(request: HttpRequest, code: str = "", state: str = "", error: str = "") -> Any:
    """
    Обрабатывает Yandex OAuth callback.
    Редиректит на фронтенд с JWT access token.
    """
    if error:
        logger.warning("Yandex OAuth error: %s", error)
        return 400, ErrorOut(detail=f"OAuth error: {error}")

    if not code:
        return 400, ErrorOut(detail="Authorization code is required")

    try:
        from apps.users.services.oauth_yandex import exchange_code, fetch_user_info, get_or_create_user_from_yandex
        token_data = exchange_code(code)
        user_info = fetch_user_info(token_data["access_token"])
        user = get_or_create_user_from_yandex(user_info)
    except Exception as exc:
        logger.error("Yandex OAuth failed", exc_info=exc)
        return 400, ErrorOut(detail="OAuth authentication failed")

    tokens = create_token_pair(user.id, user.role)

    # Редирект на фронтенд с токеном в query param (кратковременный, затем → cookie)
    from django.shortcuts import redirect
    frontend_url = f"{settings.SITE_URL}/auth/callback/yandex"
    redirect_url = f"{frontend_url}?access_token={tokens.access_token}"

    resp = redirect(redirect_url)
    resp.set_cookie(
        key="refresh_token",
        value=tokens.refresh_token,
        max_age=settings.JWT_REFRESH_TOKEN_TTL,
        httponly=True,
        samesite="Lax",
        secure=not settings.DEBUG,
        path="/api/v1/auth/refresh",
    )
    return resp


# ── Helpers ───────────────────────────────────────────────────────────────

def _get_client_ip(request: HttpRequest) -> str | None:
    x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded:
        return x_forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _email_to_username(email: str) -> str:
    """Генерирует уникальный username из email."""
    import re
    base = re.sub(r"[^a-zA-Z0-9_]", "_", email.split("@")[0])[:40]
    # Проверка уникальности
    username = base
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{base}_{counter}"
        counter += 1
    return username
