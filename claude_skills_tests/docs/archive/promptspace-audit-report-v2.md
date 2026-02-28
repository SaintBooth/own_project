# PromptSpace — Архитектурный аудит v2

> **Документ:** promptspace-v4.md (v1.2, 1861 строк)
> **Дата аудита:** 2026-02-26
> **Ревьюер:** Senior System Architect
> **Предыдущий аудит:** 2026-02-XX (Audit v1, устранено 24 замечания + 14 backend-правок)

---

## Итоговая оценка

| Показатель | v1.0 | v1.2 (сейчас) |
|-----------|------|----------------|
| Общий балл | 68/100 | **84/100** |
| Critical issues | 5 | **3** |
| High issues | 13 | **8** |
| Medium issues | 2 | **9** |
| Статус | Условно готов | Требует финальных правок |

Документ значительно улучшился. Оставшиеся проблемы — меньшей плотности, но три из них имеют прямые production-риски: один операционный (партиционирование), один юридический (152-ФЗ + Telegram), один — угроза целостности данных покупателей (версионирование промптов).

---

## CRITICAL — 3 замечания

---

### C-1: AuditLog monthly partitions — кто их создаёт?

**Раздел:** 9 (`audit/models.py`)

**Проблема:** Документ фиксирует: «Партицирование настраивается в PostgreSQL DDL, не через Django ORM». Это корректно технически, но создаёт операционную дыру: **новая месячная партиция не создаётся автоматически**. В PostgreSQL при `PARTITION BY RANGE (created_at)` INSERT в строку, не попадающую ни в одну партицию, завершается ошибкой:

```
ERROR: no partition of relation "audit_auditlog" found for row
```

Это произойдёт в **00:00:00 UTC 1-го числа следующего месяца**, когда первый аудит-запрос попытается записаться в несуществующую партицию. Результат: весь аудит перестаёт писаться, все AuditLog.save() выбрасывают исключение. Если AuditLog вызывается синхронно (в middleware или view), это может аффектировать и пользовательские запросы.

**Исправление:**

1. Добавить в Celery Beat задачу `create_audit_partitions` — запускается ежемесячно (25-го числа в 03:00 UTC), заблаговременно создаёт партицию на следующий месяц:

```sql
-- Пример для February 2026 → создаёт March 2026
CREATE TABLE IF NOT EXISTS audit_auditlog_2026_03
    PARTITION OF audit_auditlog
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
```

2. Добавить в `docs/runbook.md` раздел "Создание AuditLog партиции вручную" для emergency.

3. При первом deploy создать партиции минимум на 3 месяца вперёд (data migration).

**Severity: Critical** — предсказуемый production outage в начале каждого месяца.

---

### C-2: Версионирование промптов — покупатели теряют оплаченный контент

**Раздел:** 7 (жизненный цикл), 9 (`Prompt` модель)

**Проблема:** Жизненный цикл допускает: `PUBLISHED → ARCHIVED → DRAFT → (edit encrypted_content) → submit → ... → PUBLISHED`. При редактировании продавец меняет поле `Prompt.encrypted_content`. Это единственный `Prompt` record — у покупателя есть `PromptAccess(prompt=Prompt)`, и после публикации новой версии **он читает новый контент**, хотя платил за старый.

Сценарии злоупотребления:
- Продавец публикует качественный промпт → набирает покупателей → заменяет на шаблонный контент.
- Продавец удаляет ключевые части промпта после продаж.

Это потенциальное **мошенничество и нарушение прав потребителей** (ЗоЗПП).

**Исправление (2 варианта):**

**Вариант A (минимальный):** запретить редактирование `encrypted_content` при ARCHIVED → DRAFT. Разрешать только метаданные (title, short_description, price). Контент редактируется только при первом DRAFT. При необходимости обновления контента — только через удаление и создание нового промпта.

**Вариант B (полноценный):** ввести версионирование:
```python
class PromptVersion(models.Model):
    prompt = models.ForeignKey(Prompt, on_delete=models.CASCADE, related_name="versions")
    version_number = models.PositiveSmallIntegerField()
    encrypted_content = models.BinaryField()
    encrypted_dek = models.BinaryField()
    iv = models.BinaryField(max_length=12)
    auth_tag = models.BinaryField(max_length=16)
    created_at = models.DateTimeField(auto_now_add=True)

# PromptAccess ссылается на конкретную версию
class PromptAccess(models.Model):
    ...
    prompt_version = models.ForeignKey(PromptVersion, on_delete=models.PROTECT, null=True)
```

**Для MVP рекомендуется Вариант A** как быстрое и надёжное решение. Вариант B — после MVP при наличии явной потребности от продавцов.

**Severity: Critical** — риск мошенничества, нарушение прав потребителей.

---

### C-3: Telegram Bot API нарушает 152-ФЗ при отправке ПДн

**Раздел:** 23 (Система уведомлений), 2 (152-ФЗ)

**Проблема:** Раздел 23 описывает Telegram Bot как канал уведомлений. Уведомления включают контекст: `PURCHASE_SUCCESS` (содержит название промпта, имя продавца), `KYC_STATUS_LOST` (содержит имя пользователя), `SALE_COMPLETED` (сумма, покупатель). **Telegram Bot API серверы расположены за пределами РФ** (Дублин, Амстердам). Передача ПДн (имён, email-адресов, финансовых данных) через Telegram Bot API = трансграничная передача ПДн без уведомления Роскомнадзора.

Дополнительно: в разделе 2.1 перечислены DPA-субпроцессоры (Yandex Cloud, Selectel, Dadata, Unisender, Robokassa), но **Telegram отсутствует**.

**Исправление:**

1. Telegram уведомления — **только generic, без ПДн**. Допустимо: "У вас новое уведомление, войдите на платформу." Недопустимо: "Ваш промпт «{title}» куплен пользователем {username}."
2. Добавить Telegram в список субпроцессоров раздела 2.1 с оговоркой о характере данных.
3. В разделе 23.4 зафиксировать: "Telegram-канал не передаёт ПДн, только ссылку или generic текст."
4. Добавить в модель `NotificationSettings` поле `telegram_chat_id` (ID чата пользователя с Bot) — не username, chat_id не является ПДн.

**Severity: Critical** — прямое нарушение 152-ФЗ при отправке персонализированных уведомлений.

---

## HIGH — 8 замечаний

---

### H-1: /health/ не проверяет Vault — мониторинговый слепой угол

**Раздел:** 8.2, 20

**Проблема:** `GET /api/v1/health/` возвращает `{"db": "ok", "redis": "ok"}`. Vault отсутствует. При полной недоступности Vault (`vault status` → sealed/unreachable) Django не может расшифровать **ни один промпт**. Все запросы `GET /prompts/{id}/content/` завершатся 500. Docker Healthcheck и Zabbix пометят сервис как **healthy**, load balancer продолжит отправлять трафик, пользователи видят ошибки 500.

Фактически: RTO Vault = 1 ч (раздел 20), но без health check алерт срабатывает только по `HTTP 5xx rate > 1% за 5 мин` — это слишком поздно.

**Исправление:**
```python
@api.get("/health/")
def health(request):
    checks = {
        "db": _check_db(),
        "redis": _check_redis(),
        "vault": _check_vault(),  # добавить
    }
    status = "ok" if all(v == "ok" for v in checks.values()) else "degraded"
    http_status = 200 if status == "ok" else 503
    return JsonResponse({"status": status, **checks}, status=http_status)
```

Vault check: `vault.client.is_authenticated()` с timeout 2 сек. При 503 — load balancer выводит инстанс из ротации немедленно.

**Добавить алерт:** Zabbix / Docker healthcheck на HTTP 503 от `/health/` → Telegram немедленно.

---

### H-2: CSRF стратегия не описана

**Раздел:** 5.2, 8.2, 25

**Проблема:** Django Ninja по умолчанию **отключает CSRF-проверку** для API endpoints (они используют Bearer-токен). Однако в системе есть refresh token в HttpOnly cookie с `SameSite=Lax`. При `SameSite=Lax`:

- GET-запросы cross-site: cookie передаётся ✅
- POST-запросы cross-site AJAX: cookie не передаётся ✅
- POST через HTML form cross-site (top-level navigation): cookie передаётся ⚠️

Атакующий может создать страницу с `<form action="https://promptspace.ru/api/v1/auth/refresh" method="POST">`, trigger её через `<img>` onload или фрейм — и обновить токен сессии жертвы. Это не даёт доступ к access token (тот в памяти), но позволяет обнулить refresh session.

Более серьёзно: `/library/acquire/` с `SameSite=Lax` и отключённым CSRF теоретически уязвим к CSRF-атаке, если captcha_token можно получить из предсказуемого источника.

**Исправление:**

Зафиксировать стратегию в документе:
1. Webhook endpoint (`/webhooks/robokassa/`) — CSRF защита не нужна (проверка подписи Robokassa).
2. Auth endpoints — Django Ninja `csrf=False` (стандарт для Bearer-auth).
3. `/library/acquire/` — captcha_token является CSRF-заменителем (одноразовый токен от провайдера).
4. Для любых state-changing endpoints с cookie-auth (refresh) — добавить кастомный `X-CSRFToken` header или Double Submit Cookie.

---

### H-3: Размер и MIME файлов не проверяются при подтверждении загрузки

**Раздел:** 10 (confirm endpoint), 12.4

**Проблема:** Раздел 12.4 декларирует: «лимит 5 МБ на файл, допустимые MIME: image/*». Загрузка через presigned PUT URL в YOS минует Django. Confirm endpoint (`POST /prompts/{id}/examples/confirm/`) выполняет лишь `HeadObject` — проверяет существование файла, но **не проверяет размер (`Content-Length`) и MIME-тип (`Content-Type`)**. Продавец может загрузить:
- 500 МБ файл (DDoS на storage costs)
- Исполняемый файл (.exe, .php) с MIME=application/octet-stream

**Исправление (2 слоя):**

**Слой 1 (обязательный):** В confirm endpoint добавить проверку HeadObject response:
```python
response = s3_client.head_object(Bucket=YOS_BUCKET, Key=object_key)
size = response["ContentLength"]
mime = response["ContentType"]

if size > 5 * 1024 * 1024:  # 5MB
    s3_client.delete_object(Bucket=YOS_BUCKET, Key=object_key)
    raise Http422("File size exceeds 5MB limit")

ALLOWED_MIMES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
if mime not in ALLOWED_MIMES:
    s3_client.delete_object(Bucket=YOS_BUCKET, Key=object_key)
    raise Http422("Invalid file type")
```

**Слой 2 (дополнительный):** Использовать YOS Bucket Policy для ограничения размера через условия presigned URL. В S3-compatible объектном хранилище можно добавить `Content-Length-Range` условие при генерации presigned POST (не PUT). Для PUT — только application-level проверка.

---

### H-4: Порядок проверок при расшифровке не зафиксирован

**Раздел:** 9 (Envelope Encryption), 25.1

**Проблема:** Раздел 9 описывает поля шифрования, раздел 25.1 — обязательный `bytes()` вызов. Но **порядок операций при запросе контента** не задокументирован. Потенциальная уязвимость:

```
# НЕБЕЗОПАСНЫЙ порядок:
dek = redis.get(f"dek:{prompt_id}")  # кеш DEK
if not dek:
    dek = vault.decrypt(prompt.encrypted_dek)
    redis.set(f"dek:{prompt_id}", dek, ex=600)
# PromptAccess проверяется ПОСЛЕ
access = PromptAccess.objects.filter(buyer=user, prompt=prompt).exists()
```

При таком порядке: если PromptAccess был удалён (Refund), но DEK ещё в кеше — пользователь получает DEK до проверки. Хотя в данном сценарии шифрование ещё впереди, DEK сам по себе достаточен для расшифровки при утечке. При параллельных Refund + content request race condition может пройти.

**Исправление:** Зафиксировать обязательный порядок в разделе 25 (Implementation Conventions):

```
1. Проверить PromptAccess (DB запрос) → если нет → 403
2. Получить DEK из Redis кеша → если нет → запросить Vault decrypt
3. Расшифровать encrypted_content + проверить auth_tag (GCM)
4. Вернуть контент
```

DEK кеш никогда не читается до проверки PromptAccess.

---

### H-5: Zero-downtime migration стратегия отсутствует

**Раздел:** 18 (Инфраструктура)

**Проблема:** «Миграции выполняются в Docker entrypoint до gunicorn». Это стандартный подход, но для production с `Prompt` таблицей в 100K+ записей ряд Django migrations создаёт **эксклюзивные блокировки таблицы** на время выполнения:

- `AddField(null=False, default=...)` — переписывает все строки (ACCESS EXCLUSIVE lock)
- `CreateIndex` (без CONCURRENTLY) — блокирует таблицу на время построения индекса
- `AlterField` на `CharField` с увеличением max_length — зависит от PostgreSQL версии

При таблице в 100K промптов и стандартном `CREATE INDEX` — блокировка может длиться 30-120 секунд. За это время все INSERT/UPDATE/SELECT (через lock) блокируются. В production → 500 ошибки.

**Исправление:** Добавить в раздел 18 и 25 правила безопасных миграций:

```python
# НЕБЕЗОПАСНО для production:
models.Index(fields=["title"])  # в обычной migration → ACCESS EXCLUSIVE

# БЕЗОПАСНО:
# В migration: CreateIndex с CONCURRENTLY (Django 4.x+):
from django.contrib.postgres.operations import CreateExtension
# Используй SeparateDatabaseAndState + RunSQL:
migrations.RunSQL(
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS prompt_title_idx ON prompts_prompt (title);",
    reverse_sql="DROP INDEX CONCURRENTLY IF EXISTS prompt_title_idx;"
)

# Добавление NOT NULL поля: сначала nullable → данные → добавить NOT NULL constraint (отдельная migration)
```

Добавить в `docs/runbook.md` раздел "Правила безопасных миграций".

---

### H-6: Централизованный сбор логов и correlation ID отсутствуют

**Раздел:** 20 (Мониторинг), 18

**Проблема:** Система генерирует логи в нескольких местах:
- 4+ Gunicorn worker processes → stdout контейнера
- 5 Celery queues × N workers → отдельные контейнеры
- Next.js SSR → свои логи

При отладке падения платёжного flow (`Purchase PENDING → webhook → SUCCESS → PromptAccess`) нужно:
1. Найти запрос в Django логах
2. Найти соответствующую Celery задачу (в другом контейнере)
3. Сопоставить по времени или ID

Без **correlation ID** и централизации логов это занимает часы. Sentry собирает ошибки, но не structured request logs.

**Исправление (минимальный):**

1. Добавить Django middleware для генерации `X-Request-ID` (UUID) для каждого запроса и проброса в логи:
```python
import uuid
class RequestIDMiddleware:
    def __call__(self, request):
        request.id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        response = self.get_response(request)
        response["X-Request-ID"] = request.id
        return response
```

2. Передавать `request_id` в Celery tasks как kwarg (не из контекста).
3. Для сбора логов — минимум: `docker compose logs --follow --tail=1000 | grep request_id`. Рекомендуется Loki + Grafana (self-hosted, РФ-совместимо) или централизованный journald.

Добавить `X-Request-ID` в Nginx access log format.

---

### H-7: KYC re-submission flow не описан

**Раздел:** 10 (API), 11.2 (Dadata)

**Проблема:** `POST /seller/kyc/` запускает KYC-задачу и возвращает `{"kyc_status": "PENDING"}`. Но что происходит, если KYC был `REJECTED`?

- Может ли продавец повторно отправить исправленный ИНН? Endpoint не описывает это поведение.
- При `kyc_status=VERIFIED` → повторный POST — переводит ли обратно в PENDING (что аннулирует возможность продавать)?
- Что происходит с промптами продавца при переходе `VERIFIED → PENDING`?

Это создаёт неопределённость при реализации.

**Исправление:** Добавить в раздел 11.2 и описание endpoint:

| kyc_status (текущий) | POST /seller/kyc/ | Поведение |
|---------------------|-------------------|-----------|
| PENDING | ❌ 400 | Проверка уже запущена |
| VERIFIED | ❌ 403 | Уже верифицирован |
| REJECTED | ✅ | Можно повторно подать ИНН (и/или legal_type) → статус → PENDING |
| CANCELLED | ✅ | Аналогично REJECTED |

При re-submission: старый `kyc_rejection_reason` обнуляется, статус → PENDING.

---

### H-8: OpenAPI /docs доступен в production без защиты

**Раздел:** 10 (API Contract)

**Проблема:** `GET /api/v1/docs` — Django Ninja автогенерирует Swagger UI. В production он раскрывает полную схему API, включая защищённые endpoints, форматы запросов и примеры payload. Это упрощает работу злоумышленникам (reconnaissance phase).

**Исправление:** В `config/settings/production.py`:
```python
# Отключить Swagger UI в production
api = NinjaAPI(docs=None)  # или docs_url=None
```
Либо защитить Basic Auth или IP whitelist (только для разработчиков).

В staging — оставить доступным для тестирования.

---

## MEDIUM — 9 замечаний

---

### M-1: Отсутствует ADR для выбора Django Ninja vs DRF

**Проблема:** 14 ADRs охватывают всё от KMS до Captcha, но выбор API-фреймворка — ключевое архитектурное решение, влияющее на весь процесс разработки — не задокументирован. Django Ninja: type-hints, Pydantic, async-first, auto-OpenAPI. DRF: зрелая экосистема, browsable API, ViewSets, GenericViews.

**Рекомендация:** Добавить ADR-015: "Использовать Django Ninja вместо DRF для API".

---

### M-2: Per-user rate limiting отсутствует

**Проблема:** Rate limiting в Nginx — только по IP (`$binary_remote_addr`). Аутентифицированные пользователи за корпоративным прокси (например, 1000 человек с одним IP) делят общий лимит. Обратная проблема: один аккаунт с динамическим IP может обходить per-IP лимит.

**Рекомендация:** Добавить Django middleware для per-user rate limiting аутентифицированных запросов (Redis-based, ключ `ratelimit:user:{user_id}:{endpoint}`). Библиотека: `django-ratelimit`.

---

### M-3: HNSW параметр ef_search не задан

**Раздел:** 9 (Prompt Meta.indexes)

**Проблема:** Индекс создаётся с `m=16, ef_construction=64`. Но `ef_search` (параметр запроса, определяющий соотношение скорость/качество поиска) не установлен. По умолчанию в pgvector он равен `ef_construction`, что может быть неоптимально.

Например: при `ef_search=40` поиск быстрее, recall=0.95; при `ef_search=100` — медленнее, recall=0.99.

**Рекомендация:** Добавить в раздел 6.1 или 16:
```sql
SET hnsw.ef_search = 64;  -- или через pgvector SET per-session
```
Зафиксировать рекомендуемое значение и методологию его выбора (нагрузочное тестирование recall vs latency).

---

### M-4: N+1 запросы при загрузке каталога

**Раздел:** 25 (Соглашения)

**Проблема:** Endpoint `GET /catalog/prompts` возвращает список промптов с полями seller, category, tags. Без явного `select_related`/`prefetch_related` это N+1 запросов:
- 1 запрос: SELECT prompts
- N запросов: SELECT category WHERE id=? (для каждого промпта)
- N запросов: SELECT user WHERE id=? (seller)
- N запросов: SELECT tags WHERE prompt_id=? (через ManyToMany)

При limit=20: 61 SQL запрос вместо 4.

**Рекомендация:** Добавить в раздел 25 (Соглашения по реализации) подраздел 25.7 "Оптимизация ORM запросов":
```python
# Обязательный queryset для каталога:
Prompt.objects.filter(status="PUBLISHED")
    .select_related("seller", "category")
    .prefetch_related("tags")
```

---

### M-5: Сроки выплат продавцам не описаны

**Раздел:** 3, 4.2

**Проблема:** Документ описывает сплитование платежей, но не отвечает на вопрос: **когда** деньги поступают на счёт продавца? Robokassa Split имеет hold period. Это влияет на онбординг продавцов и юридические требования к публичной оферте.

**Рекомендация:** Добавить в раздел 3.1:
- Срок поступления средств продавцу (обычно 3-5 рабочих дней по условиям Robokassa)
- Минимальный порог выплаты (если есть)
- Что происходит при Refund после выплаты (чарджбек модель)

---

### M-6: Сканирование Docker-образов в CI отсутствует

**Раздел:** 18 (CI)

**Проблема:** CI включает `pip-audit` (Python deps), `npm audit` (JS deps), но не сканирует Docker-образ на уязвимости на уровне OS. Base image (python:3.12-slim) может содержать уязвимые системные пакеты.

**Рекомендация:** Добавить в CI шаг `trivy image {image}:{tag}` после `docker build`. Trivy — open source, не требует интернет-сервиса (можно offline DB). Пороговое условие: fail при `CRITICAL` уязвимостях.

---

### M-7: Ротация SECRET_KEY и OAuth client secrets не описана

**Раздел:** 19, 11.4

**Проблема:** Ротируется только `VAULT_SECRET_ID` (30 дней). Но:
- **`SECRET_KEY`**: при смене — все активные JWT tokens (access + refresh, в blacklist) становятся невалидными. Mass logout всех пользователей одновременно. Стратегия ротации нигде не описана.
- **`ROBOKASSA_PASSWORD1/2`**: при компрометации — злоумышленник может создавать фиктивные webhook'и.
- **OAuth client secrets**: при компрометации — MITM OAuth flow.

**Рекомендация:** Добавить в раздел 19 или 25 политику ротации ключей:

| Секрет | Частота ротации | Побочный эффект | Процедура |
|--------|----------------|-----------------|-----------|
| `SECRET_KEY` | При компрометации / 1 год | Mass logout (все JWT становятся invalid) | Двухшаговая: старый + новый ключ одновременно (grace period 15 мин) |
| `ROBOKASSA_PASSWORD2` | При компрометации | Webhook подписи становятся невалидны | Обновить в Robokassa кабинете + env |
| OAuth secrets | При компрометации | Все OAuth сессии прерываются | Обновить в консоли провайдера + env |

---

### M-8: Мониторинг очередей Celery — механизм неизвестен

**Раздел:** 20 (Алерты)

**Проблема:** Таблица алертов содержит: «Celery queue critical | длина >100 | Telegram». Но документ не описывает, **как** измеряется длина очереди. `redis-cli llen celery` — ручной. Автоматический: нужен либо Flower, либо кастомный Zabbix/Prometheus exporter.

**Рекомендация:** Уточнить в разделе 20: инструмент для мониторинга Celery очередей. Варианты:
- **Flower** — self-hosted Celery dashboard, real-time monitoring (рекомендуется для staging, но избегать в production — раскрывает task details).
- **prometheus-celery-exporter** — Prometheus metrics, интегрируется с Grafana.
- **Кастомный Zabbix**: `celery inspect stats` → парсинг → Zabbix трап.

Минимально для MVP: Celery Beat задача `check_celery_queues` каждые 2 минуты → Redis `LLEN` → при >100 → Telegram alert.

---

### M-9: Бизнес-метрики — место агрегации не описано

**Раздел:** 4.2, 20

**Проблема:** Раздел 20 перечисляет бизнес-метрики (GMV, регистрации, KYC conversion), которые агрегирует Celery Beat. Раздел 4.2 описывает "дашборд аналитики" продавца. Но нигде не описано:
- Где хранятся **платформенные** бизнес-метрики (для Superadmin)? В `SiteSettings`? В отдельной модели `PlatformDailyStats`?
- Где отображается Superadmin-дашборд? В Django Admin (стандартные views)? В отдельном `/admin/analytics/` разделе?

**Рекомендация:** Добавить модель `PlatformDailyStats` (аналог `SellerDailyStats`) и описать, что Superadmin видит агрегаты в Django Admin через кастомный `AdminSite` view или read-only changelist.

---

## Приоритизация для v1.3

### Sprint 0 (до code freeze, блокирующие)

| ID | Работа | Оценка |
|----|--------|--------|
| C-1 | AuditLog partition automation (Celery task + первичные DDL) | 4ч |
| C-2 | Prompt versioning: зафиксировать Вариант A в документе (запрет edit content) | 2ч |
| C-3 | Telegram notifications: убрать ПДн из body, добавить Telegram в DPA список | 2ч |
| H-1 | /health/ добавить Vault check + алерт 503 | 1ч |
| H-2 | CSRF стратегия: зафиксировать в документе + раздел 25 | 1ч |
| H-3 | Confirm endpoint: size + MIME проверка | 1ч |
| H-4 | Порядок операций при decrypt: зафиксировать в раздел 25 | 1ч |

### Sprint 1 (перед production release)

| ID | Работа | Оценка |
|----|--------|--------|
| H-5 | Zero-downtime migrations: добавить правила в раздел 18 + docs/runbook.md | 2ч |
| H-6 | X-Request-ID middleware + Nginx log format | 3ч |
| H-7 | KYC re-submission flow: документ + endpoint behavior table | 1ч |
| H-8 | OpenAPI docs: отключить в production settings | 30 мин |
| M-1 | ADR-015: Django Ninja vs DRF | 1ч |
| M-4 | select_related/prefetch_related guidance в раздел 25 | 1ч |

### Before Scale (при росте >10K users)

| ID | Работа |
|----|--------|
| M-2 | Per-user rate limiting (django-ratelimit) |
| M-3 | HNSW ef_search tuning |
| M-6 | Trivy image scanning в CI |
| M-7 | Полная политика ротации секретов |
| M-8 | Celery queue monitoring (Flower / Prometheus exporter) |
| M-9 | PlatformDailyStats модель + Superadmin dashboard |

---

## Пересмотренный итоговый балл

После устранения Sprint 0 + Sprint 1 замечаний документ достигнет **~93/100** и будет готов к production.

| Категория | Покрытие |
|-----------|----------|
| Архитектура | 95% |
| Безопасность | 88% → 95% после H-1..H-4 |
| Комплаенс 152-ФЗ | 85% → 95% после C-3 |
| Data Model | 95% |
| API Contract | 92% |
| Тестирование | 90% |
| Operations | 75% → 90% после H-5..H-6 |
| ADRs | 90% → 93% после M-1 |

---

*Аудит: promptspace-audit-report-v2.md | 2026-02-26 | Senior System Architect*
