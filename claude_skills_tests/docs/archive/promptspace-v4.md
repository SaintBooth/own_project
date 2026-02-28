# PromptSpace — Architecture & Product Document

> **Статус:** Approved (Ready for Development)
> **Последнее обновление:** 2026-02-26
> **Версия:** 1.6
> **Целевой uptime:** 99.5% (monthly SLA)
> **Валюта:** только RUB

## История изменений

**Изменения v0.2:** Исправлены несогласованности CI/CD, жизненного цикла промпта, Nginx; добавлены разделы «Аутентификация», «Тестирование», «Масштабирование», «Мониторинг»; детализация анонимизации, refund, KMS failover.

**Изменения v0.3:** Circuit Breaker для автоматического KMS failover; проксирование приватных медиафайлов с валидацией JWT; бизнес-логика транзакций отвязана от ID платёжного шлюза (Vendor Lock-in); резервный канал доставки OTP перенесён в MVP.

**Изменения v0.4:** API Contract (таблица эндпоинтов, форматы ошибок); детали интеграций (OAuth callback, Dadata KYC, Robokassa webhook); модель Favorite и slug у Prompt; бизнес-логика покупки и бесплатных промптов (flow); раздел Frontend (роутинг, JWT, Server/Client Components); переменные окружения (полный список); Circuit Breaker пороги; пагинация cursor-based; часовой пояс (UTC/MSK); разделы «Интеграции», «Переменные окружения», «Глоссарий».

**Изменения v0.5:** Устранены замечания архитектурного ревью: полное описание Refund (таблица + flow); соглашение slug vs id; идемпотентность webhook Robokassa и API (library/acquire, payments/create); маппинг object_key для медиа и защита от path traversal; Redis как критичная зависимость; модель ролей (buyer+seller); Runbook (таблица алертов, docs/runbook.md); CORS для staging; политика миграций; расширенная матрица рисков (R2–R9); размерность эмбеддингов.

**Изменения v0.6:** 5.6 Logout и отзыв сессий (JWT blacklist/whitelist); пагинация разделена: catalog — cursor, search (pgvector) — offset/limit; WAF/Anti-DDoS в топологии; Redis Sentinel/Cluster обязателен для Production; Envelope Encryption (поля модели, ADR-013); AuditLog — партицирование и retention; KYC lifecycle — Celery Beat `verify_active_kyc_status`; 11.4 интеграция KMS (синхронизация KEK, рекомендация единого Vault); ADR-014 защита от парсинга (rate limit acquire); RPO=5 мин, RTO — зафиксировать.

**Изменения v1.0:** Release Candidate. Устранены архитектурные развилки: KMS — HashiCorp Vault как единственный источник KEK; JWT отзыв — только blacklist; пагинация поиска — offset/limit, max_offset=1000. AI Security: SECURITY_SCAN перед модерацией; проверка на плагиат (>95% → PENDING_PLAGIARISM_REVIEW). KYC: PENDING → CANCELLED при потере статуса. ISearchProvider. ADR-014: капча для acquire. PurchaseStatus CANCELLED.

**Изменения v1.1 (относительно v1.0):** Устранены замечания архитектурного аудита (24 пункта): архитектурная диаграмма (раздел 8.1); полное описание Data Model (раздел 9); endpoints модератора, KYC, seller profile (раздел 10); раскрыты ADR-001..011 (раздел 14); полный раздел Тестирование (раздел 15); Vault AppRole + Transit Auto-Unseal + snapshot backup (раздел 11.4); RTO зафиксирован; DR Plan (раздел 24); система уведомлений (раздел 23); refresh token rotation; PENDING_PLAGIARISM_REVIEW resolve flow; Refund idempotency; R0 (Vault data loss) в матрице рисков; sort параметр в catalog API; File Upload Flow.

**Изменения v1.2 (относительно v1.1):** Устранены замечания backend code review (14 пунктов): `User.email` → nullable (OAuth без email); `AbstractBaseUser` обязательные поля (`USERNAME_FIELD`, `is_active`, `is_staff`); добавлены недостающие модели — `SiteSettings`, `SellerDailyStats`, `NotificationSettings`, `AuditLog` (полная), `RejectionReason`; `Prompt.variables` (JSONField) + `EMBEDDING_FAILED` статус; `BinaryField → bytes()` соглашение; `DATABASE_DIRECT_URL` для миграций; JWT-библиотека зафиксирована (PyJWT 2.x); refresh cookie атрибуты (SameSite=Lax); OTP атомарный check-and-delete (Redis Lua); cursor encoding формат; file upload confirmation endpoint; `POST /payments/create` — поведение при PENDING; Celery Beat полное расписание (`django-celery-beat`); KYC-батчинг; раздел 25 «Соглашения по реализации».

**Изменения v1.3 (относительно v1.2):** Устранены замечания архитектурного аудита v2 (20 пунктов): C-1 — автоматизация партиций AuditLog (`create_audit_partitions` Celery Beat + DDL); C-2 — политика версионирования промптов (запрет замены `encrypted_content` после публикации); C-3 / раздел 23 — Telegram как pluggable optional-канал без ПДн в теле, `INotificationChannel` абстракция, `TELEGRAM_ENABLED` feature flag, graceful degradation на Email + in-app; H-1 — `/health/` добавлен Vault check; H-2 — CSRF стратегия в разделе 25; H-3 — confirm endpoint: проверка размера и MIME через HeadObject; H-4 — порядок PromptAccess check → DEK fetch зафиксирован в разделе 25; H-5 — zero-downtime migration rules; H-6 — `X-Request-ID` correlation middleware; H-7 — KYC re-submission behaviour table; H-8 — OpenAPI docs отключены в production; M-1 — ADR-015 (Django Ninja vs DRF); M-4 — N+1 query guidance в разделе 25; M-7 — политика ротации всех секретов.

**Изменения v1.4 (относительно v1.3):** Финальные штрихи безопасности: 10.6/12.4 — валидация MIME при confirm через magic bytes (`GetObject` Range + `python-magic`), не HeadObject; 9.6 — партиции AuditLog через `pg_partman` (не Celery); 7/9.2 — статус `APPEAL_REQUESTED` (апелляция при BLOCKED_BY_SECURITY); 11.4/24.3 — Vault snapshot в persistent volume `/vault/backups/`; 9.2 — `content_hash` (Digital Provenance при PUBLISHED).

**Изменения v1.5 (относительно v1.4):** Performance & SEO: 8.1 — CDN перед YOS для публичных превью; 12.5 — Modern Image Delivery (next/image, WebP/AVIF, lazy loading), SWC минификация, Tree Shaking, next/font; 18 — Brotli/Gzip сжатие в Nginx.

**Изменения v1.6 (относительно v1.5):** Best Practice 2026: 5.7 — API Keys (M2M) для Agentic AI; 8.1/18 — Confidential Computing (TEE VMs); 8.2 — TLS PQC (Kyber); 18 — OpenTelemetry вместо X-Request-ID; 15.4/18 — SBOM + Cosign/Sigstore подписание образов.

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
   - 9.1–9.10: users, prompts, payments, reviews, notifications, audit, core, analytics, NotificationSettings, moderation
10. [API Contract](#10-api-contract)
    - 10.1 Формат ошибок · 10.2 Slug vs id · 10.3 Идемпотентность
    - 10.4–10.13: Auth, Каталог, Промпты, Платежи, Медиа, Продавец, Модерация, Пользователь, Отзывы, Webhook
11. [Интеграции](#11-интеграции)
12. [Frontend](#12-frontend)
    - 12.5 Performance & Media Optimization
13. [Структура репозитория](#13-структура-репозитория)
    - 13.1 Дерево файлов · 13.2 Celery Beat расписание
14. [ADR — Architecture Decision Records](#14-adr--architecture-decision-records)
15. [Тестирование](#15-тестирование)
16. [Масштабирование и ограничения](#16-масштабирование-и-ограничения)
17. [SEO и базовые страницы](#17-seo-и-базовые-страницы)
18. [Инфраструктура и деплой](#18-инфраструктура-и-деплой)
19. [Переменные окружения](#19-переменные-окружения)
20. [Мониторинг и алерты](#20-мониторинг-и-алерты)
    - 20.1 Метрики надёжности (SLA) · 20.2 Таблица алертов · 20.3 Бизнес-метрики
21. [Открытые вопросы и риски](#21-открытые-вопросы-и-риски)
    - 21.1 Закрытые решения · 21.2 Матрица рисков
22. [Глоссарий и соглашения](#22-глоссарий-и-соглашения)
23. [Система уведомлений](#23-система-уведомлений)
24. [Disaster Recovery Plan](#24-disaster-recovery-plan)
25. [Соглашения по реализации](#25-соглашения-по-реализации)

---

## 1. Обзор продукта

**PromptSpace** — маркетплейс AI-промптов для российского рынка. Платформа соединяет авторов промптов (ИП, Самозанятые) с покупателями, обеспечивая защиту интеллектуальной собственности через шифрование и прозрачную финансовую схему через Robokassa Split.

**Ключевые характеристики:**
- Семантический поиск по смыслу запроса (pgvector)
- Шифрование промптов на уровне приложения (AES-256-GCM + KMS)
- Автоматическое сплитование выплат (Robokassa Split)
- Полный комплаенс 152-ФЗ (серверы в РФ, DSR API)
- KYC верификация продавцов через API ФНС (Dadata)

**Технологический стек:**
| Компонент | Технология |
|---|---|
| Backend API | Django 5.x + Django Ninja |
| Frontend | Next.js 15 (App Router, SSR) |
| База данных | PostgreSQL 16 + pgvector |
| Connection Pooling | PgBouncer |
| Кеш / Брокер | Redis 7 |
| Очередь задач | Celery 5 |
| Хранилище медиа | Yandex Object Storage (S3-compatible) |
| KMS | HashiCorp Vault (кластер HA, единственный источник KEK) |
| Эмбеддинги | YandexGPT Embeddings v3 (152-ФЗ, данные не покидают РФ). Допустимая альтернатива: GigaChat Embeddings. OpenAI и другие зарубежные провайдеры — **запрещены** (152-ФЗ). |
| Мониторинг | Zabbix + Telegram алерты + Sentry (error tracking) |
| Аналитика | Яндекс.Метрика |
| CI/CD | GitHub Actions |
| Хостинг | Yandex Cloud / Selectel (РФ) |

**Часовой пояс:** все datetime в БД — UTC; отображение пользователю — MSK (Europe/Moscow).

---

## 2. Юридический комплаенс (152-ФЗ)

Маркетплейс оперирует персональными данными граждан РФ. Следующие пункты обязательны к реализации.

**Оператор персональных данных:** юридическое лицо, зарегистрированное в РФ и являющееся владельцем платформы. Оператор обязан подать уведомление в Роскомнадзор до начала обработки ПДн. DPA (соглашения об обработке данных) обязательны с каждым субпроцессором: Yandex Cloud, Selectel, Dadata, Unisender, Robokassa.

> **Telegram Bot API:** серверы Telegram расположены вне РФ (Дублин / Амстердам). Telegram используется как **опциональный** push-канал уведомлений (`TELEGRAM_ENABLED` env flag). Во все Telegram-сообщения запрещено включать ПДн: имена, email, суммы транзакций, названия промптов. Допустимо только: «Есть новое уведомление — войдите на сайт». DPA с Telegram не требуется, если тело сообщений не содержит ПДн. При недоступности Telegram (сбой, блокировка) система автоматически переходит на Email + in-app уведомления без потери функциональности (раздел 23).

### 2.1. Инфраструктура
- Размещение серверов и БД (PostgreSQL) исключительно на территории РФ (Yandex Cloud, Selectel)
- Базы данных не реплицируются за пределы РФ

### 2.2. Сбор согласий (UI/UX)
- Чекбоксы (не предзаполненные) под каждой формой (регистрация, покупка, контакты) с текстом: _"Я даю сознательное согласие на обработку персональных данных в соответствии с [Политикой]"_
- Для публичных профилей продавцов — отдельный чекбокс на распространение ПДн
- Cookie-баннер: информирует о сборе Cookie и IP. **Яндекс.Метрика инициализируется только после клика "Согласен"**
- В БД фиксируется `consent_pd_at` (datetime) — не булев флаг, а момент согласия

### 2.3. Документация
- Ссылка на "Политику обработки ПДн" в сквозном футере всех страниц

### 2.4. Права пользователей (Backend + UI)
- **Data Export:** API эндпоинт в личном кабинете для скачивания своих данных в машиночитаемом JSON-формате. Экспортируются: профиль, история покупок, отзывы, избранное.
- **Право на забвение:** Полное удаление аккаунта с анонимизацией. Алгоритм см. [раздел 2.5](#25-алгоритм-анонимизации-право-на-забвение)
- **DSR страница:** `/legal/dsr/` — форма для запросов по 152-ФЗ. Срок ответа — 30 дней (152-ФЗ). Обработка: вручную Superadmin через задачу в трекере; создаётся Celery-задача `process_dsr_request`.

### 2.5. Алгоритм анонимизации (право на забвение)

Выполняется Celery-задачей `anonymize_account` асинхронно. Порядок операций:

1. **User:** `is_deleted=True`, `deleted_at=now()`; `email` → `deleted_{uuid}@deleted.local`, `username` → `deleted_{uuid}`
2. **Purchase:** `UPDATE buyer_id=NULL` — записи **не удаляются** (бухучёт, 5 лет)
3. **PromptAccess:** `DELETE WHERE buyer_id=user_id` — доступ отзывается
4. **Review:** `DELETE WHERE buyer_id=user_id` — отзывы удаляются; пересчёт `rating_avg` и `rating_count` для затронутых промптов
5. **AuditLog:** `UPDATE user_id=NULL WHERE user_id=user_id` — обезличивание
6. **ModerationRecord:** если `moderator_id=user_id` → `UPDATE moderator_id=NULL`
7. **Prompt (seller):** PUBLISHED промпты продавца переводятся в ARCHIVED (покупатели сохраняют PromptAccess). Автор отображается как "Удалённый автор".

> Модели `PromptAccess` и `Review` используют `on_delete=models.PROTECT` для `User`, поскольку User не удаляется физически — происходит обезличивание. Каскадное удаление дочерних записей выполняется явно в задаче.

### 2.6. Уведомления об инцидентах
При выявлении утечки ПДн: уведомить Роскомнадзор в течение 24 часов (152-ФЗ, ст. 21.1). Ответственный — Оператор ПДн. Шаблон уведомления хранится в `docs/incident-notification-template.md`.

---

## 3. Финансы и монетизация

### 3.1. Robokassa Split и абстракция платежей
При оплате сумма делится: комиссия платформы + доход автора напрямую. Платформа не является транзитом средств. Вся логика использует универсальные UUID; `robokassa_invoice_id` инкапсулирован в payment service.

**Платформенный UUID:** используется `Purchase.id` как основной идентификатор транзакции. `robokassa_invoice_id` — поле шлюза, инкапсулировано в payment service; webhook маппит его на `Purchase.id` для идемпотентности.

### 3.2. Бесплатные промпты
- `price = Decimal('0.00')` → Robokassa не задействована.
- **Flow:** Buyer нажимает «Получить» → требуется авторизация → капча (ADR-014) → Backend создаёт `PromptAccess(purchase=None)` синхронно → возвращает расшифрованный контент.

### 3.3. Комиссия платформы
- **Дефолт: 20%** (`PLATFORM_COMMISSION_RATE=0.20` в env). Диапазон допустимых значений: 0%–50%.
- Изменяется через Django Admin (модель `SiteSettings`). Инициализация: Django data migration при первом deploy.
- Фиксируется в `Purchase.platform_commission_rate` (DecimalField) и `Purchase.platform_commission_amount` (DecimalField) на момент оплаты — исторические данные неизменны.

### 3.4. Возвраты (Refund)

| Действие | Инициатор | Интеграция | Поведение |
|----------|-----------|------------|-----------|
| Полный возврат | Superadmin (через Django Admin action) | Robokassa API refund | `Purchase.status=REFUNDED`; удаление `PromptAccess`; пересчёт `purchases_count`; уведомления |
| Частичный возврат | Вне MVP | — | — |

**Flow при Refund:**
1. Superadmin нажимает "Инициировать возврат" в Django Admin → Django вызывает `Robokassa Refund API` с `InvId`.
2. Robokassa выполняет возврат и отправляет webhook `ResultURL` с `State=Canceled`.
3. Webhook handler: проверяет подпись → находит `Purchase` по `robokassa_invoice_id` → если `Purchase.status != REFUNDED` — запускает `process_refund`.
4. **Идемпотентность:** Celery-задача `process_refund(purchase_id)` использует `select_for_update()` + проверку статуса. Повторный вызов при уже `REFUNDED` — no-op.
5. `process_refund`: `Purchase.status=REFUNDED`; удаляет `PromptAccess(buyer=buyer, prompt=prompt)`; декрементирует `Prompt.purchases_count`; отправляет уведомления покупателю и продавцу.
6. **Комиссия при возврате:** платформенная комиссия также возвращается (Robokassa Split reversal). Значение `Purchase.platform_commission_amount` сохраняется для бухучёта.

---

## 4. Ролевая модель и личные кабинеты

Платформа поддерживает роли: **Buyer, Seller, Moderator, Superadmin**. **Один пользователь может совмещать роли** (например, buyer + seller): при регистрации как seller добавляется SellerProfile, при этом история покупок как buyer сохраняется. Поле `User.role` хранит **основную** роль (`UserRole` enum); наличие `SellerProfile` определяет возможность продавать.

`UserRole` enum: `BUYER`, `SELLER`, `MODERATOR`, `SUPERADMIN`.

Регистрация: Yandex ID, VK ID, Telegram Auth или Email+OTP.

### 4.1. Покупатель (Buyer)
**Функционал:** Просмотр каталога, добавление в избранное, покупка промптов, отзывы. **API Keys (M2M):** для Agentic AI — возможность генерации API-ключей для автоматизированного доступа к купленным промптам (раздел 5.7).

**Личный кабинет:**
- Библиотека купленных/бесплатных промптов
- История транзакций и чеки
- Настройки профиля и уведомлений
- Data Export и запрос на удаление аккаунта

### 4.2. Продавец (Seller / Автор)
**Верификация (KYC):** Только ИП или Самозанятые. ИНН проверяется через Dadata.

**Onboarding:** регистрация → подача ИНН и legal_type → Dadata KYC → VERIFIED → настройка реквизитов Robokassa Split → публикация первого промпта.

**Личный кабинет:**
- CRUD промптов, управление статусами
- Дашборд аналитики: просмотры карточки, продажи (count + сумма), конверсия просмотр→покупка. Данные агрегируются Celery Beat задачей `aggregate_seller_stats` (ежедневно, хранятся в `SellerDailyStats`).
- Реквизиты Robokassa Split

### 4.3. Модератор (Moderator)
**Функционал:** Очередь промптов (Accept/Reject с причиной из CMS-справочника). Модератор не видит зашифрованный текст промпта — только метаданные и `short_description`.

**Назначение:** вручную Superadmin.

### 4.4. Супер-Админ (Superadmin)
Полный контроль через Django Admin: финансы, пользователи, CMS (причины отклонения, баннеры), настройки комиссии, ручной KYC override.

---

## 5. Аутентификация

### 5.1. Методы входа
OAuth (Yandex, VK, Telegram) — callback на `/api/v1/auth/{provider}/callback`; Email+OTP (6 цифр, TTL 5 мин).

**OTP хранение:** в Redis ключ `otp:{email}` → `{ "code": "123456", "attempts": 0 }`, TTL = 300 сек.

**OTP атомарная проверка:** операции «прочитать → сравнить → удалить» выполняются атомарно через Redis Lua-скрипт, чтобы исключить race condition (два параллельных запроса используют один код):

```lua
-- verify_otp.lua
local key = KEYS[1]
local code = ARGV[1]
local data = redis.call("GET", key)
if not data then return -1 end       -- код не найден / истёк
local stored = cjson.decode(data)
if stored.code ~= code then
    stored.attempts = stored.attempts + 1
    local ttl = redis.call("TTL", key)
    redis.call("SET", key, cjson.encode(stored), "EX", ttl)
    return stored.attempts           -- неверный код, кол-во попыток
end
redis.call("DEL", key)               -- верный код — удаляем
return 0                             -- успех
```
Возврат 0 = успех, -1 = истёк, N > 0 = неверный код (N-я попытка).

**Защита OTP от brute-force:** после 5 неверных попыток — блокировка на 15 минут (`otp:blocked:{email}`, TTL=900). Событие фиксируется в AuditLog.

### 5.2. JWT

**Библиотека:** `PyJWT 2.x` (`pip install PyJWT`). Алгоритм: `HS256`, секрет = `SECRET_KEY`.

**Payload структура:**
```json
{
  "sub": "user-uuid",
  "role": "BUYER",
  "jti": "unique-token-id-uuid4",
  "type": "access",
  "exp": 1234567890,
  "iat": 1234567890
}
```

- **Access token TTL:** 15 мин
- **Refresh token TTL:** 7 дней (HttpOnly cookie)
- **Refresh token rotation:** одноразовый. При `POST /api/v1/auth/refresh` старый Refresh Token немедленно добавляется в Redis blacklist (`jwt:revoked:{jti}`, TTL = оставшийся срок). Возвращается новая пара access + refresh. Повторный запрос со старым refresh → 401.

**Refresh cookie атрибуты:**
```python
response.set_cookie(
    key="refresh_token",
    value=refresh_jwt,
    httponly=True,
    secure=True,           # только HTTPS
    samesite="Lax",        # Lax, не Strict — чтобы OAuth-редиректы не теряли cookie
    max_age=604800,        # 7 дней в секундах
    path="/api/v1/auth/",  # ограничить scope cookie
)
```

> **Почему `SameSite=Lax`, не `Strict`:** OAuth-провайдеры (Yandex, VK) выполняют редирект на callback URL. При `Strict` браузер не передаёт cookie в cross-site редиректах, и refresh token теряется. `Lax` позволяет cookie при top-level GET-навигации (редирект), но блокирует при AJAX cross-origin POST — что нам и нужно.

### 5.3. Django Admin
Cookie-сессии. Superadmin — email + пароль (не OTP). Рекомендуется включить TOTP (django-otp) для Superadmin до production.

### 5.4. Вход под пользователем (Superadmin)
JWT с TTL 5 мин; запись в AuditLog. Выход — отдельный endpoint `POST /auth/admin-exit/`, аннулирующий служебный JWT.

### 5.5. Восстановление доступа
Единый OTP-флоу (тот же, что при первичном входе по email). Если пользователь потерял доступ к email — обращение через DSR-форму (`/legal/dsr/`); Superadmin может сбросить email вручную после верификации личности.

### 5.6. Logout и отзыв сессий

Для принудительного выхода используется **JWT blacklist в Redis**.

Redis-ключ `jwt:revoked:{jti}` с TTL = оставшемуся времени жизни Access token. При каждом валидном запросе middleware проверяет JTI в blacklist; при наличии — 401. При logout: `POST /auth/logout` → backend добавляет JTI текущего Access в blacklist. При недоступности Redis для проверки blacklist — **fail closed** (401) для маршрутов, требующих auth.

### 5.7. API-ключи для агентов (Machine-to-Machine Auth)

Для интеграции **Agentic AI** и Multiagent Systems (MAS) платформа поддерживает **API Keys** — долгоживущие токены для автоматизированного доступа без OAuth/JWT-ротации.

**Use case:** корпоративный клиент подключает купленную библиотеку промптов к своим автономным агентам (Agentic Workflows). Агенты вызывают `GET /prompts/{id}/content/`, передавая `Authorization: Api-Key <token>`.

**Формат:** префикс `ps_live_` для production-ключей. Генерация — в личном кабинете Buyer: «Создать API-ключ». Ключ показывается один раз; в БД хранится только хеш (SHA-256). Можно создать несколько ключей с именами (например, «Prod Agent», «Staging»).

**Авторизация:** middleware проверяет `Authorization: Api-Key ps_live_...`; при валидном ключе — идентификация по `User` (владелец ключа), проверка PromptAccess для доступа к контенту. JWT не требуется.

**Отзыв:** в личном кабинете — список ключей с возможностью отозвать (удалить хеш из БД).

---

## 6. Каталог: поиск и фильтрация

### 6.1. Семантический поиск

pgvector, YandexGPT Embeddings v3, HNSW индекс. Слой поиска инкапсулирован интерфейсом `ISearchProvider` (раздел 13) — миграция на Qdrant при масштабировании не требует изменений бизнес-логики.

**Размерность эмбеддингов:** конфигурируется `EMBEDDING_DIMENSIONS`. YandexGPT Embeddings v3 — 256 или 1024 (выбирается при создании индекса). При смене модели требуется миграция: пересчёт эмбеддингов для всех промптов и пересоздание HNSW-индекса (Celery-задача `rebuild_embeddings`).

**Проверка на плагиат:** после APPROVED при вычислении эмбеддингов Celery-задача сравнивает эмбеддинг нового промпта с уже опубликованными. При косинусном сходстве > 95% — статус `PENDING_PLAGIARISM_REVIEW`; иначе — PUBLISHED.

### 6.2. Пагинация

**Обычный каталог** (`GET /catalog/prompts`): **cursor-based** по `(sort_field, id)`. Параметры: `?cursor=...&limit=20&sort=created_at|price|rating`.

**Cursor encoding:** cursor = URL-safe base64 без padding от JSON-объекта с последним значением sort-поля и `id`. Примеры по типу сортировки:

| sort | cursor JSON | SQL условие |
|------|-------------|-------------|
| `created_at` (default) | `{"created_at": "2026-01-15T12:00:00Z", "id": "uuid"}` | `WHERE (created_at, id) < (?, ?)` |
| `rating` | `{"rating_avg": "4.50", "id": "uuid"}` | `WHERE (rating_avg, id) < (?, ?)` |
| `price` | `{"price": "990.00", "id": "uuid"}` | `WHERE (price, id) < (?, ?)` |

```python
import base64, json

def encode_cursor(data: dict) -> str:
    return base64.urlsafe_b64encode(json.dumps(data).encode()).rstrip(b"=").decode()

def decode_cursor(cursor: str) -> dict:
    padding = 4 - len(cursor) % 4
    return json.loads(base64.urlsafe_b64decode(cursor + "=" * padding))
```

**Семантический поиск** (`GET /catalog/search`): **offset-based**: `?offset=0&limit=20` с жёстким ограничением **max_offset=1000**. Это намеренное бизнес-решение: поиск по векторному расстоянию теряет смысл за первыми 1000 результатами.

### 6.3. Фасетная фильтрация
Параметры фильтрации: `category`, `ai_model`, `tags` (comma-separated), `price_min`, `price_max`, `rating_min`. Логика: все фильтры применяются через **AND**.

### 6.4. Категории и теги
- Категории: плоская структура. Создаются только Superadmin через Django Admin.
- Теги: создаются автоматически при публикации промпта; Superadmin может вручную добавлять/удалять теги.

---

## 7. Структура карточки промпта

URL карточки: `/prompt/{slug}/` — поле `slug` в модели Prompt.

**Поля карточки:** заголовок (`title`), краткое описание (`short_description`, 500 символов), AI-модель (`ai_model`), категория, теги, примеры результата (изображения, опционально), инструкция по использованию (`instruction`), цена, рейтинг. Текст промпта (`content`) — только после оплаты/получения (зашифрован в БД).

**Жизненный цикл:**

```
DRAFT → submit → SECURITY_SCAN → PENDING_MODERATION → APPROVED
                ↘ FAILED_SECURITY_SCAN (правки → повтор, лимит 3 попытки)
                ↘ BLOCKED_BY_SECURITY (после 3 FAILED)
                       ↘ APPEAL_REQUESTED (продавец оспорил → очередь модератору)
APPROVED → Celery [embeddings queue] (embeddings + plagiarism check) → PUBLISHED
                                                                     ↘ PENDING_PLAGIARISM_REVIEW
                                                                     ↘ EMBEDDING_FAILED (retry exhausted)
PUBLISHED → ARCHIVED (продавец снял с продажи)
ARCHIVED → DRAFT (продавец может заново отредактировать и отправить на модерацию)
PENDING_MODERATION → REJECTED (правки → DRAFT → повтор)
```

**`EMBEDDING_FAILED`:** Celery-задача `compute_embedding` использует retry с exponential backoff, max 5 попыток. Если все попытки исчерпаны (embedding API недоступен) → статус промпта → `EMBEDDING_FAILED`, алерт в Sentry + Telegram. Superadmin может вручную перезапустить задачу через Django Admin action "Retry embedding". Продавец получает уведомление: "Публикация временно задержана, мы уже решаем проблему".

**SECURITY_SCAN:** перед попаданием к модератору — автоматическая проверка через LLM/AISP на Prompt Injection, Jailbreaks, токсичный контент. При обнаружении — `FAILED_SECURITY_SCAN`, уведомление продавцу. **Лимит попыток: 3.** После 3-го FAILED — статус `BLOCKED_BY_SECURITY`. Продавец может нажать «Оспорить» → статус `APPEAL_REQUESTED`, промпт попадает в очередь модератору (живая проверка). Модератор при ручном review может перевести в `PENDING_MODERATION` (обход автоматики) или оставить BLOCKED.

**PENDING_PLAGIARISM_REVIEW resolve flow:** модератор видит промпт и список похожих с % сходства.
- Решение «Оригинальный» → `PUBLISHED`.
- Решение «Плагиат» → `REJECTED`, уведомление продавцу с указанием оригинала.

**Модерация:** типовые причины в CMS-справочнике; при Reject — email продавцу с причиной.

**Digital Provenance:** при переходе в `PUBLISHED` Celery-задача вычисляет `content_hash = SHA-256(decrypted_content + seller.inn + published_at)` и сохраняет в БД. Хеш — неизменяемый артефакт, дающий авторам юридическое доказательство первенства публикации (timestamp) при копировании промпта на другие площадки.

**Политика редактирования после публикации (версионирование):** При переходе `ARCHIVED → DRAFT` продавцу разрешено редактировать только **метаданные** (title, short_description, price, instruction, category, tags, ai_model). **Замена `encrypted_content` (тела промпта) запрещена** — покупатели, уже имеющие `PromptAccess`, должны получать именно тот контент, за который платили. Технически: при PATCH `/prompts/{id}/` в статусе DRAFT после предыдущей публикации поля `content` игнорируется (422 при попытке передать). Если продавцу нужно обновить контент — он создаёт новый промпт с новым `slug`.

---

## 8. Архитектура системы

### 8.1. Топология

```mermaid
graph TB
    Browser -->|HTTPS| WAF["WAF / Anti-DDoS<br/>(Yandex Cloud Shield)"]
    WAF --> Nginx["Nginx (reverse proxy,<br/>rate limiting, SSL termination)"]

    Nginx -->|":3000"| NextJS["Next.js 15<br/>(SSR / App Router)"]
    Nginx -->|":8000"| Django["Django 5 + Django Ninja<br/>(via Gunicorn + PgBouncer)"]

    Django --> PG[("PostgreSQL 16<br/>+ pgvector<br/>+ PgBouncer")]
    Django --> Redis[("Redis 7<br/>Sentinel / Cluster")]
    Django --> Vault["HashiCorp Vault HA<br/>(KMS, KEK)"]
    Django --> YOS["Yandex Object Storage<br/>(media, backups)"]
    CDN["CDN (Yandex CDN / CloudFlare)"] --> YOS
    Browser -.->|"превью изображений"| CDN

    Celery["Celery Workers<br/>(queues: default,<br/>embeddings, notifications,<br/>payments, gdpr)"] --> PG
    Celery --> Redis
    Celery --> Vault
    Celery --> EmbAPI["YandexGPT Embeddings API"]
    Celery --> Dadata["Dadata KYC API"]
    Celery --> Unisender["Unisender Email API"]

    Django --> Celery
    Django --> Robokassa["Robokassa Split"]
    Robokassa -->|webhook| Django

    Zabbix["Zabbix Agent"] --> ZabbixSrv["Zabbix Server"]
    Sentry["Sentry SDK"] --> SentryCloud["Sentry Cloud"]
    YaMet["Яндекс.Метрика"] --- NextJS
```

**Ключевые потоки данных:**

```
Покупка:
  Buyer → Django (Purchase PENDING) → Robokassa (redirect)
  → Robokassa webhook → Django → Celery [payments queue]
  → Purchase SUCCESS + PromptAccess → уведомление

Загрузка промпта:
  Seller → Django → Vault (KEK) → шифрование контента → DRAFT
  → submit → Celery [default] → SECURITY_SCAN (AISP API)
  → PENDING_MODERATION → Moderator approve → Celery [embeddings]
  → pgvector index + plagiarism check → PUBLISHED
```

**CDN (Content Delivery Network):** для раздачи публичных превью изображений используется CDN (Yandex CDN, CloudFlare или аналог) перед YOS. Прямая раздача из S3 медленная и дорогая; CDN кэширует медиа ближе к пользователю и снижает нагрузку на YOS. URL превью указывают на CDN; при cache miss CDN забирает объект из YOS.

**Confidential Computing (in-use protection):** при вызове `aes_gcm_decrypt` расшифрованный DEK и plaintext промпта находятся в RAM. Best Practice 2026 — **Confidential VMs (TEE)**: worker-узлы Django и Celery, выполняющие расшифровку, должны работать на инстансах с аппаратным шифрованием памяти (AMD SEV, Intel TDX). Yandex Cloud и Selectel поддерживают такие инстансы. Это защищает данные *in use* от дампа памяти гипервизора и компрометации на уровне ОС.

### 8.2. Сеть и безопасность
**WAF / Anti-DDoS (L3/L4/L7):** Yandex Cloud DDoS Protection или Selectel Anti-DDoS. Обязательно для платформы с финансовыми транзакциями.

**SSL/TLS:** терминируется на Nginx. **TLSv1.3** (TLSv1.2 — fallback). Cipher suites: ECDHE, AES-256. **Post-Quantum Cryptography (PQC):** поддержка гибридных PQC-cipher suites (например, CRYSTALS-Kyber, стандартизирован NIST) на уровне WAF/Nginx — защита от атак «Store now, decrypt later». HSTS: `max-age=31536000; includeSubDomains`. Сертификат: Let's Encrypt (auto-renewal через certbot).

**Health checks:** `GET /api/v1/health/` (публичный). Проверяет три зависимости и возвращает агрегированный статус:

```json
{
  "status": "ok | degraded",
  "db": "ok | error",
  "redis": "ok | error",
  "vault": "ok | error"
}
```

При любом компоненте `error` — HTTP 503 (load balancer выводит инстанс из ротации). Vault-check: `vault_client.is_authenticated()`, timeout 2 с. При 503 — алерт Zabbix + Telegram немедленно. **Vault недоступен = контент нечитаем = сервис деградирован**, даже если DB и Redis работают. Используется Docker Healthcheck и Zabbix.

### 8.3. Redis — критичная зависимость
Redis используется как: брокер Celery, кеш DEK, хранилище rate limit, OTP, JWT blacklist, OTP brute-force счётчики. **Production: обязательно Redis Sentinel или Redis Cluster.** Staging/Development — одиночный инстанс.

При недоступности Redis:
- Celery не обрабатывает задачи
- DEK расшифровка идёт напрямую через Vault (с задержкой)
- Rate limit → **fail open** (логируется, алерт в Sentry)
- JWT blacklist → **fail closed** (401)

---

## 9. Data Model (Django)

### 9.1. `users/models.py`

```python
class UserRole(models.TextChoices):
    BUYER = "BUYER"
    SELLER = "SELLER"
    MODERATOR = "MODERATOR"
    SUPERADMIN = "SUPERADMIN"

class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid4)
    # null=True, blank=True: VK OAuth может не предоставить email.
    # PostgreSQL разрешает несколько NULL в unique-колонке (NULL != NULL).
    # При null-email пользователю предлагается ввести email при первом входе.
    email = models.EmailField(unique=True, null=True, blank=True)
    username = models.CharField(max_length=50, unique=True)
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.BUYER)
    avatar_object_key = models.CharField(max_length=500, blank=True)

    # OAuth IDs
    yandex_id = models.CharField(max_length=100, blank=True, db_index=True)
    vk_id = models.CharField(max_length=100, blank=True, db_index=True)
    telegram_id = models.CharField(max_length=100, blank=True, db_index=True)
    telegram_username = models.CharField(max_length=100, blank=True)

    # Consent
    consent_pd_at = models.DateTimeField(null=True)
    consent_cookies_at = models.DateTimeField(null=True)

    # Django internals (обязательны для AbstractBaseUser + Django Admin)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)  # доступ к Django Admin

    # Soft delete
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    # Manager excludes is_deleted=True by default
    objects = ActiveUserManager()
    all_objects = models.Manager()

    class Meta:
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["yandex_id"]),
            models.Index(fields=["vk_id"]),
            models.Index(fields=["telegram_id"]),
        ]

class KYCStatus(models.TextChoices):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"   # потеря статуса НПД/ИП после верификации

class LegalType(models.TextChoices):
    IP = "IP"                       # ИП
    SELF_EMPLOYED = "SELF_EMPLOYED" # Самозанятый (НПД)

class SellerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="seller_profile")
    legal_type = models.CharField(max_length=20, choices=LegalType.choices)
    inn = models.CharField(max_length=12)
    kyc_status = models.CharField(max_length=20, choices=KYCStatus.choices, default=KYCStatus.PENDING)
    kyc_verified_at = models.DateTimeField(null=True)
    kyc_rejection_reason = models.TextField(blank=True)
    kyc_last_checked_at = models.DateTimeField(null=True)   # Celery Beat

    # Robokassa Split реквизиты
    robokassa_merchant_login = models.CharField(max_length=200, blank=True)
    split_enabled = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["inn"]), models.Index(fields=["kyc_status"])]
```

### 9.2. `prompts/models.py`

```python
class PromptStatus(models.TextChoices):
    DRAFT = "DRAFT"
    SECURITY_SCAN = "SECURITY_SCAN"
    FAILED_SECURITY_SCAN = "FAILED_SECURITY_SCAN"
    BLOCKED_BY_SECURITY = "BLOCKED_BY_SECURITY"   # после 3 неудачных SECURITY_SCAN
    APPEAL_REQUESTED = "APPEAL_REQUESTED"         # продавец оспорил BLOCKED → очередь модератору
    PENDING_MODERATION = "PENDING_MODERATION"
    PENDING_PLAGIARISM_REVIEW = "PENDING_PLAGIARISM_REVIEW"
    APPROVED = "APPROVED"
    EMBEDDING_FAILED = "EMBEDDING_FAILED"          # embedding API недоступен, retry exhausted
    PUBLISHED = "PUBLISHED"
    REJECTED = "REJECTED"
    ARCHIVED = "ARCHIVED"

class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)

class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)

class Prompt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    seller = models.ForeignKey(User, on_delete=models.PROTECT, related_name="prompts")
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, max_length=220)  # генерируется из title при создании; не меняется при edit
    short_description = models.CharField(max_length=500)
    instruction = models.TextField(blank=True)            # инструкция по использованию промпта
    ai_model = models.CharField(max_length=100)           # "GPT-4o", "Claude 3.5 Sonnet", etc.
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="prompts")
    tags = models.ManyToManyField(Tag, blank=True, related_name="prompts")
    price = models.DecimalField(max_digits=10, decimal_places=2)  # 0.00 = бесплатный
    status = models.CharField(max_length=30, choices=PromptStatus.choices, default=PromptStatus.DRAFT)
    security_scan_attempts = models.PositiveSmallIntegerField(default=0)  # лимит 3

    # Переменные промпта — шаблонные параметры для подстановки пользователем.
    # Формат: [{"name": "TOPIC", "description": "Тема промпта", "example": "маркетинг"}]
    variables = models.JSONField(default=list, blank=True)

    # Шифрование (Envelope Encryption, ADR-013)
    # ВАЖНО: BinaryField при чтении возвращает memoryview, не bytes.
    # Везде в коде используй bytes(prompt.encrypted_content) явно. См. раздел 25.
    encrypted_content = models.BinaryField()      # AES-256-GCM ciphertext
    encrypted_dek = models.BinaryField()          # DEK, зашифрованный KEK из Vault
    iv = models.BinaryField(max_length=12)        # GCM IV, 12 байт
    auth_tag = models.BinaryField(max_length=16)  # GCM auth tag, 16 байт

    # Семантический поиск
    embedding = VectorField(dimensions=1024, null=True)   # YandexGPT Embeddings v3

    # Метрики
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=Decimal("0.00"))
    rating_count = models.PositiveIntegerField(default=0)
    purchases_count = models.PositiveIntegerField(default=0)
    views_count = models.PositiveIntegerField(default=0)

    # Digital Provenance: SHA-256(decrypted_content + seller.inn + published_at), заполняется при переходе в PUBLISHED
    content_hash = models.CharField(max_length=64, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True)

    class Meta:
        indexes = [
            models.Index(fields=["seller"]),
            models.Index(fields=["status"]),
            models.Index(fields=["category"]),
            models.Index(fields=["-created_at"]),
            models.Index(fields=["-rating_avg"]),
            models.Index(fields=["price"]),
            HnswIndex(fields=["embedding"], m=16, ef_construction=64, name="prompt_embedding_hnsw"),
        ]

class PromptOutputExample(models.Model):
    """Примеры результатов — публичные изображения, загружаются продавцом."""
    prompt = models.ForeignKey(Prompt, on_delete=models.CASCADE, related_name="examples")
    # Формат: prompts/{prompt_id}/examples/{uuid}.{ext}
    object_key = models.CharField(max_length=500)
    mime_type = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

class ModerationRecord(models.Model):
    prompt = models.ForeignKey(Prompt, on_delete=models.CASCADE, related_name="moderation_records")
    moderator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    decision = models.CharField(max_length=20, choices=[("APPROVED", "Approved"), ("REJECTED", "Rejected"),
                                                         ("PLAGIARISM_CLEAR", "Plagiarism Clear"),
                                                         ("PLAGIARISM_CONFIRMED", "Plagiarism Confirmed")])
    rejection_reason = models.CharField(max_length=500, blank=True)  # из CMS-справочника
    created_at = models.DateTimeField(auto_now_add=True)

class Favorite(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="favorites")
    prompt = models.ForeignKey(Prompt, on_delete=models.CASCADE, related_name="favorited_by")
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = [("user", "prompt")]
```

### 9.3. `payments/models.py`

```python
class PurchaseStatus(models.TextChoices):
    PENDING = "PENDING"    # создан, ожидает оплаты
    SUCCESS = "SUCCESS"    # оплачен
    REFUNDED = "REFUNDED"  # возвращён
    CANCELLED = "CANCELLED"  # аннулирован (KYC продавца потерян в момент транзакции)

class Purchase(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)  # платформенный UUID
    buyer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="purchases")
    prompt = models.ForeignKey(Prompt, on_delete=models.PROTECT, related_name="purchases")
    seller = models.ForeignKey(User, on_delete=models.PROTECT, related_name="sales")
    status = models.CharField(max_length=20, choices=PurchaseStatus.choices, default=PurchaseStatus.PENDING)

    amount = models.DecimalField(max_digits=10, decimal_places=2)            # цена на момент покупки
    platform_commission_rate = models.DecimalField(max_digits=5, decimal_places=4)  # например, 0.2000
    platform_commission_amount = models.DecimalField(max_digits=10, decimal_places=2)
    seller_amount = models.DecimalField(max_digits=10, decimal_places=2)     # amount - commission

    # Robokassa
    robokassa_invoice_id = models.CharField(max_length=200, unique=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True)
    refunded_at = models.DateTimeField(null=True)

    class Meta:
        indexes = [
            models.Index(fields=["buyer"]),
            models.Index(fields=["seller"]),
            models.Index(fields=["status"]),
            models.Index(fields=["robokassa_invoice_id"]),
        ]

class PromptAccess(models.Model):
    """Право пользователя на расшифровку промпта."""
    buyer = models.ForeignKey(User, on_delete=models.PROTECT, related_name="accesses")
    prompt = models.ForeignKey(Prompt, on_delete=models.PROTECT, related_name="accesses")
    purchase = models.ForeignKey(Purchase, on_delete=models.SET_NULL, null=True)  # null для бесплатных
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = [("buyer", "prompt")]
```

### 9.4. `reviews/models.py`

```python
class Review(models.Model):
    buyer = models.ForeignKey(User, on_delete=models.PROTECT, related_name="reviews")
    prompt = models.ForeignKey(Prompt, on_delete=models.CASCADE, related_name="reviews")
    purchase = models.ForeignKey(Purchase, on_delete=models.SET_NULL, null=True)  # null для бесплатных
    rating = models.PositiveSmallIntegerField()  # 1–5
    text = models.TextField(max_length=2000, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = [("buyer", "prompt")]

    def clean(self):
        if not (1 <= self.rating <= 5):
            raise ValidationError("Rating must be between 1 and 5")
```

### 9.5. `notifications/models.py`

```python
class NotificationType(models.TextChoices):
    # Покупатель
    PURCHASE_SUCCESS = "PURCHASE_SUCCESS"
    PURCHASE_REFUNDED = "PURCHASE_REFUNDED"
    # Продавец
    PROMPT_PUBLISHED = "PROMPT_PUBLISHED"
    PROMPT_REJECTED = "PROMPT_REJECTED"
    PROMPT_SECURITY_FAILED = "PROMPT_SECURITY_FAILED"
    PROMPT_PLAGIARISM_REVIEW = "PROMPT_PLAGIARISM_REVIEW"
    PROMPT_PLAGIARISM_CLEARED = "PROMPT_PLAGIARISM_CLEARED"
    PROMPT_PLAGIARISM_REJECTED = "PROMPT_PLAGIARISM_REJECTED"
    KYC_VERIFIED = "KYC_VERIFIED"
    KYC_REJECTED = "KYC_REJECTED"
    KYC_STATUS_LOST = "KYC_STATUS_LOST"
    SALE_COMPLETED = "SALE_COMPLETED"
    SALE_REFUNDED = "SALE_REFUNDED"
    # Система
    ACCOUNT_DELETED = "ACCOUNT_DELETED"

class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    type = models.CharField(max_length=50, choices=NotificationType.choices)
    title = models.CharField(max_length=200)
    body = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["user", "-created_at"])]
```

### 9.6. `audit/models.py`

```python
class AuditLog(models.Model):
    """Append-only лог критичных действий. Партицирован по месяцам (PARTITION BY RANGE created_at)."""

    class Action(models.TextChoices):
        LOGIN = "LOGIN"
        LOGOUT = "LOGOUT"
        OTP_BLOCKED = "OTP_BLOCKED"
        PURCHASE = "PURCHASE"
        REFUND = "REFUND"
        KYC_SUBMIT = "KYC_SUBMIT"
        KYC_VERIFIED = "KYC_VERIFIED"
        KYC_REJECTED = "KYC_REJECTED"
        ADMIN_LOGIN_AS = "ADMIN_LOGIN_AS"
        ACCOUNT_DELETE = "ACCOUNT_DELETE"
        PROMPT_SUBMIT = "PROMPT_SUBMIT"
        PROMPT_PUBLISH = "PROMPT_PUBLISH"
        PROMPT_REJECT = "PROMPT_REJECT"

    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, db_index=True, related_name="audit_logs"
    )
    action = models.CharField(max_length=50, choices=Action.choices)
    ip_address = models.GenericIPAddressField(null=True)
    object_type = models.CharField(max_length=50, blank=True)   # "Prompt", "Purchase", etc.
    object_id = models.CharField(max_length=50, blank=True)     # UUID строкой
    payload = models.JSONField(default=dict)                    # детали без ПДн
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Партицирование настраивается в PostgreSQL DDL, не через Django ORM.
        # Django работает с партицированной таблицей прозрачно.
        indexes = [models.Index(fields=["user", "-created_at"])]
```

**Partition DDL:** используется расширение PostgreSQL **`pg_partman`**. Оно автоматически управляет созданием партиций внутри СУБД по расписанию (`pg_cron` или встроенный background worker). DDL-операции не делегируются Celery — зависимость от брокера Redis для критичной партиции устранена. При падении Redis или OOM воркера `INSERT` в AuditLog продолжит работать.

**Настройка pg_partman:** при первом deploy — data migration создаёт родительскую таблицу и настраивает `pg_partman` (интервал партиций — месяц, автокреация на N месяцев вперёд). См. [документацию pg_partman](https://github.com/pgpartman/pg_partman).

**Retention:** логи старше 1 года → архивировать в YOS (Parquet/JSON) → удалять из основной таблицы. Celery Beat задача `archive_audit_logs` — ежемесячно.

### 9.7. `core/models.py`

```python
class SiteSettings(models.Model):
    """Singleton. Использовать через SiteSettings.get_solo() (django-solo) или кастомный менеджер.
    Кешируется в Redis ключом 'site:settings' TTL=300 сек."""
    commission_rate = models.DecimalField(
        max_digits=5, decimal_places=4, default=Decimal("0.2000"),
        help_text="Комиссия платформы, напр. 0.2000 = 20%. Диапазон: 0.0000–0.5000"
    )
    maintenance_mode = models.BooleanField(default=False, help_text="Режим обслуживания")

    class Meta:
        verbose_name = "Настройки сайта"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
        cache.delete("site:settings")  # инвалидация кеша при изменении
```

### 9.8. `analytics/models.py`

```python
class SellerDailyStats(models.Model):
    """Агрегированная статистика продавца за день. Заполняется Celery Beat задачей aggregate_seller_stats."""
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name="daily_stats")
    date = models.DateField()
    views_count = models.PositiveIntegerField(default=0)
    sales_count = models.PositiveIntegerField(default=0)
    revenue = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        unique_together = [("seller", "date")]
        indexes = [models.Index(fields=["seller", "-date"])]
```

### 9.9. `notifications/models.py` — NotificationSettings

```python
class NotificationSettings(models.Model):
    """Настройки уведомлений пользователя. Создаётся автоматически при регистрации (post_save signal)."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="notification_settings")
    email_enabled = models.BooleanField(default=True)
    telegram_enabled = models.BooleanField(default=False)

    # Обязательные типы — нельзя отключить: PURCHASE_SUCCESS, KYC_REJECTED, KYC_STATUS_LOST
```

### 9.10. `moderation/models.py`

```python
class RejectionReason(models.Model):
    """CMS-справочник причин отклонения. Управляется Superadmin через Django Admin."""
    code = models.CharField(max_length=50, unique=True)         # "INAPPROPRIATE_CONTENT"
    text_ru = models.CharField(max_length=500)                  # человекочитаемый текст для продавца
    is_active = models.BooleanField(default=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order"]
```

---

## 10. API Contract

**Base URL:** `https://promptspace.ru/api/v1`
**Авторизация:** `Authorization: Bearer <access_token>`
**Content-Type:** `application/json`
**OpenAPI/Swagger:** `GET /api/v1/docs` (автогенерация Django Ninja)

### 10.1. Формат ошибок

```json
{
  "detail": "Human-readable message",
  "code": "ERROR_CODE",
  "errors": { "field_name": ["validation message"] }
}
```

HTTP коды: 400 (validation), 401 (unauthorized), 403 (forbidden), 404, 422 (unprocessable), 429 (rate limit), 500.

**Rate limit headers:** при 429 — заголовки `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After` (секунды).

### 10.2. Соглашение: slug vs id

- **Публичные маршруты** (каталог, карточка): **slug** — `GET /catalog/prompts/{slug}`.
- **Операции с контентом и управление**: **id** (UUID) — `GET /prompts/{id}/content/`, `PATCH /prompts/{id}/`.
- **Медиа:** `object_key` → backend извлекает `prompt_id` → проверяет PromptAccess.

### 10.3. Идемпотентность мутирующих эндпоинтов
- `POST /library/acquire/`: `get_or_create(buyer, prompt)` → при повторном вызове возвращает 200.
- `POST /payments/create/`: при уже купленном промпте → 200 `{ "redirect": "/library" }`.
- Webhook Robokassa: проверка `Purchase.status` → если SUCCESS — 200 без побочных эффектов.

### 10.4. Эндпоинты: Аутентификация

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| POST | `/auth/otp/request` | — | `{ "email": "..." }` → 200 |
| POST | `/auth/otp/verify` | — | `{ "email": "...", "code": "123456" }` → `{ "access": "...", "refresh_cookie": true }` |
| POST | `/auth/refresh` | cookie | Rotation: старый refresh аннулируется → `{ "access": "...", "refresh_cookie": true }` |
| POST | `/auth/logout` | bearer | JTI в blacklist; 200 |
| POST | `/auth/api-keys/` | bearer | `{ "name": "Prod Agent" }` → `{ "id": "uuid", "key": "ps_live_...", "key_preview": "ps_live_•••xyz" }`. Ключ показывается один раз. |
| GET | `/auth/api-keys/` | bearer | Список ключей (id, name, created_at, последние 4 символа) |
| DELETE | `/auth/api-keys/{id}/` | bearer | Отзыв API-ключа |
| GET | `/auth/{provider}/` | — | Redirect to OAuth |
| GET | `/auth/{provider}/callback` | — | → JWT |

### 10.5. Эндпоинты: Каталог

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| GET | `/catalog/prompts` | opt | `?q=&category=&ai_model=&tags=&price_min=&price_max=&rating_min=&sort=created_at\|price\|rating&cursor=&limit=20` → `{ "items": [...], "next_cursor": "..." }` |
| GET | `/catalog/prompts/{slug}` | opt | Публичные поля; `has_access: bool` при auth |
| GET | `/catalog/search` | opt | `?q=&offset=0&limit=20` → `{ "items": [...], "total": int }` |

**Response schema для `/catalog/prompts`:**
```json
{
  "items": [{
    "id": "uuid",
    "slug": "string",
    "title": "string",
    "short_description": "string",
    "ai_model": "string",
    "category": {"id": "int", "name": "string", "slug": "string"},
    "tags": ["string"],
    "price": "string (decimal)",
    "rating_avg": "string",
    "rating_count": "int",
    "purchases_count": "int",
    "seller": {"username": "string"},
    "has_access": "bool|null",
    "published_at": "ISO datetime"
  }],
  "next_cursor": "string|null"
}
```

### 10.6. Эндпоинты: Промпты (Seller)

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| POST | `/prompts/` | seller | Создание: `{ "title", "short_description", "ai_model", "category_id", "price", "instruction?" }` → `{ "id": "uuid", "slug": "..." }` |
| PATCH | `/prompts/{id}/` | seller | Редактирование (только DRAFT/REJECTED/ARCHIVED→DRAFT) |
| POST | `/prompts/{id}/submit/` | seller | DRAFT → SECURITY_SCAN |
| POST | `/prompts/{id}/appeal/` | seller | BLOCKED_BY_SECURITY → APPEAL_REQUESTED (запрос ручной проверки) |
| GET | `/prompts/{id}/content/` | buyer+access (JWT или `Api-Key`) | `{ "content": "string", "instruction": "string", "variables": [...] }`. Поддерживает `Authorization: Bearer <jwt>` и `Authorization: Api-Key ps_live_...` (M2M). |
| POST | `/prompts/{id}/examples/upload-url/` | seller | Получить presigned PUT URL → `{ "upload_url": "...", "object_key": "...", "ttl": 900 }`. TTL presigned URL: 15 мин. |
| POST | `/prompts/{id}/examples/confirm/` | seller | `{ "object_key": "..." }` — подтвердить загрузку. **Безопасность:** не доверять `HeadObject` (ContentType контролируется клиентом, возможна подмена MIME → XSS). Backend скачивает первые 2048 байт (`GetObject Range="bytes=0-2048"`), проверяет **magic bytes** (file signature) через `python-magic`; сопоставляет с whitelist `{image/jpeg, image/png, image/webp, image/gif}`. При несоответствии — удаляет файл из YOS + 422. Также: `ContentLength` ≤ 5 МБ. При успехе → создаёт `PromptOutputExample`. |
| DELETE | `/prompts/{id}/examples/{example_id}/` | seller | Удалить пример |

### 10.7. Эндпоинты: Платежи

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| POST | `/payments/create` | buyer | `{ "prompt_id": "uuid" }` → `{ "payment_url": "...", "purchase_id": "uuid" }`. **Идемпотентность PENDING:** если существует PENDING Purchase для этого buyer+prompt возрастом < 30 мин — возвращает его `payment_url` без создания нового (200). Если PENDING > 30 мин — отменяет старый (`status=CANCELLED`) и создаёт новый. |
| GET | `/payments/purchases/` | buyer | Список покупок с пагинацией (cursor) |
| GET | `/payments/purchases/{id}/` | buyer | Детали покупки |
| POST | `/library/acquire/` | buyer | `{ "prompt_id": "uuid", "captcha_token": "..." }` → `{ "access_id": "uuid" }` (200) |

### 10.8. Эндпоинты: Медиа

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| GET | `/media/private/{object_key}` | buyer+access | Стриминг приватного файла (≤10 МБ). Защита от path traversal: whitelist префиксов `prompts/`. |
| GET | `/media/presigned/{object_key}` | — | Presigned URL (TTL 1ч) только для публичных превью (whitelist: `prompts/*/examples/*`) |

### 10.9. Эндпоинты: Продавец (KYC + профиль)

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| POST | `/seller/kyc/` | seller | `{ "inn": "...", "legal_type": "IP\|SELF_EMPLOYED" }` → запуск Celery KYC-задачи → `{ "kyc_status": "PENDING" }`. Поведение в зависимости от текущего статуса: PENDING → 400 (проверка уже запущена), VERIFIED → 403 (уже верифицирован), REJECTED → 200 (повторная подача с новым ИНН, сбрасывает `kyc_rejection_reason`), CANCELLED → 200 (аналогично REJECTED). |
| GET | `/seller/profile/` | seller | Профиль + kyc_status, split_enabled |
| PATCH | `/seller/profile/` | seller | Обновление реквизитов Robokassa |
| GET | `/seller/analytics/` | seller | `?from=date&to=date` → `{ "views": int, "sales": int, "revenue": "decimal", "conversion": "decimal" }` |
| GET | `/seller/prompts/` | seller | Список своих промптов с cursor-пагинацией |

### 10.10. Эндпоинты: Модерация

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| GET | `/moderation/queue/` | moderator | `?type=PENDING_MODERATION\|PENDING_PLAGIARISM_REVIEW\|APPEAL_REQUESTED&cursor=&limit=20` → список промптов |
| GET | `/moderation/queue/{id}/` | moderator | Детали: метаданные промпта, для PLAGIARISM — список похожих с % |
| POST | `/moderation/queue/{id}/approve/` | moderator | Одобрить → APPROVED |
| POST | `/moderation/queue/{id}/reject/` | moderator | `{ "reason": "...(из справочника)", "comment": "..." }` → REJECTED |
| POST | `/moderation/queue/{id}/plagiarism-clear/` | moderator | → PUBLISHED |
| POST | `/moderation/queue/{id}/plagiarism-confirm/` | moderator | `{ "original_prompt_id": "uuid" }` → REJECTED |
| POST | `/moderation/queue/{id}/appeal-approve/` | moderator | APPEAL_REQUESTED → PENDING_MODERATION (ручной review, обход SECURITY_SCAN) |
| POST | `/moderation/queue/{id}/appeal-reject/` | moderator | APPEAL_REQUESTED → BLOCKED_BY_SECURITY |

### 10.11. Эндпоинты: Пользователь

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| GET | `/users/me/` | user | `{ "id", "email", "username", "role", "has_seller_profile": bool }` |
| GET | `/users/me/export` | user | JSON-архив всех данных |
| DELETE | `/users/me/` | user | Запуск `anonymize_account` |
| GET | `/users/me/favorites/` | user | Cursor-пагинация |
| POST | `/users/me/favorites/` | user | `{ "prompt_id" }` |
| DELETE | `/users/me/favorites/{prompt_id}` | user | — |
| GET | `/users/me/notifications/` | user | Cursor-пагинация, `?is_read=false` |
| POST | `/users/me/notifications/read/` | user | `{ "notification_ids": ["uuid"] }` → mark as read |
| GET | `/users/me/notification-settings/` | user | `{ "email_enabled": bool, "telegram_enabled": bool }` |
| PATCH | `/users/me/notification-settings/` | user | Изменить настройки |

### 10.12. Эндпоинты: Отзывы

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| POST | `/reviews/` | buyer+access | `{ "prompt_id", "rating" (1-5), "text?" }` |
| GET | `/reviews/?prompt_id={uuid}` | opt | Публичные отзывы промпта |

### 10.13. Webhook

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/webhooks/robokassa/` | Robokassa callback: проверка IP whitelist + подписи `SignatureValue` |

---

## 11. Интеграции

### 11.1. OAuth (Yandex, VK, Telegram)

| Провайдер | Регистрация | Redirect URI |
|-----------|-------------|--------------|
| Yandex ID | console.yandex.ru | `https://promptspace.ru/api/v1/auth/yandex/callback` |
| VK ID | vk.com/dev | `https://promptspace.ru/api/v1/auth/vk/callback` |
| Telegram | @BotFather | Login Widget, `auth_date` проверка (TTL: 86400 сек) |

**Связывание аккаунтов:**
1. OAuth callback получает `provider_id` и `email` (если предоставлен провайдером).
2. Если email предоставлен: ищем User по email. Если найден — привязываем `provider_id`. Если занят другим методом — ошибка «Аккаунт с этим email уже зарегистрирован».
3. **Если email не предоставлен провайдером** (VK может не давать email): ищем по `{provider}_id`. Если не найден — создаём новый User с `email = null`; при первом входе просим указать email.

### 11.2. Dadata (KYC)

- **API:** Dadata «Проверка самозанятого» / «Проверка ИП по ИНН».
- **Retry:** экспоненциальный backoff, max 3 попытки при 5xx/timeout.
- **Ошибки:** не найден/не НПД/не ИП → `kyc_status=REJECTED`, `kyc_rejection_reason`.
- **Жизненный цикл KYC:** Celery Beat `verify_active_kyc_status` (раз в 7 дней для VERIFIED продавцов). При потере статуса → `kyc_status=REJECTED`; уведомление продавцу; `on_kyc_rejected` аннулирует PENDING транзакции → `CANCELLED`.
- **Батчинг при массовой проверке:** задача `verify_active_kyc_status` не вызывает Dadata напрямую для каждого продавца. Вместо этого для каждого продавца планируется индивидуальная sub-задача `verify_single_seller_kyc` с задержкой `countdown=i * 0.5` секунды (i = порядковый номер). Это ограничивает нагрузку на Dadata API: при 1000 VERIFIED продавцах — 1 запрос / 0.5 с = 2 RPS (в пределах лимита Dadata).

```python
@shared_task(queue="default")
def verify_active_kyc_status():
    seller_ids = SellerProfile.objects.filter(
        kyc_status=KYCStatus.VERIFIED
    ).values_list("id", flat=True)
    for i, seller_id in enumerate(seller_ids):
        verify_single_seller_kyc.apply_async(args=[seller_id], countdown=i * 0.5)
```

### 11.3. Robokassa Split

- **Webhook:** `POST /api/webhooks/robokassa/`, `application/x-www-form-urlencoded`.
- **Проверка:** IP whitelist + `SignatureValue = MD5(password2 + ":" + InvId)`.
- **Идемпотентность webhook:** 1) проверить подпись; 2) найти Purchase по `robokassa_invoice_id`; 3) если уже SUCCESS → 200 OK без эффектов; 4) иначе → обновить статус + создать PromptAccess через `get_or_create`.
- **SuccessURL/FailURL:** `/payment/result?purchase_id={uuid}&status=success|fail`.

### 11.4. Интеграция KMS (HashiCorp Vault)

**Аутентификация Django → Vault: AppRole.** В production используется AppRole (не статичный Token). `VAULT_ROLE_ID` и `VAULT_SECRET_ID` передаются через env. Secret ID ротируется раз в 30 дней Celery Beat задачей `rotate_vault_secret_id`.

**Единый источник KEK:** Vault HA cluster — единственный KMS. Синхронизация KEK между провайдерами невозможна (ADR-012).

**Auto-Unseal:** Vault настроен на Transit Auto-Unseal через Yandex KMS. При рестарте узла Vault самостоятельно распечатывается без участия DevOps.

**Snapshot Backup:** ежедневные снапшоты Vault через Celery Beat задачу `backup_vault_snapshot`:
```bash
# ВАЖНО: не использовать /tmp/ — в контейнерах он может быть tmpfs или эфемерным.
# При OOM или перезапуске бэкап будет утерян. Использовать выделенный persistent volume.
vault operator raft snapshot save /vault/backups/vault_$(date +%Y%m%d).snap
# загрузка в YOS: s3://promptspace-backups/vault/
```
Монтирование: в docker-compose / Kubernetes — persistent volume на путь `/vault/backups/`. Retention: 30 дней. Тест восстановления — ежеквартально на staging.

**Ротация KEK:** при смене KEK — перешифрование всех DEK фоновой Celery-задачей. Старые ключи сохраняются в Vault до завершения миграции.

---

## 12. Frontend

### 12.1. Роутинг (Next.js App Router)

```
app/
├── (public)/
│   ├── page.tsx                    # /
│   ├── catalog/page.tsx            # /catalog
│   ├── category/[slug]/page.tsx    # /category/{slug}
│   ├── prompt/[slug]/page.tsx      # /prompt/{slug}
│   └── seller/[username]/page.tsx  # /seller/{username}
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx           # выбор: email или OAuth
├── (buyer)/
│   ├── library/page.tsx
│   └── purchases/page.tsx
├── (seller)/
│   ├── dashboard/page.tsx          # аналитика продавца
│   ├── prompts/page.tsx            # список промптов
│   ├── prompts/new/page.tsx        # создание
│   ├── prompts/[id]/edit/page.tsx  # редактирование
│   └── kyc/page.tsx                # KYC onboarding
├── (moderator)/
│   └── moderation/page.tsx         # очередь
└── legal/
    ├── privacy/page.tsx
    ├── terms/page.tsx
    └── dsr/page.tsx
```

> **Blog (`/blog/{slug}`):** вне MVP. Убран из роутинга.

### 12.2. Авторизация и JWT

- **Хранение:** Access token — в памяти (React state / Zustand); Refresh — HttpOnly cookie.
- **State management:** Zustand (глобальный auth store).
- **Refresh:** при 401 → `POST /auth/refresh` (cookie автоматически) → новый access → retry запроса. При неудаче → редирект на `/login`.
- **SSR:** для Server Components — Next.js route handler проксирует запросы к Django с cookie.

### 12.3. Server vs Client Components

- Каталог, карточки промптов, категории — Server Components (SSR для SEO).
- Фильтры, кнопки «Купить», «Получить», «В избранное», форма входа, дашборд продавца — Client Components.

### 12.4. Валидация и безопасность (Backend)

- **Рендеринг prompt content:** текст промпта отображается внутри `<pre>` — plain text. HTML и Markdown не интерпретируются. XSS недопустим.
- **Review, short_description:** escape HTML, max length (Review 2000, short_description 500).
- **Загрузка файлов:** лимит 5 МБ на файл, максимум 5 файлов на промпт. Допустимые MIME: `image/jpeg`, `image/png`, `image/webp`, `image/gif`. Загрузка через presigned PUT URL в YOS (минуя Django backend). **Валидация при confirm:** не доверять `ContentType` из S3 (контролируется клиентом). Использовать `GetObject Range="bytes=0-2048"` + проверку magic bytes (`python-magic`). При несоответствии — удаление файла, 422.
- **Длина промпта:** лимит `MAX_PROMPT_LENGTH` (50 000 символов, настраивается через env).
- **Path traversal:** `object_key` — валидация regex `^prompts/[0-9a-f-]+/examples/[0-9a-f-]+\.[a-z]+$`. Запрет `..`, абсолютных путей.

### 12.5. Performance & Media Optimization

**Modern Image Delivery Pipeline:**
- Оригиналы изображений (до 5 МБ) хранятся в YOS.
- Для вывода превью в каталоге и карточках — `next/image` или внешний сервис (imgproxy, Yandex Cloud Image Optimization).
- Обязательная генерация миниатюр (например, 400×400 для каталога) и конвертация в **WebP / AVIF** на лету с кэшированием на CDN.
- `loading="lazy"` для всех изображений, кроме Above the Fold (улучшение LCP).

**Code Minification & Bundling:**
- Next.js 15 компилятор **SWC** (Rust-based) — агрессивная минификация JS/CSS. Требование поисковиков для парсинга и рендеринга.
- **Tree Shaking:** строгий контроль импортов тяжёлых библиотек в Client Components; исключение неиспользуемого кода из бандла.
- Оптимизация шрифтов: `next/font` (самохостинг, предотвращение Layout Shift для CLS).

---

## 13. Структура репозитория

### 13.1. Дерево файлов

```
promptspace/
├── docs/
│   ├── runbook.md                  # обязательно до production
│   └── incident-notification-template.md
├── backend/
│   ├── config/  (settings: base, local, staging, production)
│   ├── apps/
│   │   ├── users/
│   │   ├── prompts/
│   │   ├── payments/
│   │   ├── reviews/
│   │   ├── notifications/
│   │   ├── audit/
│   │   └── moderation/
│   ├── api/v1/  (router, auth, prompts, payments, users, seller, moderation)
│   ├── api/webhooks/robokassa.py
│   ├── services/
│   │   ├── kms.py           # Vault AppRole client
│   │   ├── kyc.py           # Dadata
│   │   ├── payment.py       # Robokassa abstraction
│   │   ├── storage.py       # YOS / presigned URLs
│   │   ├── ratelimit.py
│   │   └── search/
│   │       ├── interfaces.py         # ISearchProvider
│   │       └── pgvector_provider.py  # PgVectorSearchProvider
│   ├── tasks/
│   │   ├── embeddings.py
│   │   ├── kyc.py
│   │   ├── notifications.py
│   │   ├── payments.py
│   │   ├── gdpr.py            # anonymize_account, process_dsr_request
│   │   ├── vault.py           # rotate_vault_secret_id, backup_vault_snapshot
│   │   └── audit.py           # archive_audit_logs
│   └── Dockerfile
├── frontend/
│   └── ... (Next.js App Router)
├── nginx/nginx.conf
├── pgbouncer/pgbouncer.ini
├── docker-compose.yml
├── docker-compose.staging.yml
├── docker-compose.prod.yml
└── .github/workflows/
    ├── ci.yml
    ├── deploy-staging.yml
    └── deploy-prod.yml
```

**Celery queues:** `default`, `embeddings` (CPU-heavy), `notifications` (email/tg), `payments` (Robokassa), `gdpr` (anonymize). Разделение предотвращает блокировку критичных задач тяжёлыми.

**ISearchProvider:** методы `index(prompt_id, embedding)`, `search(query_embedding, offset, limit)`, `delete(prompt_id)`. Реализация для pgvector — `PgVectorSearchProvider`; при переходе на Qdrant — `QdrantSearchProvider`.

### 13.2. Celery Beat расписание

Для хранения расписания в БД и управления через Django Admin используется `django-celery-beat`. Установка: `pip install django-celery-beat`; добавить `"django_celery_beat"` в `INSTALLED_APPS`; запускать beat с: `celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler`.

| Задача | Очередь | Расписание | Описание |
|--------|---------|------------|----------|
| `verify_active_kyc_status` | `default` | Каждые 7 дней (воскресенье 03:00 UTC) | Проверка KYC статуса VERIFIED продавцов |
| `aggregate_seller_stats` | `default` | Ежедневно 02:00 UTC | Агрегация SellerDailyStats |
| `archive_audit_logs` | `gdpr` | Ежемесячно (1-е число, 04:00 UTC) | Архивация AuditLog в YOS |
| `backup_vault_snapshot` | `default` | Ежедневно 01:00 UTC | Снапшот Vault в YOS |
| `rotate_vault_secret_id` | `default` | Каждые 30 дней | Ротация Vault AppRole Secret ID |
| `check_email_provider` | `notifications` | Каждые 5 минут | Проверка и сброс email-fallback |
| `expire_pending_purchases` | `payments` | Каждые 15 минут | Отмена PENDING Purchase старше 30 мин |

**`expire_pending_purchases`:** находит все `Purchase(status=PENDING, created_at__lt=now()-30min)` → переводит в `CANCELLED`. Предотвращает накопление "мёртвых" транзакций. Задача идемпотентна — повторный запуск безопасен.

---

## 14. ADR — Architecture Decision Records

---

**ADR-001: Zero Trust KMS — шифрование промптов через HashiCorp Vault**
**Status:** Accepted

**Context:** Промпты — интеллектуальная собственность авторов. Утечка БД не должна компрометировать контент. Нужно шифрование с управлением ключами, совместимое с 152-ФЗ (данные в РФ).

**Decision:** Envelope Encryption: DEK (AES-256-GCM) шифрует контент; KEK из HashiCorp Vault шифрует DEK. Vault развёрнут как HA-кластер в РФ.

**Options Considered:**

| Вариант | За | Против |
|---------|----|----|
| Vault (выбрано) | Open-source, HA, AppRole, Transit seal, audit log | Операционная сложность |
| Yandex KMS | Managed service, РФ | Не поддерживает экспорт ключей, нет failover KEK |
| Без KMS (ключи в env) | Просто | Ключи в env = утечка при компрометации конфига |

**Consequences:** Vault — критичная зависимость. Требует HA, backup, Auto-Unseal, мониторинг.

**Review date:** при появлении managed Vault в Yandex Cloud.

---

**ADR-002: pgvector для семантического поиска в MVP**
**Status:** Accepted

**Context:** Нужен векторный поиск для ~100k промптов. Два варианта: pgvector (in-process, PostgreSQL) vs Qdrant (отдельный сервис).

**Decision:** pgvector + HNSW-индекс для MVP. Слой изолирован интерфейсом `ISearchProvider`.

**Options Considered:**

| Вариант | За | Против |
|---------|----|----|
| pgvector (выбрано) | Нет нового сервиса, транзакционность | Деградация при >1M векторов |
| Qdrant | Оптимален при масштабе | Новый сервис, ops overhead для MVP |

**Consequences:** При достижении 5M промптов — плановая миграция на Qdrant через замену провайдера без изменений бизнес-логики.

**Review date:** при 5M промптов.

---

**ADR-003: Robokassa Split как единственный платёжный провайдер**
**Status:** Accepted

**Context:** Нужен сплит-платёж (платформа + автор) с поддержкой ИП/самозанятых, соответствие 54-ФЗ (в будущем), работа с РФ-банками.

**Decision:** Robokassa Split. Бизнес-логика работает с платформенным UUID (`Purchase.id`); `robokassa_invoice_id` инкапсулирован в payment service.

**Consequences:** Vendor risk митигирован абстракцией. Замена провайдера — изменение только `services/payment.py`.

---

**ADR-004: Инфраструктура для комплаенса 152-ФЗ**
**Status:** Accepted

**Context:** Платформа обрабатывает ПДн граждан РФ. Серверы и БД обязаны находиться в РФ.

**Decision:** Yandex Cloud / Selectel (РФ) для всех компонентов. Внешние API — только RF-compliant (Dadata, Unisender, YandexGPT). OpenAI и зарубежные embedding-провайдеры — запрещены.

---

**ADR-005: Next.js App Router с SSR**
**Status:** Accepted

**Context:** SEO критичен для маркетплейса (каталог, карточки — в поиске). Нужен SSR для публичных страниц.

**Decision:** Next.js 15 App Router. Server Components для каталога/карточек (SEO), Client Components для интерактива.

---

**ADR-006: Celery + Redis как брокер задач**
**Status:** Accepted

**Context:** Нужна асинхронная обработка: embedding-генерация, KYC, уведомления, GDPR-задачи.

**Decision:** Celery 5 + Redis (отдельная DB `redis://redis:6379/1` для брокера, `redis://redis:6379/0` для кеша). 5 именованных очередей для изоляции нагрузки.

**Consequences:** Redis — критичная зависимость. Production: Redis Sentinel / Cluster обязательны.

---

**ADR-007: Yandex Object Storage + проксирование приватных медиа**
**Status:** Accepted

**Context:** Хранение медиафайлов (примеры результатов). Приватные файлы доступны только при наличии PromptAccess.

**Decision:** YOS (S3-compatible). Публичные превью — presigned URL (TTL 1ч). Приватные — проксирование через Django с проверкой PromptAccess.

**Consequences:** Django-прокси добавляет latency; лимит ответа 10 МБ. Защита от path traversal — whitelist prefix `prompts/`.

---

**ADR-008: Email + Unisender + SMTP fallback для OTP**
**Status:** Accepted

**Context:** OTP-коды — единственный способ входа по email. Недоступность email-провайдера = полная блокировка входа.

**Decision:** Primary: Unisender API. Fallback: SMTP.ru (переключение автоматически при 3 consecutive ошибках Unisender → запись в Redis `email:provider:fallback`, TTL 30 мин). Celery Beat `check_email_provider` каждые 5 минут сбрасывает fallback при восстановлении.

---

**ADR-009: Rate Limiting (Nginx + Django)**
**Status:** Accepted

**Context:** Защита от brute-force, DDoS, парсинга.

**Decision:** Nginx `limit_req_zone` — первый уровень. Django-middleware — второй (детальные правила, Redis).

```nginx
limit_req_zone $binary_remote_addr zone=api_general:10m rate=60r/m;
limit_req_zone $binary_remote_addr zone=api_auth:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=api_search:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=api_acquire:10m rate=20r/m;

location /api/v1/auth/ { limit_req zone=api_auth burst=5 nodelay; }
location /api/v1/catalog/search { limit_req zone=api_search burst=10 nodelay; }
location /api/v1/library/acquire/ { limit_req zone=api_acquire burst=3 nodelay; }
location /api/ { limit_req zone=api_general burst=20 nodelay; }
```

---

**ADR-010: Backup с pgBackRest (PITR)**
**Status:** Accepted

**Context:** RPO=5 мин. Нужно point-in-time recovery.

**Decision:** pgBackRest с WAL archiving в YOS. `archive_timeout = 60` (фактический RPO ≤ 1 мин).

| Тип бэкапа | Частота | Retention |
|------------|---------|-----------|
| Full | Еженедельно | 4 недели |
| Differential | Ежедневно | 2 недели |
| WAL | Непрерывно | 2 недели |

**Consequences:** Алерт при lag >5 мин. Тест восстановления — ежеквартально.

---

**ADR-011: Staging + Feature Flags**
**Status:** Accepted

**Context:** Нужна среда для тестирования до production. Feature flags — для безопасного rollout.

**Decision:** `docker-compose.staging.yml`. CD: merge в `main` → auto-deploy на staging; tag `v*.*.*` + manual approve → deploy на production. Feature flags: env variable + Django Admin toggle.

---

**ADR-012: KMS — HashiCorp Vault как единственный источник KEK**
**Status:** Accepted (обновлено в v1.0)

HashiCorp Vault — единственный KMS. HA cluster. Circuit Breaker с failover на альтернативный KMS исключён: синхронизация KEK между Yandex KMS и Vault невозможна (Yandex KMS не поддерживает экспорт).

---

**ADR-013: Envelope Encryption**
**Status:** Accepted

Шифрование промпта — AES-256-GCM. DEK генерируется для каждого промпта; контент шифруется DEK; DEK шифруется KEK из Vault. Хранение: `encrypted_content`, `encrypted_dek`, `iv` (12 байт), `auth_tag` (16 байт). AAD = `prompt_id` (привязка к контексту).

---

**ADR-014: Защита от парсинга бесплатных промптов**
**Status:** Accepted

Обязательная капча (Turnstile / reCAPTCHA v3 / Yandex SmartCaptcha) для `POST /library/acquire/`. Без успешной валидации — 403. Rate limit (ADR-009) — дополнительный уровень.

---

**ADR-015: Django Ninja вместо Django REST Framework**
**Status:** Accepted

**Context:** Нужен API-фреймворк поверх Django для JSON REST API. Два зрелых варианта: DRF (Django REST Framework) и Django Ninja.

**Decision:** Использовать **Django Ninja** для всего API (`api/v1/`).

**Options Considered:**

| Вариант | За | Против |
|---------|----|----|
| **Django Ninja** (выбрано) | Type hints + Pydantic схемы; auto OpenAPI/Swagger; async views из коробки; лаконичный код; быстрее DRF в бенчмарках (~2–3×) | Меньшая экосистема сторонних пакетов; относительно молодой |
| Django REST Framework | Огромная экосистема; ViewSets/GenericViews; Browsable API; de-facto стандарт | Нет нативного Pydantic; OpenAPI — через drf-spectacular (дополнительная зависимость); boilerplate-heavy; нет async из коробки |

**Consequences:**
- Схемы запросов/ответов — Pydantic модели (единый источник валидации и документации)
- OpenAPI (`/api/v1/docs`) генерируется автоматически, без drf-spectacular
- Async endpoints возможны без дополнительных адаптеров
- CSRF-стратегия: Django Ninja отключает CSRF для API маршрутов по умолчанию — нужно явно описать обработку (см. раздел 25.7)

**Review date:** при необходимости миграции на async-first runtime (ASGI + async ORM).

---

## 15. Тестирование

### 15.1. Unit Tests (pytest)

**Покрытие:** ≥ 80% по всему коду. **Критические пути — 100%:**
- Envelope Encryption / расшифровка DEK
- `anonymize_account` (все 7 шагов)
- Purchase flow (PENDING → SUCCESS → PromptAccess)
- Webhook идемпотентность (повторный SUCCESS → no-op)
- KYC lifecycle (VERIFIED → periodic check → REJECTED → cancel PENDING purchases)
- Refresh token rotation (старый token аннулируется)
- SECURITY_SCAN retry limit (3 попытки → BLOCKED_BY_SECURITY)

**Моки:** `VaultMock` (возвращает фиксированный DEK), `RobokassaMock`, `DadataMock`, `UnisenderMock`, `YOSMock`.

### 15.2. Integration Tests (pytest-django)

| Тест | Инструмент |
|------|-----------|
| Robokassa webhook flow | Sandbox credentials в `.env.test` |
| Full purchase: PENDING → webhook → SUCCESS → PromptAccess | pytest-django + Robokassa sandbox |
| KYC: submit → Dadata verify → VERIFIED | Dadata sandbox |
| Celery tasks (sync mode) | `CELERY_TASK_ALWAYS_EAGER=True` |
| pgvector semantic search | PostgreSQL с pgvector в Docker |

### 15.3. E2E Tests (Playwright)

**Обязательные сценарии:**
1. Регистрация по email + OTP → покупка промпта → доступ к контенту
2. OAuth-вход (Yandex) → добавление в избранное
3. Seller: KYC submission → создание промпта → модерация → PUBLISHED
4. Moderator: просмотр очереди → approve → reject с причиной
5. PENDING_PLAGIARISM_REVIEW: moderator decides clear → PUBLISHED
6. Право на забвение: запрос → проверка анонимизации данных
7. Бесплатный промпт: капча → acquire → access
8. Refund: Superadmin action → проверка PromptAccess удалён

### 15.4. Security Testing

| Инструмент | Когда | Цель |
|-----------|-------|------|
| Bandit | CI (каждый push) | Python SAST |
| Semgrep | CI | Django-specific правила, injection |
| pip-audit | CI | Уязвимые зависимости |
| npm audit | CI | Frontend зависимости |
| **SBOM** | CI (deploy-prod) | Генерация Software Bill of Materials (CycloneDX/SPDX); прозрачность цепочки поставок |
| **Cosign/Sigstore** | CI (deploy-prod) | Криптографическое подписание Docker-образов; Production отклоняет неподписанные контейнеры |
| OWASP ZAP | Ручной на staging | DAST перед production release |

### 15.5. Load Testing (Locust / k6)

**Сценарии и пороги:**

| Сценарий | Нагрузка | Порог |
|----------|---------|-------|
| Catalog browse | 1000 RPS | p95 < 200ms |
| Semantic search | 100 RPS | p95 < 500ms |
| Purchase flow | 50 concurrent | p95 < 2s |
| Decrypt content (cache hit) | 500 RPS | p95 < 100ms |

Запускать перед каждым major release на staging с production-подобными данными.

---

## 16. Масштабирование и ограничения

| Метрика | MVP | Рост |
|---------|-----|------|
| Промпты | ~100k | >5M → Qdrant (через ISearchProvider) |
| Пользователи | ~5000 | horizontal scaling Django + PgBouncer |
| Latency поиска p95 | <200ms | |
| Latency расшифровки p95 | <500ms (без кеша), <100ms (с кешем DEK) | |
| Redis DEK cache TTL | 10 мин | |

**Горизонтальное масштабирование Django:** Nginx upstream с несколькими Gunicorn-инстансами. PgBouncer обязателен для pooling соединений к PostgreSQL.

**Celery масштабирование:** увеличение воркеров в очереди `embeddings` при росте публикаций. Очередь `gdpr` — отдельный воркер с низким приоритетом.

---

## 17. SEO и базовые страницы

Mobile-First, Core Web Vitals. Целевые значения: LCP < 2.5s, CLS < 0.1, INP < 200ms.

**Страницы:** `/`, `/catalog/`, `/category/{slug}/`, `/prompt/{slug}/`, `/seller/{username}/`, `/legal/*`.

**Sitemap:** динамическая генерация через Next.js Route Handler (`/sitemap.xml`). Включает все PUBLISHED промпты. Обновляется ISR (revalidate 3600).

**robots.txt:** разрешает индексацию `/`, `/catalog/`, `/prompt/`, `/category/`, `/seller/`. Запрещает: `/api/`, `/dashboard/`, `/library/`, `/moderation/`.

**Structured Data (JSON-LD):** на странице `/prompt/{slug}/` — schema `Product` с `name`, `description`, `offers` (price, currency). На главной — `WebSite` с `SearchAction`.

**Canonical URLs:** для каталога с фильтрами — canonical на `/catalog/` без параметров фильтрации.

**OG / Twitter Cards:** на каждой карточке промпта — `og:title`, `og:description`, `og:image` (первый пример результата или дефолтная обложка).

---

## 18. Инфраструктура и деплой

**CI:** push/PR → pytest + Bandit + Semgrep + pip-audit + ruff + mypy + docker build.

**CD Staging:** merge в `main` → автодеплой на staging (`docker-compose.staging.yml`). CORS для `staging.promptspace.ru`.

**CD Production:** tag `v*.*.*` → GitHub Actions ждёт manual approve (GitHub Environments: `production`) → deploy (`docker-compose.prod.yml`). **Обязательные шаги перед deploy:**
- Генерация **SBOM** (CycloneDX или SPDX) для backend и frontend; артефакт сохраняется в artifact registry.
- **Подписание Docker-образов** через Sigstore/Cosign; Kubernetes/Docker Swarm в Production настроен на политику `verify-image-signatures` — неподписанные образы не запускаются.

**Secrets в CI/CD:** все секреты — GitHub Secrets. Список обязательных: `VAULT_ROLE_ID`, `VAULT_SECRET_ID`, `DATABASE_URL_PROD`, `REDIS_URL_PROD`, `ROBOKASSA_*`, `SENTRY_DSN`, `YOS_*`, `DOCKER_REGISTRY_TOKEN`.

**Image tagging:** `{registry}/{app}:{git-sha}-{env}` + semver tag при release.

**Rollback procedure:** при неудачном деплое → `docker service update --rollback` (Swarm) или ручной откат к предыдущему image tag. Rollback БД: `migrate <app> <previous_migration>` — только после тестирования на staging.

**Миграции:** выполняются в Docker entrypoint до gunicorn (`migrate --noinput`). Политика: только вперёд. Откат — вручную, только после теста на staging.

**Zero-downtime migration rules:** стандартный `CREATE INDEX` берёт ACCESS EXCLUSIVE lock и блокирует таблицу на всё время построения. Для таблицы `prompts_prompt` с 100K строк это 30–120 сек downtime. Обязательные правила:

```python
# НЕБЕЗОПАСНО — блокирует таблицу:
migrations.AddIndex(model_name="prompt", index=models.Index(fields=["title"]))

# БЕЗОПАСНО — CONCURRENTLY не блокирует:
migrations.RunSQL(
    sql="CREATE INDEX CONCURRENTLY IF NOT EXISTS prompt_title_idx ON prompts_prompt (title);",
    reverse_sql="DROP INDEX CONCURRENTLY IF EXISTS prompt_title_idx;",
)

# НЕБЕЗОПАСНО — NOT NULL без DEFAULT переписывает все строки:
models.CharField(max_length=200, null=False)

# БЕЗОПАСНО — три миграции: 1) nullable, 2) backfill data, 3) set NOT NULL
```

Правило: любая миграция на таблицах `prompts_prompt`, `payments_purchase`, `users_user` объёмом >10K строк — обязательна проверка на staging с `EXPLAIN ANALYZE` и мониторинг lock wait time.

> **Внимание: PgBouncer `transaction` mode несовместим с `manage.py migrate`.** Django migrations используют DDL и advisory locks, которые требуют удержания соединения между командами — это невозможно в `transaction` mode. Для миграций использовать `DATABASE_DIRECT_URL` (прямое соединение с PostgreSQL, минуя PgBouncer). В `settings.py`:
> ```python
> DATABASES = {
>     "default": env.db("DATABASE_URL"),           # через PgBouncer (runtime)
>     "direct": env.db("DATABASE_DIRECT_URL"),      # напрямую (только для migrate)
> }
> ```
> Запуск: `python manage.py migrate --database=direct` или установить `DATABASE_DIRECT_URL` как `DATABASE_URL` только в entrypoint команды миграции.

**Сжатие трафика (Nginx):** обязательно включить **Brotli** (приоритетно) и **Gzip** для всех текстовых ответов API и статических ассетов (HTML, CSS, JS, JSON). Пример: `gzip on; gzip_types text/plain application/json application/javascript text/css; brotli on; brotli_types ...`. Улучшает LCP и TBT, соответствие требованиям поисковиков 2026.

**Confidential Computing:** worker-узлы Django и Celery (расшифровка промптов) — на Confidential VMs (AMD SEV / Intel TDX). См. раздел 8.1.

**PgBouncer:** `pool_mode = transaction`. `max_client_conn = 200`, `default_pool_size = 20`. Обязателен в production.

**Распределённая трассировка (OpenTelemetry):** использовать **OpenTelemetry (OTel)** — индустриальный стандарт 2026 для унифицированного сбора метрик, логов и трейсов. OTel прокидывает контекст запроса (trace_id, span_id) от Next.js через Nginx, Django, PgBouncer в Celery-воркеры и БД. Критично для отладки асинхронных потоков (оплата, возвраты, embeddings). Интеграция: `opentelemetry-sdk`, экспорт в Zabbix/Prometheus + Jaeger/Tempo. В structured logs — `trace_id`, `span_id`.

---

## 19. Переменные окружения

```bash
# Django
SECRET_KEY=
DEBUG=False
DJANGO_SETTINGS_MODULE=config.settings.production
ALLOWED_HOSTS=promptspace.ru,staging.promptspace.ru
DATABASE_URL=postgres://user:pass@pgbouncer:5432/dbname
DATABASE_DIRECT_URL=postgres://user:pass@postgres:5432/dbname  # прямое соединение для migrate
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1
CORS_ALLOWED_ORIGINS=https://promptspace.ru,https://staging.promptspace.ru

# Gunicorn
GUNICORN_WORKERS=4
GUNICORN_TIMEOUT=30

# KMS (HashiCorp Vault — AppRole)
VAULT_ADDR=
VAULT_ROLE_ID=
VAULT_SECRET_ID=
VAULT_MOUNT_PATH=          # путь к transit/keys

# Robokassa
ROBOKASSA_LOGIN=
ROBOKASSA_PASSWORD1=
ROBOKASSA_PASSWORD2=
ROBOKASSA_IP_WHITELIST=    # comma-separated

# Dadata
DADATA_API_KEY=
DADATA_SECRET_KEY=

# OAuth
YANDEX_CLIENT_ID=
YANDEX_CLIENT_SECRET=
VK_CLIENT_ID=
VK_CLIENT_SECRET=
TELEGRAM_BOT_TOKEN=
TELEGRAM_ENABLED=true           # false — отключить Telegram-канал глобально (graceful degradation)

# Email / OTP
UNISENDER_API_KEY=
SMTPRU_HOST=
SMTPRU_PORT=
SMTPRU_USER=
SMTPRU_PASSWORD=

# Yandex Object Storage
YOS_ACCESS_KEY=
YOS_SECRET_KEY=
YOS_BUCKET=
YOS_BACKUP_BUCKET=
YOS_ENDPOINT=storage.yandexcloud.net

# Embeddings
EMBEDDING_PROVIDER=yandex
EMBEDDING_DIMENSIONS=1024
YANDEX_EMBEDDING_FOLDER_ID=
YANDEX_EMBEDDING_API_KEY=

# AI Security Scan
SECURITY_SCAN_PROVIDER=
SECURITY_SCAN_API_KEY=
SECURITY_SCAN_API_URL=

# Captcha (ADR-014)
CAPTCHA_PROVIDER=turnstile|recaptcha|yandex_smartcaptcha
CAPTCHA_SECRET_KEY=

# Business
PLATFORM_COMMISSION_RATE=0.20   # default 20%, range 0.00–0.50
MAX_PROMPT_LENGTH=50000

# Celery
CELERY_CONCURRENCY=4

# OpenAPI docs (H-8: отключить в production)
DJANGO_NINJA_DOCS_URL=          # пусто = docs отключены; /api/v1/docs для staging

# Monitoring
SENTRY_DSN=
TELEGRAM_ALERT_BOT_TOKEN=
TELEGRAM_ALERT_CHAT_ID=
ZABBIX_AGENT_HOST=
ZABBIX_SERVER=
```

---

## 20. Мониторинг и алерты

### 20.1. Метрики надёжности (SLA)

| Метрика | Значение |
|---------|---------|
| **RPO** | 5 мин (WAL archiving; фактически ≤ 1 мин при `archive_timeout=60`) |
| **RTO PostgreSQL** | 4 ч (failover + restore) |
| **RTO Vault** | 1 ч (HA auto-unseal; restore из снапшота) |
| **RTO Redis** | 30 мин (перезапуск + прогрев кеша) |
| **RTO Full App** | 2 ч |
| **Uptime target** | 99.5% (monthly) |

### 20.2. Таблица алертов

| Алерт | Условие | Действие |
|-------|---------|----------|
| Бэкап | >25 ч с последнего | Telegram → проверка pgBackRest |
| WAL lag | >5 мин | Telegram → проверка `archive_command` |
| Vault недоступен | ошибка DEK decrypt | Telegram → `docs/runbook.md#vault` |
| Redis недоступен | connect timeout | Telegram → перезапуск, проверка Sentinel |
| Unisender error | 3 consecutive 5xx | Telegram → fallback SMTP активирован |
| PostgreSQL connections | >80% max_connections | Telegram |
| Celery queue critical | длина >100 | Telegram |
| HTTP 5xx rate | >1% за 5 мин | Telegram + Sentry |
| Sentry error rate | >10 new errors/min | Telegram |
| SECURITY_SCAN failures | >10 за час | Telegram (возможна атака) |
| KYC rejection spike | >5 за час | Telegram |

**Error tracking:** Sentry SDK в Django и Next.js. DSN через env. Sentry алертирует при новых ошибках и spike'ах. **OpenTelemetry:** trace_id/span_id в логах и Sentry — корреляция запросов при расследовании инцидентов.

### 20.3. Бизнес-метрики

Celery Beat агрегация, ежедневно:
- Количество покупок и сумма GMV
- Количество опубликованных промптов
- KYC conversion rate
- Регистрации по методам входа

**Runbook:** `docs/runbook.md` — шаги реагирования на каждый алерт. Обязателен до production.

---

## 21. Открытые вопросы и риски

### 21.1. Закрытые решения

| Вопрос | Решение |
|--------|---------|
| Чеки 54-ФЗ | Вне MVP; данные для будущей интеграции с ОФД сохраняются |
| i18n | MVP — только русский, только RUB |
| Повторная покупка | Редирект в библиотеку, без нового Purchase |
| Один user — buyer и seller | Наличие SellerProfile; история покупок сохраняется |
| Идемпотентность library/acquire | `get_or_create(buyer, prompt)` |
| Blog | **Вне MVP.** Убран из роутинга и SEO. |
| Refresh token | Одноразовый (rotation) |
| ARCHIVED → re-publish | → DRAFT, затем повторная отправка на модерацию |

### 21.2. Матрица рисков

| ID | Риск | Severity | Митигация |
|----|------|----------|-----------|
| R0 | **Vault data loss (KEK недоступен навсегда)** | **Critical** | Ежедневные снапшоты в YOS (retention 30 дней); HA кластер; тест восстановления ежеквартально |
| R1 | Vault временно недоступен | High | DEK-кеш Redis 10 мин + HA кластер Vault |
| R2 | Redis SPOF | High | Production: Redis Sentinel / Cluster. Staging — одиночный инстанс. |
| R3 | Thundering herd на Vault | Medium | DEK-кеш TTL 10 мин |
| R4 | Дубли webhook Robokassa | High | Идемпотентность: `select_for_update()` + статус-проверка |
| R5 | Dadata API недоступен | Medium | Retry экспоненциальный, max 3; ручная верификация Superadmin |
| R6 | HNSW деградация при росте | Low | Celery Beat перестройка; при >5M → Qdrant |
| R7 | Unisender недоступен | Medium | Auto-fallback на SMTP.ru |
| R8 | Vendor lock-in Robokassa | Medium | Абстракция `services/payment.py`, платформенный UUID |
| R9 | Path traversal через object_key | High | Regex whitelist, запрет `..` |
| R10 | DDoS на семантический поиск | Medium | Rate limit api_search (ADR-009); WAF; Nginx burst limit |
| R11 | Массовая регистрация ботов | Medium | Captcha при регистрации (в MVP — только на acquire); rate limit api_auth |
| R12 | Embedding API (YandexGPT) недоступен длительно | High | Retry max 5 попыток + exponential backoff → `EMBEDDING_FAILED`; алерт в Sentry + Telegram; Superadmin action "Retry embedding"; продавец уведомлён. Промпты в `APPROVED`/`EMBEDDING_FAILED` не блокируют платформу — они просто не появляются в поиске. |

---

## 22. Глоссарий и соглашения

| Термин | Значение |
|--------|----------|
| Purchase | Транзакция оплаты; платформенный UUID = `Purchase.id` |
| PromptAccess | Право пользователя на расшифровку промпта (платно или бесплатно) |
| DEK | Data Encryption Key — ключ шифрования одного промпта; зашифрован KEK в Vault |
| KEK | Key Encryption Key — мастер-ключ в HashiCorp Vault |
| AAD | Additional Authenticated Data — `prompt_id` в GCM, предотвращает подмену |
| JTI | JWT ID — уникальный идентификатор токена для blacklist |
| HNSW | Hierarchical Navigable Small World — алгоритм ANN-индекса в pgvector |
| ISearchProvider | Интерфейс абстракции векторного поиска (`index`, `search`, `delete`) |
| Slug | Человекочитаемый URL-идентификатор промпта (уникальный, не меняется после создания) |
| object_key | Путь в YOS; формат `prompts/{prompt_id}/examples/{uuid}.{ext}` |
| SECURITY_SCAN | Автопроверка промпта на Prompt Injection, Jailbreaks, токсичность |
| PENDING_PLAGIARISM_REVIEW | Промпт на ручной проверке (сходство >95% с опубликованными) |
| APPEAL_REQUESTED | Продавец оспорил BLOCKED_BY_SECURITY → в очереди модератору |
| content_hash | SHA-256(decrypted_content + seller_inn + published_at) — Digital Provenance, доказательство первенства публикации |
| AppRole | Метод аутентификации Vault: `role_id` + `secret_id` вместо статичного токена |
| Auto-Unseal | Vault автоматически распечатывается при рестарте через Transit KMS (Yandex KMS) |
| PgBouncer | Connection pooler для PostgreSQL; работает в режиме `transaction` |
| DSR | Data Subject Request — запрос субъекта ПДн (152-ФЗ) |
| Celery Beat | Планировщик периодических Celery-задач (аналог cron) |
| SiteSettings | Django-модель для хранения бизнес-конфигурации (комиссия, флаги) |

---

## 23. Система уведомлений

### 23.1. Принципы и каналы

**Три уровня уведомлений (в порядке надёжности):**

| Уровень | Канал | Доступность | Содержит ПДн |
|---------|-------|-------------|--------------|
| **L1 — In-app** | `Notification` запись в БД | Всегда | Да (полный контекст) |
| **L2 — Email** | Unisender API → SMTP.ru fallback | Высокая | Да |
| **L3 — Telegram** | Telegram Bot API | Опциональный | **Нет** (generic-текст) |

**Ключевые принципы:**
- **In-app (L1) создаётся всегда**, независимо от состояния внешних каналов. Пользователь всегда может увидеть уведомления через UI.
- **Email (L2) — основной push-канал**, обязателен для критичных событий.
- **Telegram (L3) — дополнительный convenience-канал**. Управляется `TELEGRAM_ENABLED` (env-flag). При `false` или недоступности Bot API — graceful degradation: L1 + L2 продолжают работу без изменений.
- **Telegram не содержит ПДн**: тело любого Telegram-сообщения — только generic текст типа «Есть новое уведомление на PromptSpace». Детали — на сайте.

### 23.2. Архитектура: INotificationChannel

Все каналы реализуют единый интерфейс. Добавление нового канала (VK Notify, Web Push) — новый класс без изменений бизнес-логики:

```python
# notifications/channels/base.py
from abc import ABC, abstractmethod

class INotificationChannel(ABC):
    """Интерфейс канала доставки уведомлений."""

    @abstractmethod
    def is_available(self) -> bool:
        """True если канал активен и пользователь его включил."""
        ...

    @abstractmethod
    def send(self, user, notification_type: str, context: dict) -> bool:
        """Отправить уведомление. Возвращает True при успехе."""
        ...


# notifications/channels/email_channel.py
class EmailChannel(INotificationChannel):
    def is_available(self, user) -> bool:
        return bool(user.email) and user.notification_settings.email_enabled

    def send(self, user, notification_type, context) -> bool:
        # Unisender API → SMTP fallback
        template = render_template(f"notifications/{notification_type}.html", context)
        return email_service.send(user.email, template)


# notifications/channels/telegram_channel.py
class TelegramChannel(INotificationChannel):
    GENERIC_TEXT = "Новое уведомление на PromptSpace → {url}"  # БЕЗ ПДн в тексте

    def is_available(self, user) -> bool:
        return (
            settings.TELEGRAM_ENABLED  # глобальный feature flag
            and user.notification_settings.telegram_enabled
            and bool(user.notification_settings.telegram_chat_id)
        )

    def send(self, user, notification_type, context) -> bool:
        text = self.GENERIC_TEXT.format(url="https://promptspace.ru/notifications/")
        return telegram_bot.send_message(
            chat_id=user.notification_settings.telegram_chat_id,
            text=text,
        )
```

**Регистр каналов** (приоритет: Email всегда, Telegram — если доступен):
```python
NOTIFICATION_CHANNELS: list[type[INotificationChannel]] = [
    EmailChannel,
    TelegramChannel,
]
```

### 23.3. Подключение Telegram (onboarding пользователя)

Чтобы получать Telegram-уведомления, пользователь:
1. Открывает `@PromptSpaceBot` и отправляет `/start` → бот получает `chat_id`.
2. Бот выдаёт одноразовый токен привязки (TTL 10 мин, хранится в Redis: `tg:link:{token}:{user_id}`).
3. Пользователь вводит токен в настройках профиля → `PATCH /users/me/notification-settings/` с `{ "telegram_link_token": "..." }`.
4. Backend верифицирует токен → записывает `NotificationSettings.telegram_chat_id`.

Для отключения: `PATCH /users/me/notification-settings/ { "telegram_enabled": false }`. Полный отвязать: `DELETE /users/me/telegram-link/`.

**NotificationSettings модель** — дополнение:
```python
class NotificationSettings(models.Model):
    user = models.OneToOneField(User, ...)
    email_enabled = models.BooleanField(default=True)
    telegram_enabled = models.BooleanField(default=False)
    telegram_chat_id = models.CharField(max_length=50, blank=True)  # Telegram chat_id — не ПДн
```

### 23.4. Каталог уведомлений

| Тип | Триггер | L1 (in-app) | L2 (Email) | L3 (Telegram) |
|-----|---------|-------------|------------|---------------|
| `PURCHASE_SUCCESS` | Buyer: оплата прошла | ✅ | ✅ обязательно | ✅ generic push |
| `PURCHASE_REFUNDED` | Buyer: возврат выполнен | ✅ | ✅ | — |
| `SALE_COMPLETED` | Seller: новая продажа | ✅ | ✅ | ✅ generic push |
| `SALE_REFUNDED` | Seller: Refund на продажу | ✅ | ✅ | — |
| `PROMPT_PUBLISHED` | Seller: промпт опубликован | ✅ | ✅ | — |
| `PROMPT_REJECTED` | Seller: промпт отклонён | ✅ | ✅ | — |
| `PROMPT_SECURITY_FAILED` | Seller: FAILED_SECURITY_SCAN | ✅ | ✅ | — |
| `PROMPT_PLAGIARISM_REVIEW` | Seller: PENDING_PLAGIARISM_REVIEW | ✅ | ✅ | — |
| `PROMPT_PLAGIARISM_CLEARED` | Seller: плагиат не подтверждён | ✅ | ✅ | — |
| `PROMPT_PLAGIARISM_REJECTED` | Seller: плагиат подтверждён | ✅ | ✅ | — |
| `KYC_VERIFIED` | Seller: KYC верифицирован | ✅ | ✅ | — |
| `KYC_REJECTED` | Seller: KYC отклонён | ✅ | ✅ обязательно | — |
| `KYC_STATUS_LOST` | Seller: статус НПД/ИП потерян | ✅ | ✅ обязательно | ✅ generic push |
| `ACCOUNT_DELETED` | User: анонимизация завершена | — | ✅ (если email есть) | — |

**Обязательные типы** (нельзя отключить через настройки): `PURCHASE_SUCCESS`, `KYC_REJECTED`, `KYC_STATUS_LOST`.

### 23.5. Настройки opt-in/opt-out

Пользователь управляет каналами через `/users/me/notification-settings/`. Telegram — только opt-in (по умолчанию выключен, требует привязки bot). Отключение типов уведомлений через `?types[]=PROMPT_PUBLISHED` — для необязательных типов.

### 23.6. Процесс доставки и graceful degradation

Celery-задача `send_notification(user_id, notification_type, context, request_id=None)`:

```
1. Создать Notification (in-app, L1) — всегда, даже если все внешние каналы упали
2. Для каждого канала в NOTIFICATION_CHANNELS:
   a. channel.is_available(user) → False? → пропустить
   b. channel.send(...) → исключение или False? → retry до 3 раз, затем Sentry alert
   c. Ошибка одного канала не прерывает доставку другим каналам
3. Если Telegram Bot API недоступен (timeout / 5xx):
   → log warning + Sentry breadcrumb
   → Email доставлен нормально
   → In-app доставлен нормально
   → Никакого user-visible сбоя
```

**Глобальное отключение Telegram:** `TELEGRAM_ENABLED=false` в env → `TelegramChannel.is_available()` возвращает `False` для всех пользователей → ноль вызовов Bot API → Email + in-app работают без изменений. Переключение без перезапуска: значение читается из `SiteSettings` (кешируется Redis 60 сек), изменяется в Django Admin.

---

## 24. Disaster Recovery Plan

### 24.1. RTO и RPO по компонентам

| Компонент | RPO | RTO | Тип сбоя |
|-----------|-----|-----|---------|
| PostgreSQL | ≤ 1 мин (WAL) | 4 ч | Node failure / data corruption |
| Vault | ~0 (HA cluster) | 1 ч | Cluster failure / snapshot restore |
| Redis | N/A (reconstruction) | 30 мин | Node failure |
| Yandex Object Storage | SLA провайдера | N/A | Managed service |
| Django / Next.js | N/A (stateless) | 15 мин | Container restart |

### 24.2. Процедура: PostgreSQL failover

**Сценарий:** primary недоступен, replica в наличии.

1. Проверить: `pg_is_in_recovery()` на replica → `true` — готова к промоуту.
2. Промоут: `pg_ctl promote -D /var/lib/postgresql/data` (или `SELECT pg_promote()`).
3. Обновить `DATABASE_URL` в env (через секреты) → перезапустить Django + Celery.
4. Проверить алерты: connection count, replication lag (теперь нет replica → настроить мониторинг).
5. После восстановления primary: настроить как replica нового primary.

**Сценарий:** нет replica, нужен restore из бэкапа.

1. Развернуть новый PostgreSQL инстанс.
2. `pgbackrest --stanza=main restore` — восстановление из последнего full + WAL.
3. Обновить `DATABASE_URL` → перезапустить сервисы.
4. Проверить целостность: `SELECT count(*) FROM prompts; SELECT count(*) FROM purchases;`.

### 24.3. Процедура: Vault restore из снапшота

**Применяется:** полная потеря HA кластера (все узлы недоступны).

1. Развернуть новый Vault кластер (HA, 3 узла).
2. Инициализировать: `vault operator init` (при Auto-Unseal — автоматически).
3. Восстановить снапшот: `vault operator raft snapshot restore /vault/backups/vault_latest.snap` (с persistent volume или скопировав из YOS в этот путь).
4. Проверить Transit ключи: `vault list transit/keys`.
5. Обновить `VAULT_ADDR` в env → перезапустить Django.
6. Проверить расшифровку: тестовый запрос `GET /prompts/{id}/content/`.

> **Внимание:** Auto-Unseal через Yandex KMS требует доступности Yandex KMS при restore. Убедиться в наличии Yandex KMS в RTO-window.

### 24.4. Процедура: Redis rebuild

Redis не хранит долгосрочных данных (всё в PostgreSQL/Vault). При полной потере:

1. Перезапустить Redis (новый инстанс или восстановление Sentinel).
2. Django автоматически начинает работать (DEK кеш будет промахами → обращения к Vault).
3. Celery начнёт обрабатывать задачи после восстановления соединения.
4. Проверить: `redis-cli ping` → `PONG`; длина очередей Celery.

### 24.5. Runbook (структура `docs/runbook.md`)

```markdown
# Runbook PromptSpace

## Vault недоступен
Алерт: "Vault недоступен | ошибка DEK decrypt"
1. Проверить: `vault status` на каждом узле
2. Если sealed: Auto-Unseal должен сработать автоматически (Yandex KMS)
3. Если network: проверить Security Groups / VPC routes
4. Если кластер потерян: см. DR Plan 24.3
Эскалация: @devops-lead в Telegram
RTO: 1 ч

## Redis недоступен
...

## PostgreSQL недоступен
...

## Robokassa webhook не приходит
...
```

---

## 25. Соглашения по реализации

Этот раздел фиксирует соглашения, которые должны соблюдаться во всём бэкенд-коде. Они устраняют частые классы ошибок, выявленные при ревью.

### 25.1. BinaryField → всегда явный `bytes()`

Django `BinaryField` при чтении возвращает `memoryview`, не `bytes`. Передача `memoryview` в криптографические функции (`AES`, `hmac`) вызывает `TypeError` в runtime — ошибка непредсказуемо всплывает только при первом чтении записи из БД.

```python
# НЕПРАВИЛЬНО — TypeError при передаче в cryptography
cipher.decrypt(prompt.encrypted_content)

# ПРАВИЛЬНО — всегда явное приведение
cipher.decrypt(bytes(prompt.encrypted_content))
iv = bytes(prompt.iv)
auth_tag = bytes(prompt.auth_tag)
dek = bytes(prompt.encrypted_dek)
```

**Правило:** в любом месте кода, где читается `BinaryField`, немедленно оборачивать в `bytes()`.

### 25.2. Счётчики — только через `F()`

Инкремент/декремент счётчиков (`purchases_count`, `views_count`, `rating_count`) выполнять исключительно через `F()` выражения Django ORM. Прямое присвоение `obj.counter += 1` создаёт race condition при конкурентных запросах.

```python
# НЕПРАВИЛЬНО — race condition
prompt.purchases_count += 1
prompt.save()

# ПРАВИЛЬНО — атомарное обновление на уровне БД
from django.db.models import F
Prompt.objects.filter(pk=prompt.pk).update(purchases_count=F("purchases_count") + 1)
```

### 25.3. Разрешения в Django Ninja

Используется декоратор-based подход с кастомными `Auth` классами Django Ninja. Паттерн:

```python
from ninja.security import HttpBearer
from ninja import Router

class BuyerAuth(HttpBearer):
    def authenticate(self, request, token: str):
        user = decode_jwt(token)
        if not user or not user.is_active:
            return None
        if not PromptAccess.objects.filter(buyer=user, prompt_id=request.resolver_match.kwargs["id"]).exists():
            return None
        return user

router = Router()

@router.get("/{id}/content/", auth=BuyerAuth())
def get_prompt_content(request, id: UUID):
    ...
```

Для проверок типа `is_seller` — проверять наличие `SellerProfile` и `kyc_status=VERIFIED`.

### 25.4. Транзакционные границы

Операции, затрагивающие несколько моделей, оборачивать в `transaction.atomic()`:

```python
from django.db import transaction

@transaction.atomic
def process_purchase_success(purchase_id: UUID):
    purchase = Purchase.objects.select_for_update().get(pk=purchase_id)
    if purchase.status != PurchaseStatus.PENDING:
        return  # идемпотентность
    purchase.status = PurchaseStatus.SUCCESS
    purchase.paid_at = now()
    purchase.save()
    PromptAccess.objects.get_or_create(buyer=purchase.buyer, prompt=purchase.prompt, purchase=purchase)
    Prompt.objects.filter(pk=purchase.prompt_id).update(purchases_count=F("purchases_count") + 1)
    # уведомления — ПОСЛЕ commit транзакции, через Celery
```

Celery-задачи для уведомлений запускать через `transaction.on_commit()`, чтобы они не стартовали до завершения транзакции.

### 25.5. Celery Beat — только `django-celery-beat`

В production **не использовать** статичный файл расписания (`beat_schedule` в `settings.py`). Причина: при горизонтальном масштабировании несколько beat-процессов дублируют задачи.

Использовать `django-celery-beat` с `DatabaseScheduler` — расписание хранится в БД, редактируется через Django Admin, beat-lock предотвращает дублирование при нескольких воркерах.

### 25.6. Метод аутентификации Vault — только AppRole в production

Никогда не использовать статичный `VAULT_TOKEN` в production. `VAULT_TOKEN` допустим только в local development (`docker-compose.yml`). В staging и production — AppRole (`VAULT_ROLE_ID` + `VAULT_SECRET_ID`).

`VAULT_SECRET_ID` хранится в GitHub Secrets и передаётся в контейнер через env. Не логировать и не выводить Secret ID ни при каких обстоятельствах.

### 25.7. CSRF стратегия (H-2)

Django Ninja отключает CSRF-проверку для API endpoints по умолчанию (используется Bearer-токен). Это корректно, но при `SameSite=Lax` refresh cookie требует явного описания политики:

| Endpoint | Auth | CSRF риск | Защита |
|----------|------|-----------|--------|
| `/auth/refresh` | cookie | Теоретически — cross-site form POST | `SameSite=Lax` блокирует AJAX cross-origin POST |
| `/library/acquire/` | bearer | Нет | captcha_token = одноразовый CSRF-заменитель |
| `/webhooks/robokassa/` | — | Нет (проверка подписи Robokassa) | SignatureValue |
| Все остальные API | bearer | Нет (Bearer не передаётся браузером автоматически) | — |

**Правило:** если в будущем добавляется endpoint, использующий **только cookie** без Bearer — обязательно добавить Django CSRF middleware для этого маршрута или использовать Double Submit Cookie pattern.

### 25.8. Обязательный порядок операций при расшифровке промпта (H-4)

Порядок строго соблюдается во всех view и тестах. Нарушение порядка — race condition при concurrent Refund + content request:

```
1. Получить prompt = Prompt.objects.get(pk=prompt_id, status="PUBLISHED")
   └─ Если нет → 404

2. Проверить PromptAccess.objects.filter(buyer=user, prompt=prompt).exists()
   └─ Если нет → 403
   ✅ ТОЛЬКО ПОСЛЕ этой проверки переходить к DEK

3. dek = redis.get(f"dek:{prompt_id}")
   └─ Если нет в кеше → vault.decrypt(bytes(prompt.encrypted_dek))
   └─ Положить в кеш: redis.set(f"dek:{prompt_id}", dek, ex=600)

4. plaintext = aes_gcm_decrypt(
       key=dek,
       ciphertext=bytes(prompt.encrypted_content),
       iv=bytes(prompt.iv),
       auth_tag=bytes(prompt.auth_tag),
       aad=str(prompt.id).encode(),
   )

5. Вернуть plaintext
```

DEK никогда не читается из кеша до подтверждения PromptAccess. При Refund: PromptAccess удаляется → следующий запрос на шаг 2 получит 403, даже если DEK ещё в Redis.

### 25.9. N+1 запросы в каталоге (M-4)

Catalog queryset без явного prefetch = N+1 SQL запросов. Обязательный шаблон:

```python
# ВСЕГДА для /catalog/prompts и /seller/prompts:
Prompt.objects.filter(status=PromptStatus.PUBLISHED) \
    .select_related("seller", "category") \
    .prefetch_related("tags") \
    .order_by(...)

# Для одиночного промпта с примерами:
Prompt.objects.select_related("seller", "category") \
    .prefetch_related("tags", "examples") \
    .get(slug=slug)
```

Правило: любой queryset, возвращающий список промптов, обязан иметь `select_related` + `prefetch_related`. Проверяется в code review через `django-silk` на staging (логирует N+1) или `assertNumQueries` в тестах.

### 25.10. Политика ротации секретов (M-7)

| Секрет | Частота | Побочный эффект | Процедура |
|--------|---------|-----------------|-----------|
| `VAULT_SECRET_ID` | 30 дней (авто, Celery Beat) | — | `rotate_vault_secret_id` задача |
| `SECRET_KEY` | При компрометации / 1 год | **Mass logout** (все JWT invalid) | Grace period 15 мин: поддерживать старый + новый ключ одновременно через `SECRET_KEY_FALLBACKS` (список) |
| `ROBOKASSA_PASSWORD2` | При компрометации | Webhook подписи невалидны | Обновить в кабинете Robokassa + env + перезапустить |
| OAuth client secrets | При компрометации | OAuth сессии прерываются | Обновить в консоли провайдера + env |
| `DATABASE_PASSWORD` | 1 год (или при компрометации) | Кратковременная недоступность | PgBouncer hot-reload: `pgbouncer -R` + обновить env |

**`SECRET_KEY` ротация без mass logout:**
```python
# settings.py — поддержка двух ключей в период ротации (до 15 мин)
SECRET_KEY = env("SECRET_KEY")                        # новый ключ
SECRET_KEY_FALLBACKS = [env("SECRET_KEY_OLD", "")]    # старый ключ
```
PyJWT 2.x не поддерживает `SECRET_KEY_FALLBACKS` напрямую — реализовать через try/except при верификации: сначала пробовать новый ключ, при `InvalidSignatureError` — старый.

---


*Следующая ревизия при достижении 5M промптов или изменении платёжного провайдера.*