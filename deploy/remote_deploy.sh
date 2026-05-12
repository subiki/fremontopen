#!/usr/bin/env bash
# Remote-side deploy hook. Executed on the DreamHost server over SSH by the
# GitHub Actions workflow. Assumes:
#   - Repo source has been rsync'd to $DEPLOY_PATH/backend and $DEPLOY_PATH/frontend/build
#   - Python venv exists at $DEPLOY_PATH/backend/venv (see deploy/bootstrap.sh for first-time setup)
#   - systemd service "cuestats" is registered (see deploy/cuestats.service)
#   - The .env files on the server (backend/.env) are NOT touched by the deploy

set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-$HOME/cuestats}"

echo "==> Deploying to $DEPLOY_PATH"
cd "$DEPLOY_PATH/backend"

# Install/update Python dependencies in the existing venv
if [ ! -d venv ]; then
  echo "ERROR: $DEPLOY_PATH/backend/venv missing — run deploy/bootstrap.sh once before the first deploy" >&2
  exit 1
fi

./venv/bin/pip install --quiet --upgrade pip
./venv/bin/pip install --quiet -r requirements.txt

# Restart API service. We use --user systemd if available (no sudo), otherwise sudo.
if systemctl --user is-active cuestats >/dev/null 2>&1; then
  systemctl --user restart cuestats
elif command -v sudo >/dev/null && sudo -n systemctl is-active cuestats >/dev/null 2>&1; then
  sudo -n systemctl restart cuestats
else
  echo "WARN: 'cuestats' systemd unit not found. Skipping restart."
fi

# Frontend is served as static files by nginx; nothing to restart.
echo "==> Done."
