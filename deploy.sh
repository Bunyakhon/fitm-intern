#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "======================================"
echo "      FITM-INTERN STAGING DEPLOY"
echo "======================================"

# ตรวจไฟล์ environment ที่จำเป็น
for file in .env backend/.env frontend/.env; do
  if [ ! -f "$file" ]; then
    echo "ERROR: Missing $file"
    exit 1
  fi
done

# ป้องกัน git pull ทับงานที่แก้ค้างบน Server
if [ -n "$(git status --porcelain --untracked-files=normal)" ]; then
  echo "ERROR: Git working tree is not clean."
  echo "Commit/stash changes before deploying."
  git status --short
  exit 1
fi

echo
echo "[1/8] Pull latest code from GitHub..."
git pull --ff-only origin main

echo
echo "[2/8] Validate Docker Compose..."
docker compose config --quiet

echo
echo "[3/8] Build application images..."
docker compose build

echo
echo "[4/8] Start PostgreSQL..."
docker compose up -d postgres

echo "Waiting for PostgreSQL to become healthy..."

DB_STATUS=""
for i in {1..30}; do
  DB_CONTAINER="$(docker compose ps -q postgres)"

  if [ -n "$DB_CONTAINER" ]; then
    DB_STATUS="$(docker inspect \
      --format='{{.State.Health.Status}}' \
      "$DB_CONTAINER" 2>/dev/null || true)"
  fi

  if [ "$DB_STATUS" = "healthy" ]; then
    echo "PostgreSQL is healthy."
    break
  fi

  sleep 2
done

if [ "$DB_STATUS" != "healthy" ]; then
  echo "ERROR: PostgreSQL did not become healthy."
  docker compose logs --tail=100 postgres
  exit 1
fi

echo
echo "[5/8] Run database migrations..."
docker compose run --rm --no-deps backend npm run db:migrate

echo
echo "[6/8] Start application services..."
docker compose up -d \
  --remove-orphans \
  --renew-anon-volumes \
  postgres nlp-service backend frontend

echo
echo "[7/8] Check migration status..."
docker compose run --rm --no-deps backend npm run db:migrate:status

echo
echo "[8/8] Health checks..."

check_url() {
  local name="$1"
  local url="$2"

  for i in {1..20}; do
    if curl -fsS -o /dev/null "$url"; then
      echo "OK: $name"
      return 0
    fi
    sleep 2
  done

  echo "ERROR: $name failed - $url"
  return 1
}

check_url "Backend API" "http://localhost:5000/"
check_url "Database API" "http://localhost:5000/health/db"
check_url "NLP Service" "http://localhost:8000/health"
check_url "Frontend" "http://localhost:5173/"

echo
echo "======================================"
echo "          DEPLOY COMPLETE"
echo "======================================"

docker compose ps

FRONTEND_URL="$(grep '^FRONTEND_URL=' backend/.env | cut -d= -f2- || true)"
API_URL="$(grep '^VITE_API_URL=' frontend/.env | cut -d= -f2- || true)"

echo
echo "Frontend : ${FRONTEND_URL:-http://192.168.10.137:5173}"
echo "Backend  : ${API_URL:-http://192.168.10.137:5000}"
echo
