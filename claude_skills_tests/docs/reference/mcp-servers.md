# PromptSpace — Рекомендуемые MCP серверы

<!--
  Версия: 1.0
  Дата:   2026-02-28
  Контекст: Django 5 + Next.js 15 + PostgreSQL 16 + Redis 7 + Vault + Celery
-->

> MCP (Model Context Protocol) серверы позволяют AI-ассистентам (Cursor, Claude Code)
> напрямую взаимодействовать с инструментами разработки. Список составлен под стек PromptSpace.

---

## Содержание

1. [Обязательные (Core Dev Experience)](#1-обязательные)
2. [Backend-разработка](#2-backend-разработка)
3. [Frontend-разработка](#3-frontend-разработка)
4. [Инфраструктура и DevOps](#4-инфраструктура-и-devops)
5. [Тестирование и качество](#5-тестирование-и-качество)
6. [Настройка в Cursor](#6-настройка-в-cursor)

---

## 1. Обязательные

### 1.1 Filesystem MCP
**Назначение:** Чтение и навигация по файлам проекта.

```json
{
  "name": "filesystem",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/promptspace"]
}
```

**Использование в PromptSpace:**
- Навигация по `backend/apps/`, `frontend/app/`
- Чтение миграций и конфигов Django
- Анализ структуры Next.js App Router

---

### 1.2 GitHub MCP
**Назначение:** Управление issues, PR, ветками, Actions.

```json
{
  "name": "github",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "<token>"
  }
}
```

**Использование в PromptSpace:**
- Создание issues для каждой задачи из спринтов
- Просмотр статуса GitHub Actions (CI/CD)
- Code review комментарии
- Управление GitHub Environments (staging/production)

---

### 1.3 Memory MCP
**Назначение:** Сохранение контекста между сессиями (архитектурные решения, ADR).

```json
{
  "name": "memory",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-memory"]
}
```

**Использование в PromptSpace:**
- Сохранять принятые архитектурные решения (ADR-001..016)
- Запоминать текущий спринт и статус задач
- Контекст соглашений по реализации (раздел 25)

---

## 2. Backend-разработка

### 2.1 PostgreSQL MCP
**Назначение:** Прямые SQL-запросы к PostgreSQL для отладки и анализа данных.

```json
{
  "name": "postgres",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost:5432/promptspace_dev"]
}
```

> [!WARNING]
> Использовать **только** с dev/staging базой. Никогда не подключать к production БД через MCP.

**Использование в PromptSpace:**
- Анализ EXPLAIN ANALYZE для оптимизации запросов каталога
- Проверка pgvector индексов (`\d+ prompts_prompt`)
- Отладка партиций AuditLog (`pg_partman`)
- Проверка миграций: `SELECT * FROM django_migrations ORDER BY applied DESC`
- Анализ курсорной пагинации

**Ключевые запросы для PromptSpace:**
```sql
-- Проверить pgvector индекс
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'prompts_prompt';

-- Статистика по статусам промптов
SELECT status, COUNT(*) FROM prompts_prompt GROUP BY status;

-- Анализ производительности каталога
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM prompts_prompt WHERE status = 'PUBLISHED' ORDER BY created_at DESC LIMIT 20;
```

---

### 2.2 Redis MCP
**Назначение:** Просмотр и отладка Redis (OTP, JWT blacklist, rate limits, Celery queues).

```json
{
  "name": "redis",
  "command": "npx",
  "args": ["-y", "mcp-server-redis"],
  "env": {
    "REDIS_URL": "redis://localhost:6379"
  }
}
```

**Использование в PromptSpace:**
- Проверить OTP: `GET otp:user@example.com`
- Проверить JWT blacklist: `EXISTS jwt:revoked:{jti}`
- Отладка brute-force счётчиков: `GET otp:blocked:user@example.com`
- Мониторинг Celery очередей: `LLEN celery`
- Проверка DEK кеша: `KEYS dek:*`
- Rate limit счётчики: `GET rate:{zone}:{key}`

---

### 2.3 Docker MCP
**Назначение:** Управление Docker Compose сервисами во время разработки.

```json
{
  "name": "docker",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-docker"]
}
```

**Использование в PromptSpace:**
- Запуск/перезапуск сервисов: Vault, Redis, PostgreSQL, PgBouncer
- Просмотр логов: `docker compose logs -f celery`
- Проверка healthcheck контейнеров
- Управление Vault dev-кластером

---

### 2.4 Fetch / HTTP MCP
**Назначение:** Тестирование Django Ninja API endpoints напрямую.

```json
{
  "name": "fetch",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-fetch"]
}
```

**Использование в PromptSpace:**
- Тестирование `GET /api/v1/health/` (Vault/Redis/DB check)
- Отладка OTP flow: `POST /api/v1/auth/otp/send`
- Проверка Robokassa webhook: тестовый POST с подписью
- Тестирование `/api/v1/catalog/prompts` с разными фильтрами
- Проверка Rate Limiting заголовков

---

### 2.5 HashiCorp Vault MCP (если доступен)
**Назначение:** Управление секретами и KMS операции.

```json
{
  "name": "vault",
  "command": "uvx",
  "args": ["mcp-server-vault"],
  "env": {
    "VAULT_ADDR": "http://localhost:8200",
    "VAULT_TOKEN": "<dev-only-token>"
  }
}
```

> [!IMPORTANT]
> Только для **dev** кластера. В production используется только AppRole.

**Использование в PromptSpace:**
- Создание Transit secrets engine для тестирования Envelope Encryption
- Проверка AppRole конфигурации
- Ротация тестовых KEK
- Проверка Vault snapshot backup

---

## 3. Frontend-разработка

### 3.1 Playwright MCP (Browser Automation)
**Назначение:** E2E тестирование и отладка Next.js UI.

```json
{
  "name": "playwright",
  "command": "npx",
  "args": ["-y", "@executeautomation/playwright-mcp-server"]
}
```

**Использование в PromptSpace:**
- Прохождение 8 обязательных E2E сценариев (§15.3)
- Проверка Cookie-баннера: Метрика не инициализируется до клика
- Тестирование OAuth flow (Yandex, VK)
- Проверка KYC State Machine: middleware.ts блокировка
- Тестирование File Upload UX
- Accessibility audit через axe-core

**8 обязательных E2E сценариев для PromptSpace:**
```
1. Регистрация Email+OTP → просмотр каталога
2. OAuth Yandex → покупка платного промпта
3. Seller KYC submit → публикация промпта
4. Buyer покупка → доступ к контенту (расшифровка)
5. Бесплатный промпт → acquire (капча)
6. Refund через Admin → потеря PromptAccess
7. Anonymize account → промпты ARCHIVED
8. Moderator approve/reject очередь
```

---

### 3.2 Figma MCP (Design)
**Назначение:** Получение дизайн-токенов и компонентов из Figma.

```json
{
  "name": "figma",
  "command": "npx",
  "args": ["-y", "figma-mcp"],
  "env": {
    "FIGMA_API_KEY": "<token>"
  }
}
```

**Использование в PromptSpace:**
- Импорт цветовых токенов в Tailwind v4 конфиг
- Проверка соответствия shadcn/ui компонентов макетам
- Получение OG Image дизайна для карточек промптов

---

## 4. Инфраструктура и DevOps

### 4.1 Brave Search / Web Search MCP
**Назначение:** Поиск документации и решений.

```json
{
  "name": "brave-search",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-brave-search"],
  "env": {
    "BRAVE_API_KEY": "<key>"
  }
}
```

**Использование в PromptSpace:**
- Поиск Django 5 + Django Ninja документации
- HashiCorp Vault Transit secrets примеры
- pgvector HNSW индекс настройка
- Robokassa Split API документация
- YandexGPT Embeddings v3 API

---

### 4.2 Sentry MCP (если доступен)
**Назначение:** Просмотр ошибок и трейсов прямо в Cursor.

```json
{
  "name": "sentry",
  "command": "uvx",
  "args": ["mcp-server-sentry"],
  "env": {
    "SENTRY_AUTH_TOKEN": "<token>",
    "SENTRY_ORG": "promptspace"
  }
}
```

**Использование в PromptSpace:**
- Просмотр ошибок Celery задач (EMBEDDING_FAILED)
- Анализ Vault connection errors
- Трейсы покупок с OpenTelemetry trace_id
- Performance monitoring Next.js страниц

---

### 4.3 Zabbix MCP (если доступен)
**Назначение:** Мониторинг инфраструктуры.

Альтернатива для просмотра метрик из таблицы 20.2:
- `GET /api/v1/health/` через Fetch MCP как более простая альтернатива

---

## 5. Тестирование и качество

### 5.1 Sequential Thinking MCP
**Назначение:** Пошаговое решение сложных архитектурных задач.

```json
{
  "name": "sequential-thinking",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
}
```

**Использование в PromptSpace:**
- Анализ race conditions в `process_purchase_success`
- Разбор Envelope Encryption flow
- Планирование zero-downtime миграций
- Анализ 152-ФЗ compliance gaps

---

### 5.2 Everything MCP (Тестирование всех серверов)
**Назначение:** Локальный тестовый MCP с примерами всех инструментов.

```json
{
  "name": "everything",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-everything"]
}
```

---

## 6. Настройка в Cursor

### `.cursor/mcp.json` — минимальный набор для разработки

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
      "disabled": false
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres:postgres@localhost:5432/promptspace_dev"
      ]
    },
    "redis": {
      "command": "npx",
      "args": ["-y", "mcp-server-redis"],
      "env": {
        "REDIS_URL": "redis://localhost:6379"
      }
    },
    "fetch": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"]
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@executeautomation/playwright-mcp-server"]
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}
```

### Приоритет установки по спринтам

| Спринт | MCP серверы | Зачем |
|--------|-------------|-------|
| Sprint 0 | filesystem, github, docker | Инфраструктура, структура репо |
| Sprint 1 | + postgres, fetch, memory | Auth: SQL debug, API test |
| Sprint 2 | + redis, vault | Шифрование: DEK/KEK debug |
| Sprint 3 | + sequential-thinking | Сложная логика поиска |
| Sprint 4 | + playwright | E2E тесты модерации |
| Sprint 5 | + sentry, brave-search | Мониторинг, Production prep |

---

## Важные замечания

### 152-ФЗ и MCP

> [!WARNING]
> MCP серверы, подключённые к production PostgreSQL или Redis, могут **обрабатывать ПДн**.
> Это нарушает принципы минимальной привилегии и создаёт риски 152-ФЗ.
>
> **Правило:** MCP серверы баз данных подключать **только к dev/staging** средам.
> Никогда не подключать MCP к production PostgreSQL или Redis.

### Секреты в MCP конфигах

- Использовать переменные окружения (`${VAR_NAME}`), не хардкодить токены
- `.cursor/mcp.json` с токенами — в `.gitignore`
- Токены для MCP — минимальные права (read-only где возможно)

### Vault MCP и безопасность

- Dev Vault token в MCP конфиге — только для локальной разработки
- В CI/CD: Vault интеграция через AppRole, не через MCP
- Никогда не добавлять production Vault token в MCP конфиг

---

*При обновлении стека (pgvector → Qdrant, Unisender → другой провайдер) — обновить соответствующий MCP сервер.*
