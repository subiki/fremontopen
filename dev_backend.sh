#!/usr/bin/env bash
# Replit dev startup: SQLite database → seed (if empty) → uvicorn
# Uses SQLite (no server needed). Set DATABASE_URL in backend/.env.
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "$0")/backend" && pwd)"
PORT="${PORT:-8080}"

# Ensure dev .env exists with SQLite DATABASE_URL
ENV_FILE="$BACKEND_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "==> Creating dev .env with SQLite database..."
  cat > "$ENV_FILE" <<'EOF'
# Replit dev environment — SQLite, no server needed
DATABASE_URL="sqlite+aiosqlite:///./cuestats_dev.db"
CORS_ORIGINS="*"
FRONTEND_URL="http://localhost:3000"
CHALLONGE_API_KEY=""
ANTHROPIC_API_KEY=""
JWT_SECRET="dev-insecure-jwt-secret-change-in-prod"
ADMIN_EMAIL="admin@dev.local"
ADMIN_PASSWORD="adminpass"
EOF
  echo "==> dev .env created."
fi

cd "$BACKEND_DIR"

# Seed if the database is empty or doesn't exist yet
DB_FILE="./cuestats_dev.db"
NEEDS_SEED=0
if [ ! -f "$DB_FILE" ]; then
  NEEDS_SEED=1
else
  # Check player count via Python (database.py handles table creation)
  COUNT=$(python3 -c "
import asyncio, os
os.chdir('$(pwd)')
from dotenv import load_dotenv
load_dotenv('.env')
from database import make_engine
from sqlalchemy import select, func
import database as T

async def count():
    engine = make_engine()
    try:
        async with engine.connect() as conn:
            n = (await conn.execute(select(func.count()).select_from(T.players))).scalar()
            print(n)
    except Exception:
        print(0)
    finally:
        await engine.dispose()

asyncio.run(count())
" 2>/dev/null || echo "0")
  if [ "$COUNT" = "0" ]; then
    NEEDS_SEED=1
  fi
fi

if [ "$NEEDS_SEED" = "1" ]; then
  echo "==> Seeding dev database with fake data..."
  python3 seed_dev.py
else
  echo "==> Dev database already has data — skipping seed."
fi

echo "==> Starting FastAPI on port $PORT..."
exec python3 -m uvicorn server:app \
  --host 0.0.0.0 \
  --port "$PORT" \
  --reload \
  --log-level info
