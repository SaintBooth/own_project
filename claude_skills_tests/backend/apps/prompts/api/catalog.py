"""
Catalog API — /api/v1/catalog/
Источник: promptspace-release.md §10.5, §6

Endpoints:
  GET /catalog/prompts          → cursor-based pagination
  GET /catalog/prompts/{slug}   → публичная карточка промпта
"""
from __future__ import annotations

import base64
import json
import logging
from decimal import Decimal
from typing import Any
from uuid import UUID

from django.db.models import F, Q
from django.http import HttpRequest
from ninja import Query, Router, Schema
from pydantic import field_validator

from apps.prompts.models import Prompt, PromptStatus

logger = logging.getLogger(__name__)

router = Router(tags=["Catalog"])

PAGE_SIZE = 20


# ── Output Schemas ────────────────────────────────────────────────────────

class CategoryOut(Schema):
    id: int
    name: str
    slug: str


class TagOut(Schema):
    id: int
    name: str
    slug: str


class SellerOut(Schema):
    id: UUID
    username: str
    bio: str = ""
    avatar_url: str | None = None


class PromptListItem(Schema):
    id: UUID
    slug: str
    title: str
    short_description: str
    category: CategoryOut | None
    tags: list[TagOut]
    price: Decimal
    is_free: bool
    seller: SellerOut
    views_count: int
    purchases_count: int
    published_at: str | None


class CursorPage(Schema):
    items: list[PromptListItem]
    next_cursor: str | None
    has_next: bool
    total_hint: int | None = None


class PromptDetail(Schema):
    id: UUID
    slug: str
    title: str
    short_description: str
    category: CategoryOut | None
    tags: list[TagOut]
    price: Decimal
    is_free: bool
    seller: SellerOut
    views_count: int
    purchases_count: int
    published_at: str | None
    variables: dict[str, Any]
    og_image_object_key: str


class ErrorOut(Schema):
    detail: str


# ── Filter Schema ─────────────────────────────────────────────────────────

class CatalogFilters(Schema):
    category: str | None = None           # category slug
    tags: list[str] | None = None         # tag slugs
    price_min: Decimal | None = None
    price_max: Decimal | None = None
    is_free: bool | None = None
    q: str | None = None                  # текстовый поиск (простой LIKE, семантический — Sprint 3)
    sort: str = "newest"                  # newest | popular | price_asc | price_desc
    cursor: str | None = None


# ── Endpoints ─────────────────────────────────────────────────────────────

@router.get(
    "/prompts",
    response=CursorPage,
    auth=None,
    summary="Каталог промптов (cursor-based pagination)",
)
def list_prompts(request: HttpRequest, filters: CatalogFilters = Query(...)) -> CursorPage:  # type: ignore[assignment]
    """
    Cursor-based пагинация без offset.
    cursor = base64({"id": last_id, "ts": last_published_at_iso})

    Сортировка:
    - newest   → -published_at, -id
    - popular  → -purchases_count, -id
    - price_asc  → price, id
    - price_desc → -price, id
    """
    qs = (
        Prompt.objects
        .filter(status=PromptStatus.PUBLISHED)
        .select_related("seller", "seller__seller_profile", "category")
        .prefetch_related("tags")
    )

    # ── Фильтрация ─────────────────────────────────────────────────────────
    if filters.category:
        qs = qs.filter(category__slug=filters.category)

    if filters.tags:
        for tag_slug in filters.tags:
            qs = qs.filter(tags__slug=tag_slug)

    if filters.is_free is not None:
        qs = qs.filter(is_free=filters.is_free)

    if filters.price_min is not None:
        qs = qs.filter(price__gte=filters.price_min)

    if filters.price_max is not None:
        qs = qs.filter(price__lte=filters.price_max)

    if filters.q:
        qs = qs.filter(
            Q(title__icontains=filters.q) | Q(short_description__icontains=filters.q)
        )

    # ── Сортировка + cursor decode ─────────────────────────────────────────
    sort_map = {
        "newest": ("-published_at", "-id"),
        "popular": ("-purchases_count", "-id"),
        "price_asc": ("price", "id"),
        "price_desc": ("-price", "id"),
    }
    order_fields = sort_map.get(filters.sort, sort_map["newest"])
    qs = qs.order_by(*order_fields)

    if filters.cursor:
        try:
            cursor_data = json.loads(base64.urlsafe_b64decode(filters.cursor + "==").decode())
            qs = _apply_cursor(qs, cursor_data, filters.sort)
        except Exception:
            logger.warning("Invalid cursor: %s", filters.cursor)

    # Запрашиваем PAGE_SIZE + 1 для определения has_next
    items = list(qs[: PAGE_SIZE + 1])
    has_next = len(items) > PAGE_SIZE
    if has_next:
        items = items[:PAGE_SIZE]

    next_cursor = None
    if has_next and items:
        last = items[-1]
        cursor_payload = {
            "id": str(last.id),
            "ts": last.published_at.isoformat() if last.published_at else None,
            "price": str(last.price),
            "purchases": last.purchases_count,
            "sort": filters.sort,
        }
        next_cursor = base64.urlsafe_b64encode(
            json.dumps(cursor_payload).encode()
        ).decode().rstrip("=")

    return CursorPage(
        items=[_serialize_prompt_list(p) for p in items],
        next_cursor=next_cursor,
        has_next=has_next,
    )


@router.get(
    "/prompts/{slug}",
    response={200: PromptDetail, 404: ErrorOut},
    auth=None,
    summary="Публичная карточка промпта",
)
def get_prompt(request: HttpRequest, slug: str) -> tuple[int, Any]:
    """
    Публичная карточка промпта.
    Инкрементирует views_count через F() (без race condition).
    """
    try:
        prompt = (
            Prompt.objects
            .filter(slug=slug, status=PromptStatus.PUBLISHED)
            .select_related("seller", "seller__seller_profile", "category")
            .prefetch_related("tags")
            .get()
        )
    except Prompt.DoesNotExist:
        return 404, ErrorOut(detail="Prompt not found")

    # Атомарный инкремент просмотров (F() без race condition)
    Prompt.objects.filter(pk=prompt.pk).update(views_count=F("views_count") + 1)

    return 200, PromptDetail(
        id=prompt.id,
        slug=prompt.slug,
        title=prompt.title,
        short_description=prompt.short_description,
        category=CategoryOut(id=prompt.category_id, name=prompt.category.name, slug=prompt.category.slug) if prompt.category else None,
        tags=[TagOut(id=t.id, name=t.name, slug=t.slug) for t in prompt.tags.all()],
        price=prompt.price,
        is_free=prompt.is_free,
        seller=_serialize_seller(prompt),
        views_count=prompt.views_count,
        purchases_count=prompt.purchases_count,
        published_at=prompt.published_at.isoformat() if prompt.published_at else None,
        variables=prompt.variables,
        og_image_object_key=prompt.og_image_object_key,
    )


# ── Helpers ───────────────────────────────────────────────────────────────

def _serialize_seller(prompt: Prompt) -> SellerOut:
    try:
        sp = prompt.seller.seller_profile
        bio = sp.bio
        avatar = sp.avatar_url
    except Exception:
        bio = ""
        avatar = None
    return SellerOut(
        id=prompt.seller.id,
        username=prompt.seller.username,
        bio=bio,
        avatar_url=avatar,
    )


def _serialize_prompt_list(prompt: Prompt) -> PromptListItem:
    return PromptListItem(
        id=prompt.id,
        slug=prompt.slug,
        title=prompt.title,
        short_description=prompt.short_description,
        category=CategoryOut(
            id=prompt.category_id,
            name=prompt.category.name,
            slug=prompt.category.slug,
        ) if prompt.category else None,
        tags=[TagOut(id=t.id, name=t.name, slug=t.slug) for t in prompt.tags.all()],
        price=prompt.price,
        is_free=prompt.is_free,
        seller=_serialize_seller(prompt),
        views_count=prompt.views_count,
        purchases_count=prompt.purchases_count,
        published_at=prompt.published_at.isoformat() if prompt.published_at else None,
    )


def _apply_cursor(qs: Any, cursor_data: dict[str, Any], sort: str) -> Any:
    """Применяет cursor-фильтрацию к queryset."""
    last_id = cursor_data.get("id")
    last_ts = cursor_data.get("ts")
    last_price = cursor_data.get("price")
    last_purchases = cursor_data.get("purchases")

    if sort == "newest" and last_ts and last_id:
        qs = qs.filter(
            Q(published_at__lt=last_ts) | Q(published_at=last_ts, id__lt=last_id)
        )
    elif sort == "popular" and last_purchases is not None and last_id:
        qs = qs.filter(
            Q(purchases_count__lt=last_purchases)
            | Q(purchases_count=last_purchases, id__gt=last_id)
        )
    elif sort == "price_asc" and last_price is not None and last_id:
        qs = qs.filter(
            Q(price__gt=last_price) | Q(price=last_price, id__gt=last_id)
        )
    elif sort == "price_desc" and last_price is not None and last_id:
        qs = qs.filter(
            Q(price__lt=last_price) | Q(price=last_price, id__gt=last_id)
        )
    return qs
