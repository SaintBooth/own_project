<#
.SYNOPSIS
    PromptSpace — PowerShell аналог Makefile для Windows
.EXAMPLE
    .\run.ps1 up-infra
    .\run.ps1 migrate
    .\run.ps1 test
#>

param([string]$Command = "help")

$ErrorActionPreference = "Stop"

function Write-Header($text) {
    Write-Host "`n── $text ──" -ForegroundColor Cyan
}

switch ($Command) {

    "help" {
        Write-Host ""
        Write-Host "PromptSpace run.ps1 — доступные команды:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  DOCKER"
        Write-Host "    up            " -NoNewline -ForegroundColor Green; Write-Host "Запустить все сервисы"
        Write-Host "    up-infra      " -NoNewline -ForegroundColor Green; Write-Host "Запустить db + redis + vault + pgbouncer"
        Write-Host "    down          " -NoNewline -ForegroundColor Green; Write-Host "Остановить все сервисы"
        Write-Host "    ps            " -NoNewline -ForegroundColor Green; Write-Host "Статус контейнеров"
        Write-Host "    logs          " -NoNewline -ForegroundColor Green; Write-Host "Логи всех сервисов"
        Write-Host "    logs-web      " -NoNewline -ForegroundColor Green; Write-Host "Логи Django"
        Write-Host ""
        Write-Host "  DJANGO"
        Write-Host "    migrate       " -NoNewline -ForegroundColor Green; Write-Host "Применить миграции"
        Write-Host "    makemigrations" -NoNewline -ForegroundColor Green; Write-Host "Создать миграции"
        Write-Host "    shell         " -NoNewline -ForegroundColor Green; Write-Host "Django shell"
        Write-Host "    check         " -NoNewline -ForegroundColor Green; Write-Host "Django deploy check"
        Write-Host ""
        Write-Host "  VAULT"
        Write-Host "    vault-init    " -NoNewline -ForegroundColor Green; Write-Host "Инициализировать Transit secrets engine"
        Write-Host "    vault-status  " -NoNewline -ForegroundColor Green; Write-Host "Статус Vault"
        Write-Host ""
        Write-Host "  ТЕСТЫ"
        Write-Host "    test          " -NoNewline -ForegroundColor Green; Write-Host "Запустить тесты с покрытием"
        Write-Host "    lint          " -NoNewline -ForegroundColor Green; Write-Host "ruff + mypy"
        Write-Host "    fmt           " -NoNewline -ForegroundColor Green; Write-Host "Форматировать код"
        Write-Host ""
        Write-Host "  ПЕРВЫЙ ЗАПУСК"
        Write-Host "    setup         " -NoNewline -ForegroundColor Green; Write-Host "Полная первоначальная настройка"
        Write-Host ""
    }

    # ── Docker ──────────────────────────────────────────────────────────────
    "up" {
        Write-Header "Запуск всех сервисов"
        docker compose up -d
    }

    "up-infra" {
        Write-Header "Запуск инфраструктуры (db, redis, vault, pgbouncer)"
        docker compose up -d db redis vault pgbouncer
        Write-Host "Ожидание готовности сервисов..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
        docker compose ps
    }

    "down" {
        Write-Header "Остановка сервисов"
        docker compose down
    }

    "ps" {
        docker compose ps
    }

    "logs" {
        docker compose logs -f
    }

    "logs-web" {
        docker compose logs -f web
    }

    "logs-celery" {
        docker compose logs -f celery
    }

    # ── Django ──────────────────────────────────────────────────────────────
    "migrate" {
        Write-Header "Применение миграций"
        docker compose exec web python manage.py migrate --database=direct
    }

    "makemigrations" {
        Write-Header "Создание миграций"
        docker compose exec web python manage.py makemigrations
    }

    "shell" {
        docker compose exec web python manage.py shell
    }

    "createsuperuser" {
        docker compose exec web python manage.py createsuperuser
    }

    "check" {
        Write-Header "Django deploy check"
        docker compose exec web python manage.py check --deploy
    }

    # ── Vault ───────────────────────────────────────────────────────────────
    "vault-init" {
        Write-Header "Инициализация Vault Transit secrets engine"
        docker compose exec -e VAULT_ADDR=http://127.0.0.1:8200 -e VAULT_TOKEN=dev-root-token vault vault secrets enable transit
        docker compose exec -e VAULT_ADDR=http://127.0.0.1:8200 -e VAULT_TOKEN=dev-root-token vault vault write -f transit/keys/promptspace-kek type=aes256-gcm96
        Write-Host "✓ Vault готов. KEK: promptspace-kek" -ForegroundColor Green
    }

    "vault-status" {
        docker compose exec -e VAULT_ADDR=http://127.0.0.1:8200 -e VAULT_TOKEN=dev-root-token vault vault status
    }

    # ── Тесты ───────────────────────────────────────────────────────────────
    "test" {
        Write-Header "Запуск тестов"
        Set-Location backend
        python -m pytest --cov=. --cov-report=term-missing
        Set-Location ..
    }

    "test-fast" {
        Set-Location backend
        python -m pytest -x -q
        Set-Location ..
    }

    "lint" {
        Write-Header "Линтинг (ruff + mypy)"
        Set-Location backend
        ruff check .
        mypy . --ignore-missing-imports
        Set-Location ..
    }

    "fmt" {
        Write-Header "Форматирование кода"
        Set-Location backend
        ruff format .
        ruff check --fix .
        Set-Location ..
    }

    # ── Frontend ────────────────────────────────────────────────────────────
    "frontend-install" {
        Write-Header "Установка frontend зависимостей"
        Set-Location frontend
        npm install
        Set-Location ..
    }

    "frontend-dev" {
        Write-Header "Frontend dev сервер"
        Set-Location frontend
        npm run dev
    }

    # ── Первоначальная настройка ─────────────────────────────────────────
    "setup" {
        Write-Header "Первоначальная настройка PromptSpace"

        if (-not (Test-Path ".env")) {
            Copy-Item ".env.example" ".env"
            Write-Host "✓ .env создан из .env.example" -ForegroundColor Green
            Write-Host "  → Открой .env и заполни SECRET_KEY и другие обязательные поля" -ForegroundColor Yellow
        } else {
            Write-Host "  .env уже существует" -ForegroundColor Gray
        }

        Write-Host "`n2. Запуск инфраструктуры..." -ForegroundColor Cyan
        docker compose up -d db redis vault pgbouncer

        Write-Host "`n3. Ожидание (15 сек)..." -ForegroundColor Cyan
        Start-Sleep -Seconds 15

        Write-Host "`n4. Инициализация Vault..." -ForegroundColor Cyan
        try {
            docker compose exec vault vault secrets enable transit
            docker compose exec vault vault write -f transit/keys/promptspace-kek type=aes256-gcm96
            Write-Host "✓ Vault Transit готов" -ForegroundColor Green
        } catch {
            Write-Host "  Vault Transit уже настроен или недоступен" -ForegroundColor Yellow
        }

        Write-Host "`n✓ Базовая настройка завершена!" -ForegroundColor Green
        Write-Host "  Следующие шаги:"
        Write-Host "    .\run.ps1 up        # запустить все сервисы"
        Write-Host "    .\run.ps1 migrate   # применить миграции"
    }

    default {
        Write-Host "Неизвестная команда: $Command" -ForegroundColor Red
        Write-Host "Запусти .\run.ps1 help для списка команд"
        exit 1
    }
}
