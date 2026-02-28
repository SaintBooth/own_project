.PHONY: help up down logs shell migrate makemigrations test lint fmt check vault-init

help:  ## Показать список команд
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Docker ────────────────────────────────────────────────────────────────
up:  ## Запустить все сервисы
	docker compose up -d

up-infra:  ## Запустить только инфраструктуру (db, redis, vault, pgbouncer)
	docker compose up -d db redis vault pgbouncer

down:  ## Остановить все сервисы
	docker compose down

logs:  ## Логи всех сервисов
	docker compose logs -f

logs-web:  ## Логи Django
	docker compose logs -f web

logs-celery:  ## Логи Celery
	docker compose logs -f celery

ps:  ## Статус контейнеров
	docker compose ps

# ── Django ────────────────────────────────────────────────────────────────
migrate:  ## Применить миграции (через DATABASE_DIRECT_URL)
	docker compose exec web python manage.py migrate --database=direct

makemigrations:  ## Создать миграции
	docker compose exec web python manage.py makemigrations

shell:  ## Django shell
	docker compose exec web python manage.py shell

createsuperuser:  ## Создать суперпользователя
	docker compose exec web python manage.py createsuperuser

check:  ## Django deploy check
	docker compose exec web python manage.py check --deploy

# ── Тесты ─────────────────────────────────────────────────────────────────
test:  ## Запустить тесты с покрытием
	cd backend && python -m pytest --cov=. --cov-report=term-missing

test-fast:  ## Быстрые тесты без coverage
	cd backend && python -m pytest -x -q

test-ci:  ## Тесты для CI
	cd backend && python -m pytest --cov=. --cov-report=xml -q

# ── Линтинг и форматирование ──────────────────────────────────────────────
lint:  ## Проверить код (ruff + mypy)
	cd backend && ruff check . && mypy .

fmt:  ## Форматировать код
	cd backend && ruff format . && ruff check --fix .

security:  ## Проверить безопасность (bandit + pip-audit)
	cd backend && bandit -r apps/ services/ config/ -ll && pip-audit

# ── Комплексная проверка (как в CI) ──────────────────────────────────────
ci-check: lint security test-ci  ## Запустить все проверки CI локально

# ── Vault ─────────────────────────────────────────────────────────────────
vault-init:  ## Инициализировать Vault Transit secrets engine (dev)
	@echo "Настройка Vault Transit..."
	docker compose exec vault vault secrets enable transit || true
	docker compose exec vault vault write -f transit/keys/promptspace-kek type=aes256-gcm96
	@echo "Vault готов. KEK: promptspace-kek"

vault-status:  ## Проверить статус Vault
	docker compose exec vault vault status

vault-shell:  ## Открыть shell в контейнере Vault
	docker compose exec vault sh

# ── Frontend ──────────────────────────────────────────────────────────────
frontend-install:  ## Установить зависимости frontend
	cd frontend && npm install

frontend-dev:  ## Запустить frontend в режиме разработки
	cd frontend && npm run dev

frontend-build:  ## Собрать frontend
	cd frontend && npm run build

frontend-lint:  ## Проверить frontend код
	cd frontend && npm run lint && npx tsc --noEmit

frontend-test:  ## Тесты frontend
	cd frontend && npm run test

# ── Первоначальная настройка ──────────────────────────────────────────────
setup:  ## Первоначальная настройка проекта
	@echo "1. Копирование .env..."
	@cp -n .env.example .env || echo ".env уже существует"
	@echo "2. Запуск инфраструктуры..."
	$(MAKE) up-infra
	@echo "3. Ожидание готовности сервисов (15 сек)..."
	@sleep 15
	@echo "4. Инициализация Vault Transit..."
	$(MAKE) vault-init
	@echo "5. Применение миграций..."
	$(MAKE) migrate
	@echo ""
	@echo "✓ Настройка завершена! Запусти: make up"
