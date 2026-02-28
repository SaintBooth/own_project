#!/usr/bin/env bash
# check-services.sh — проверка локальных сервисов PromptSpace
# Запуск: bash scripts/check-services.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "${GREEN}  ✓${NC} $1"; }
fail() { echo -e "${RED}  ✗${NC} $1"; }
info() { echo -e "${YELLOW}  →${NC} $1"; }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PromptSpace — Service Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ERRORS=0

# ── PostgreSQL ──────────────────────────────
echo "PostgreSQL (localhost:5432)"
if nc -z localhost 5432 2>/dev/null; then
  ok "Port 5432 открыт"
  if command -v psql &>/dev/null; then
    DB_CHECK=$(PGPASSWORD=postgres psql -h localhost -U postgres -d prompt_marketplace -c "SELECT 1" 2>&1)
    if echo "$DB_CHECK" | grep -q "1 row"; then
      ok "База prompt_marketplace доступна"
      PG_VEC=$(PGPASSWORD=postgres psql -h localhost -U postgres -d prompt_marketplace -c "SELECT extversion FROM pg_extension WHERE extname='vector'" 2>/dev/null | grep -E "[0-9]+\.[0-9]+" || echo "")
      if [ -n "$PG_VEC" ]; then
        ok "pgvector расширение: $PG_VEC"
      else
        fail "pgvector расширение НЕ установлено → CREATE EXTENSION vector;"
        ERRORS=$((ERRORS+1))
      fi
    else
      fail "База prompt_marketplace недоступна (проверь docker compose up)"
      ERRORS=$((ERRORS+1))
    fi
  else
    info "psql не установлен — пропускаем проверку БД"
  fi
else
  fail "PostgreSQL не запущен → docker compose up db"
  ERRORS=$((ERRORS+1))
fi
echo ""

# ── Redis ───────────────────────────────────
echo "Redis (localhost:6379)"
if nc -z localhost 6379 2>/dev/null; then
  ok "Port 6379 открыт"
  if command -v redis-cli &>/dev/null; then
    PONG=$(redis-cli -h localhost -p 6379 PING 2>/dev/null || echo "")
    if [ "$PONG" = "PONG" ]; then
      ok "Redis PING → PONG"
      REDIS_INFO=$(redis-cli -h localhost -p 6379 INFO server 2>/dev/null | grep "redis_version" | cut -d: -f2 | tr -d '\r' || echo "?")
      ok "Redis версия: $REDIS_INFO"
    else
      fail "Redis не отвечает на PING"
      ERRORS=$((ERRORS+1))
    fi
  else
    info "redis-cli не установлен — только проверка порта"
  fi
else
  fail "Redis не запущен → docker compose up redis"
  ERRORS=$((ERRORS+1))
fi
echo ""

# ── Django API ──────────────────────────────
echo "Django API (localhost:8000)"
if nc -z localhost 8000 2>/dev/null; then
  ok "Port 8000 открыт"
  if command -v curl &>/dev/null; then
    HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/health/ 2>/dev/null || echo "000")
    if [ "$HEALTH" = "200" ]; then
      HEALTH_BODY=$(curl -s http://localhost:8000/api/v1/health/ 2>/dev/null || echo "{}")
      ok "GET /api/v1/health/ → 200"
      echo "     $HEALTH_BODY"
    elif [ "$HEALTH" = "503" ]; then
      HEALTH_BODY=$(curl -s http://localhost:8000/api/v1/health/ 2>/dev/null || echo "{}")
      fail "GET /api/v1/health/ → 503 (деградированный режим)"
      echo "     $HEALTH_BODY"
      ERRORS=$((ERRORS+1))
    else
      info "GET /api/v1/health/ → $HEALTH (API ещё не реализован?)"
    fi
  else
    info "curl не установлен — только проверка порта"
  fi
else
  info "Django не запущен (ожидается при разработке)"
fi
echo ""

# ── Node.js / npx ───────────────────────────
echo "Node.js / npx"
NODE_VER=$(node --version 2>/dev/null || echo "")
if [ -n "$NODE_VER" ]; then
  ok "node $NODE_VER"
  NPM_VER=$(npm --version 2>/dev/null || echo "?")
  ok "npm $NPM_VER"
else
  fail "Node.js не установлен → https://nodejs.org"
  ERRORS=$((ERRORS+1))
fi
echo ""

# ── Итог ────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$ERRORS" -eq 0 ]; then
  echo -e "${GREEN}  Все сервисы в порядке${NC}"
else
  echo -e "${RED}  Проблем: $ERRORS. Смотри вывод выше.${NC}"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
