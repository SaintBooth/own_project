"""
Prompts domain models — PromptSpace
Источник: promptspace-release.md §9.2, §6, §7, §10.5
"""
from uuid import uuid4

from django.conf import settings
from django.db import models
from django.utils.text import slugify


class PromptStatus(models.TextChoices):
    DRAFT = "DRAFT", "Черновик"
    PENDING_MODERATION = "PENDING_MODERATION", "На модерации"
    PUBLISHED = "PUBLISHED", "Опубликован"
    REJECTED = "REJECTED", "Отклонён"
    ARCHIVED = "ARCHIVED", "В архиве"
    BLOCKED_BY_SECURITY = "BLOCKED_BY_SECURITY", "Заблокирован (безопасность)"
    PENDING_PLAGIARISM_REVIEW = "PENDING_PLAGIARISM_REVIEW", "Проверка плагиата"
    EMBEDDING_FAILED = "EMBEDDING_FAILED", "Ошибка эмбеддинга"


class Category(models.Model):
    """Категория промптов."""

    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    description = models.TextField(blank=True, default="")
    icon = models.CharField(max_length=50, blank=True, default="")
    order = models.PositiveSmallIntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Категория"
        verbose_name_plural = "Категории"
        ordering = ["order", "name"]

    def __str__(self) -> str:
        return self.name

    def save(self, *args: object, **kwargs: object) -> None:
        if not self.slug:
            self.slug = slugify(self.name, allow_unicode=True)
        super().save(*args, **kwargs)


class Tag(models.Model):
    """Тег промпта (свободный)."""

    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=60, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Тег"
        verbose_name_plural = "Теги"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name

    def save(self, *args: object, **kwargs: object) -> None:
        if not self.slug:
            self.slug = slugify(self.name, allow_unicode=True)
        super().save(*args, **kwargs)


class Prompt(models.Model):
    """
    Промпт — основная единица контента.

    Envelope Encryption реализуется в Sprint 2:
    encrypted_content / encrypted_dek / iv / auth_tag — добавляются в миграции Sprint 2.
    В Sprint 1 храним raw content только для DRAFT (публичного доступа нет).
    """

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="prompts",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prompts",
    )
    tags = models.ManyToManyField(Tag, blank=True, related_name="prompts")

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, db_index=True)
    short_description = models.TextField(max_length=500)

    # Статус в жизненном цикле промпта
    status = models.CharField(
        max_length=30,
        choices=PromptStatus.choices,
        default=PromptStatus.DRAFT,
        db_index=True,
    )

    # Ценообразование (DecimalField для денег, scale=2)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_free = models.BooleanField(default=False, db_index=True)

    # Шаблонные переменные {{placeholder}} — документируются в JSONField
    variables = models.JSONField(default=dict, blank=True)

    # SEO / OG
    og_image_object_key = models.CharField(max_length=512, blank=True, default="")

    # Digital Provenance (§9.2) — SHA-256 при PUBLISHED (Sprint 2)
    content_hash = models.CharField(max_length=64, blank=True, default="")

    # Статистика — обновляется только через F() (no race conditions)
    views_count = models.PositiveIntegerField(default=0)
    purchases_count = models.PositiveIntegerField(default=0)

    # Даты
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Промпт"
        verbose_name_plural = "Промпты"
        ordering = ["-published_at", "-created_at"]
        indexes = [
            models.Index(fields=["status", "published_at"]),
            models.Index(fields=["seller", "status"]),
            models.Index(fields=["is_free", "status"]),
            models.Index(fields=["category", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.title} [{self.status}]"

    def save(self, *args: object, **kwargs: object) -> None:
        if not self.slug:
            from django.utils.text import slugify as _slugify
            base = _slugify(self.title, allow_unicode=True)
            self.slug = f"{base}-{str(self.id)[:8]}" if base else str(self.id)
        # Синхронизация is_free с price
        if self.price == 0:
            self.is_free = True
        super().save(*args, **kwargs)


class Favorite(models.Model):
    """Промпт в избранном пользователя."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="favorites",
    )
    prompt = models.ForeignKey(
        Prompt,
        on_delete=models.CASCADE,
        related_name="favorited_by",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Избранное"
        verbose_name_plural = "Избранные"
        unique_together = [["user", "prompt"]]

    def __str__(self) -> str:
        return f"Favorite({self.user_id}, {self.prompt_id})"


class PromptAccess(models.Model):
    """
    Право доступа пользователя к расшифрованному контенту промпта.

    purchase=None → бесплатный промпт (price=0, без Robokassa).
    Проверяется перед расшифровкой (порядок §25.8).
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="prompt_accesses",
    )
    prompt = models.ForeignKey(
        Prompt,
        on_delete=models.CASCADE,
        related_name="accesses",
    )
    # null=True → бесплатный доступ без покупки
    purchase = models.OneToOneField(
        "payments.Purchase",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prompt_access",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Доступ к промпту"
        verbose_name_plural = "Доступы к промптам"
        unique_together = [["user", "prompt"]]
        indexes = [
            models.Index(fields=["user", "prompt"]),
        ]

    def __str__(self) -> str:
        return f"PromptAccess({self.user_id} → {self.prompt_id})"
