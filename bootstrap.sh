#!/usr/bin/env bash
# ============================================================
# TP 全屋家居 · 一键初始化脚本（Git Bash / Linux / macOS）
# 用法：
#   ./bootstrap.sh                # 自动选择数据库模式
#   ./bootstrap.sh --db docker    # 强制 Docker Compose 起 MySQL+Redis
#   ./bootstrap.sh --db portable  # 强制便携版（.tools/，零安装）
# ============================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_MODE=""

# ---------- 参数解析 ----------
for arg in "$@"; do
  case "$arg" in
    --db=*) DB_MODE="${arg#*=}" ;;
    --db) shift; DB_MODE="$1" ;;
  esac
done

# ---------- 0. 环境预检 ----------
echo "==> [0/5] 环境预检"
command -v node >/dev/null 2>&1 || { echo "✗ 缺少 node（需 18+）"; exit 1; }
command -v python3 >/dev/null 2>&1 || command -v python >/dev/null 2>&1 || { echo "✗ 缺少 python（需 3.11+）"; exit 1; }
echo "   node: $(node --version)"
PY="$(command -v python3 || command -v python)"
echo "   python: $($PY --version)"

# ---------- 1. 数据库依赖 ----------
echo "==> [1/5] 启动 MySQL 8.0 + Redis 7"
if [ -z "$DB_MODE" ]; then
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    DB_MODE="docker"
  elif [ -x "$ROOT_DIR/.tools/mysql/bin/mysqld" ]; then
    DB_MODE="portable"
  else
    echo "✗ 未检测到 Docker，也未找到便携版数据库（.tools/）。"
    echo "  请先按《项目开发实施方案》确认数据库环境，或执行 install-deps.sh 安装便携版。"
    exit 1
  fi
fi

case "$DB_MODE" in
  docker)
    echo "  模式：Docker Compose（deploy/docker-compose.yml）"
    docker compose -f "$ROOT_DIR/deploy/docker-compose.yml" up -d mysql redis
    ;;
  portable)
    echo "  模式：便携版（.tools/）"
    "$ROOT_DIR/.tools/start-deps.sh"
    ;;
  *)
    echo "✗ 未知模式：$DB_MODE（可选 docker|portable）"; exit 1 ;;
esac

# ---------- 2. 后端环境（项目级虚拟环境：根 .venv） ----------
echo "==> [2/5] 后端 venv + 依赖"
cd "$ROOT_DIR"
if [ ! -d .venv ]; then
  $PY -m venv .venv
fi
# Windows venv 为 Scripts/，Unix 为 bin/
if [ -f .venv/Scripts/activate ]; then
  # shellcheck disable=SC1091
  source .venv/Scripts/activate
else
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi
python -m pip install --upgrade pip -q
if [ -f "$ROOT_DIR/api/requirements.txt" ]; then
  python -m pip install -r "$ROOT_DIR/api/requirements.txt" -q
fi
cp -n "$ROOT_DIR/api/.env.example" "$ROOT_DIR/api/.env" 2>/dev/null || true

# ---------- 3. 前端环境 ----------
echo "==> [3/5] 前端依赖（web / admin）"
command -v pnpm >/dev/null 2>&1 || npm i -g pnpm >/dev/null 2>&1 || {
  echo "✗ 缺少 pnpm 且无法安装（若无全局安装权限，请手动安装 pnpm）"; exit 1;
}
for app in web admin; do
  if [ -f "$ROOT_DIR/$app/package.json" ]; then
    (cd "$ROOT_DIR/$app" && pnpm install --frozen-lockfile 2>/dev/null || pnpm install)
  else
    echo "   跳过 $app（package.json 尚未生成，阶段 1 创建）"
  fi
done

# ---------- 4. 数据库迁移（阶段 1 后可用） ----------
echo "==> [4/5] 数据库迁移"
cd "$ROOT_DIR/api"
if [ -d alembic ] && [ -n "$(ls alembic/versions 2>/dev/null | head -1)" ]; then
  python -m alembic upgrade head
  echo "   alembic upgrade head 完成"
else
  echo "   跳过（Alembic 迁移在阶段 1 生成）"
fi

echo "==> [5/5] 初始化完成 ✅"
echo "  后端：source .venv/Scripts/activate && cd api && uvicorn main:app --reload   （Windows）"
echo "  前台：cd web  && pnpm dev   （5173）"
echo "  后台：cd admin && pnpm dev   （5174）"
