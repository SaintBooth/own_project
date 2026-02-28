# PromptSpace — Настройка MCP и инструкция по проверке

<!--
  Версия: 1.0 | Дата: 2026-02-28
  Платформа: Windows 11, Node.js 22
  Cursor версия: ≥0.45
-->

> MCP (Model Context Protocol) — стандарт, позволяющий AI-ассистентам (Cursor, Claude Code)
> напрямую работать с инструментами разработки: PostgreSQL, Redis, GitHub, браузером и т.д.

---

## Содержание

1. [Требования](#1-требования)
2. [Структура конфигурации](#2-структура-конфигурации)
3. [Настройка Cursor](#3-настройка-cursor)
4. [Настройка Claude Code](#4-настройка-claude-code)
5. [Описание каждого сервера](#5-описание-каждого-сервера)
6. [Проверка работы](#6-проверка-работы)
7. [Устранение проблем](#7-устранение-проблем)

---

## 1. Требования

### Обязательно

| Компонент | Версия | Проверка |
|-----------|--------|----------|
| Node.js | ≥ 18 LTS | `node --version` |
| npm / npx | ≥ 9 | `npm --version` |
| Cursor | ≥ 0.45 | Help → About |

### Для конкретных серверов

| Сервер | Требование |
|--------|-----------|
| postgres | Docker: `prompt_marketplace_db` запущен (порт 5432) |
| redis | Docker: `prompt_marketplace_redis` запущен (порт 6379) |
| github | Переменная окружения `GITHUB_TOKEN` |
| playwright | Браузеры Playwright (ставятся автоматически при первом запуске) |
| brave-search | Переменная окружения `BRAVE_API_KEY` |

### Быстрая проверка готовности

```bash
# Запусти из папки проекта
bash scripts/check-services.sh
bash scripts/verify-mcp.sh
```

---

## 2. Структура конфигурации

```
C:\dev\claude_skills_tests\
├── .cursor\
│   ├── mcp.json              ← MCP для Cursor (workspace-level)
│   └── rules\
│       └── promptspace.mdc   ← Правила проекта (MDC формат)
├── .cursorrules              ← Правила проекта (legacy формат)
├── CLAUDE.md                 ← Инструкции для Claude Code
└── docs\
    └── mcp-setup.md          ← Этот файл
```

**Где лежит конфиг Cursor MCP:** `.cursor/mcp.json`

> Это workspace-level конфиг — действует только когда Cursor открыт в папке
> `C:\dev\claude_skills_tests`. Для глобального конфига — `%APPDATA%\Cursor\User\mcp.json`.

---

## 3. Настройка Cursor

### Шаг 1 — Открой проект в Cursor

```
File → Open Folder → C:\dev\claude_skills_tests
```

Cursor автоматически обнаружит `.cursor/mcp.json` в корне проекта.

### Шаг 2 — Проверь что серверы подхвачены

```
Cursor Settings (Ctrl+Shift+J) → MCP
```

Ты увидишь список серверов из `mcp.json`. Статус может быть:
- 🟢 **Connected** — сервер работает
- 🔴 **Error** — ошибка (смотри лог в панели)
- ⚪ **Disabled** — сервер отключён

### Шаг 3 — Задай переменные окружения

MCP серверы наследуют переменные из окружения Shell. Добавь в `~/.bashrc` (или `~/.zshrc`):

```bash
# GitHub Personal Access Token (нужен для github MCP)
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Brave Search API (опционально, для brave-search MCP)
export BRAVE_API_KEY="BSAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

После добавления:
```bash
source ~/.bashrc   # или перезапусти терминал
```

**Важно:** Cursor читает переменные окружения из того Shell, из которого он запущен. Если Cursor запущен не из терминала, а кликом по иконке — переменные могут не передаться. В этом случае добавь их напрямую в `.cursor/mcp.json` (но не коммить этот файл в git!).

### Шаг 4 — Подтверди запуск серверов

В Cursor Chat нажми `@` и проверь что MCP инструменты видны:

```
@ → должны появиться инструменты: read_file, query (postgres), redis_get, и т.д.
```

---

## 4. Настройка Claude Code

Claude Code использует собственный MCP конфиг (отдельно от Cursor).

### Вариант A — Добавить серверы через CLI (рекомендуется)

Выполни эти команды из папки `C:\dev\claude_skills_tests`:

```bash
# 1. Filesystem (доступ к файлам проекта)
claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem C:\\dev\\claude_skills_tests

# 2. PostgreSQL
claude mcp add postgres -- npx -y @modelcontextprotocol/server-postgres postgresql://postgres:postgres@localhost:5432/prompt_marketplace

# 3. Redis
claude mcp add redis -- npx -y redis-mcp

# 4. GitHub
claude mcp add github -e GITHUB_PERSONAL_ACCESS_TOKEN=$GITHUB_TOKEN -- npx -y @modelcontextprotocol/server-github

# 5. Playwright
claude mcp add playwright -- npx -y @playwright/mcp@latest

# 6. Memory
claude mcp add memory -- npx -y @modelcontextprotocol/server-memory

# 7. Sequential Thinking
claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking

# 8. Brave Search (если есть ключ)
claude mcp add brave-search -e BRAVE_API_KEY=$BRAVE_API_KEY -- npx -y @modelcontextprotocol/server-brave-search
```

### Вариант B — Посмотреть текущие серверы

```bash
claude mcp list
```

### Вариант C — Удалить сервер

```bash
claude mcp remove <name>
```

### Проверка в Claude Code

```bash
claude  # запусти Claude Code в папке проекта
# Затем спроси: "Какие MCP инструменты у тебя доступны?"
```

---

## 5. Описание каждого сервера

### `filesystem` — Доступ к файлам проекта

**Пакет:** `@modelcontextprotocol/server-filesystem`
**Путь:** `C:\dev\claude_skills_tests`

**Зачем:** AI видит структуру папок и читает файлы без явного `cat`. Cursor и Claude Code смогут самостоятельно навигировать по документации, находить нужные разделы спецификации.

**Что можно делать:**
```
"Найди в спецификации раздел про Envelope Encryption"
"Покажи все задачи Sprint 2 из docs/planning/"
"В каком файле описан ADR-009?"
```

**Проверка:**
```bash
# В Cursor Chat:
@filesystem прочитай docs/spec/promptspace-release.md первые 50 строк
```

---

### `postgres` — PostgreSQL запросы

**Пакет:** `@modelcontextprotocol/server-postgres`
**DSN:** `postgresql://postgres:postgres@localhost:5432/prompt_marketplace`

**Зачем:** Отладка SQL запросов, анализ схемы БД, EXPLAIN ANALYZE, проверка pgvector индексов — всё это прямо в чате без переключения на DBeaver/psql.

> ⚠️ **Только dev/staging!** Никогда не подключай к production БД.

**Что можно делать:**
```sql
-- Проверить статистику промптов
"Покажи количество промптов по статусам"

-- Отладить производительность
"Запусти EXPLAIN ANALYZE для запроса каталога с фильтром по category_id"

-- Проверить pgvector
"Проверь что расширение vector установлено и покажи индексы таблицы prompts_prompt"
```

**Проверка:**
```bash
# Предварительно: docker compose up db -d
# В Cursor Chat:
@postgres SELECT version();
@postgres SELECT extversion FROM pg_extension WHERE extname = 'vector';
```

**Если БД пустая (начало разработки):**
```bash
docker compose up db -d
# Подожди 10 сек, затем:
docker compose exec db psql -U postgres -c "CREATE DATABASE prompt_marketplace;"
```

---

### `redis` — Redis инспекция

**Пакет:** `redis-mcp`
**URL:** `redis://localhost:6379`

**Зачем:** Смотреть OTP коды, JWT blacklist, Celery очереди, rate limit счётчики — без redis-cli.

> ⚠️ **Только dev!** Redis содержит сессии и OTP — не подключай к production.

**Что можно делать:**
```
"Покажи все ключи otp:*"
"Есть ли элементы в очереди Celery?"
"Покажи TTL для ключа jwt:revoked:..."
```

**Проверка:**
```bash
# Предварительно: docker compose up redis -d
# В Cursor Chat:
@redis PING
@redis DBSIZE
```

---

### `github` — GitHub интеграция

**Пакет:** `@modelcontextprotocol/server-github`
**Auth:** `GITHUB_TOKEN` (Personal Access Token)

**Зачем:** Создавать issues по задачам из спринтов, просматривать PR, смотреть статус GitHub Actions — без переключения в браузер.

**Получить токен:**
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Нужные scope: `repo`, `read:org`, `workflow`
3. Добавить в `~/.bashrc`: `export GITHUB_TOKEN="ghp_..."`

**Что можно делать:**
```
"Создай issue 'Sprint 1: Email OTP authentication' с описанием из задачи B1-1"
"Покажи открытые PR в репозитории"
"Какой статус у последнего GitHub Actions workflow?"
```

**Проверка:**
```bash
# В Cursor Chat (после задания GITHUB_TOKEN):
@github list my repositories
```

---

### `playwright` — Браузерная автоматизация и E2E

**Пакет:** `@playwright/mcp@latest`

**Зачем:** Запускать E2E тесты прямо из чата, делать скриншоты, проверять что Cookie-баннер работает, тестировать OAuth flow.

**При первом запуске** Playwright скачает браузеры (~300 МБ). Это нормально.

**Что можно делать:**
```
"Открой http://localhost:3000 и сделай скриншот главной страницы"
"Проверь что кнопка 'Войти' видна без прокрутки"
"Запусти E2E сценарий: перейди на /catalog, дождись загрузки списка, сделай скриншот"
```

**Проверка:**
```bash
# В Cursor Chat (Next.js должен быть запущен на :3000):
@playwright navigate to http://localhost:3000 and take screenshot
```

---

### `memory` — Постоянная память между сессиями

**Пакет:** `@modelcontextprotocol/server-memory`

**Зачем:** AI запоминает контекст между разными чат-сессиями — принятые решения, текущий спринт, статус задач.

**Что сохранять:**
```
"Запомни: мы на Sprint 2, задача B2-1 (Envelope Encryption) в работе"
"Запомни: ADR-016 принят — LLM Guard OSS + Yandex Foundation Models"
"Что ты помнишь о текущем статусе проекта?"
```

**Проверка:**
```bash
# В Cursor Chat:
@memory store: PromptSpace проект, Sprint 0 завершён, начинаем Sprint 1
@memory что ты знаешь о PromptSpace?
```

---

### `sequential-thinking` — Пошаговое рассуждение

**Пакет:** `@modelcontextprotocol/server-sequential-thinking`

**Зачем:** Для сложных архитектурных задач — race conditions, анализ Envelope Encryption flow, планирование zero-downtime миграций.

**Что можно делать:**
```
"Используя sequential thinking, проанализируй race condition в process_purchase_success"
"Пошагово разбери порядок операций при anonymize_account (7 шагов из §2.5)"
"Спланируй zero-downtime миграцию добавления колонки в таблицу purchases"
```

**Проверка:** этот сервер не требует внешних зависимостей — просто работает.

---

### `brave-search` — Поиск документации

**Пакет:** `@modelcontextprotocol/server-brave-search`
**Auth:** `BRAVE_API_KEY` (получить на brave.com/search/api/)

**Зачем:** Искать документацию Django, Vault, pgvector, Robokassa API прямо из чата.

**Получить ключ (бесплатно до 2000 запросов/мес):**
1. Зайди на https://brave.com/search/api/
2. Зарегистрируйся → Free plan
3. Скопируй API key
4. `export BRAVE_API_KEY="BSA..."`

**Что можно делать:**
```
"Найди документацию HashiCorp Vault Transit secrets engine Python примеры"
"Найди pgvector HNSW index tuning для Django"
"Последние новости про Robokassa Split API"
```

---

## 6. Проверка работы

### Шаг 1 — Проверка npm пакетов

```bash
bash scripts/verify-mcp.sh
```

Ожидаемый вывод:
```
Обязательные MCP серверы:
  ✓ filesystem (@modelcontextprotocol/server-filesystem@...)
  ✓ postgres    (@modelcontextprotocol/server-postgres@0.6.2)
  ✓ memory      (@modelcontextprotocol/server-memory@2026.1.26)
  ✓ seq-think   (@modelcontextprotocol/server-sequential-thinking@...)

Рекомендуемые MCP серверы:
  ✓ github      (@modelcontextprotocol/server-github@2025.4.8)
  ✓ playwright  (@playwright/mcp@0.0.68)
  ✓ redis       (redis-mcp@0.0.4)
  ✓ brave-srch  (@modelcontextprotocol/server-brave-search@0.6.2)
```

### Шаг 2 — Проверка сервисов

```bash
bash scripts/check-services.sh
```

### Шаг 3 — Проверка в Cursor

Открой Cursor в папке `C:\dev\claude_skills_tests`, затем:

```
Cursor Settings → MCP
```

Убедись что все 8 серверов отображаются. Серверы без ENV переменных (filesystem, memory, sequential-thinking, playwright) должны быть зелёными сразу.

### Шаг 4 — Функциональная проверка каждого сервера

Открой Cursor Chat и выполни следующие проверки:

#### filesystem ✓
```
Прочитай первые 10 строк файла CLAUDE.md
```
Ожидание: AI читает и возвращает содержимое файла.

#### postgres ✓ (требует запущенный docker)
```
@postgres SELECT current_database(), version();
```
Ожидание: `prompt_marketplace | PostgreSQL 16.x`

#### redis ✓ (требует запущенный docker)
```
@redis PING
```
Ожидание: `PONG`

#### github ✓ (требует GITHUB_TOKEN)
```
@github list my repositories, show only names
```
Ожидание: список твоих репозиториев.

#### playwright ✓
```
@playwright navigate to https://example.com and tell me the page title
```
Ожидание: "Example Domain"

#### memory ✓
```
@memory remember: PromptSpace Sprint 1 started on 2026-03-01
```
Затем в новой сессии:
```
@memory what do you know about PromptSpace?
```
Ожидание: AI вспоминает сохранённый контекст.

#### sequential-thinking ✓
```
@sequential-thinking analyze the race condition risk in:
purchase.status = SUCCESS; save(); create_access();
```
Ожидание: пошаговый анализ.

#### brave-search ✓ (требует BRAVE_API_KEY)
```
@brave-search Django Ninja authentication middleware 2025
```
Ожидание: результаты поиска с ссылками.

---

## 7. Устранение проблем

### Сервер не появляется в Cursor MCP списке

**Причина:** Cursor не видит `.cursor/mcp.json` или файл невалидный JSON.

```bash
# Проверить JSON синтаксис
node -e "JSON.parse(require('fs').readFileSync('.cursor/mcp.json','utf8')); console.log('JSON валиден')"
```

Если ошибка — открой `.cursor/mcp.json` и найди лишнюю запятую или кавычку.

---

### postgres: `ECONNREFUSED localhost:5432`

**Причина:** PostgreSQL контейнер не запущен.

```bash
# Из папки с кодом проекта:
docker compose up db -d
docker compose ps  # убедись что state = running
```

---

### redis: ошибка подключения

**Причина:** Redis контейнер не запущен или неверный порт.

```bash
docker compose up redis -d
# Проверить:
nc -z localhost 6379 && echo "Redis доступен" || echo "Redis недоступен"
```

---

### github: `GITHUB_PERSONAL_ACCESS_TOKEN is not set`

**Причина:** Переменная окружения не передаётся в Cursor.

**Решение 1 (рекомендуется):** Запускай Cursor из терминала где задан токен:
```bash
export GITHUB_TOKEN="ghp_..."
cursor C:\dev\claude_skills_tests
```

**Решение 2 (временно, не коммить):** Пропишти токен напрямую в `.cursor/mcp.json`:
```json
"env": {
  "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_твой_токен_здесь"
}
```
Добавь `.cursor/mcp.json` в `.gitignore` если используешь это решение.

---

### playwright: браузеры не установлены

**Причина:** Первый запуск, браузеры ещё не скачаны.

```bash
npx playwright install chromium
# или все браузеры:
npx playwright install
```

---

### `npx: command not found`

**Причина:** Node.js не установлен или не в PATH.

```bash
# Windows: скачай с nodejs.org/en/download (LTS)
# Или через winget:
winget install OpenJS.NodeJS.LTS
# После установки перезапусти терминал
node --version
```

---

### MCP сервер запускается, но инструменты не видны в чате

**Причина:** В Cursor нужно явно использовать `@` для вызова MCP.

```
# Правильно:
@postgres SELECT 1;

# Неправильно (просто текст):
postgres SELECT 1;
```

Также убедись что в Cursor Settings → Features → MCP включено.

---

### redis-mcp не работает, REDIS_URL не передаётся

**Причина:** `redis-mcp` читает `REDIS_URL` из env, который должен быть задан в `mcp.json`.

Текущий конфиг в `.cursor/mcp.json` уже содержит:
```json
"env": {
  "REDIS_URL": "redis://localhost:6379"
}
```

Если проблема остаётся — попробуй передать URL как аргумент:
```json
"args": ["-y", "redis-mcp", "redis://localhost:6379"]
```

---

## Быстрая шпаргалка

```bash
# Проверить всё
bash scripts/check-services.sh && bash scripts/verify-mcp.sh

# Запустить БД и Redis
docker compose up db redis -d

# Добавить MCP в Claude Code
claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem C:\\dev\\claude_skills_tests
claude mcp add postgres -- npx -y @modelcontextprotocol/server-postgres postgresql://postgres:postgres@localhost:5432/prompt_marketplace
claude mcp list  # проверить

# Открыть проект в Cursor с правильным окружением
export GITHUB_TOKEN="ghp_..."
cursor C:\dev\claude_skills_tests

# Проверить JSON конфига
node -e "JSON.parse(require('fs').readFileSync('.cursor/mcp.json','utf8')); console.log('OK')"
```
