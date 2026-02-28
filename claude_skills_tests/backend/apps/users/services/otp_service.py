"""
OTP сервис — Email + Redis Lua атомарная проверка.
Источник: promptspace-release.md §5.1

Ключи Redis:
  otp:{email}           → 6-значный код (TTL 5 мин)
  otp:{email}:attempts  → счётчик неверных попыток (TTL = TTL кода)
  otp:{email}:blocked   → флаг блокировки (TTL 15 мин)
"""
from __future__ import annotations

import logging
import random
import string
from dataclasses import dataclass
from enum import Enum

import redis as redis_lib
from django.conf import settings

logger = logging.getLogger(__name__)

# ── Константы ──────────────────────────────────────────────────────────────
OTP_TTL_SECONDS = getattr(settings, "OTP_TTL_SECONDS", 300)       # 5 мин
OTP_BLOCK_TTL_SECONDS = getattr(settings, "OTP_BLOCK_TTL_SECONDS", 900)  # 15 мин
OTP_MAX_ATTEMPTS = getattr(settings, "OTP_MAX_ATTEMPTS", 5)
OTP_LENGTH = 6

# ── Redis Lua скрипт — атомарная проверка OTP ─────────────────────────────
# KEYS[1] = blocked_key, KEYS[2] = otp_key, KEYS[3] = attempts_key
# ARGV[1] = provided_otp, ARGV[2] = max_attempts, ARGV[3] = block_ttl
#
# Возвращает: {result_code, remaining_attempts}
#   0 = заблокирован
#   1 = OTP не найден (истёк или не существует)
#   2 = успех
#   3 = заблокирован после этой попытки
#   4 = неверный код (remaining_attempts = сколько осталось)
_LUA_VERIFY_OTP = """
local blocked_key  = KEYS[1]
local otp_key      = KEYS[2]
local attempts_key = KEYS[3]
local provided     = ARGV[1]
local max_attempts = tonumber(ARGV[2])
local block_ttl    = tonumber(ARGV[3])

if redis.call('EXISTS', blocked_key) == 1 then
    return {0, 0}
end

local stored = redis.call('GET', otp_key)
if stored == false then
    return {1, 0}
end

if stored == provided then
    redis.call('DEL', otp_key)
    redis.call('DEL', attempts_key)
    return {2, 0}
end

local attempts = redis.call('INCR', attempts_key)
if attempts == 1 then
    local ttl = redis.call('TTL', otp_key)
    if ttl > 0 then
        redis.call('EXPIRE', attempts_key, ttl)
    end
end

if attempts >= max_attempts then
    redis.call('SET', blocked_key, '1', 'EX', block_ttl)
    redis.call('DEL', otp_key)
    redis.call('DEL', attempts_key)
    return {3, 0}
end

return {4, max_attempts - attempts}
"""


class OTPVerifyResult(Enum):
    BLOCKED = 0
    NOT_FOUND = 1
    SUCCESS = 2
    BLOCKED_NOW = 3
    WRONG = 4


@dataclass
class OTPVerifyResponse:
    result: OTPVerifyResult
    remaining_attempts: int = 0


def _get_redis() -> redis_lib.Redis:  # type: ignore[type-arg]
    return redis_lib.from_url(
        settings.REDIS_URL,
        decode_responses=True,
        socket_timeout=2,
    )


def _otp_key(email: str) -> str:
    return f"otp:{email}"


def _blocked_key(email: str) -> str:
    return f"otp:{email}:blocked"


def _attempts_key(email: str) -> str:
    return f"otp:{email}:attempts"


def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=OTP_LENGTH))


def send_otp(email: str) -> str:
    """
    Генерирует OTP, сохраняет в Redis и возвращает код (для передачи в email).

    В реальной системе здесь отправка email через Unisender / SMTP.
    Код не логируется (security правило).
    """
    otp = _generate_otp()
    r = _get_redis()
    r.set(_otp_key(email), otp, ex=OTP_TTL_SECONDS)
    logger.info("OTP sent", extra={"email_domain": email.split("@")[-1]})
    return otp


def verify_otp(email: str, code: str) -> OTPVerifyResponse:
    """
    Атомарная проверка OTP через Lua скрипт.

    Lua гарантирует отсутствие race condition при параллельных запросах.
    """
    r = _get_redis()
    script = r.register_script(_LUA_VERIFY_OTP)
    result = script(
        keys=[_blocked_key(email), _otp_key(email), _attempts_key(email)],
        args=[code, str(OTP_MAX_ATTEMPTS), str(OTP_BLOCK_TTL_SECONDS)],
    )
    code_val = int(result[0])
    remaining = int(result[1])
    return OTPVerifyResponse(
        result=OTPVerifyResult(code_val),
        remaining_attempts=remaining,
    )


def is_blocked(email: str) -> bool:
    """Проверяет, заблокирован ли email для OTP."""
    r = _get_redis()
    return bool(r.exists(_blocked_key(email)))


def get_block_ttl(email: str) -> int:
    """Возвращает секунды до снятия блокировки (0 если не заблокирован)."""
    r = _get_redis()
    ttl = r.ttl(_blocked_key(email))
    return max(0, ttl)
