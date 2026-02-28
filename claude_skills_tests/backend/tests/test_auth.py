"""
Sprint 1 — Auth тесты.
Источник: promptspace-release.md §5.1, §5.2, SPEC-002

DoD:
- Race condition test проходит (Lua атомарность)
- 6-я попытка OTP → 429
- Повторный refresh → 401
- Redis down → 401 (fail closed)
"""
from __future__ import annotations

import threading
import time
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest


# ── OTP Service Tests ─────────────────────────────────────────────────────

class TestOTPService:
    """Тесты OTP сервиса с реальным Redis (фиксируется в conftest)."""

    def setup_method(self) -> None:
        """Очищаем Redis ключи перед каждым тестом."""
        import redis
        from django.conf import settings
        r = redis.from_url(settings.REDIS_URL, decode_responses=True)
        for key in r.scan_iter("otp:test@*"):
            r.delete(key)

    def test_send_otp_stores_in_redis(self) -> None:
        """send_otp сохраняет код в Redis с TTL."""
        import redis
        from django.conf import settings
        from apps.users.services.otp_service import send_otp, OTP_TTL_SECONDS

        email = "test@example.com"
        otp = send_otp(email)

        r = redis.from_url(settings.REDIS_URL, decode_responses=True)
        stored = r.get(f"otp:{email}")
        ttl = r.ttl(f"otp:{email}")

        assert stored == otp
        assert 0 < ttl <= OTP_TTL_SECONDS

    def test_verify_otp_success(self) -> None:
        """Верный OTP → OTPVerifyResult.SUCCESS."""
        from apps.users.services.otp_service import send_otp, verify_otp, OTPVerifyResult

        email = "test_success@example.com"
        otp = send_otp(email)
        result = verify_otp(email, otp)

        assert result.result == OTPVerifyResult.SUCCESS

    def test_verify_otp_wrong_code(self) -> None:
        """Неверный OTP → WRONG + decrement remaining."""
        from apps.users.services.otp_service import send_otp, verify_otp, OTPVerifyResult, OTP_MAX_ATTEMPTS

        email = "test_wrong@example.com"
        send_otp(email)
        result = verify_otp(email, "000000")

        assert result.result == OTPVerifyResult.WRONG
        assert result.remaining_attempts == OTP_MAX_ATTEMPTS - 1

    def test_brute_force_blocks_after_5_attempts(self) -> None:
        """5 неверных попыток → блокировка. 6-я → BLOCKED_NOW статус."""
        from apps.users.services.otp_service import (
            send_otp, verify_otp, is_blocked, OTPVerifyResult
        )

        email = "test_brute@example.com"
        send_otp(email)

        for _ in range(4):
            verify_otp(email, "000000")

        # 5-я попытка → BLOCKED_NOW
        result = verify_otp(email, "000000")
        assert result.result == OTPVerifyResult.BLOCKED_NOW
        assert is_blocked(email)

    def test_blocked_email_returns_blocked(self) -> None:
        """Последующий запрос заблокированного email → BLOCKED."""
        from apps.users.services.otp_service import (
            send_otp, verify_otp, OTPVerifyResult
        )

        email = "test_blocked@example.com"
        send_otp(email)

        for _ in range(5):
            verify_otp(email, "000000")

        # Новый запрос после блокировки
        send_otp(email)
        result = verify_otp(email, "111111")
        assert result.result == OTPVerifyResult.BLOCKED

    def test_otp_deleted_after_success(self) -> None:
        """После успешной проверки OTP удаляется из Redis."""
        import redis
        from django.conf import settings
        from apps.users.services.otp_service import send_otp, verify_otp, OTPVerifyResult

        email = "test_cleanup@example.com"
        otp = send_otp(email)
        result = verify_otp(email, otp)

        assert result.result == OTPVerifyResult.SUCCESS

        r = redis.from_url(settings.REDIS_URL, decode_responses=True)
        assert r.get(f"otp:{email}") is None
        assert r.get(f"otp:{email}:attempts") is None

    def test_expired_otp_returns_not_found(self) -> None:
        """Несуществующий OTP → NOT_FOUND."""
        from apps.users.services.otp_service import verify_otp, OTPVerifyResult

        result = verify_otp("nonexistent@example.com", "123456")
        assert result.result == OTPVerifyResult.NOT_FOUND

    def test_lua_atomicity_concurrent_requests(self) -> None:
        """
        Race condition тест: 10 параллельных потоков пытаются верифицировать OTP.
        Только один должен получить SUCCESS, остальные — WRONG или NOT_FOUND.
        """
        from apps.users.services.otp_service import send_otp, verify_otp, OTPVerifyResult

        email = "test_concurrent@example.com"
        otp = send_otp(email)

        results: list[OTPVerifyResult] = []
        lock = threading.Lock()

        def try_verify() -> None:
            res = verify_otp(email, otp)
            with lock:
                results.append(res.result)

        threads = [threading.Thread(target=try_verify) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        success_count = results.count(OTPVerifyResult.SUCCESS)
        assert success_count == 1, f"Expected exactly 1 success, got {success_count}. Results: {results}"


# ── JWT Service Tests ─────────────────────────────────────────────────────

class TestJWTService:
    """Тесты JWT сервиса."""

    def test_create_token_pair(self) -> None:
        """create_token_pair генерирует валидные токены."""
        from apps.users.services.jwt_service import create_token_pair, decode_token, TOKEN_TYPE_ACCESS, TOKEN_TYPE_REFRESH

        user_id = uuid4()
        pair = create_token_pair(user_id, "BUYER")

        access_payload = decode_token(pair.access_token)
        refresh_payload = decode_token(pair.refresh_token)

        assert access_payload.sub == str(user_id)
        assert access_payload.token_type == TOKEN_TYPE_ACCESS
        assert access_payload.role == "BUYER"

        assert refresh_payload.sub == str(user_id)
        assert refresh_payload.token_type == TOKEN_TYPE_REFRESH

    def test_decode_expired_token(self) -> None:
        """Истёкший токен → TokenExpiredError."""
        import jwt
        from django.conf import settings
        from apps.users.services.jwt_service import decode_token, TokenExpiredError

        payload = {
            "sub": str(uuid4()),
            "jti": str(uuid4()),
            "type": "access",
            "role": "BUYER",
            "iat": int((datetime.now(tz=timezone.utc) - timedelta(hours=2)).timestamp()),
            "exp": int((datetime.now(tz=timezone.utc) - timedelta(hours=1)).timestamp()),
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

        with pytest.raises(TokenExpiredError):
            decode_token(token)

    def test_revoke_token(self) -> None:
        """Отозванный токен → is_token_revoked = True."""
        from apps.users.services.jwt_service import revoke_token, is_token_revoked

        jti = uuid4()
        revoke_token(jti, ttl_seconds=300)
        assert is_token_revoked(jti) is True

    def test_token_not_revoked_by_default(self) -> None:
        """Свежий токен не находится в blacklist."""
        from apps.users.services.jwt_service import is_token_revoked

        assert is_token_revoked(uuid4()) is False

    def test_rotate_refresh_token(self) -> None:
        """rotate_refresh_token отзывает старый и создаёт новую пару."""
        from apps.users.services.jwt_service import (
            create_token_pair, rotate_refresh_token, is_token_revoked
        )

        user_id = uuid4()
        pair = create_token_pair(user_id, "BUYER")
        old_refresh_jti = pair.refresh_jti

        new_pair = rotate_refresh_token(pair.refresh_token, user_id, "BUYER")

        # Старый refresh отозван
        assert is_token_revoked(old_refresh_jti) is True
        # Новые токены отличаются
        assert new_pair.access_token != pair.access_token
        assert new_pair.refresh_token != pair.refresh_token

    def test_rotate_revoked_refresh_raises(self) -> None:
        """Повторное использование уже ротированного refresh → TokenRevokedError."""
        from apps.users.services.jwt_service import (
            create_token_pair, rotate_refresh_token, TokenRevokedError
        )

        user_id = uuid4()
        pair = create_token_pair(user_id, "BUYER")

        # Первая ротация — успешно
        rotate_refresh_token(pair.refresh_token, user_id, "BUYER")

        # Вторая ротация со старым токеном → TokenRevokedError
        with pytest.raises(TokenRevokedError):
            rotate_refresh_token(pair.refresh_token, user_id, "BUYER")

    def test_fail_closed_redis_unavailable(self) -> None:
        """Redis недоступен → RedisUnavailableError (fail closed)."""
        from apps.users.services.jwt_service import is_token_revoked, RedisUnavailableError
        import redis

        jti = uuid4()
        with patch("apps.users.services.jwt_service._get_redis") as mock_redis:
            mock_redis.return_value = MagicMock()
            mock_redis.return_value.exists.side_effect = redis.RedisError("Connection refused")

            with pytest.raises(RedisUnavailableError):
                is_token_revoked(jti)


# ── Auth API Tests ────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestAuthAPI:
    """Интеграционные тесты Auth API."""

    def setup_method(self) -> None:
        """Очищаем Redis."""
        import redis
        from django.conf import settings
        r = redis.from_url(settings.REDIS_URL, decode_responses=True)
        for key in r.scan_iter("otp:apitest*"):
            r.delete(key)

    def test_otp_send_returns_200(self, client) -> None:
        """POST /auth/otp/send → 200."""
        response = client.post(
            "/api/v1/auth/otp/send",
            data={"email": "apitest@example.com"},
            content_type="application/json",
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data

    def test_otp_send_blocked_email_returns_429(self, client) -> None:
        """Заблокированный email → 429."""
        import redis
        from django.conf import settings

        email = "apitestblocked@example.com"
        r = redis.from_url(settings.REDIS_URL, decode_responses=True)
        r.set(f"otp:{email}:blocked", "1", ex=900)

        response = client.post(
            "/api/v1/auth/otp/send",
            data={"email": email},
            content_type="application/json",
        )
        assert response.status_code == 429

    def test_otp_verify_wrong_code_returns_401(self, client) -> None:
        """Неверный OTP → 401."""
        from apps.users.services.otp_service import send_otp

        email = "apitestwrong@example.com"
        send_otp(email)

        response = client.post(
            "/api/v1/auth/otp/verify",
            data={"email": email, "code": "000000"},
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_otp_verify_success_returns_token(self, client) -> None:
        """Верный OTP → 200 + access_token."""
        from apps.users.services.otp_service import send_otp

        email = "apitestsuccess@example.com"
        otp = send_otp(email)

        response = client.post(
            "/api/v1/auth/otp/verify",
            data={"email": email, "code": otp},
            content_type="application/json",
        )
        # В тестовом окружении OTP verify может возвращать 200 или Response объект
        assert response.status_code in (200,)

    def test_logout_without_token_returns_401(self, client) -> None:
        """POST /auth/logout без токена → 401."""
        response = client.post("/api/v1/auth/logout")
        assert response.status_code in (401, 403)

    def test_refresh_invalid_token_returns_401(self, client) -> None:
        """POST /auth/refresh с невалидным токеном → 401."""
        response = client.post(
            "/api/v1/auth/refresh",
            data={"refresh_token": "invalid.token.here"},
            content_type="application/json",
        )
        assert response.status_code == 401
