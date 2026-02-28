"""
Users models — PromptSpace
Источник: promptspace-release.md §9.1
"""
from uuid import uuid4

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from apps.users.managers import UserManager


class UserRole(models.TextChoices):
    BUYER = "BUYER", "Покупатель"
    SELLER = "SELLER", "Продавец"
    MODERATOR = "MODERATOR", "Модератор"
    SUPERADMIN = "SUPERADMIN", "Суперадмин"


class KycStatus(models.TextChoices):
    PENDING = "PENDING", "На проверке"
    VERIFIED = "VERIFIED", "Верифицирован"
    REJECTED = "REJECTED", "Отклонён"
    CANCELLED = "CANCELLED", "Отменён (потеря НПД/ИП)"


class LegalType(models.TextChoices):
    IP = "IP", "Индивидуальный предприниматель"
    SELF_EMPLOYED = "SELF_EMPLOYED", "Самозанятый"


class User(AbstractBaseUser, PermissionsMixin):
    """
    Кастомная модель пользователя.

    email nullable: VK OAuth может не предоставить email (§9.1).
    PostgreSQL допускает несколько NULL в unique-колонке (NULL != NULL).
    """

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)

    # null=True, blank=True — VK OAuth без email
    email = models.EmailField(unique=True, null=True, blank=True)
    username = models.CharField(max_length=50, unique=True)

    # Основная роль. Наличие SellerProfile определяет возможность продавать.
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.BUYER,
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    # Soft delete — для anonymize_account (§2.5)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    # 152-ФЗ: datetime согласия (не bool)
    consent_pd_at = models.DateTimeField(null=True, blank=True)

    # Аватар хранится в YOS; здесь — object_key (не URL)
    avatar_object_key = models.CharField(max_length=255, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"
        indexes = [
            models.Index(fields=["username"]),
            models.Index(fields=["is_deleted", "is_active"]),
        ]

    def __str__(self) -> str:
        return self.username or str(self.id)

    @property
    def is_seller(self) -> bool:
        """Пользователь является продавцом если есть SellerProfile с VERIFIED KYC."""
        try:
            return self.seller_profile.kyc_status == KycStatus.VERIFIED
        except SellerProfile.DoesNotExist:
            return False


class SellerProfile(models.Model):
    """Профиль продавца (ИП или Самозанятый)."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="seller_profile",
    )
    inn = models.CharField(max_length=12, db_index=True)
    legal_type = models.CharField(max_length=20, choices=LegalType.choices)
    kyc_status = models.CharField(
        max_length=20,
        choices=KycStatus.choices,
        default=KycStatus.PENDING,
        db_index=True,
    )
    kyc_verified_at = models.DateTimeField(null=True, blank=True)
    kyc_rejected_reason = models.TextField(blank=True, default="")

    # Публичный профиль (§12.15)
    bio = models.TextField(blank=True, default="", max_length=500)
    avatar_url = models.URLField(blank=True, null=True)

    # Robokassa Split реквизиты
    robokassa_split_id = models.CharField(max_length=255, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Профиль продавца"
        verbose_name_plural = "Профили продавцов"

    def __str__(self) -> str:
        return f"SellerProfile({self.user.username}, {self.kyc_status})"


class OTPRequest(models.Model):
    """
    Запрос OTP кода (аудит). Основная защита — в Redis (Lua-атомарная).
    Источник: §5.1
    """

    email = models.EmailField(db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "OTP запрос"
        verbose_name_plural = "OTP запросы"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["email", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"OTPRequest({self.email}, {self.created_at})"


class RefreshToken(models.Model):
    """
    Refresh token для JWT rotation + Redis blacklist.
    Источник: §5.2

    jti → JWT ID, blacklist: jwt:revoked:{jti} в Redis.
    """

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="refresh_tokens",
    )
    jti = models.UUIDField(unique=True, db_index=True)
    is_revoked = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        verbose_name = "Refresh token"
        verbose_name_plural = "Refresh tokens"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"RefreshToken({self.user_id}, revoked={self.is_revoked})"


class ApiKey(models.Model):
    """
    API ключи для Agentic AI (M2M, §5.7).

    Хранится только SHA-256 хеш — plaintext показывается один раз при создании.
    Формат ключа: ps_live_<random>
    """

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="api_keys")
    name = models.CharField(max_length=100)

    # SHA-256(plaintext_key) — plaintext НИКОГДА не хранится
    key_hash = models.CharField(max_length=64, unique=True, db_index=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "API ключ"
        verbose_name_plural = "API ключи"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"ApiKey({self.name}, user={self.user_id})"
