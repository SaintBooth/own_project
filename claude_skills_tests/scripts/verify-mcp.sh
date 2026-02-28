#!/usr/bin/env bash
# verify-mcp.sh — проверка что все MCP пакеты доступны в npm
# Запуск: bash scripts/verify-mcp.sh
# Не запускает серверы — только проверяет npm registry и установку

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ok()   { echo -e "${GREEN}  ✓${NC} $1"; }
fail() { echo -e "${RED}  ✗${NC} $1"; }
info() { echo -e "${YELLOW}  →${NC} $1"; }
head() { echo -e "${BLUE}$1${NC}"; }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PromptSpace MCP — Package Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ERRORS=0

check_package() {
  local name="$1"
  local pkg="$2"
  local ver
  ver=$(npm show "$pkg" version 2>/dev/null || echo "")
  if [ -n "$ver" ]; then
    ok "$name ($pkg@$ver)"
  else
    fail "$name ($pkg) — пакет не найден в npm"
    ERRORS=$((ERRORS+1))
  fi
}

# ── Обязательные серверы ────────────────────
echo "Обязательные MCP серверы:"
check_package "filesystem" "@modelcontextprotocol/server-filesystem"
check_package "postgres   " "@modelcontextprotocol/server-postgres"
check_package "memory     " "@modelcontextprotocol/server-memory"
check_package "seq-think  " "@modelcontextprotocol/server-sequential-thinking"
echo ""

# ── Рекомендуемые серверы ───────────────────
echo "Рекомендуемые MCP серверы:"
check_package "github     " "@modelcontextprotocol/server-github"
check_package "playwright " "@playwright/mcp"
check_package "redis      " "redis-mcp"
check_package "brave-srch " "@modelcontextprotocol/server-brave-search"
echo ""

# ── Проверка ENV переменных ─────────────────
echo "Переменные окружения:"

if [ -n "${GITHUB_TOKEN:-}" ]; then
  ok "GITHUB_TOKEN задан (${#GITHUB_TOKEN} символов)"
else
  info "GITHUB_TOKEN не задан → GitHub MCP не будет работать"
  info "  Добавь в ~/.bashrc: export GITHUB_TOKEN=ghp_..."
fi

if [ -n "${BRAVE_API_KEY:-}" ]; then
  ok "BRAVE_API_KEY задан"
else
  info "BRAVE_API_KEY не задан → Brave Search MCP не будет работать"
  info "  Получи ключ: https://brave.com/search/api/"
fi
echo ""

# ── Проверка Node.js ────────────────────────
echo "Runtime:"
NODE_VER=$(node --version 2>/dev/null || echo "")
if [ -n "$NODE_VER" ]; then
  ok "node $NODE_VER (требуется ≥18)"
  MAJOR=$(echo "$NODE_VER" | sed 's/v//' | cut -d. -f1)
  if [ "$MAJOR" -lt 18 ]; then
    fail "Node.js < 18 — обнови до LTS"
    ERRORS=$((ERRORS+1))
  fi
else
  fail "Node.js не найден → https://nodejs.org"
  ERRORS=$((ERRORS+1))
fi

NPX_VER=$(npx --version 2>/dev/null || echo "")
if [ -n "$NPX_VER" ]; then
  ok "npx $NPX_VER"
else
  fail "npx не найден"
  ERRORS=$((ERRORS+1))
fi
echo ""

# ── Быстрый тест filesystem ─────────────────
echo "Тест запуска filesystem сервера (5 сек):"
if timeout 5 npx -y @modelcontextprotocol/server-filesystem "C:\\dev\\claude_skills_tests" </dev/null >/dev/null 2>&1; then
  ok "filesystem сервер запускается"
elif timeout 5 npx -y @modelcontextprotocol/server-filesystem . </dev/null 2>&1 | grep -q "Error\|Cannot\|ENOENT"; then
  fail "filesystem сервер не запускается"
  ERRORS=$((ERRORS+1))
else
  ok "filesystem сервер запускается (timeout — это нормально для MCP)"
fi
echo ""

# ── Итог ────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$ERRORS" -eq 0 ]; then
  echo -e "${GREEN}  Все проверки прошли. MCP готов к использованию.${NC}"
  echo ""
  echo "  Следующий шаг: открой проект в Cursor и проверь"
  echo "  Cursor Settings → MCP — все 8 серверов должны быть зелёными."
else
  echo -e "${RED}  Проблем: $ERRORS. Смотри docs/mcp-setup.md → Раздел 5 «Устранение проблем»${NC}"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
