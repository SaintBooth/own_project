"""
Sprint 1 — Catalog API тесты.
Источник: promptspace-release.md §10.5, SPEC-003

DoD:
- Cursor encoding тест проходит
- Фильтрация по category, price, is_free работает
- Карточка промпта (slug) рендерится
"""
from __future__ import annotations

import base64
import json
from decimal import Decimal
from uuid import uuid4

import pytest


@pytest.fixture
def seller_user(db):
    """Создаёт пользователя-продавца."""
    from apps.users.models import User
    return User.objects.create(
        username="test_seller",
        email="seller@example.com",
        role="SELLER",
    )


@pytest.fixture
def category(db):
    """Создаёт тестовую категорию."""
    from apps.prompts.models import Category
    return Category.objects.create(name="Тест", slug="test-cat")


@pytest.fixture
def published_prompt(db, seller_user, category):
    """Создаёт опубликованный промпт."""
    from django.utils import timezone
    from apps.prompts.models import Prompt, PromptStatus
    return Prompt.objects.create(
        seller=seller_user,
        category=category,
        title="Test Prompt",
        slug="test-prompt",
        short_description="A test prompt",
        status=PromptStatus.PUBLISHED,
        price=Decimal("199.00"),
        published_at=timezone.now(),
    )


@pytest.fixture
def free_prompt(db, seller_user, category):
    """Создаёт бесплатный опубликованный промпт."""
    from django.utils import timezone
    from apps.prompts.models import Prompt, PromptStatus
    return Prompt.objects.create(
        seller=seller_user,
        category=category,
        title="Free Prompt",
        slug="free-prompt",
        short_description="A free prompt",
        status=PromptStatus.PUBLISHED,
        price=Decimal("0"),
        is_free=True,
        published_at=timezone.now(),
    )


@pytest.mark.django_db
class TestCatalogList:
    """Тесты GET /catalog/prompts."""

    def test_empty_catalog_returns_empty_list(self, client) -> None:
        """Пустой каталог → пустой список."""
        response = client.get("/api/v1/catalog/prompts")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["has_next"] is False

    def test_published_prompt_appears_in_catalog(self, client, published_prompt) -> None:
        """Опубликованный промпт виден в каталоге."""
        response = client.get("/api/v1/catalog/prompts")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["slug"] == "test-prompt"

    def test_draft_prompt_not_in_catalog(self, client, seller_user, category) -> None:
        """Черновик НЕ виден в каталоге."""
        from apps.prompts.models import Prompt, PromptStatus
        Prompt.objects.create(
            seller=seller_user,
            category=category,
            title="Draft",
            slug="draft-prompt",
            short_description="Draft",
            status=PromptStatus.DRAFT,
            price=Decimal("100"),
        )
        response = client.get("/api/v1/catalog/prompts")
        assert response.status_code == 200
        assert response.json()["items"] == []

    def test_filter_by_is_free(self, client, published_prompt, free_prompt) -> None:
        """Фильтр is_free=true возвращает только бесплатные."""
        response = client.get("/api/v1/catalog/prompts?is_free=true")
        assert response.status_code == 200
        items = response.json()["items"]
        assert len(items) == 1
        assert items[0]["is_free"] is True

    def test_filter_by_category(self, client, published_prompt, seller_user) -> None:
        """Фильтр по category slug."""
        from django.utils import timezone
        from apps.prompts.models import Category, Prompt, PromptStatus

        other_cat = Category.objects.create(name="Другая", slug="other-cat")
        Prompt.objects.create(
            seller=seller_user,
            category=other_cat,
            title="Other",
            slug="other-prompt",
            short_description="Other",
            status=PromptStatus.PUBLISHED,
            price=Decimal("50"),
            published_at=timezone.now(),
        )

        response = client.get("/api/v1/catalog/prompts?category=test-cat")
        assert response.status_code == 200
        items = response.json()["items"]
        assert len(items) == 1
        assert items[0]["slug"] == "test-prompt"

    def test_cursor_pagination_structure(self, client, published_prompt, seller_user, category) -> None:
        """Cursor pagination: has_next=True и next_cursor валиден при >PAGE_SIZE промптах."""
        from django.utils import timezone
        from apps.prompts.models import Prompt, PromptStatus
        from apps.prompts.api.catalog import PAGE_SIZE

        # Создаём PAGE_SIZE + 1 промптов
        prompts_to_create = PAGE_SIZE + 1
        for i in range(prompts_to_create):
            Prompt.objects.get_or_create(
                slug=f"cursor-test-{i}",
                defaults=dict(
                    seller=seller_user,
                    category=category,
                    title=f"Cursor Test {i}",
                    short_description="Test",
                    status=PromptStatus.PUBLISHED,
                    price=Decimal("10"),
                    published_at=timezone.now(),
                ),
            )

        response = client.get("/api/v1/catalog/prompts")
        assert response.status_code == 200
        data = response.json()
        assert data["has_next"] is True
        assert data["next_cursor"] is not None

        # cursor должен декодироваться в валидный JSON
        cursor = data["next_cursor"]
        decoded = json.loads(base64.urlsafe_b64decode(cursor + "==").decode())
        assert "id" in decoded
        assert "sort" in decoded

    def test_cursor_pagination_next_page(self, client, seller_user, category) -> None:
        """Переход на следующую страницу через cursor не дублирует элементы."""
        from django.utils import timezone
        from apps.prompts.models import Prompt, PromptStatus
        from apps.prompts.api.catalog import PAGE_SIZE

        slugs = [f"pag-test-{i:03d}" for i in range(PAGE_SIZE + 5)]
        for slug in slugs:
            Prompt.objects.get_or_create(
                slug=slug,
                defaults=dict(
                    seller=seller_user,
                    category=category,
                    title=slug,
                    short_description="Test",
                    status=PromptStatus.PUBLISHED,
                    price=Decimal("10"),
                    published_at=timezone.now(),
                ),
            )

        page1 = client.get("/api/v1/catalog/prompts").json()
        assert page1["has_next"] is True
        cursor = page1["next_cursor"]

        page2 = client.get(f"/api/v1/catalog/prompts?cursor={cursor}").json()
        ids_page1 = {item["id"] for item in page1["items"]}
        ids_page2 = {item["id"] for item in page2["items"]}
        assert ids_page1.isdisjoint(ids_page2), "Pages must not overlap"


@pytest.mark.django_db
class TestCatalogDetail:
    """Тесты GET /catalog/prompts/{slug}."""

    def test_get_published_prompt(self, client, published_prompt) -> None:
        """Карточка опубликованного промпта."""
        response = client.get(f"/api/v1/catalog/prompts/{published_prompt.slug}")
        assert response.status_code == 200
        data = response.json()
        assert data["slug"] == published_prompt.slug
        assert data["title"] == published_prompt.title

    def test_get_nonexistent_prompt_returns_404(self, client) -> None:
        """Несуществующий slug → 404."""
        response = client.get("/api/v1/catalog/prompts/nonexistent-slug")
        assert response.status_code == 404

    def test_get_draft_returns_404(self, client, seller_user, category) -> None:
        """Черновик недоступен публично → 404."""
        from apps.prompts.models import Prompt, PromptStatus
        Prompt.objects.create(
            seller=seller_user,
            category=category,
            title="Hidden Draft",
            slug="hidden-draft",
            short_description="Draft",
            status=PromptStatus.DRAFT,
            price=Decimal("100"),
        )
        response = client.get("/api/v1/catalog/prompts/hidden-draft")
        assert response.status_code == 404

    def test_view_count_increments(self, client, published_prompt) -> None:
        """GET карточки промпта инкрементирует views_count."""
        from apps.prompts.models import Prompt

        initial_views = published_prompt.views_count
        client.get(f"/api/v1/catalog/prompts/{published_prompt.slug}")

        published_prompt.refresh_from_db()
        assert published_prompt.views_count == initial_views + 1

    def test_view_count_uses_f_expression(self, client, published_prompt) -> None:
        """
        Множественные запросы инкрементируют views_count корректно через F().

        F() гарантирует атомарность на уровне БД: UPDATE prompt SET views_count = views_count + 1
        без SELECT-then-UPDATE (нет race condition).
        """
        n_requests = 5
        for _ in range(n_requests):
            client.get(f"/api/v1/catalog/prompts/{published_prompt.slug}")

        published_prompt.refresh_from_db()
        assert published_prompt.views_count == n_requests
