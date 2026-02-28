"""
Yandex ID OAuth сервис.
Источник: promptspace-release.md §5.3, §9.1

Flow:
  1. Redirect → Yandex OAuth с client_id + redirect_uri
  2. Yandex → callback с code
  3. Exchange code → tokens (POST /token)
  4. Fetch user info (GET /info)
  5. Find or create User (nullable email — VK may not provide one)
"""
from __future__ import annotations

import logging
import secrets
from typing import Any
from urllib.parse import urlencode

import httpx
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

YANDEX_OAUTH_BASE = "https://oauth.yandex.ru"
YANDEX_LOGIN_API = "https://login.yandex.ru/info"


def get_authorization_url(state: str | None = None) -> tuple[str, str]:
    """
    Возвращает (authorization_url, state).

    state используется для защиты от CSRF.
    """
    if state is None:
        state = secrets.token_urlsafe(32)

    params = {
        "response_type": "code",
        "client_id": settings.YANDEX_CLIENT_ID,
        "redirect_uri": settings.YANDEX_REDIRECT_URI,
        "state": state,
    }
    url = f"{YANDEX_OAUTH_BASE}/authorize?{urlencode(params)}"
    return url, state


def exchange_code(code: str) -> dict[str, Any]:
    """
    Обменивает authorization code на access + refresh tokens.

    Raises:
        httpx.HTTPStatusError: при ошибке Yandex API
    """
    response = httpx.post(
        f"{YANDEX_OAUTH_BASE}/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "client_id": settings.YANDEX_CLIENT_ID,
            "client_secret": settings.YANDEX_CLIENT_SECRET,
            "redirect_uri": settings.YANDEX_REDIRECT_URI,
        },
        timeout=10,
    )
    response.raise_for_status()
    return response.json()  # type: ignore[no-any-return]


def fetch_user_info(access_token: str) -> dict[str, Any]:
    """Получает информацию о пользователе Yandex."""
    response = httpx.get(
        YANDEX_LOGIN_API,
        headers={"Authorization": f"OAuth {access_token}"},
        params={"format": "json"},
        timeout=10,
    )
    response.raise_for_status()
    return response.json()  # type: ignore[no-any-return]


def get_or_create_user_from_yandex(user_info: dict[str, Any]) -> Any:
    """
    Создаёт или обновляет User на основе данных от Yandex.

    yandex_id сохраняется в username как yandex_{id} если нет username.
    email nullable — если Yandex не предоставил.
    """
    from apps.users.models import User

    yandex_id: str = str(user_info["id"])
    email: str | None = user_info.get("default_email") or user_info.get("emails", [None])[0]
    display_name: str = user_info.get("display_name") or user_info.get("login") or f"user_{yandex_id[:8]}"

    # Нормализуем username — уникальный, без спецсимволов
    base_username = f"y_{yandex_id}"

    # Ищем по yandex_id (хранится как username prefix y_{id})
    user = User.objects.filter(username=base_username).first()

    if user is None and email:
        user = User.objects.filter(email=email).first()

    if user is None:
        user = User(username=base_username)

    # Обновляем email только если он не задан ранее
    if email and not user.email:
        user.email = email

    if not user.consent_pd_at:
        user.consent_pd_at = timezone.now()

    user.save()
    logger.info("Yandex OAuth: user authenticated", extra={"user_id": str(user.id)})
    return user
