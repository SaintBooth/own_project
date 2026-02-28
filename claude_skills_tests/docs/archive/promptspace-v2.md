# PromptSpace — Architecture & Product Document

> **Статус:** В разработке
> **Последнее обновление:** 2026-02-26
> **Версия:** 0.2 (доработано по результатам аудита)

**Изменения v0.2 (относительно v0.1):** Исправлены несогласованности CI/CD, жизненного цикла промпта, Nginx; добавлены разделы «Аутентификация», «Тестирование», «Масштабирование», «Мониторинг», детализация анонимизации, refund, KMS failover; уточнены Review для бесплатных промптов, модель эмбеддингов, RPO; упорядочены ADR.

---

## Содержание

1. [Обзор продукта](#1-обзор-продукта)
2. [Юридический комплаенс (152-ФЗ)](#2-юридический-комплаенс-152-фз)
3. [Финансы и монетизация](#3-финансы-и-монетизация)
4. [Ролевая модель и личные кабинеты](#4-ролевая-модель-и-личные-кабинеты)
5. [Аутентификация](#5-аутентификация)
6. [Каталог: поиск и фильтрация](#6-каталог-поиск-и-фильтрация)
7. [Структура карточки промпта](#7-структура-карточки-промпта)
8. [Архитектура системы](#8-архитектура-системы)
9. [Data Model (Django)](#9-data-model-django)
10. [Структура репозитория](#10-структура-репозитория)
11. [ADR — Architecture Decision Records](#11-adr--architecture-decision-records)
12. [Тестирование](#12-тестирование)
13. [Масштабирование и ограничения](#13-масштабирование-и-ограничения)
14. [SEO и базовые страницы](#14-seo-и-базовые-страницы)
15. [Инфраструктура и деплой](#15-инфраструктура-и-деплой)
16. [Мониторинг и алерты](#16-мониторинг-и-алерты)
17. [Открытые вопросы и риски](#17-открытые-вопросы-и-риски)

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
| Эмбеддинги | YandexGPT Embeddings (рекомендуется, 152-ФЗ) или аналог |
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
- **Право на забвение:** Полное удаление аккаунта с анонимизацией. Алгоритм см. [раздел 2.5](#25-алгоритм-анонимизации-право-на-забвение)
- **DSR страница:** `/legal/dsr/` — форма для запросов по 152-ФЗ

### 2.5. Алгоритм анонимизации (право на забвение)

Выполняется Celery-задачей `anonymize_account` асинхронно. Порядок операций:

1. **User:** `is_deleted=True`, `deleted_at=now()`; `email` → `deleted_{uuid}@deleted.local`, `username` → `deleted_{uuid}`
2. **Purchase:** `UPDATE buyer_id=NULL` — записи **не удаляются** (бухучёт, 5 лет)
3. **PromptAccess:** `DELETE WHERE buyer_id=user_id` — доступ отзывается
4. **Review:** `DELETE WHERE buyer_id=user_id` — отзывы удаляются; пересчёт `rating_avg` и `rating_count` для затронутых промптов
5. **AuditLog:** `UPDATE user_id=NULL WHERE user_id=user_id` — обезличивание для усиленной приватности
6. **ModerationRecord:** если `moderator_id=user_id` → `UPDATE moderator_id=NULL` (сохраняем запись для аудита)

> Модели `PromptAccess` и `Review` используют `on_delete=models.PROTECT` для `User`, поскольку User не удаляется — происходит обновление с обезличиванием. Каскадное удаление дочерних записей выполняется явно в задаче.

---

## 3. Финансы и монетизация

### 3.1. Robokassa Split
При оплате покупателем сумма транзакции автоматически делится:
- **Комиссия платформы PromptSpace** — процент от суммы (настраивается через Django Admin)
- **Доход автора** — перечисляется напрямую на р/с ИП или карту Самозанятого

Это снимает с платформы налоговую нагрузку и упрощает юридическую схему: платформа не является транзитом средств.

### 3.2. Бесплатные промпты
- `price = 0` → Robokassa не задействована
- Backend напрямую создаёт запись `PromptAccess(purchase=None)` без платёжного flow

### 3.3. Комиссия платформы
- Размер комиссии настраивается Superadmin через Django Admin (системная настройка)
- Фиксируется в каждой транзакции `Purchase.platform_commission` на момент оплаты

### 3.4. Возвраты (Refund)

| Действие | Инициатор | Интеграция | Поведение |
|----------|-----------|------------|-----------|
| Полный возврат | Superadmin (ручная заявка в Robokassa) или по обращению | Robokassa API refund | `Purchase.status=REFUNDED`; **удаление** соответствующей записи `PromptAccess` |
| Частичный возврат | Вне MVP | — | — |

При смене статуса на `REFUNDED` Celery-задача:
1. Обновляет `Purchase.status`
2. Удаляет `PromptAccess` для этой пары (buyer, prompt)
3. При необходимости пересчитывает `purchases_count` у `Prompt`
4. Отправляет уведомление покупателю и продавцу

---

## 4. Ролевая модель и личные кабинеты

Платформа поддерживает 4 типа пользователей. Регистрация: Yandex ID, VK ID, Telegram Auth или Email+OTP.

### 4.1. Покупатель (Buyer)
**Функционал:** Просмотр каталога, добавление в избранное, покупка промптов.

**Личный кабинет:**
- Библиотека купленных/полученных промптов (доступ к расшифрованному тексту с кнопкой "Копировать")
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
- Управление пользователями (бан, вход под другим пользователем, смена статусов)
- CMS: создание и редактирование динамических страниц, управление SEO-тегами, категориями, фильтрами
- Управление баннерами и системными настройками (размер комиссии и др.)

---

## 5. Аутентификация

### 5.1. Методы входа
- **OAuth:** Yandex ID, VK ID, Telegram (Login Widget) — callback на `/api/v1/auth/{provider}/callback`
- **Email+OTP:** пароль не используется; 6-значный код отправляется на email (TTL 5 мин)

### 5.2. JWT
- **Access token:** TTL 15 минут; в payload: `user_id`, `role`, `email`
- **Refresh token:** TTL 7 дней; хранится в HttpOnly cookie (или в БД для инвалидации)
- **Refresh flow:** `POST /api/v1/auth/refresh` — выдаёт новую пару токенов

### 5.3. Django Admin (сессии)
- `/admin/` использует cookie-сессии Django (CSRF, session backend)
- Superadmin логинится по email + паролю (отдельный пароль для Admin, не OTP)

### 5.4. Вход под пользователем (Superadmin)
- В Django Admin: действие «Войти как пользователь» генерирует одноразовый JWT с коротким TTL (5 мин)
- В AuditLog пишется: `action="admin.impersonate", resource_type="user", resource_id=<target_id>`
- После входа Superadmin получает access token от имени целевого пользователя для отладки

### 5.5. Восстановление доступа (Email+OTP)
- Пользователь вводит email → запрашивается OTP (тот же flow, что при первичном входе)
- Отдельного «сброса пароля» нет — используется единый OTP-флоу

---

## 6. Каталог: поиск и фильтрация

### 6.1. Семантический поиск
Строка поиска работает на базе векторного алгоритма через **pgvector**, понимая запросы на естественном языке. Эмбеддинги генерируются из заголовка, описания и метаданных промпта (не из зашифрованного текста).

**Модель эмбеддингов:** Рекомендуется **YandexGPT Embeddings** (данные не покидают РФ, 152-ФЗ). Размерность вектора конфигурируется (`EMBEDDING_DIMENSIONS` в settings). Альтернативы: GigaChat Embeddings, OpenAI (с учётом передачи данных за рубеж).

Индекс: **HNSW** (Hierarchical Navigable Small World) для субмиллисекундного поиска по косинусному расстоянию.

### 6.2. Фасетная фильтрация
| Фильтр | Варианты |
|---|---|
| Нейросеть | ChatGPT-4o, Claude 3.5, Midjourney v6, Stable Diffusion, DALL-E 3, и др. |
| Категория | Маркетинг, SEO, Разработка, Дизайн, Продуктивность, и др. |
| Теги | свободные теги |
| Цена | Бесплатно / Диапазон |
| Рейтинг | от 4★ и выше |
| Формат вывода | Текст / Код / Изображение / JSON |

---

## 7. Структура карточки промпта

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
| **Текст промпта + переменные** | **После оплаты / получения** | Хранится зашифрованным (AES-256-GCM) |

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

### 7.1. Жизненный цикл промпта (State Machine)

```
DRAFT → PENDING_MODERATION → APPROVED ──(Celery)──→ PUBLISHED
                           ↘ REJECTED  (с причиной, редактирование и повторная отправка)
PUBLISHED → ARCHIVED       (продавец снял с продажи)
```

**Правила:**
- **APPROVED → PUBLISHED:** автоматически после успешной генерации эмбеддингов (Celery `generate_embeddings`). Промпт появляется в каталоге только в статусе `PUBLISHED`.
- Редактирование возможно в `DRAFT` и `REJECTED`.
- Опубликованный промпт редактируется in-place (версионирование — вне MVP).

**Модерация:**
- Типовые причины отклонения (справочник в CMS): «Нарушение правил», «Низкое качество», «Дубликат», «Некорректные метаданные», «Другое» (свободный текст).
- При Reject продавцу отправляется письмо с причиной и ссылкой на редактирование.
- После правок продавец повторно отправляет на модерацию (возврат в `PENDING_MODERATION`).

---

## 8. Архитектура системы

### 8.1. Топология сервисов

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
│     ├── process_refund                                       │
│     └── rebuild_hnsw_index (by schedule)                     │
│                                                              │
│  Внешние интеграции:                                        │
│  [Yandex KMS]  [Robokassa]  [FNS API / Dadata]             │
│  [Yandex Object Storage]  [Embeddings API]  [Яндекс.Метрика]│
│  [Zabbix] ──── [Telegram Alerts]                            │
└──────────────────────────────────────────────────────────────┘
```

### 8.2. Ключевые потоки данных

**Покупка промпта:**
```
Buyer "Купить" → Django создаёт Purchase(PENDING) + Robokassa ссылку (с параметрами сплита)
→ Редирект на Robokassa → Оплата
→ Robokassa POST ResultURL (webhook) → Django проверяет IP + подпись
→ Celery process_payment_webhook (очередь critical, sequential)
→ Идемпотентное Purchase(SUCCESS) + PromptAccess
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
→ Moderator Approve → APPROVED
→ Celery: generate_embeddings → после успеха: status = PUBLISHED
```

---

## 9. Data Model (Django)

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

    public_metadata = models.JSONField(default=dict)
    encrypted_content = models.BinaryField()
    kms_key_id = models.CharField(max_length=255)

    # pgvector: размерность из settings.EMBEDDING_DIMENSIONS (зависит от модели)
    embedding = VectorField(dimensions=1536, null=True)  # 1536 — Yandex/OpenAI-совместимо

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
        # HNSW: CREATE INDEX ON prompts_prompt USING hnsw (embedding vector_cosine_ops)


class PromptOutputExample(models.Model):
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
    """Отзыв. Разрешён при наличии PromptAccess (платный или бесплатный промпт)."""
    buyer = models.ForeignKey(User, on_delete=models.PROTECT)
    prompt = models.ForeignKey(Prompt, on_delete=models.PROTECT)
    purchase = models.ForeignKey(Purchase, null=True, on_delete=models.PROTECT)  # null для бесплатных промптов
    rating = models.PositiveSmallIntegerField()  # 1–5
    text = models.TextField(max_length=2000, blank=True)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("buyer", "prompt")]
```

> Проверка при создании Review: у пользователя должна быть запись `PromptAccess` для этого промпта. Для платных — `purchase` заполнен, для бесплатных — `purchase=None`.

### `audit/models.py`

```python
class AuditLog(models.Model):
    user = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=64)
    resource_type = models.CharField(max_length=64)
    resource_id = models.CharField(max_length=64)
    metadata = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["action", "created_at"])]
```

---

## 10. Структура репозитория

```
promptspace/
├── backend/
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── local.py
│   │   │   ├── staging.py
│   │   │   └── production.py
│   │   ├── urls.py
│   │   └── celery.py
│   ├── apps/
│   │   ├── users/
│   │   ├── prompts/
│   │   ├── payments/
│   │   ├── reviews/
│   │   ├── search/
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
│   ├── services/
│   │   ├── kms.py
│   │   ├── kyc.py
│   │   ├── payment.py
│   │   ├── search.py
│   │   ├── storage.py
│   │   └── ratelimit.py
│   ├── tasks/
│   │   ├── embeddings.py
│   │   ├── kyc.py
│   │   ├── notifications.py
│   │   ├── payments.py   # process_payment_webhook, process_refund
│   │   └── gdpr.py
│   └── Dockerfile
├── frontend/
├── nginx/
│   └── nginx.conf       # см. ADR-009, полная конфигурация с rate limiting
├── docker-compose.yml
├── docker-compose.staging.yml
├── docker-compose.prod.yml
└── .github/
    └── workflows/
        ├── ci.yml              # push/PR: pytest, ruff, mypy, docker build
        ├── deploy-staging.yml  # merge to main → deploy staging
        └── deploy-prod.yml     # tag v*.*.* → deploy production (manual approve)
```

---

## 11. ADR — Architecture Decision Records

> ADR упорядочены по номеру (001 → 011). Детали Nginx и rate limiting — в ADR-009.

### ADR-001: Zero Trust шифрование промптов (KMS)
*[без изменений относительно v0.1]*

### ADR-002: pgvector для семантического поиска

**Дополнения:**
- Модель эмбеддингов: **YandexGPT Embeddings** (рекомендуется для 152-ФЗ). Размерность настраивается в `EMBEDDING_DIMENSIONS`.
- При смене провайдера потребуется миграция: пересчёт эмбеддингов и переиндексация HNSW.

### ADR-003: Robokassa Split — платёжный flow
*[без изменений]*

### ADR-004: Комплаенс 152-ФЗ (локализация и приватность)

**Дополнения:**
- Алгоритм анонимизации: см. [раздел 2.5](#25-алгоритм-анонимизации-право-на-забвение).

### ADR-005: Frontend архитектура
*[без изменений]*

### ADR-006: Async Processing Pipeline (Celery + Redis)
*[без изменений]*

### ADR-007: Хранение медиафайлов (Yandex Object Storage)

**Дополнения:**
- **Presigned URL:** TTL 1 час. При компрометации URL: отзыв доступа невозможен до истечения TTL; рекомендуется мониторинг аномальных объёмов запросов и алерт при подозрении на утечку.
- Публичные превью — через CDN с кешированием; для приватного контента — только presigned URL.

### ADR-008: Email-провайдер и уведомления

**Дополнения:**
- «Сброс пароля» заменён на «Восстановление доступа» — тот же OTP-флоу.
- **Fallback при недоступности Unisender:** Celery retry (3 попытки, exponential backoff). При исчерпании — запись в AuditLog, алерт в Telegram. Резерв SMTP (SMTP.ru) — в backlog для post-MVP.

### ADR-009: Rate Limiting (защита API)

**Решение:** Двухуровневая защита — Nginx (IP) + Django/Redis (per-user).

**Redis недоступен:** стратегия **fail open** — rate limit не применяется, запрос пропускается. Логирование: `WARNING` при каждом пропуске. Алерт в Telegram при недоступности Redis > 1 мин.

**Nginx (основная конфигурация):**
```nginx
limit_req_zone $binary_remote_addr zone=api_general:10m   rate=60r/m;
limit_req_zone $binary_remote_addr zone=api_auth:10m      rate=10r/m;
limit_req_zone $binary_remote_addr zone=api_search:10m    rate=30r/m;

location /api/ {
    limit_req zone=api_general burst=20 nodelay;
    limit_req_status 429;
    proxy_pass http://backend:8000;
}
location /api/v1/auth/ {
    limit_req zone=api_auth burst=5 nodelay;
    limit_req_status 429;
    proxy_pass http://backend:8000;
}
location /api/v1/catalog/search {
    limit_req zone=api_search burst=10 nodelay;
    limit_req_status 429;
    proxy_pass http://backend:8000;
}
location /admin/ { proxy_pass http://backend:8000; }
location / { proxy_pass http://frontend:3000; }
```

**Django per-user лимиты (Redis sliding window):** OTP request 3/10мин, OTP verify 5/5мин, payment 10/час, prompt decrypt 100/час.

### ADR-010: Backup стратегия PostgreSQL

**Дополнения:**
- Целевые показатели: **RPO ≤ 1 мин** (при `archive_timeout=60`), **RTO < 30 мин**.
- Исходная цель 5 мин перевыполнена за счёт настройки WAL archiving.

### ADR-011: Staging окружение и Feature Flags
*[без изменений, соответствует разделам 10 и 15]*

### ADR-012: Failover KMS

**Статус:** Accepted

**Контекст:** При недоступности Yandex KMS расшифровка промптов невозможна. DEK-кеш в Redis даёт запас на TTL, но при длительном простое KMS нужен fallback.

**Решение:**
- **Основной:** Yandex KMS.
- **Fallback:** HashiCorp Vault с теми же форматами ключей (AES-256-GCM). Ключи мигрируются вручную; `kms_key_id` содержит префикс `yandex:` или `vault:`.
- Конфигурация: `KMS_PROVIDER=yandex|vault`, при `vault` — чтение DEK из Vault. Запись новых ключей всегда в активный провайдер.
- Переключение: изменение env и рестарт приложений. DEK-кеш Redis инвалидируется при смене провайдера.

---

## 12. Тестирование

### 12.1. Unit-тесты
- pytest, coverage ≥ 80%
- Моки для KMS, Robokassa, FNS API, Unisender, YOS

### 12.2. Интеграционные тесты
- Тесты API с тестовой БД (pytest-django)
- Robokassa sandbox для платёжного flow
- Тесты Celery с `CELERY_TASK_ALWAYS_EAGER=True` или отдельным тестовым брокером

### 12.3. E2E
- Playwright (или аналог) для критичных сценариев: регистрация, покупка, доступ к промпту
- Запуск в CI на merge в main (опционально)

### 12.4. Credentials
- Секреты для тестов — через env или `.env.test` (не в репозитории)
- Robokassa: sandbox merchant
- KMS: mock или Vault dev mode

---

## 13. Масштабирование и ограничения

| Метрика | MVP | При росте |
|---------|-----|-----------|
| Промпты в каталоге | до ~100k | > 10M → оценка Qdrant |
| Одновременных пользователей | ~500 | horizontal scaling Django, Celery |
| Latency поиска (p95) | < 200 ms | мониторинг |
| Latency расшифровки (p95) | < 500 ms | DEK-кеш, мониторинг KMS |

**Горизонтальное масштабирование:** реплики Django (за Nginx), реплики Celery workers, Redis — single node (или cluster при необходимости).

---

## 14. SEO и базовые страницы

UI Mobile-First, адаптивный, Core Web Vitals (LCP < 2.5s).

| Страница | URL | Описание |
|----------|-----|----------|
| Главная | `/` | Hero с семантическим поиском, топ категории, топ авторы |
| Каталог | `/catalog/` | Фасетный фильтр, сортировка |
| Категория | `/category/{slug}/` | H1, Meta Title/Desc, FAQ микроразметка |
| Карточка промпта | `/prompt/{slug}/` | Schema.org Product |
| Профиль продавца | `/seller/{username}/` | Публичный профиль, список промптов |
| Блог / База знаний | `/blog/{slug}/` | Контент-маркетинг |
| Политика конфиденциальности | `/legal/privacy/` | |
| Пользовательское соглашение | `/legal/terms/` | |
| Оферта для продавцов | `/legal/seller-agreement/` | |
| Контакты + DSR | `/legal/dsr/` | Форма запросов по 152-ФЗ |

---

## 15. Инфраструктура и деплой

### 15.1. CI/CD (GitHub Actions)

```
ci.yml:
  on: [push, pull_request]
  → pytest --cov-fail-under=80
  → ruff, mypy
  → docker build (проверка)

deploy-staging.yml:
  on: push branches [main]
  needs: CI passed
  → docker build + push to registry (tag: staging)
  → SSH deploy to staging-server
  → docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d

deploy-prod.yml:
  on: push tags ['v*.*.*']
  environment: production (manual approve в GitHub)
  → docker build + push (tag: vX.Y.Z)
  → SSH deploy to prod-server
  → docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 15.2. Nginx
Полная конфигурация — см. **ADR-009** (rate limiting + проксирование).

### 15.3. API versioning
- **v1** — текущий контракт; breaking changes недопустимы без deprecation.
- При breaking changes: ввод **v2**, v1 помечается deprecated, поддерживается ≥ 6 мес, затем отключение.

---

## 16. Мониторинг и алерты

| Алерт | Условие | Действие |
|-------|---------|----------|
| Бэкап не выполнился | > 25 ч с последнего бэкапа | Telegram, проверка pgBackRest |
| WAL lag | > 5 мин | Telegram, проверка archive_command |
| KMS недоступен | ошибка при запросе DEK | Telegram, проверка Yandex KMS / Vault |
| Redis недоступен | connect timeout | Telegram, fail open для rate limit |
| Unisender API error | 5xx или таймаут | Telegram, проверка очереди писем |
| PostgreSQL connections | > 80% от max_connections | Telegram |
| Celery queue critical | длина > 100 | Telegram |
| HTTP 5xx | rate > 1% за 5 мин | Telegram |

**Runbook:** отдельный документ с шагами реагирования. Эскалация: Telegram → ответственный разработчик/DevOps.

---

## 17. Открытые вопросы и риски

### Закрытые решения
| Вопрос | Решение |
|--------|---------|
| JWT vs сессии | JWT для `/api/`, сессии для `/admin/` |
| Бесплатные промпты | PromptAccess(purchase=None), отзывы разрешены |
| Версионирование промптов | Вне MVP, in-place редактирование |
| Ревью | Одна запись на (buyer, prompt); требуется PromptAccess (платный или бесплатный) |
| API versioning | v1 — текущий контракт; v2 при breaking changes с deprecation period 6 мес |

### Актуальные риски

| ID | Риск | Severity | Митигация |
|----|------|----------|-----------|
| R1 | KMS недоступен | High | DEK-кеш Redis + ADR-012 (failover Vault) |
| R2 | Thundering herd на KMS | Medium | DEK-кеш TTL 10 мин |
| R3 | Повторный Robokassa webhook | High | unique + get_or_create, идемпотентность |
| R4 | FNS API недоступен | Medium | Retry в Celery + ручная верификация |
| R5 | HNSW деградация при росте | Low | Celery Beat перестройка, при >10M — Qdrant |
| R6 | Unisender недоступен | Medium | Retry, алерт; SMTP fallback в backlog |
| R7 | Robokassa единственный провайдер | Medium | Абстракция payment service для будущего добавления провайдера |
