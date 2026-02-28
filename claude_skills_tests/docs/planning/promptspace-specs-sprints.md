# PromptSpace — Спецификации и спринты

<!--
  Статус:   📋 Planning
  Версия:   1.0
  Дата:     2026-02-28
  Источник: promptspace-release.md v2.3
  Команда:  2 backend + 1 frontend + 0.5 devops
-->

> [!IMPORTANT]
> Этот документ является рабочим планом реализации на основе `promptspace-release.md v2.3`.
> Каждая спецификация ссылается на разделы основного документа.
> MVP = 6 спринтов × 2 недели = **12 недель**.

---

## Содержание

1. [Обзор архитектуры спринтов](#1-обзор-архитектуры-спринтов)
2. [Доменные спецификации](#2-доменные-спецификации)
   - SPEC-001: Инфраструктура
   - SPEC-002: Аутентификация
   - SPEC-003: Каталог и публичные страницы
   - SPEC-004: Промпты + Шифрование
   - SPEC-005: Платежи (Robokassa Split)
   - SPEC-006: KYC (Dadata)
   - SPEC-007: Семантический поиск
   - SPEC-008: Уведомления
   - SPEC-009: Модерация
   - SPEC-010: Безопасность + GDPR
   - SPEC-011: Мониторинг и обсёрвабилити
   - SPEC-012: Производительность и запуск
   - SPEC-013: Agentic AI (API Keys)
3. [Детальные спринты](#3-детальные-спринты)
4. [Матрица зависимостей](#4-матрица-зависимостей)
5. [Критический путь](#5-критический-путь)

---

## 1. Обзор архитектуры спринтов

```
Sprint 0  [Нед 1–2]   ████ Инфраструктура
Sprint 1  [Нед 3–4]   ████ Auth + Каталог
Sprint 2  [Нед 5–6]   ████ Промпты + Платежи
Sprint 3  [Нед 7–8]   ████ Поиск + Уведомления
Sprint 4  [Нед 9–10]  ████ Модерация + Безопасность
Sprint 5  [Нед 11–12] ████ Перф + Запуск
```

**Стек:** Django 5 · Django Ninja · Next.js 15 · PostgreSQL 16 + pgvector · Redis 7 · Celery 5 · HashiCorp Vault HA · Yandex Object Storage · Robokassa Split · YandexGPT Embeddings v3

**Definition of Done (применяется к каждой задаче):**
- [ ] Код написан и прошёл code review (≥1 approval)
- [ ] Unit-тесты написаны, покрытие критических путей 100%
- [ ] Функционал задеплоен на staging и проверен вручную
- [ ] Если решение отклоняется от спецификации — документация обновлена

---

## 2. Доменные спецификации

### SPEC-001: Инфраструктура и DevOps

**Источник:** §8, §13, §18, §19, §24, §26.1

**Scope:**
- Docker Compose для локальной разработки (PostgreSQL 16 + pgvector, Redis 7, Vault dev, PgBouncer, Nginx)
- GitHub Actions CI: ruff, mypy, pytest, Bandit, pip-audit
- GitHub Environments: `staging` (auto-deploy), `production` (manual approve)
- HashiCorp Vault HA кластер (3 узла) — AppRole, Transit Auto-Unseal (Yandex KMS), snapshot backup
- Django settings: `base.py`, `local.py`, `staging.py`, `production.py`
- `DATABASE_DIRECT_URL` для миграций (bypasses PgBouncer)
- OpenTelemetry коллектор (trace_id, span_id)
- SBOM (CycloneDX) + Cosign подписание образов
- Nginx: TLS 1.3, HSTS, Brotli/Gzip, `server_tokens off`

**Ключевые решения:**
- Vault — единственный источник KEK (ADR-001)
- Redis Sentinel (≥3 узлов) обязателен для Production (ADR-006)
- PgBouncer: `pool_mode=transaction` (не session)
- Celery queues: `default`, `embeddings`, `notifications`, `payments`, `gdpr`

**Acceptance Criteria:**
- `git clone && docker compose up` → `pytest` зелёный локально
- `manage.py check --deploy` без критических ошибок
- `vault status` → initialized, unsealed, HA active
- GitHub Actions PR Check: все gates green

---

### SPEC-002: Аутентификация

**Источник:** §4, §5, §9.1

**Scope:**
- Email + OTP (6 цифр, TTL 5 мин, Redis Lua атомарная проверка)
- OTP brute-force: 5 попыток → блокировка 15 мин (`otp:blocked:{email}`, TTL=900)
- OAuth: Yandex ID (P0), VK ID (P1), Telegram Auth Widget (P1)
- JWT: access 15 мин, refresh 7 дней (HttpOnly cookie, SameSite=Lax)
- Refresh token rotation + Redis blacklist (`jwt:revoked:{jti}`)
- Logout: `POST /auth/logout` → JTI в blacklist; fail closed при недоступности Redis
- Django Admin: cookie-sessions + TOTP (django-otp) для Superadmin
- Superadmin "Войти как пользователь": JWT TTL=5 мин + AuditLog

**Модели:** `User`, `SellerProfile` (§9.1)

**API Endpoints (§10.4):**
```
POST /api/v1/auth/otp/send
POST /api/v1/auth/otp/verify
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/{provider}/callback  (yandex | vk | telegram)
POST /api/v1/auth/admin-impersonate/{user_id}
POST /api/v1/auth/admin-exit
```

**Acceptance Criteria:**
- Email+OTP: 5 неверных → 401 + 15 мин блок
- Refresh rotation: повторный запрос со старым refresh → 401
- JWT blacklist недоступен → 401 (fail closed)
- AuditLog записывается при impersonate

---

### SPEC-003: Каталог и публичные страницы

**Источник:** §6, §7, §12, §17, §10.5, §10.6

**Scope:**
- `Prompt` CRUD + статусы: DRAFT → PENDING_MODERATION → PUBLISHED/REJECTED/ARCHIVED
- Каталог: cursor-based pagination (нет offset), фильтрация по category/tags/price_min/price_max/is_free, сортировка
- Публичная карточка промпта (`slug`-based URL): SSR, OG Image, ISR 300 сек
- Страница автора `/seller/{username}`: публичный профиль, аватар, bio
- SEO: `sitemap.xml`, `robots.txt`, динамический `og:image`
- Яндекс.Метрика: Server-Side Tagging, инициализация только после cookie-consent
- next/image: WebP/AVIF, lazy loading
- next/font: Plus Jakarta Sans / Geist / JetBrains Mono

**Frontend роутинг (§12, §13.1):**
```
/                    → каталог (SSR + ISR)
/prompts/[slug]      → карточка промпта (SSR + ISR 300s)
/seller/[username]   → публичный профиль продавца
/auth/login          → страница входа
/auth/callback/[p]   → OAuth callback
```

**Acceptance Criteria:**
- Lighthouse SEO score ≥ 90 на staging
- Карточка промпта рендерится без JS (SSR)
- ISR: `revalidatePath` вызывается при публикации промпта
- `sitemap.xml` содержит все PUBLISHED промпты

---

### SPEC-004: Промпты + Шифрование (Envelope Encryption)

**Источник:** §7, §9.2, §11.4, §25.1, §25.4, §25.8, §25.9

**Scope:**
- Seller CRUD: create/update/delete промпта (только DRAFT/REJECTED)
- Envelope Encryption: DEK (AES-256-GCM) → шифрует контент; KEK из Vault Transit → шифрует DEK
- Порядок при публикации (§25.9): `published_at` → `content_hash` (атомарно в транзакции)
- Запрет замены `encrypted_content` после PUBLISHED (§9.2, политика версионирования)
- `Prompt.variables` (JSONField) + `{{placeholder}}` в тексте
- `EMBEDDING_FAILED` статус при ошибке генерации эмбеддинга
- File Upload (YOS): presigned upload URL → `PUT` к YOS → `POST /confirm` → magic bytes MIME-check
- `content_hash` (Digital Provenance, SHA-256) при PUBLISHED
- SECURITY_SCAN заглушка в Sprint 2 → реальный AISP в Sprint 5

**Порядок расшифровки (§25.8):**
1. `PromptAccess` check
2. Fetch `encrypted_dek` из БД
3. Vault Transit decrypt → DEK
4. `aes_gcm_decrypt(bytes(encrypted_content), dek, bytes(iv), bytes(auth_tag))`

**API Endpoints (§10.6, §10.8):**
```
POST   /api/v1/prompts/                   (seller only)
GET    /api/v1/prompts/{id}/
PUT    /api/v1/prompts/{id}/
DELETE /api/v1/prompts/{id}/
POST   /api/v1/prompts/{id}/submit
GET    /api/v1/prompts/{id}/content/      (buyer with PromptAccess OR Api-Key)
POST   /api/v1/media/upload-url
POST   /api/v1/media/confirm
```

**Acceptance Criteria:**
- DEK уникален для каждого промпта
- `bytes(BinaryField)` везде — mypy проверяет
- Magic bytes MIME валидация: только разрешённые типы
- После PUBLISHED: попытка обновить `encrypted_content` → 400

---

### SPEC-005: Платежи (Robokassa Split)

**Источник:** §3, §9.3, §10.7, §11.1

**Scope:**
- `Purchase` lifecycle: PENDING → SUCCESS | FAILED | CANCELLED | REFUNDED
- Robokassa Split: платёж = комиссия платформы (20% default) + доход автора (Split)
- Webhook `/api/v1/payments/webhook/`: проверка подписи, идемпотентность (`select_for_update`)
- `POST /payments/create`: создание `Purchase` PENDING, редирект на Robokassa
- При SUCCESS: `PromptAccess` создаётся атомарно, `purchases_count += F(1)`
- Бесплатный промпт (`price=0`): `PromptAccess(purchase=None)` без Robokassa + капча (ADR-014)
- Refund: Django Admin action → `Robokassa Refund API` → webhook CANCELLED → Celery `process_refund`
- `SiteSettings.platform_commission_rate`: изменяется через Django Admin
- Фиксация `platform_commission_rate` и `platform_commission_amount` в `Purchase` на момент оплаты

**Robokassa IP whitelist (§27.2):** `ROBOKASSA_IP_WHITELIST` в env.

**API Endpoints (§10.7):**
```
POST /api/v1/payments/create
GET  /api/v1/payments/{id}/status
POST /api/v1/payments/webhook/          (Robokassa ResultURL)
GET  /api/v1/users/me/purchases
```

**Acceptance Criteria:**
- Повторный webhook с тем же InvId → идемпотентный ответ 200, no-op
- Refund: `PromptAccess` удаляется, `purchases_count` декрементируется
- `platform_commission_rate` в `Purchase` неизменен после SUCCESS
- Бесплатный промпт: Robokassa не вызывается ни при каком условии

---

### SPEC-006: KYC (Dadata)

**Источник:** §4.2, §9.1, §11.2

**Scope:**
- `SellerProfile.kyc_status`: PENDING → VERIFIED | REJECTED | CANCELLED
- KYC flow: submit ИНН + `legal_type` (ИП | Самозанятый) → Dadata API проверка
- Celery Beat `verify_active_kyc_status` (ежедневно): VERIFIED → REJECTED/CANCELLED при потере статуса НПД/ИП
- REJECTED → CANCELLED (потеря НПД/ИП статуса в ФНС, §11.2)
- Re-submission: таблица состояний (§11.2, H-7)
- KYC-батчинг (§9.1): до 50 ИНН в одном запросе к Dadata
- KYC override: Superadmin вручную через Django Admin

**Acceptance Criteria:**
- Seller не может опубликовать промпт без `kyc_status=VERIFIED`
- `verify_active_kyc_status` корректно переводит VERIFIED → CANCELLED при потере НПД
- Batching: не более 50 INN в одном запросе Dadata

---

### SPEC-007: Семантический поиск

**Источник:** §6, §9.2, §10.5, §11.3, §14 ADR-002

**Scope:**
- pgvector: HNSW-индекс, размерность эмбеддинга (YandexGPT Embeddings v3)
- `ISearchProvider` интерфейс → `PgVectorSearchProvider` (MVP)
- Поиск: offset/limit пагинация, max_offset=1000
- Plagiarism check: cosine similarity >95% → `PENDING_PLAGIARISM_REVIEW`
- Celery queue `embeddings`: генерация эмбеддинга после модерации APPROVED
- `EMBEDDING_FAILED` статус при ошибке + алерт Sentry
- **Запрещены:** OpenAI Embeddings, зарубежные провайдеры (152-ФЗ)

**Celery задачи:**
- `generate_embedding(prompt_id)` → queue=`embeddings`
- `check_plagiarism(prompt_id)` → вызывается после `generate_embedding`

**Acceptance Criteria:**
- Семантический поиск возвращает релевантные результаты на staging
- Plagiarism >95% → статус `PENDING_PLAGIARISM_REVIEW` без ошибки
- `ISearchProvider` — смена на Qdrant не требует изменений бизнес-логики

---

### SPEC-008: Уведомления

**Источник:** §23, §13.2

**Scope:**
- `INotificationChannel` абстракция: Email (Unisender) + In-App + Telegram (optional)
- Email fallback на SMTP при недоступности Unisender (ADR-008)
- Telegram: `TELEGRAM_ENABLED` flag; **запрещено** включать ПДн в body (152-ФЗ)
- In-app уведомления: Browser polling `GET /api/v1/notifications/` каждые 30 сек
- `NotificationSettings` модель: пользователь настраивает каналы
- Celery queue `notifications`

**Типы уведомлений:**
- Покупка: покупатель (чек) + продавец (доход)
- Модерация: промпт одобрен/отклонён → продавцу
- KYC: изменение статуса → продавцу
- Возврат: обоим

**Acceptance Criteria:**
- При `TELEGRAM_ENABLED=false` — graceful fallback на Email + in-app
- Telegram-сообщения не содержат email, имена, суммы, названия промптов
- SMTP fallback активируется при ошибке Unisender API

---

### SPEC-009: Модерация

**Источник:** §4.3, §9.10, §10.10

**Scope:**
- Модерационная очередь: PENDING_MODERATION → PUBLISHED | REJECTED | BLOCKED_BY_SECURITY
- Причины отклонения из `RejectionReason` CMS-справочника (Superadmin управляет)
- Модератор не видит зашифрованный текст — только метаданные, `short_description`
- SECURITY_SCAN (AISP, ADR-016): перед попаданием в очередь модератора
- `APPEAL_REQUESTED`: покупатель подаёт апелляцию при BLOCKED_BY_SECURITY
- `ModerationRecord`: история решений, `APPEAL_APPROVED` / `APPEAL_REJECTED`
- Plagiarism resolve flow: Superadmin review → PUBLISHED или REJECTED
- `content_hash` при PUBLISHED (Digital Provenance)

**API Endpoints (§10.10):**
```
GET    /api/v1/moderation/queue
POST   /api/v1/moderation/{id}/approve
POST   /api/v1/moderation/{id}/reject
POST   /api/v1/moderation/{id}/appeal
GET    /api/v1/moderation/rejection-reasons
```

**Acceptance Criteria:**
- Очередь содержит только PENDING_MODERATION промпты
- Reject без причины → 422
- Appeal при не-BLOCKED_BY_SECURITY статусе → 400

---

### SPEC-010: Безопасность + GDPR (152-ФЗ)

**Источник:** §2, §5.6, §9.8, §14 ADR-009, §25

**Scope:**
- `anonymize_account` Celery-задача: 7 шагов из §2.5 в правильном порядке
- Data Export `GET /users/me/export`: JSON с профилем, покупками, отзывами, избранным
- DSR страница `/legal/dsr/` + Celery `process_dsr_request`
- Rate limiting (ADR-009): `map`-блок Nginx, зоны `api_buyer`, `api_seller`, `api_agent`
  - `api_agent` (M2M): 300 req/min по хешу токена (не plaintext)
- Cookie-баннер: Метрика не инициализируется до `"Согласен"`
- `consent_pd_at` в `User` (datetime, не bool)
- `AuditLog` партиционирование через `pg_partman` (ежемесячно, retention 2 года)
- Nonce-based CSP (§12.13): убран `'unsafe-inline'`
- `X-Request-ID` → заменён на OpenTelemetry `trace_id`

**Acceptance Criteria:**
- `anonymize_account`: все 7 шагов без ошибок на staging
- После anonymize: пользователь не может войти; его промпты — ARCHIVED
- Rate limit `api_agent`: ключ зоны — хеш токена, не plaintext токен
- Cookie consent: `ya.metrika` не вызывается до клика "Согласен"

---

### SPEC-011: Мониторинг и Observability

**Источник:** §20, §18, §8.2

**Scope:**
- OpenTelemetry: trace_id + span_id в Django (middleware) и Celery (task headers)
- Sentry SDK: Django + Next.js, DSN в env
- Zabbix Agent на всех узлах + Zabbix Server
- Алерты из таблицы 20.2 (Vault, Redis, DB, платежи)
- `GET /api/v1/health/`: db + redis + vault check, HTTP 503 при любом `error`
- Telegram Bot для критических алертов (только сигналы, без ПДн)
- Структурированные логи (JSON): `trace_id` в каждом логе

**Acceptance Criteria:**
- `health/` возвращает 503 при остановке Vault (проверено на staging)
- Тест-алерт получен в Telegram
- trace_id виден в Sentry для каждого исключения

---

### SPEC-012: Производительность и запуск

**Источник:** §15.5, §16, §17, §18, §26.6, §27

**Scope:**
- Load testing (Locust) на staging: пороги из §15.5
- OWASP ZAP DAST на staging
- CDN для публичных превью (Yandex CDN перед YOS)
- Confidential VMs: Django + Celery workers (AMD SEV / Intel TDX)
- SBOM (CycloneDX) + Cosign подписание образов (policy verify)
- Carbon-Aware Scheduling (§13.2): некритичные Celery задачи в low-carbon window
- Frontend CI: eslint + tsc + vitest + next build + bundle budget
- Выполнение Production Checklist (§27)

**Acceptance Criteria:**
- Все пункты §27 выполнены и подписаны ответственным с датой
- Load test: пороги §15.5 выполнены
- OWASP ZAP: нет `HIGH`/`CRITICAL` находок

---

### SPEC-013: Agentic AI (API Keys, M2M)

**Источник:** §4.1, §5.7, §9.1 (модель ApiKey)

**Scope:**
- `ApiKey` модель: `key_hash` (SHA-256), индекс по `key_hash`, `user_id`, `name`, `created_at`, `last_used_at`
- Генерация: префикс `ps_live_`, показывается **один раз**, в БД только хеш
- Авторизация: `Authorization: Api-Key ps_live_...` → middleware → `User` → `PromptAccess` check
- Rate limit зона `api_agent` (ADR-009): 300 req/min по хешу токена
- Управление в личном кабинете: список, создать, отозвать
- Plaintext ключ **не логируется** нигде

**API Endpoints:**
```
GET    /api/v1/users/me/api-keys
POST   /api/v1/users/me/api-keys
DELETE /api/v1/users/me/api-keys/{id}
```

**Acceptance Criteria:**
- Повторная GET на список — plaintext не возвращается (только `key_hash[:8]...` preview)
- Отозванный ключ → 401 немедленно
- Логи не содержат plaintext API ключей

---

## 3. Детальные спринты

### Sprint 0 — Инфраструктура (Недели 1–2) ✅ ЗАВЕРШЁН

**Цель:** команда разблокирована, dev/staging среды работают.

> **Статус:** ✅ Backend P0 выполнен | ✅ pytest green (3 passed) | ✅ /health/ → all ok
> **Дата завершения:** 2026-02-28
> **Известные фиксы в процессе:**
> - PgBouncer md5 ↔ PostgreSQL scram-sha-256: решено через `ALTER USER postgres WITH PASSWORD` + `password_encryption=md5`
> - Debug Toolbar: добавлен `path("__debug__/", include(debug_toolbar.urls))`
> - OTel instrumentation: перенесено в Sprint 5 (beta versioning `0.50b0` vs `0.50.*`)
> - pytest test settings: `config.settings.test` с direct DB (PgBouncer не поддерживает CREATE DATABASE)

**Backend:**
| # | Задача | SPEC | Приоритет | Статус |
|---|--------|------|-----------|--------|
| B0-1 | `docker-compose.yml`: PostgreSQL 16+pgvector, Redis 7, Vault dev, PgBouncer | SPEC-001 | P0 | ✅ Все 6 контейнеров healthy |
| B0-2 | Django settings: `base/local/staging/production.py` + `test.py` | SPEC-001 | P0 | ✅ check --deploy: 0 errors, 5 warnings (HTTPS, ожидаемо для local) |
| B0-3 | `DATABASE_DIRECT_URL` для migrate + `DIRECT_URL` bypass PgBouncer | SPEC-001 | P0 | ✅ /health/ → db: ok через PgBouncer |
| B0-4 | Начальные миграции: User, SellerProfile (базовые поля) | SPEC-002 | P0 | ✅ migrate OK (0001 + 0002) |
| B0-5 | Vault: Transit secrets engine + KEK `promptspace-kek` | SPEC-001 | P0 | ✅ vault: ok, KEK AES-256-GCM96 |
| B0-6 | Celery: 5 очередей (`default`, `embeddings`, `notifications`, `payments`, `gdpr`) | SPEC-001 | P0 | ✅ Worker запущен, все 5 очередей активны |
| B0-7 | `.env.example` с полным списком переменных (§19) | SPEC-001 | P0 | ✅ |

**DevOps:**
| # | Задача | SPEC | Приоритет | Статус |
|---|--------|------|-----------|--------|
| D0-1 | CI: ruff, mypy, pytest, Bandit (GitHub Actions) | SPEC-001 | P0 | ✅ `.github/workflows/ci.yml` готов |
| D0-2 | GitHub Environments: `staging` (auto), `production` (manual approve) | SPEC-001 | P0 | ⏳ Требует ручной настройки в GitHub Settings |
| D0-3 | Nginx базовая конфигурация: TLS 1.3, HSTS | SPEC-001 | P0 | ✅ `docker/nginx/nginx.conf` готов |
| D0-4 | Vault HA (3 узла) на staging | SPEC-001 | P1 | ⏩ Deferred → Sprint 5 (P1) |

**Frontend:**
| # | Задача | SPEC | Приоритет | Статус |
|---|--------|------|-----------|--------|
| F0-1 | Next.js 15 App Router базовая структура + `next.config.ts` | SPEC-003 | P0 | ✅ Структура создана; `next build` → Sprint 1 |
| F0-2 | Design System: shadcn/ui + Tailwind v4 + шрифты (§12.6) | SPEC-003 | P0 | ✅ shadcn/ui + tailwindcss@4 в package.json |
| F0-3 | ESLint + TypeScript strict + vitest | SPEC-003 | P0 | ✅ vitest.config.ts готов; тесты → Sprint 1 |

**Дополнительно выполнено:**
- ✅ `GET /api/v1/health/` → `{"status":"ok","db":"ok","redis":"ok","vault":"ok"}`
- ✅ `GET /api/v1/docs` → 200 OK (Swagger UI)
- ✅ pytest: 3 passed (test_health_endpoint_ok, test_health_status_model, test_health_status_degraded)
- ✅ run.ps1 — PowerShell альтернатива Makefile для Windows

---

### Sprint 1 — Аутентификация + Каталог (Недели 3–4)

**Цель:** пользователь может зарегистрироваться и просмотреть каталог.

**Backend:**
| # | Задача | SPEC | Приоритет | DoD |
|---|--------|------|-----------|-----|
| B1-1 | Email + OTP: Redis Lua атомарная проверка (§5.1) | SPEC-002 | P0 | Race condition test проходит |
| B1-2 | OTP brute-force: 5 попыток → 15 мин блок | SPEC-002 | P0 | Test: 6-я попытка → 401 |
| B1-3 | JWT access+refresh, refresh rotation, Redis blacklist | SPEC-002 | P0 | Повторный refresh → 401 |
| B1-4 | OAuth: Yandex ID callback + User create/update | SPEC-002 | P0 | OAuth flow на staging |
| B1-5 | Logout: JTI blacklist, fail closed | SPEC-002 | P0 | Redis down → 401 |
| B1-6 | Модели: Prompt, Category, Tag, Favorite, PromptAccess, ApiKey | SPEC-003/004 | P0 | `migrate` OK |
| B1-7 | `GET /catalog/prompts` cursor pagination + фильтры | SPEC-003 | P0 | Cursor encoding тест |
| B1-8 | `GET /catalog/prompts/{slug}` публичная карточка | SPEC-003 | P0 | SSR рендерится без JS |
| B1-9 | OAuth: VK ID | SPEC-002 | P1 | Callback работает |
| B1-10 | OAuth: Telegram Auth Widget | SPEC-002 | P1 | Widget верифицирует подпись |

**Frontend:**
| # | Задача | SPEC | Приоритет | DoD |
|---|--------|------|-----------|-----|
| F1-1 | Страница входа (`/auth/login`): Email+OTP форма | SPEC-002 | P0 | OTP отправляется |
| F1-2 | OAuth кнопки: Yandex, VK, Telegram | SPEC-002 | P0 | Redirect работает |
| F1-3 | JWT хранение: access в memory, refresh cookie | SPEC-002 | P0 | Refresh rotation работает |
| F1-4 | Главная страница + каталог (SSR, Server Components) | SPEC-003 | P0 | Lighthouse SEO ≥ 85 |
| F1-5 | Карточка промпта `/prompts/[slug]` (SSR + ISR 300s) | SPEC-003 | P0 | OG Image генерируется |
| F1-6 | Cookie-баннер: Метрика не инициализируется до согласия | SPEC-010 | P0 | DevTools: ya.metrika не вызывается |

---

### Sprint 2 — Промпты + Платежи (Недели 5–6)

**Цель:** продавец создаёт промпт; покупатель — покупает.

**Backend:**
| # | Задача | SPEC | Приоритет | DoD |
|---|--------|------|-----------|-----|
| B2-1 | Envelope Encryption: DEK генерация, Vault Transit encrypt/decrypt | SPEC-004 | P0 | `bytes()` везде — mypy OK |
| B2-2 | Seller CRUD промптов: DRAFT → submit → PENDING_MODERATION | SPEC-004 | P0 | Статусная машина тест |
| B2-3 | SECURITY_SCAN заглушка (pass-through) | SPEC-004 | P0 | Интерфейс задан, impl заменима |
| B2-4 | `GET /prompts/{id}/content/`: расшифровка (порядок §25.8) | SPEC-004 | P0 | Roundtrip encrypt/decrypt тест |
| B2-5 | `Prompt.variables` JSONField + `{{placeholder}}` документация | SPEC-004 | P0 | Serialization тест |
| B2-6 | Robokassa Split: создание заказа + webhook (идемпотентность) | SPEC-005 | P0 | Повторный webhook → no-op |
| B2-7 | `process_purchase_success`: транзакция + `PromptAccess` + `F()` | SPEC-005 | P0 | Race condition тест |
| B2-8 | Бесплатный промпт: acquire + капча (ADR-014) | SPEC-005 | P0 | price=0 → Robokassa не вызывается |
| B2-9 | YOS: presigned upload URL + confirm + magic bytes MIME | SPEC-004 | P1 | Неверный MIME → 415 |
| B2-10 | Seller KYC: Dadata API, batch ≤50 ИНН | SPEC-006 | P1 | KYC lifecycle тест |

**Frontend:**
| # | Задача | SPEC | Приоритет | DoD |
|---|--------|------|-----------|-----|
| F2-1 | Seller: форма создания промпта (DRAFT) | SPEC-004 | P0 | Форма сохраняет draft |
| F2-2 | File Upload UX: react-dropzone + XHR progress (§12.11) | SPEC-004 | P0 | Progress bar работает |
| F2-3 | Buyer: кнопка "Купить" → редирект Robokassa | SPEC-005 | P0 | Payment redirect работает |
| F2-4 | Страница результата платежа `/payment/result` | SPEC-005 | P0 | Success/failure состояния |
| F2-5 | KYC State Machine (§12.9): middleware.ts protection | SPEC-006 | P1 | Незаверш. KYC → /kyc/pending |

---

### Sprint 3 — Поиск + Уведомления (Недели 7–8)

**Цель:** семантический поиск работает; уведомления доставляются.

**Backend:**
| # | Задача | SPEC | Приоритет | DoD |
|---|--------|------|-----------|-----|
| B3-1 | pgvector HNSW индекс + YandexGPT Embeddings v3 интеграция | SPEC-007 | P0 | Embedding roundtrip тест |
| B3-2 | `ISearchProvider` + `PgVectorSearchProvider` | SPEC-007 | P0 | Смена провайдера — 0 изменений бизнес-логики |
| B3-3 | `GET /catalog/search` offset/limit, max_offset=1000 | SPEC-007 | P0 | offset=1001 → 400 |
| B3-4 | Plagiarism check: cosine >95% → `PENDING_PLAGIARISM_REVIEW` | SPEC-007 | P0 | Тест с клоном промпта |
| B3-5 | `EMBEDDING_FAILED` статус + алерт Sentry | SPEC-007 | P0 | YandexGPT timeout → EMBEDDING_FAILED |
| B3-6 | Система уведомлений: `INotificationChannel`, Email (Unisender) | SPEC-008 | P0 | Письмо доходит на staging |
| B3-7 | SMTP fallback при ошибке Unisender | SPEC-008 | P0 | Unisender mock failure → SMTP |
| B3-8 | In-app уведомления: polling `GET /notifications/` 30 сек | SPEC-008 | P0 | Уведомление появляется в UI |
| B3-9 | Celery Beat (`django-celery-beat`): базовое расписание | SPEC-001 | P0 | Расписание в Admin виден |
| B3-10 | Telegram Bot optional канал (`TELEGRAM_ENABLED`) | SPEC-008 | P1 | Flag=false → graceful fallback |
| B3-11 | `aggregate_seller_stats` + `verify_active_kyc_status` | SPEC-006 | P1 | Daily run на staging |

**Frontend:**
| # | Задача | SPEC | Приоритет | DoD |
|---|--------|------|-----------|-----|
| F3-1 | Search UI: семантический поиск в каталоге | SPEC-007 | P0 | Результаты релевантны |
| F3-2 | Skeleton loading states (§12.8) | SPEC-003 | P0 | Нет CLS при загрузке |
| F3-3 | Notification bell: polling + счётчик непрочитанных | SPEC-008 | P0 | Уведомление появляется |
| F3-4 | Seller Dashboard: аналитика, просмотры, продажи | SPEC-003 | P1 | Данные из `SellerDailyStats` |

---

### Sprint 4 — Модерация + Безопасность (Недели 9–10)

**Цель:** модераторы работают; безопасность и GDPR выполнены.

**Backend:**
| # | Задача | SPEC | Приоритет | DoD |
|---|--------|------|-----------|-----|
| B4-1 | Модерационная очередь: approve / reject (с причиной) | SPEC-009 | P0 | Причина обязательна при reject |
| B4-2 | `PENDING_PLAGIARISM_REVIEW` resolve flow | SPEC-009 | P0 | Superadmin может PUBLISHED/REJECTED |
| B4-3 | `BLOCKED_BY_SECURITY` + `APPEAL_REQUESTED` flow | SPEC-009 | P0 | Appeal → ModerationRecord |
| B4-4 | `anonymize_account` Celery-задача (7 шагов §2.5) | SPEC-010 | P0 | Все 7 шагов на staging OK |
| B4-5 | `GET /users/me/export`: JSON профиль + покупки + отзывы | SPEC-010 | P0 | JSON валиден |
| B4-6 | DSR страница `/legal/dsr/` + `process_dsr_request` | SPEC-010 | P0 | Форма отправляет задачу |
| B4-7 | AuditLog: `pg_partman` ежемесячные партиции + retention 2 года | SPEC-010 | P1 | Партиция создаётся автоматически |
| B4-8 | Rate limiting: ADR-009, Nginx `map`-блок, зоны | SPEC-010 | P0 | Rate limit срабатывает на staging |
| B4-9 | Refund: Django Admin action + `process_refund` идемпотентность | SPEC-005 | P0 | Повторный вызов → no-op |
| B4-10 | `content_hash` (Digital Provenance) при PUBLISHED | SPEC-004 | P1 | SHA-256 совпадает с контентом |
| B4-11 | API Keys (§5.7): генерация, хранение хеша SHA-256, отзыв | SPEC-013 | P2 | Plaintext не в логах |

**Frontend:**
| # | Задача | SPEC | Приоритет | DoD |
|---|--------|------|-----------|-----|
| F4-1 | Модератор: очередь, approve/reject с причиной | SPEC-009 | P0 | Reject без причины заблокирован |
| F4-2 | Seller: Appeal форма при BLOCKED_BY_SECURITY | SPEC-009 | P0 | Form submit → статус меняется |
| F4-3 | Покупатель: запрос удаления аккаунта (право на забвение) | SPEC-010 | P0 | Trigger `anonymize_account` |
| F4-4 | Data Export: кнопка скачать данные | SPEC-010 | P0 | JSON скачивается |
| F4-5 | Error handling UI: 4× `error.tsx` + Sonner (§12.7) | SPEC-003 | P0 | 500/404/network error обработаны |
| F4-6 | Accessibility: WCAG 2.1 AA, axe-core CI (§12.12) | SPEC-003 | P1 | axe-core: 0 violations |

---

### Sprint 5 — Производительность + Запуск (Недели 11–12)

**Цель:** готово к production. Чеклист §27 выполнен.

**Backend/DevOps:**
| # | Задача | SPEC | Приоритет | DoD |
|---|--------|------|-----------|-----|
| D5-1 | SBOM (CycloneDX) генерация + Cosign подписание в CI | SPEC-012 | P0 | `cosign verify-attestation` OK |
| D5-2 | OpenTelemetry: trace_id в Django middleware + Celery | SPEC-011 | P0 | trace_id в Sentry |
| D5-3 | Zabbix Agent + все алерты таблицы 20.2 | SPEC-011 | P0 | Тест-алерт в Telegram |
| D5-4 | Sentry SDK: Django + Next.js + source maps | SPEC-011 | P0 | Тестовое исключение зафиксировано |
| D5-5 | AISP Security Scan реальный провайдер (LLM Guard / YFM) | SPEC-009 | P0 | ADR-016 реализован |
| D5-6 | Load testing Locust: пороги §15.5 на staging | SPEC-012 | P0 | Все пороги выполнены |
| D5-7 | OWASP ZAP DAST на staging | SPEC-012 | P0 | Нет HIGH/CRITICAL |
| D5-8 | CDN (Yandex CDN) перед YOS для публичных превью | SPEC-012 | P1 | Cache hit ratio >80% |
| D5-9 | Confidential VMs (AMD SEV) для Django + Celery | SPEC-012 | P1 | Workers на TEE инстансах |
| D5-10 | Production Checklist §27: все пункты, подписи | SPEC-012 | P0 | 100% пунктов отмечены |
| D5-11 | Carbon-Aware Scheduling для некритичных задач | SPEC-001 | P2 | Low-carbon window в расписании |

**Frontend:**
| # | Задача | SPEC | Приоритет | DoD |
|---|--------|------|-----------|-----|
| F5-1 | Frontend CI gate: eslint + tsc + vitest + bundle budget | SPEC-012 | P0 | CI green |
| F5-2 | Страница автора `/seller/[username]` + OG Image (§12.15) | SPEC-003 | P0 | OG Image в Telegram preview |
| F5-3 | State Management: 3× Zustand stores + TanStack Query (§12.14) | SPEC-003 | P1 | Devtools показывают стор |
| F5-4 | E2E Playwright: все 8 сценариев §15.3 | SPEC-012 | P0 | Все 8 зелёные на staging |

---

## 4. Матрица зависимостей

```
SPEC-001 (Инфраструктура)
  └─► SPEC-002 (Auth) — требует Redis, Vault, Django
  └─► SPEC-003 (Каталог) — требует PostgreSQL, Next.js
  └─► SPEC-007 (Поиск) — требует pgvector, Celery
  └─► SPEC-011 (Мониторинг) — требует OTel инфра

SPEC-002 (Auth)
  └─► SPEC-004 (Промпты) — требует User, JWT
  └─► SPEC-005 (Платежи) — требует User
  └─► SPEC-010 (GDPR) — требует User.consent_pd_at

SPEC-004 (Промпты)
  └─► SPEC-005 (Платежи) — требует Prompt, PromptAccess
  └─► SPEC-007 (Поиск) — требует Prompt.embedding
  └─► SPEC-009 (Модерация) — требует Prompt статусы

SPEC-005 (Платежи)
  └─► SPEC-006 (KYC) — Seller без KYC не получает выплаты

SPEC-007 (Поиск)
  └─► SPEC-009 (Модерация) — plagiarism check перед PUBLISHED

SPEC-009 (Модерация)
  └─► SPEC-008 (Уведомления) — notify seller on decision
```

---

## 5. Критический путь

```
Sprint 0: SPEC-001 (Инфра + Vault)
  ↓
Sprint 1: SPEC-002 (Auth) + SPEC-003 (Каталог)
  ↓
Sprint 2: SPEC-004 (Шифрование) + SPEC-005 (Платежи)  ← КЛЮЧЕВОЙ
  ↓
Sprint 3: SPEC-007 (Поиск) + SPEC-008 (Уведомления)
  ↓
Sprint 4: SPEC-009 (Модерация) + SPEC-010 (GDPR)
  ↓
Sprint 5: SPEC-011 + SPEC-012 (Перф + Запуск)
```

**Блокеры (нельзя начать следующий спринт):**
1. **Vault HA** (Sprint 0 → Sprint 2): без Vault нет шифрования промптов
2. **Envelope Encryption** (Sprint 2 → Sprint 4): без DEK нет расшифровки контента
3. **Robokassa webhook** (Sprint 2 → Sprint 4): без платежей нет `PromptAccess`
4. **152-ФЗ checklist** (Sprint 4 → Sprint 5): GDPR обязательно до production

---

*Документ актуален для promptspace-release.md v2.3. При изменении спецификации — обновить соответствующий SPEC-XXX.*
