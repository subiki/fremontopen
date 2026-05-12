#!/usr/bin/env bash
# Replit dev frontend: React 19 via craco
# REACT_APP_BACKEND_URL="" → API base = "/api" → routed through Replit proxy to the backend
set -euo pipefail

export REACT_APP_BACKEND_URL=""
export PORT="${PORT:-23218}"

cd /home/runner/workspace/frontend

if [ ! -d node_modules ]; then
  echo "==> Installing frontend dependencies..."
  yarn install
fi

echo "==> Starting React dev server on port $PORT..."
exec yarn start
