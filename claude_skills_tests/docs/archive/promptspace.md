# PromptSpace — Architecture & Product Document

> **Статус:** В разработке
> **Последнее обновление:** 2026-02-26
> **Версия:** 0.1

---

## Содержание

1. [Обзор продукта](#1-обзор-продукта)
2. [Юридический комплаенс (152-ФЗ)](#2-юридический-комплаенс-152-фз)
3. [Финансы и монетизация](#3-финансы-и-монетизация)
4. [Ролевая модель и личные кабинеты](#4-ролевая-модель-и-личные-кабинеты)
5. [Каталог: поиск и фильтрация](#5-каталог-поиск-и-фильтрация)
6. [Структура карточки промпта](#6-структура-карточки-промпта)
7. [Архитектура системы](#7-архитектура-системы)
8. [Data Model (Django)](#8-data-model-django)
9. [Структура репозитория](#9-структура-репозитория)
10. [ADR — Architecture Decision Records](#10-adr--architecture-decision-records)
11. [SEO и базовые страницы](#11-seo-и-базовые-страницы)
12. [Инфраструктура и деплой](#12-инфраструктура-и-деплой)
13. [Открытые вопросы и риски](#13-открытые-вопросы-и-риски)

---

## 1. Обзор продукта

**PromptSpace** — маркетплейс AI-промптов для российского рынка. Платформа соединяет авторов промптов (ИП, Самозанятые) с покупателями, обеспечивая защиту интеллектуальной собственности через шифрование и прозрачную финансовую схему через Robokassa Split.

**Ключевые характеристики:**
- Семантический поиск по смыслу запроса (pgvector)
- Шифрование промптов на уровне приложения (AES-256-GCM + KMS)
- Автоматическое сплитование выплат (Robokassa Split)
- Полный комплаенс 152-ФЗ (серверы в РФ, DSR API)
- KYC верификация продавцов через API ФНС

**Технологический стек:**
| Компонент | Технология |
|---|---|
| Backend API | Django + Django Ninja |
| Frontend | Next.js (App Router, SSR) |
| База данных | PostgreSQL + pgvector |
| Кеш / Брокер | Redis |
| Очередь задач | Celery |
| Хранилище медиа | Yandex Object Storage (S3) |
| KMS | Yandex KMS / HashiCorp Vault |
| Мониторинг | Zabbix + Telegram алерты |
| Аналитика | Яндекс.Метрика |
| CI/CD | GitHub Actions |
| Хостинг | Yandex Cloud / Selectel (РФ) |

---

## 2. Юридический комплаенс (152-ФЗ)

Маркетплейс оперирует персональными данными граждан РФ. Следующие пункты обязательны к реализации.

### 2.1. Инфраструктура
- Размещение серверов и БД (PostgreSQL) исключительно на территории РФ (Yandex Cloud, Selectel)
- Базы данных не реплицируются за пределы РФ

### 2.2. Сбор согласий (UI/UX)
- Чекбоксы (не предзаполненные) под каждой формой (регистрация, покупка, контакты) с текстом: _"Я даю сознательное согласие на обработку персональных данных в соответствии с [Политикой]"_
- Для публичных профилей продавцов — отдельный чекбокс на распространение ПДн
- Cookie-баннер: информирует о сборе Cookie, IP, геолокации. **Яндекс.Метрика инициализируется только после клика "Согласен"**
- В БД фиксируется `consent_pd_at` (datetime) — не булев флаг, а момент согласия

### 2.3. Документация
- Ссылка на "Политику обработки ПДн" в сквозном футере всех страниц

### 2.4. Права пользователей (Backend + UI)
- **Data Export:** API эндпоинт в личном кабинете для скачивания своих данных в машиночитаемом JSON-формате
- **Право на забвение:** Полное удаление аккаунта с каскадной анонимизацией:
  - Аккаунт помечается `is_deleted=True`, email/username обезличиваются
  - Финансовые транзакции **не удаляются** (требования бухучёта, хранение 5 лет) — `buyer` заменяется на `NULL`
  - Выполняется через Celery-задачу асинхронно
- **DSR страница:** `/legal/dsr/` — форма для запросов по 152-ФЗ

---

## 3. Финансы и монетизация

### 3.1. Robokassa Split
При оплате покупателем сумма транзакции автоматически делится:
- **Комиссия платформы PromptSpace** — процент от суммы (настраивается через Django Admin)
- **Доход автора** — перечисляется напрямую на р/с ИП или карту Самозанятого

Это снимает с платформы налоговую нагрузку и упрощает юридическую схему: платформа не является транзитом средств.

### 3.2. Бесплатные промпты
- `price = 0` → Robokassa не задействована
- Backend напрямую создаёт запись `PromptAccess` без платёжного flow

### 3.3. Комиссия платформы
- Размер комиссии настраивается Superadmin через Django Admin (системная настройка)
- Фиксируется в каждой транзакции `Purchase.platform_commission` на момент оплаты

---

## 4. Ролевая модель и личные кабинеты

Платформа поддерживает 4 типа пользователей. Регистрация: Yandex ID, VK ID, Telegram Auth или Email+OTP.

### 4.1. Покупатель (Buyer)
**Функционал:** Просмотр каталога, добавление в избранное, покупка промптов.

**Личный кабинет:**
- Библиотека купленных промптов (доступ к расшифрованному тексту с кнопкой "Копировать")
- История транзакций и чеки
- Настройки профиля и управление согласиями 152-ФЗ
- Data Export и запрос на удаление аккаунта

### 4.2. Продавец (Seller / Автор)
**Верификация (KYC):** Продавать могут только ИП или Самозанятые. При регистрации запрашивается ИНН. Backend интегрируется с API ФНС (Dadata) для автоматической проверки статуса НПД/ИП.

**Личный кабинет:**
- CRUD-интерфейс для промптов (создание, редактирование, установка цены)
- Управление статусами промптов (снять с продажи / архивировать)
- Дашборд аналитики: просмотры карточек, конверсия в покупку, заработанная сумма
- Управление реквизитами для Robokassa Split

### 4.3. Модератор (Moderator)
**Функционал:** Проверка новых промптов перед публикацией.

**Личный кабинет:**
- Очередь промптов на модерацию (Accept / Reject с указанием причины)
- Модератор видит только превью, описание и метаданные — **зашифрованный текст промпта недоступен**

### 4.4. Супер-Админ (Superadmin)
**Функционал:** Полный контроль через нативную Django Admin.

**Возможности:**
- Глобальная финансовая аналитика (оборот, доход платформы)
- Управление пользователями (бан, логин под другим пользователем, смена статусов)
- CMS: создание и редактирование динамических страниц, управление SEO-тегами, категориями, фильтрами
- Управление баннерами и системными настройками (размер комиссии и др.)

---

## 5. Каталог: поиск и фильтрация

### 5.1. Семантический поиск
Строка поиска работает на базе векторного алгоритма через **pgvector**, понимая запросы на естественном языке. Эмбеддинги генерируются из заголовка, описания и метаданных промпта (не из зашифрованного текста).

Индекс: **HNSW** (Hierarchical Navigable Small World) для субмиллисекундного поиска по косинусному расстоянию.

### 5.2. Фасетная фильтрация
| Фильтр | Варианты |
|---|---|
| Нейросеть | ChatGPT-4o, Claude 3.5, Midjourney v6, Stable Diffusion, DALL-E 3, и др. |
| Категория | Маркетинг, SEO, Разработка, Дизайн, Продуктивность, и др. |
| Теги | свободные теги |
| Цена | Бесплатно / Диапазон |
| Рейтинг | от 4★ и выше |
| Формат вывода | Текст / Код / Изображение / JSON |

---

## 6. Структура карточки промпта

Промпты бывают разных форматов, поэтому структура гибкая — `public_metadata: JSONB`.

| Поле | Видимость | Описание |
|---|---|---|
| Заголовок | Публично | |
| Краткое описание | Публично | До 500 символов |
| Тип (AI-модель) | Публично | Midjourney v6, ChatGPT-4o и др. |
| Категория + теги | Публично | |
| Примеры результата | Публично | Скриншоты или тексты из YOS |
| Инструкция по применению | Публично | Как использовать параметры |
| Цена | Публично | |
| Рейтинг и отзывы | Публично | |
| **Текст промпта + переменные** | **После оплаты** | Хранится зашифрованным (AES-256-GCM) |

**Примеры `public_metadata` для разных форматов:**
```json
// Stable Diffusion
{
  "negative_prompt_hint": "blurry, low quality...",
  "cfg_scale": 7,
  "variables": ["subject", "style"]
}

// Claude System Prompt
{
  "variables": ["role", "context", "output_format"],
  "usage_notes": "Вставьте в поле System в начале диалога"
}
```

### 6.1. Жизненный цикл промпта (State Machine)
```
DRAFT → PENDING_MODERATION → APPROVED → PUBLISHED
                           ↘ REJECTED  (с причиной)
PUBLISHED → ARCHIVED       (продавец снял с продажи)
```

- Эмбеддинги генерируются асинхронно (Celery) после перехода в `APPROVED`
- Редактирование возможно только в `DRAFT` и `REJECTED`
- Опубликованный промпт редактируется in-place (версионирование — вне MVP)

---

## 7. Архитектура системы

### 7.1. Топология сервисов

```
┌──────────────────────────────────────────────────────────────┐
│                    RF Серверы (152-ФЗ)                       │
│                                                              │
│   [Browser] ──── [Nginx] ──┬── [Next.js SSR :3000]          │
│                            └── [Django API :8000]            │
│                                 [Django Admin /admin/]       │
│                                      │                       │
│                    ┌─────────────────┘                       │
│                    │                                         │
│   [PostgreSQL 16 + pgvector]    [Redis 7]                   │
│          │                           │                       │
│   [Celery Workers] ──────────────────┘                       │
│          │                                                   │
│     ├── generate_embeddings                                  │
│     ├── process_payment_webhook                              │
│     ├── verify_seller_inn                                    │
│     ├── anonymize_account (право на забвение)                │
│     └── rebuild_hnsw_index (by schedule)                    │
│                                                              │
│  Внешние интеграции:                                        │
│  [Yandex KMS]  [Robokassa]  [FNS API / Dadata]             │
│  [Yandex Object Storage]    [Яндекс.Метрика]                │
│  [Zabbix] ──── [Telegram Alerts]                            │
└──────────────────────────────────────────────────────────────┘
```

### 7.2. Ключевые потоки данных

**Покупка промпта:**
```
Buyer "Купить" → Django генерирует Robokassa ссылку (с параметрами сплита)
→ Редирект на Robokassa → Оплата
→ Robokassa POST ResultURL (webhook) → Django проверяет IP + подпись
→ Идемпотентное создание Purchase(SUCCESS) + PromptAccess
→ Buyer запрашивает промпт → Django проверяет PromptAccess
→ Запрос DEK из KMS (или кеш Redis TTL 10мин)
→ Расшифровка в памяти → HTTPS ответ Buyer
```

**Загрузка промпта продавцом:**
```
Seller POST /api/v1/prompts/ → Django получает plaintext
→ KMS генерирует DEK → AES-256-GCM шифрование
→ PostgreSQL: ciphertext + kms_key_id (plaintext НЕ сохраняется)
→ Status: DRAFT → Seller submit → PENDING_MODERATION
→ Celery: generate_embeddings (после APPROVED)
```

---

## 8. Data Model (Django)

### `users/models.py`

```python
class UserRole(models.TextChoices):
    BUYER = "buyer"
    SELLER = "seller"
    MODERATOR = "moderator"
    SUPERADMIN = "superadmin"


class User(AbstractBaseUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=64, unique=True)
    role = models.CharField(max_length=16, choices=UserRole.choices, default=UserRole.BUYER)
    is_active = models.BooleanField(default=True)

    # 152-ФЗ: фиксируем datetime согласия, не булев флаг
    consent_pd_at = models.DateTimeField(null=True)
    consent_cookie_at = models.DateTimeField(null=True)

    # OAuth (nullable — не все привязывают соцсети)
    yandex_id = models.CharField(max_length=64, null=True, unique=True)
    vk_id = models.CharField(max_length=64, null=True, unique=True)
    telegram_id = models.CharField(max_length=64, null=True, unique=True)

    # Право на забвение: мягкое удаление + async анонимизация через Celery
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    USERNAME_FIELD = "email"


class KYCStatus(models.TextChoices):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class LegalType(models.TextChoices):
    IP = "ip"
    SELF_EMPLOYED = "self_employed"


class SellerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="seller_profile")
    inn = models.CharField(max_length=12)
    legal_type = models.CharField(max_length=16, choices=LegalType.choices)
    kyc_status = models.CharField(max_length=16, choices=KYCStatus.choices, default=KYCStatus.PENDING)
    kyc_verified_at = models.DateTimeField(null=True)
    kyc_rejection_reason = models.TextField(blank=True)
    robokassa_login = models.CharField(max_length=128, blank=True)
    # Согласие на распространение ПДн (публичный профиль — 152-ФЗ)
    consent_pd_distribution_at = models.DateTimeField(null=True)
```

### `prompts/models.py`

```python
class PromptStatus(models.TextChoices):
    DRAFT = "draft"
    PENDING_MODERATION = "pending_moderation"
    APPROVED = "approved"
    PUBLISHED = "published"
    REJECTED = "rejected"
    ARCHIVED = "archived"


class FormatType(models.TextChoices):
    TEXT = "text"
    CODE = "code"
    IMAGE = "image"
    JSON = "json"


class Category(models.Model):
    name = models.CharField(max_length=128)
    slug = models.SlugField(unique=True)
    parent = models.ForeignKey("self", null=True, on_delete=models.SET_NULL, related_name="children")
    meta_title = models.CharField(max_length=160, blank=True)
    meta_description = models.TextField(blank=True)
    h1 = models.CharField(max_length=200, blank=True)


class Tag(models.Model):
    name = models.CharField(max_length=64)
    slug = models.SlugField(unique=True)


class Prompt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    seller = models.ForeignKey(User, on_delete=models.PROTECT, related_name="prompts")
    title = models.CharField(max_length=200)
    short_description = models.TextField(max_length=500)
    ai_model = models.CharField(max_length=64)
    category = models.ForeignKey(Category, on_delete=models.PROTECT)
    tags = models.ManyToManyField(Tag, blank=True)
    format_type = models.CharField(max_length=16, choices=FormatType.choices)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=24, choices=PromptStatus.choices, default=PromptStatus.DRAFT)

    # Гибкая структура для разных AI-форматов (negative_prompt для SD, variables для Claude и т.д.)
    public_metadata = models.JSONField(default=dict)

    # Зашифрованный контент (AES-256-GCM через KMS)
    encrypted_content = models.BinaryField()
    kms_key_id = models.CharField(max_length=255)

    # pgvector: NULL до генерации, генерируется async после APPROVED
    embedding = VectorField(dimensions=1536, null=True)

    # Денормализованные счётчики — обновляются Celery, не DB триггерами
    views_count = models.PositiveIntegerField(default=0)
    purchases_count = models.PositiveIntegerField(default=0)
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    rating_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["status", "category"]),
            models.Index(fields=["seller", "status"]),
            models.Index(fields=["price"]),
        ]
        # HNSW индекс создаётся отдельной миграцией:
        # CREATE INDEX ON prompts_prompt USING hnsw (embedding vector_cosine_ops)


class PromptOutputExample(models.Model):
    """Примеры результата — файлы в Yandex Object Storage, presigned URL генерируется на лету."""
    prompt = models.ForeignKey(Prompt, on_delete=models.CASCADE, related_name="output_examples")
    object_key = models.CharField(max_length=512)
    content_type = models.CharField(max_length=64)
    order = models.PositiveSmallIntegerField(default=0)


class ModerationRecord(models.Model):
    prompt = models.ForeignKey(Prompt, on_delete=models.CASCADE, related_name="moderation_records")
    moderator = models.ForeignKey(User, on_delete=models.PROTECT)
    action = models.CharField(max_length=16, choices=[("approved", "Approved"), ("rejected", "Rejected")])
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### `payments/models.py`

```python
class PurchaseStatus(models.TextChoices):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    REFUNDED = "refunded"


class Purchase(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # null=True для анонимизации при "праве на забвение" — запись не удаляется
    buyer = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="purchases")
    prompt = models.ForeignKey(Prompt, on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    platform_commission = models.DecimalField(max_digits=10, decimal_places=2)
    seller_amount = models.DecimalField(max_digits=10, decimal_places=2)
    robokassa_invoice_id = models.CharField(max_length=128, unique=True)
    status = models.CharField(max_length=16, choices=PurchaseStatus.choices, default=PurchaseStatus.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True)


class PromptAccess(models.Model):
    """Право покупателя расшифровать промпт. Создаётся идемпотентно."""
    buyer = models.ForeignKey(User, on_delete=models.PROTECT)
    prompt = models.ForeignKey(Prompt, on_delete=models.PROTECT)
    purchase = models.ForeignKey(Purchase, null=True, on_delete=models.PROTECT)  # null для price=0
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("buyer", "prompt")]
```

### `reviews/models.py`

```python
class Review(models.Model):
    buyer = models.ForeignKey(User, on_delete=models.PROTECT)
    prompt = models.ForeignKey(Prompt, on_delete=models.PROTECT)
    purchase = models.ForeignKey(Purchase, on_delete=models.PROTECT)
    rating = models.PositiveSmallIntegerField()  # 1–5
    text = models.TextField(max_length=2000, blank=True)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("buyer", "prompt")]
```

### `audit/models.py`

```python
class AuditLog(models.Model):
    """Append-only лог критичных операций. Никогда не обновляется."""
    user = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=64)     # "prompt.decrypt", "account.delete", "kyc.verify"
    resource_type = models.CharField(max_length=64)
    resource_id = models.CharField(max_length=64)
    metadata = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["action", "created_at"])]
```

---

## 9. Структура репозитория

```
promptspace/
├── backend/
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── local.py
│   │   │   └── production.py
│   │   ├── urls.py
│   │   └── celery.py
│   ├── apps/
│   │   ├── users/
│   │   ├── prompts/
│   │   ├── payments/
│   │   ├── reviews/
│   │   ├── search/          # pgvector логика, embedding pipeline
│   │   ├── audit/
│   │   └── moderation/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── router.py
│   │   │   ├── auth.py
│   │   │   ├── prompts.py
│   │   │   ├── payments.py
│   │   │   └── users.py
│   │   └── webhooks/
│   │       └── robokassa.py
│   ├── services/            # бизнес-логика (не ORM)
│   │   ├── kms.py           # шифрование/расшифровка через Yandex KMS
│   │   ├── kyc.py           # верификация ИНН через FNS API / Dadata
│   │   ├── payment.py       # Robokassa integration
│   │   ├── search.py        # семантический поиск через pgvector
│   │   └── storage.py       # Yandex Object Storage (presigned URLs)
│   ├── tasks/               # Celery задачи
│   │   ├── embeddings.py
│   │   ├── kyc.py
│   │   ├── notifications.py
│   │   └── gdpr.py          # анонимизация при "праве на забвение"
│   └── Dockerfile
├── frontend/                # Next.js (App Router)
│   ├── app/
│   │   ├── (catalog)/
│   │   ├── (prompt)/[slug]/
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   └── (legal)/
│   ├── components/
│   └── Dockerfile
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
├── docker-compose.prod.yml
└── .github/
    └── workflows/
        ├── ci.yml           # тесты + линтинг (pytest, ruff, mypy)
        └── deploy.yml       # Docker build → push → деплой на prod
```

---

## 10. ADR — Architecture Decision Records

### ADR-001: Zero Trust шифрование промптов (KMS)

**Статус:** Accepted

**Контекст:**
Маркетплейсу требуется хранить AI-промпты так, чтобы при компрометации БД злоумышленники (включая администраторов платформы) не могли получить доступ к исходным текстам.

**Решение:** Серверное шифрование на уровне приложения (AES-256-GCM) с внешней системой управления ключами (Yandex KMS или HashiCorp Vault).

- **Загрузка:** Backend запрашивает у KMS уникальный DEK → шифрует промпт → в PostgreSQL сохраняется только `ciphertext` + `kms_key_id`
- **Чтение:** Backend проверяет `PromptAccess` → запрашивает DEK у KMS (или из Redis-кеша TTL 10 мин) → расшифровывает в оперативной памяти → отдаёт по HTTPS
- Промпты **никогда** не сохраняются в открытом виде на диске или в логах

**Уточнения:**
- DEK кешируется в Redis (зашифрованным) с TTL 10 минут — без кеша каждый запрос = сетевой вызов к KMS (~50–100мс)
- Конфигурация логирования явно запрещает вывод полей `encrypted_content` и расшифрованных текстов

**Последствия:**
- `+` Промпты защищены даже при полном дампе БД
- `+` Соответствует принципу Zero Trust
- `-` Дополнительный сетевой вызов при первом чтении
- `-` Зависимость от доступности KMS (нужен failover)

---

### ADR-002: pgvector для семантического поиска

**Статус:** Accepted

**Контекст:**
Требуется интеллектуальный поиск по смыслу запроса, а не только по ключевым словам.

**Решение:** Расширение pgvector в существующем PostgreSQL.

**Обоснование:** Основные бизнес-данные уже в PostgreSQL → использование pgvector исключает дополнительную инфраструктуру (Qdrant, Pinecone) и проблему синхронизации данных между БД.

**Детали реализации:**
- Индекс: `HNSW` — субмиллисекундный поиск по косинусному расстоянию
- Эмбеддинги генерируются **асинхронно** (Celery) после перехода промпта в `APPROVED`
- Векторизируются: заголовок + описание + теги + `ai_model`. **Зашифрованный текст не векторизируется**
- Перестройка HNSW индекса: Celery Beat, раз в сутки (при добавлении > 10% новых векторов производительность деградирует)

**Последствия:**
- `+` Нет дополнительных сервисов, единая БД
- `+` Транзакционная консистентность без синхронизации
- `-` При > 10М промптов потребуется оценить вынос в Qdrant

---

### ADR-003: Robokassa Split — платёжный flow

**Статус:** Accepted

**Flow:**
1. Buyer нажимает "Купить" → Django создаёт `Purchase(PENDING)` + генерирует Robokassa ссылку с параметрами сплита
2. Редирект на шлюз Robokassa → Оплата
3. Robokassa POST на `ResultURL` (вебхук)
4. Django проверяет: **IP whitelist** Robokassa + **криптографическую подпись**
5. Идемпотентное обновление `Purchase(SUCCESS)` + создание `PromptAccess`
6. Деньги автоматически разделяются Robokassa: платформе + продавцу напрямую

**Критичные детали:**
- `robokassa_invoice_id` — уникальный индекс: защита от дублирования при повторных вебхуках
- `PromptAccess` создаётся через `get_or_create` — идемпотентно
- IP whitelist — первый рубеж защиты, до проверки подписи
- Celery очередь `critical`: sequential обработка вебхуков (0 concurrency)

**Последствия:**
- `+` Платформа не является транзитом средств, упрощает налоговую схему
- `+` Прямые выплаты продавцам без участия платформы
- `-` Зависимость от Robokassa API

---

### ADR-004: Комплаенс 152-ФЗ (локализация и приватность)

**Статус:** Accepted

**Решение:**
- Вся инфраструктура **исключительно на серверах в РФ** (Yandex Cloud / Selectel)
- PostgreSQL не реплицируется за пределы РФ

**DSR API (Data Subject Requests):**
- `GET /api/v1/users/me/export` — выгрузка ПДн в JSON (машиночитаемый формат со схемой)
- `DELETE /api/v1/users/me` — запуск Celery-задачи анонимизации

**Стратегия анонимизации (право на забвение):**
- Аккаунт: `is_deleted=True`, email/username заменяются на `deleted_{uuid}@deleted.local`
- Транзакции `Purchase`: `buyer = NULL` (анонимизация, не удаление — требования бухучёта 5 лет)
- `PromptAccess`, `Review`, `AuditLog`: каскадное удаление или обезличивание

**Последствия:**
- `+` Полное соответствие 152-ФЗ
- `-` Серверы в РФ ограничивают выбор провайдеров

---

### ADR-005: Frontend архитектура

**Статус:** Accepted

**Контекст:**
PRD требует Mobile-First, Core Web Vitals (LCP < 2.5s), SEO с семантической разметкой. Django-шаблоны не дают достаточного уровня интерактивности для маркетплейса. React SPA даёт плохой SEO.

**Решение:** **Next.js (App Router)** как отдельный frontend-сервис + Django Ninja как API.

| Вариант | Плюсы | Минусы |
|---|---|---|
| Django templates + HTMX | Простой стек, один деплой | Сложно достичь CWV для сложного каталога |
| **Next.js SSR + Django API** | Отличный SEO, CWV из коробки | Два сервиса |
| React SPA (Vite) | Быстрая разработка | Плохой SEO, медленный FCP |

**Детали реализации:**
- Страницы каталога и карточек — Server Components (SSR для SEO и CWV)
- Интерактивные части (фильтры, покупка, личный кабинет) — Client Components
- Django Admin остаётся для Superadmin без изменений
- Nginx: `/api/` → Django `:8000`, остальное → Next.js `:3000`

**Последствия:**
- `+` SEO и Core Web Vitals без компромиссов
- `+` SSR-кеш Next.js снижает нагрузку на Django для публичных страниц
- `-` Два Docker-образа, сложнее локальная разработка

---

### ADR-006: Async Processing Pipeline (Celery + Redis)

**Статус:** Accepted

**Контекст:**
Несколько операций нельзя выполнять синхронно: генерация эмбеддингов (~500–2000мс), верификация ИНН через ФНС (нестабильный внешний сервис), обработка Robokassa вебхука, отправка уведомлений.

**Решение:** Celery + Redis (брокер + result backend).

**Задачи и приоритеты:**

| Задача | Триггер | Очередь |
|---|---|---|
| `process_payment_webhook` | POST на ResultURL | `critical` (sequential) |
| `verify_seller_inn` | Регистрация продавца | `high` |
| `generate_embeddings` | Промпт → APPROVED | `default` |
| `anonymize_account` | Запрос удаления | `default` |
| `send_notification` | Покупка, модерация | `low` |
| `rebuild_hnsw_index` | Celery Beat, раз в сутки | `low` |

**Все задачи идемпотентны** — повтор при сбое безопасен.

**Последствия:**
- `+` HTTP-запросы не блокируются на внешних вызовах
- `+` Отказоустойчивость через retry
- Redis выполняет двойную роль: брокер Celery + кеш DEK

---

### ADR-011: Staging окружение и Feature Flags

**Статус:** Accepted

**Контекст:**
Команде нужна среда для тестирования деплоев, интеграций (Robokassa sandbox, FNS API) и новых фич до выхода в production. Параллельно нужен механизм включения/отключения фич без передеплоя — особенно для постепенного выката и kill switch.

---

**Часть 1: Окружения**

Три окружения, один набор Docker-образов:

```
Local → Staging → Production
  │         │          │
docker-   main      git tag
compose   branch    v*.*.*
```

| | Local | Staging | Production |
|---|---|---|---|
| Деплой | `docker-compose up` | Auto (push to `main`) | Manual tag `v*.*.*` |
| Django DEBUG | True | False | False |
| База данных | Локальный PostgreSQL | Staging PostgreSQL | Production PostgreSQL |
| Данные | dev fixtures | seed script | реальные пользователи |
| Robokassa | mock / sandbox | **sandbox режим** | production |
| KMS | mock / Vault dev | Yandex KMS (staging keyring) | Yandex KMS (prod keyring) |
| Email | console backend | Mailtrap | Unisender |
| FNS API | mock-ответы | Dadata test mode | Dadata production |
| YOS bucket | `promptspace-local` | `promptspace-staging` | `promptspace-prod` |
| Domain | localhost | staging.promptspace.ru | promptspace.ru |

**Ключевой принцип:** staging использует те же Docker-образы что и production. Разница только в переменных окружения. Это гарантирует "it works on staging = it works on prod".

**Структура docker-compose:**

```yaml
# docker-compose.yml — базовая конфигурация (локальная разработка)
services:
  backend:
    build: ./backend
    env_file: .env.local

  frontend:
    build: ./frontend
    env_file: .env.local

  db:
    image: pgvector/pgvector:pg16

  redis:
    image: redis:7-alpine

  celery:
    build: ./backend
    command: celery -A config worker -Q critical,high,default,low

# docker-compose.staging.yml — override для staging
services:
  backend:
    env_file: .env.staging
    deploy:
      replicas: 1

  frontend:
    env_file: .env.staging

# docker-compose.prod.yml — override для production
services:
  backend:
    env_file: .env.prod
    deploy:
      replicas: 2   # два воркера в prod

  celery:
    deploy:
      replicas: 2
```

**Seed data для staging (не копия production — 152-ФЗ):**

```python
# backend/management/commands/seed_staging.py
class Command(BaseCommand):
    """Заполняет staging тестовыми данными. Никаких реальных ПДн."""

    def handle(self, *args, **options):
        # Тестовые пользователи
        buyer = User.objects.create_user(email="buyer@test.local", role=UserRole.BUYER)
        seller = User.objects.create_user(email="seller@test.local", role=UserRole.SELLER)
        SellerProfile.objects.create(
            user=seller, inn="123456789012",  # несуществующий ИНН
            kyc_status=KYCStatus.VERIFIED,
            legal_type=LegalType.SELF_EMPLOYED,
        )

        # Тестовые промпты разных статусов и форматов
        Prompt.objects.bulk_create([...])

        # Тестовая покупка
        Purchase.objects.create(buyer=buyer, ...)
        PromptAccess.objects.create(buyer=buyer, ...)
```

**GitHub Actions — CI/CD pipeline:**

```yaml
# .github/workflows/ci.yml — на каждый push и PR
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: pytest --cov=apps/ --cov-fail-under=80
      - name: Lint
        run: ruff check . && mypy .

# .github/workflows/deploy-staging.yml — автодеплой при merge в main
name: Deploy Staging
on:
  push:
    branches: [main]
jobs:
  deploy:
    needs: [test]   # только если тесты прошли
    steps:
      - name: Build and push images
        run: |
          docker build -t registry/promptspace-backend:staging ./backend
          docker push registry/promptspace-backend:staging
      - name: Deploy to staging
        run: |
          ssh staging-server "
            docker-compose -f docker-compose.yml -f docker-compose.staging.yml pull
            docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d
          "

# .github/workflows/deploy-prod.yml — деплой только по тегу v*.*.*
name: Deploy Production
on:
  push:
    tags: ['v*.*.*']
jobs:
  deploy:
    environment: production   # требует ручного approve в GitHub UI
    steps:
      - name: Deploy to production
        run: |
          ssh prod-server "
            docker-compose -f docker-compose.yml -f docker-compose.prod.yml pull
            docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-downtime
          "
```

---

**Часть 2: Feature Flags**

**Когда флаги нужны в PromptSpace:**

| Флаг | Сценарий |
|---|---|
| `SEMANTIC_SEARCH_ENABLED` | Включать только когда HNSW индекс построен |
| `TELEGRAM_NOTIFICATIONS_ENABLED` | Kill switch при проблемах с ботом |
| `NEW_SELLER_ONBOARDING` | Постепенный выкат нового UX продавца |
| `MODERATION_AUTO_APPROVE` | Временно для тестирования (staging only) |

**Решение:** `django-flags` для MVP — хранит флаги в БД с условиями, не требует дополнительной инфраструктуры.

```bash
pip install django-flags
```

```python
# settings/base.py
FLAGS = {
    "SEMANTIC_SEARCH_ENABLED": [
        {"condition": "boolean", "value": True},   # включён глобально
    ],
    "TELEGRAM_NOTIFICATIONS_ENABLED": [
        {"condition": "boolean", "value": True},
    ],
    "NEW_SELLER_ONBOARDING": [
        # Включён для 20% пользователей — постепенный выкат
        {"condition": "percent", "value": 20},
    ],
}
```

**Использование в коде:**

```python
# В Django Ninja endpoint
from flags.state import flag_enabled

@router.get("/catalog/search")
async def search(request, query: str, auth=Depends(get_optional_user)):
    if flag_enabled("SEMANTIC_SEARCH_ENABLED", request=request):
        return await semantic_search(query)
    return await fulltext_search(query)   # fallback


# В Celery задаче (без request)
from flags.state import flag_enabled

async def send_notification(user_id: str, event: str):
    user = await User.objects.aget(id=user_id)
    await send_email_notification(user, event)

    if flag_enabled("TELEGRAM_NOTIFICATIONS_ENABLED") and user.telegram_id:
        await send_telegram_notification(user.telegram_id, event)
```

**Управление флагами:**

- Superadmin меняет флаги через Django Admin (`/admin/flags/`)
- Изменение флага — немедленный эффект, без передеплоя
- Изменения флагов логируются в AuditLog

**Путь к масштабированию:**
Если понадобится per-user A/B тестирование → миграция на **Flagsmith** (self-hosted, RF-совместимый). `django-flags` и Flagsmith имеют совместимый интерфейс, миграция несложная.

**Последствия:**
- `+` Staging = те же образы что prod, только другие env переменные
- `+` Автодеплой на staging при merge в main, production только по тегу с approve
- `+` Feature flags без дополнительной инфраструктуры (django-flags в БД)
- `+` Kill switch для любой интеграции без передеплоя
- `-` Staging сервер = дополнительные расходы (~50% от prod по ресурсам)
- `-` Флаги в коде накапливаются — нужна дисциплина: удалять флаги после полного выката фичи

---

### ADR-010: Backup стратегия PostgreSQL

**Статус:** Accepted

**Контекст:**
PostgreSQL хранит персональные данные (152-ФЗ), финансовые транзакции (требование хранения 5 лет) и зашифрованные промпты. Потеря данных критична. Бэкапы должны храниться в РФ и быть зашифрованы (ПДн в бэкапе = ПДн в базе).

**Целевые показатели:**
- **RPO** (максимально допустимая потеря данных): **5 минут**
- **RTO** (время восстановления): **< 30 минут**

**Решение:** `pgBackRest` с хранением в выделенном bucket Yandex Object Storage.

| Вариант | Плюсы | Минусы |
|---|---|---|
| `pg_dump` по крону | Прост в настройке | RPO до 24ч, нагружает БД при выполнении |
| `pg_basebackup` + ручной WAL | Гибко | Нет инкрементов, сложнее ротация |
| **`pgBackRest`** | Инкременты, WAL, шифрование, S3, параллельность | Требует настройки |
| Streaming replication | RPO ~0 | Не защищает от логических ошибок (DROP TABLE) |

**Архитектура бэкапов:**

```
PostgreSQL сервер
    │
    ├── WAL archiving (непрерывно)
    │       └── pgBackRest → YOS bucket: promptspace-backups-rf
    │
    └── Celery Beat: 02:00 МСК ежедневно
            └── pgBackRest full/incremental backup → YOS
```

**Расписание и retention:**

| Тип бэкапа | Расписание | Хранение |
|---|---|---|
| Full backup | Воскресенье 02:00 МСК | 4 недели |
| Incremental backup | Пн–Сб 02:00 МСК | 2 недели |
| WAL архивы | Непрерывно (flush каждые ~1 мин) | 7 дней |

WAL архивы позволяют восстановить БД на **любой момент времени** в пределах 7 дней (PITR — Point-In-Time Recovery).

**Конфигурация pgBackRest:**

```ini
# /etc/pgbackrest/pgbackrest.conf

[global]
repo1-type=s3
repo1-s3-endpoint=storage.yandexcloud.net
repo1-s3-bucket=promptspace-backups-rf
repo1-s3-region=ru-central1
repo1-s3-key=<YOS_BACKUP_ACCESS_KEY>
repo1-s3-key-secret=<YOS_BACKUP_SECRET_KEY>

# Шифрование бэкапов (ПДн в бэкапе требует защиты — 152-ФЗ)
repo1-cipher-type=aes-256-cbc
repo1-cipher-pass=<BACKUP_ENCRYPTION_PASSPHRASE>

# Сжатие (lz4 — быстрее zstd, достаточно для наших объёмов)
compress-type=lz4
compress-level=6

# Параллельность (ускоряет backup/restore)
process-max=2

[global:archive-push]
compress-level=3

[promptspace]
pg1-path=/var/lib/postgresql/16/main
pg1-user=postgres
```

**postgresql.conf (WAL archiving):**

```ini
wal_level = replica
archive_mode = on
archive_command = 'pgbackrest --stanza=promptspace archive-push %p'
archive_timeout = 60   # flush WAL минимум раз в 60 секунд → RPO ≤ 1 мин
```

**Команды:**

```bash
# Первичная инициализация
pgbackrest --stanza=promptspace stanza-create

# Полный бэкап (первый запуск и воскресенье)
pgbackrest --stanza=promptspace --type=full backup

# Инкрементальный бэкап (Пн–Сб)
pgbackrest --stanza=promptspace --type=incr backup

# Восстановление на последний момент
pgbackrest --stanza=promptspace restore

# Восстановление на конкретный момент (PITR) — например, до DROP TABLE
pgbackrest --stanza=promptspace restore \
  --type=time "--target=2026-02-26 14:35:00"

# Проверка состояния бэкапов
pgbackrest --stanza=promptspace info
```

**Мониторинг (Zabbix):**
- Zabbix-агент выполняет `pgbackrest info --output=json` после каждого бэкапа
- Алерт в Telegram если:
  - Бэкап не выполнился в течение 25 часов
  - WAL archiving лагает > 5 минут
  - Размер бэкапа изменился > 50% от предыдущего (признак проблемы)

**Restore Drill (обязательно):**
- Ежемесячно — восстановление на staging сервер и проверка целостности данных
- Команда: `pgbackrest restore` → `pg_dumpall | wc -l` (сравниваем количество строк)
- Результат фиксируется в AuditLog

**Хранение секретов:**
```
YOS_BACKUP_ACCESS_KEY          # отдельный сервисный аккаунт YOS (не тот, что для media)
YOS_BACKUP_SECRET_KEY
BACKUP_ENCRYPTION_PASSPHRASE   # хранится в Vault, не в .env
```

**Yandex Object Storage — bucket для бэкапов:**
- Отдельный bucket `promptspace-backups-rf` (изолирован от media bucket)
- Версионирование объектов включено
- Lifecycle policy: автоудаление объектов старше 30 дней

**Последствия:**
- `+` RPO ~1 мин, RTO < 30 мин — значительно лучше pg_dump
- `+` PITR: можно откатиться до любого момента за последние 7 дней
- `+` Бэкапы зашифрованы — ПДн в YOS защищены
- `+` Инкрементальные бэкапы экономят место: полный бэкап только раз в неделю
- `-` pgBackRest требует начальной настройки (~2-3 часа)
- `-` Отдельный сервисный аккаунт YOS и passphrase — ещё один секрет для управления

---

### ADR-009: Rate Limiting (защита API)

**Статус:** Accepted

**Контекст:**
PromptSpace имеет несколько критичных точек атаки: брутфорс OTP (6 цифр = 10⁶ комбинаций), скрейпинг каталога, фрод при оплате, парсинг расшифрованных промптов через API. Без rate limiting каждый из этих векторов реализуется за минуты.

Nginx-уровень не покрывает главную угрозу — атакующие за NAT/VPN имеют один IP, и жёсткий IP-лимит заблокирует легитимных пользователей корпоративных сетей. Нужен дополнительный уровень на уровне приложения.

**Решение:** Двухуровневая защита — Nginx (IP-based, грубый фильтр) + Django/Redis (per-user, точечная защита критичных эндпоинтов).

---

**Уровень 1 — Nginx (`limit_req_zone`)**

Защита от DDoS и грубого скрейпинга до того, как запрос дойдёт до Django.

```nginx
# nginx.conf

# Зоны для rate limiting
limit_req_zone $binary_remote_addr zone=api_general:10m   rate=60r/m;
limit_req_zone $binary_remote_addr zone=api_auth:10m      rate=10r/m;
limit_req_zone $binary_remote_addr zone=api_search:10m    rate=30r/m;

server {
    # Все API запросы
    location /api/ {
        limit_req zone=api_general burst=20 nodelay;
        limit_req_status 429;
        proxy_pass http://backend:8000;
    }

    # Auth эндпоинты — строже
    location /api/v1/auth/ {
        limit_req zone=api_auth burst=5 nodelay;
        limit_req_status 429;
        proxy_pass http://backend:8000;
    }

    # Поиск — средний лимит
    location /api/v1/catalog/search {
        limit_req zone=api_search burst=10 nodelay;
        limit_req_status 429;
        proxy_pass http://backend:8000;
    }
}
```

| Зона | Лимит | Burst | Для чего |
|---|---|---|---|
| `api_general` | 60 req/min per IP | 20 | Общая защита от DDoS |
| `api_auth` | 10 req/min per IP | 5 | Защита auth эндпоинтов |
| `api_search` | 30 req/min per IP | 10 | Защита от скрейпинга каталога |

---

**Уровень 2 — Django + Redis (per-user sliding window)**

Библиотека: `django-ratelimit` с Redis backend. Точечная защита критичных эндпоинтов с учётом идентичности пользователя.

```python
# services/ratelimit.py
import hashlib
from django.core.cache import cache


def check_rate_limit(key: str, limit: int, window_seconds: int) -> tuple[bool, int]:
    """
    Sliding window counter через Redis.
    Возвращает (allowed: bool, remaining: int).
    Более честный чем fixed window — нет thundering herd на границе окна.
    """
    cache_key = f"rl:{hashlib.md5(key.encode()).hexdigest()}"
    current = cache.get(cache_key, 0)

    if current >= limit:
        return False, 0

    pipe = cache.client.pipeline()
    pipe.incr(cache_key)
    pipe.expire(cache_key, window_seconds)
    pipe.execute()

    return True, limit - current - 1
```

**Лимиты по эндпоинтам:**

```python
# api/v1/auth.py (Django Ninja)

@router.post("/auth/otp/request")
async def otp_request(request, payload: OTPRequestSchema):
    # Лимит по email — не по IP (за NAT один IP у многих)
    allowed, remaining = check_rate_limit(
        key=f"otp_request:{payload.email}",
        limit=3,
        window_seconds=600,  # 3 запроса за 10 минут
    )
    if not allowed:
        raise HttpError(429, "Too many OTP requests. Try again in 10 minutes.")
    ...


@router.post("/auth/otp/verify")
async def otp_verify(request, payload: OTPVerifySchema):
    # Лимит по email — защита от перебора кода
    allowed, _ = check_rate_limit(
        key=f"otp_verify:{payload.email}",
        limit=5,
        window_seconds=300,  # 5 попыток за 5 минут (TTL кода)
    )
    if not allowed:
        # Также инвалидируем текущий OTP-код — повторный запрос обязателен
        cache.delete(f"otp:{payload.email}")
        raise HttpError(429, "Too many attempts. Request a new code.")
    ...


@router.post("/payments/create")
async def payment_create(request, payload: PaymentCreateSchema, auth=Depends(get_current_user)):
    # Лимит по user_id — защита от фрода
    allowed, _ = check_rate_limit(
        key=f"payment_create:{auth.id}",
        limit=10,
        window_seconds=3600,  # 10 покупок в час
    )
    if not allowed:
        raise HttpError(429, "Too many payment attempts.")
    ...


@router.get("/prompts/{prompt_id}/content")
async def prompt_content(request, prompt_id: UUID, auth=Depends(get_current_user)):
    # Лимит по user_id — защита от массового скрейпинга через купленные промпты
    allowed, _ = check_rate_limit(
        key=f"prompt_decrypt:{auth.id}",
        limit=100,
        window_seconds=3600,  # 100 расшифровок в час
    )
    if not allowed:
        raise HttpError(429, "Rate limit exceeded.")
    ...
```

**Сводная таблица лимитов:**

| Эндпоинт | Уровень | Ключ | Лимит | Окно |
|---|---|---|---|---|
| Все `/api/` | Nginx | IP | 60 req/min | - |
| `/api/v1/auth/` | Nginx | IP | 10 req/min | - |
| `POST /auth/otp/request` | Django | email | 3 | 10 мин |
| `POST /auth/otp/verify` | Django | email | 5 | 5 мин |
| `POST /payments/create` | Django | user_id | 10 | 1 час |
| `GET /prompts/.../content` | Django | user_id | 100 | 1 час |
| `GET /catalog/search` | Nginx | IP | 30 req/min | - |

**Ответ клиенту при превышении:**
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 300
Content-Type: application/json

{"detail": "Too many OTP requests. Try again in 10 minutes."}
```

**Последствия:**
- `+` Nginx-уровень отсекает DDoS до Python, почти без накладных расходов
- `+` Per-email лимиты на auth не наказывают легитимных пользователей за чужой NAT
- `+` Инвалидация OTP при превышении попыток исключает повторный перебор
- `-` Redis становится критической зависимостью (при падении Redis — Django должен fail open или fail closed; рекомендация: fail open с логированием)
- `-` `django-ratelimit` не поддерживает sliding window из коробки — нужна небольшая кастомная реализация (выше)

---

### ADR-008: Email-провайдер и уведомления

**Статус:** Accepted

**Контекст:**
Платформе нужны транзакционные письма (OTP, подтверждение покупки, результаты модерации и KYC) с хорошей доставляемостью на российские домены (@mail.ru, @yandex.ru, @rambler.ru) и хранением данных в РФ (152-ФЗ).

**Решение:** Unisender (транзакционные письма) + опциональный Telegram Bot (уведомления).

| Вариант | Плюсы | Минусы |
|---|---|---|
| **Unisender** | Доставляемость в РФ, REST API + SMTP, данные в РФ | Платный |
| SendPulse | Мультиканальность (email + Telegram + SMS) | Данные частично за рубежом |
| SMTP.ru | Дёшево | Только SMTP, нет статусов доставки |

**Транзакционные письма:**

| Тип | Триггер | Критичность |
|---|---|---|
| OTP-код | Email+OTP вход | Критично |
| Подтверждение покупки | `Purchase → SUCCESS` | Высокая |
| Результат модерации | `APPROVED / REJECTED` | Высокая |
| Результат KYC | Статус SellerProfile изменился | Высокая |
| Сброс пароля | Запрос пользователя | Высокая |

**OTP flow:**
```
POST /api/v1/auth/otp/request {email}
  → 6-значный код → Redis KEY=otp:{email} VALUE=hash(code) TTL=5мин
  → Celery: send_email(template="otp", code=code)
  → 200 OK (одинаковый ответ для любого email — защита от user enumeration)

POST /api/v1/auth/otp/verify {email, code}
  → Redis GET → сравниваем hash(code)
  → OK  → удаляем ключ → выдаём JWT
  → FAIL → счётчик попыток в Redis (max 5, затем cooldown 15 мин)
```

**Django интеграция:**
- `django-anymail` с Unisender backend (статусы доставки через webhook)
- Все письма отправляются через Celery (`send_notification` задача) — HTTP-запрос не блокируется
- HTML-шаблоны через Django template engine, subject и body на русском

**Telegram Bot (опциональный канал):**
- `python-telegram-bot` + webhook на отдельном эндпоинте
- Пользователь привязывает Telegram в настройках профиля
- При наличии `telegram_id` — уведомления дублируются в Telegram
- Более высокий open rate чем email для РФ-аудитории

**Secrets:**
```
UNISENDER_API_KEY=...
TELEGRAM_BOT_TOKEN=...
```

**Последствия:**
- `+` Высокая доставляемость на российские почтовые сервисы
- `+` Статусы доставки через webhook → можно мониторить
- `+` Telegram Bot повышает вовлечённость без дополнительных затрат
- `-` OTP только на email (SMS не в MVP — добавляет зависимость от SMS-провайдера и стоимость)
- `-` Нет встроенного fallback если Unisender недоступен (можно добавить SMTP.ru как резерв позже)

---

### ADR-007: Хранение медиафайлов (Yandex Object Storage)

**Статус:** Accepted

**Контекст:**
Карточки промптов содержат примеры результата — изображения и тексты (100кб–5мб). Хранить их в PostgreSQL нельзя.

**Решение:** Yandex Object Storage (S3-совместимый API).

**Детали:**
- В PostgreSQL хранится `object_key` (путь в bucket), не URL
- При отдаче API генерируется **presigned URL** с TTL 1 час
- Публичные превью → Yandex CDN перед YOS (кеширование изображений)
- SSE (server-side encryption) на всех bucket'ах
- Lifecycle policy: автоудаление объектов удалённых промптов

**Последствия:**
- `+` Масштабируемое хранилище без нагрузки на БД
- `+` CDN ускоряет загрузку изображений
- `-` Дополнительный секрет: `YOS_ACCESS_KEY`, `YOS_SECRET_KEY`

---

## 11. SEO и базовые страницы

UI Mobile-First, адаптивный, с высокой производительностью (Core Web Vitals).

| Страница | URL | Описание |
|---|---|---|
| Главная | `/` | Hero с семантическим поиском, топ категории, топ авторы |
| Каталог | `/catalog/` | Фасетный фильтр, сортировка |
| Категория | `/category/{slug}/` | H1, Meta Title/Desc, FAQ микроразметка |
| Карточка промпта | `/prompt/{slug}/` | Детальная страница, Schema.org Product |
| Профиль продавца | `/seller/{username}/` | Публичный профиль, список промптов |
| Блог / База знаний | `/blog/{slug}/` | Контент-маркетинг |
| Политика конфиденциальности | `/legal/privacy/` | |
| Пользовательское соглашение | `/legal/terms/` | |
| Оферта для продавцов | `/legal/seller-agreement/` | |
| Контакты + DSR | `/legal/dsr/` | Форма запросов по 152-ФЗ |

---

## 12. Инфраструктура и деплой

### 12.1. Мониторинг (Zabbix)
- Zabbix-агенты на всех серверах
- Метрики: CPU, RAM, Disk I/O, состояние PostgreSQL, доступность KMS и Robokassa
- Алерты → Telegram (системный администратор)

### 12.2. Веб-аналитика (Яндекс.Метрика)
- Инициализация **только после клика "Согласен"** в Cookie-баннере (152-ФЗ)
- Цели: "Купить" нажато, оплата успешна, промпт скопирован, регистрация продавца

### 12.3. CI/CD (GitHub Actions)

```
ci.yml:
  push/PR → pytest → ruff → mypy → docker build (проверка)

deploy.yml:
  merge to main → docker build + push to registry
               → SSH deploy to prod (docker-compose pull + up)
               → healthcheck
```

### 12.4. Конфигурация Nginx
```nginx
# /api/ → Django
location /api/ {
    proxy_pass http://backend:8000;
}
# /admin/ → Django
location /admin/ {
    proxy_pass http://backend:8000;
}
# остальное → Next.js
location / {
    proxy_pass http://frontend:3000;
}
```

---

## 13. Открытые вопросы и риски

### Закрытые решения
| Вопрос | Решение |
|---|---|
| JWT vs сессии | JWT для `/api/` + сессии для `/admin/` |
| Бесплатные промпты | Прямое создание `PromptAccess`, без Robokassa |
| Версионирование промптов | Нет в MVP, in-place редактирование |
| Ревью и рейтинги | Одна запись на пару (buyer, prompt), требует покупки |
| Лимиты продавца | Нет в MVP |

### Актуальные риски

| ID | Риск | Severity | Митигация |
|---|---|---|---|
| R1 | KMS недоступен → нельзя расшифровать промпты | High | DEK кеш в Redis + fallback к Vault |
| R2 | Thundering herd на KMS при высокой нагрузке | Medium | DEK кеш TTL 10 мин |
| R3 | Повторный Robokassa вебхук → двойной доступ | High | `unique_together` + `get_or_create` |
| R4 | FNS API недоступен → продавец не может верифицироваться | Medium | Retry в Celery + ручная верификация Superadmin |
| R5 | HNSW индекс деградирует при росте данных | Low | Celery Beat перестройка + мониторинг |

### Требует проработки
- [x] Email-провайдер для OTP и уведомлений → **ADR-008** (Unisender + Telegram Bot)
- [x] Стратегия rate limiting для `/api/` → **ADR-009** (Nginx IP-лимиты + Django/Redis per-user)
- [x] Backup стратегия PostgreSQL → **ADR-010** (pgBackRest + WAL archiving в YOS, RPO 1 мин / RTO 30 мин)
- [x] Staging окружение и стратегия feature flags → **ADR-011** (3 окружения + django-flags)
