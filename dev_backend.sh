#!/usr/bin/env bash
# Replit dev startup: MongoDB → seed (if empty) → uvicorn
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "$0")/backend" && pwd)"
MONGO_DATA="/tmp/mongodb-data"
MONGO_LOG="/tmp/mongodb.log"
PORT="${PORT:-8080}"

echo "==> Starting local MongoDB..."
mkdir -p "$MONGO_DATA"
if ! pgrep -x mongod >/dev/null 2>&1; then
  mongod --dbpath "$MONGO_DATA" \
         --logpath "$MONGO_LOG" \
         --bind_ip 127.0.0.1 \
         --port 27017 \
         --fork
  # Wait for mongod to accept connections (up to 20 s)
  for i in $(seq 1 20); do
    mongosh --quiet --eval "db.runCommand({ping:1})" >/dev/null 2>&1 && break
    sleep 1
  done
  echo "==> MongoDB ready."
else
  echo "==> MongoDB already running."
fi

echo "==> Checking if seed data is needed..."
COUNT=$(mongosh cuestats --quiet --eval "db.players.countDocuments({})" 2>/dev/null || echo "0")
if [ "$COUNT" = "0" ]; then
  echo "==> Seeding dev database with fake data..."
  python3 "$BACKEND_DIR/seed_dev.py"
else
  echo "==> Dev database has $COUNT players — skipping seed."
fi

echo "==> Starting FastAPI on port $PORT..."
cd "$BACKEND_DIR"
exec python3 -m uvicorn server:app \
  --host 0.0.0.0 \
  --port "$PORT" \
  --reload \
  --log-level info
