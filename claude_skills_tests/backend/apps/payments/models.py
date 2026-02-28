"""
Payments domain models — stub for Sprint 1.
Full implementation: Sprint 2 (SPEC-005).
Источник: promptspace-release.md §9.3, §10.7, §11.1
"""
from uuid import uuid4

from django.conf import settings
from django.db import models


class PurchaseStatus(models.TextChoices):
    PENDING = "PENDING", "Ожидает оплаты"
    SUCCESS = "SUCCESS", "Оплачен"
    FAILED = "FAILED", "Ошибка оплаты"
    CANCELLED = "CANCELLED", "Отменён"
    REFUNDED = "REFUNDED", "Возвращён"


class Purchase(models.Model):
    """
    Покупка промпта. Полная реализация в Sprint 2.

    В Sprint 1 создаётся только модель для FK из PromptAccess.
    """

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="purchases",
    )
    prompt = models.ForeignKey(
        "prompts.Prompt",
        on_delete=models.PROTECT,
        related_name="purchases",
    )
    status = models.CharField(
        max_length=20,
        choices=PurchaseStatus.choices,
        default=PurchaseStatus.PENDING,
        db_index=True,
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    # Фиксируется на момент оплаты (§11.1)
    platform_commission_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0)
    platform_commission_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Robokassa InvId
    robokassa_inv_id = models.PositiveIntegerField(null=True, blank=True, unique=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Покупка"
        verbose_name_plural = "Покупки"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["prompt", "status"]),
        ]

    def __str__(self) -> str:
        return f"Purchase({self.id}, {self.status})"
