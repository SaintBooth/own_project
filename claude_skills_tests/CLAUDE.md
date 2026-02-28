# PromptSpace — Claude Code Project Context

## Что это за папка

Рабочий workspace для проекта **PromptSpace** — маркетплейс AI-промптов для российского рынка.
Папка содержит документацию, спецификации и планирование. Код проекта — отдельный репозиторий.

## Структура

```
docs/
  spec/promptspace-release.md      ← ГЛАВНЫЙ документ (v2.3, source of truth)
  planning/promptspace-specs-sprints.md  ← Спринты и задачи по SPEC-001..013
  reference/mcp-servers.md         ← Справочник MCP серверов
  archive/                         ← Старые версии документов
  mcp-setup.md                     ← Инструкция по настройке MCP

.cursor/
  mcp.json                         ← MCP конфиг для Cursor
  rules/promptspace.mdc            ← Cursor правила (MDC формат)

.cursorrules                       ← Cursor правила (legacy формат)
scripts/
  verify-mcp.sh                    ← Скрипт проверки MCP серверов
  check-services.sh                ← Скрипт проверки локальных сервисов
```

## Технологический стек проекта

| Компонент | Технология |
|-----------|-----------|
| Backend API | Django 5 + Django Ninja |
| Frontend | Next.js 15 App Router |
| БД | PostgreSQL 16 + pgvector |
| Cache/Queue | Redis 7 + Celery 5 |
| KMS | HashiCorp Vault HA |
| Storage | Yandex Object Storage |
| Embeddings | YandexGPT v3 (только РФ, 152-ФЗ) |
| Payments | Robokassa Split |
| KYC | Dadata API |

## Локальные сервисы (docker-compose)

| Сервис | Порт | Connection string |
|--------|------|-------------------|
| PostgreSQL 16 + pgvector | 5432 | `postgresql://postgres:postgres@localhost:5432/prompt_marketplace` |
| Redis 7 | 6379 | `redis://localhost:6379` |
| Django API | 8000 | `http://localhost:8000` |
| Next.js | 3000 | `http://localhost:3000` |

## Критические правила (обязательны при написании кода)

1. **BinaryField** → всегда оборачивать в `bytes()` перед криптографией
2. **Счётчики** → только через `F()` выражения ORM (не `obj.count += 1`)
3. **Webhook/Celery** → проверять статус перед действием (идемпотентность)
4. **152-ФЗ** → OpenAI и зарубежные embedding-провайдеры **запрещены**
5. **Секреты** → никогда не логировать DEK, API ключи, OTP, refresh токены
6. **JWT blacklist** → fail closed при недоступности Redis (401, не pass-through)
7. Используй context7 MCP, когда мне нужна документация по библиотекам/API, генерация кода, шаги по настройке или конфигурации без необходимости явного запроса с моей стороны.

## Compliance

- Все серверы и БД — только в РФ (Yandex Cloud / Selectel)
- Telegram Bot: сообщения без ПДн (нет email, имён, сумм, названий промптов)
- `consent_pd_at` — datetime (не bool)
- Право на забвение: `anonymize_account` Celery задача, 7 шагов из §2.5 спецификации

## ADR (принятые архитектурные решения)

| ADR | Решение |
|-----|---------|
| ADR-001 | Vault HA = единственный источник KEK |
| ADR-002 | pgvector + HNSW для MVP; миграция на Qdrant при >5M промптов |
| ADR-003 | Robokassa Split; `Purchase.id` как платформенный UUID |
| ADR-009 | Rate limit через Nginx `map`-блок; ключ `api_agent` = хеш токена |
| ADR-015 | Django Ninja (не DRF) |
| ADR-016 | AISP: LLM Guard OSS + fallback Yandex Foundation Models |

## Спринты (MVP = 12 недель)

| Спринт | Недели | Фокус |
|--------|--------|-------|
| Sprint 0 | 1–2 | Инфраструктура, Vault, CI/CD |
| Sprint 1 | 3–4 | Auth (OTP/OAuth/JWT) + Каталог |
| Sprint 2 | 5–6 | Промпты + Шифрование + Платежи |
| Sprint 3 | 7–8 | Семантический поиск + Уведомления |
| Sprint 4 | 9–10 | Модерация + GDPR (152-ФЗ) |
| Sprint 5 | 11–12 | Производительность + Production |

Детали: `docs/planning/promptspace-specs-sprints.md`

## Разрешённые Bash команды

```bash
# Проверка сервисов
bash scripts/check-services.sh

# Проверка MCP серверов
bash scripts/verify-mcp.sh

# Добавить MCP сервер в Claude Code
claude mcp add <name> -- npx -y <package> <args>
```
