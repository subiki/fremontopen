#!/usr/bin/env bash
# Remote-side deploy hook. Executed on the DreamHost VPS over SSH by GitHub Actions.
#
# NO sudo required — runs entirely as the SSH user.
#
# Assumptions (set up once by deploy/bootstrap.sh):
#   - Backend code already rsync'd to $DEPLOY_PATH/backend  (done by workflow)
#   - Frontend build already rsync'd to $DEPLOY_WEBROOT     (done by workflow)
#   - Python venv exists at $DEPLOY_PATH/backend/venv
#   - User systemd service "cuestats" is registered and linger is enabled
#   - backend/.env exists on the VPS and is NEVER touched by this script
#
# DreamHost VPS note: static files are served directly from $DEPLOY_WEBROOT
# (the domain's document root, e.g. ~/fremontopen.com). API requests to /api/
# are forwarded by the DreamHost panel Proxy Server → 127.0.0.1:8001.
# No nginx config files are written; no sudo is used anywhere.

set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-$HOME/fremontopen.com}"

echo "==> Remote deploy to $DEPLOY_PATH"
cd "$DEPLOY_PATH/backend"

if [ ! -d venv ]; then
  echo "ERROR: Python venv not found at $DEPLOY_PATH/backend/venv"
  echo "       Run deploy/bootstrap.sh on the server first."
  exit 1
fi

# Update Python dependencies
echo "==> Updating Python dependencies..."
./venv/bin/pip install --quiet --upgrade pip
./venv/bin/pip install --quiet -r requirements.txt

# Restart using user-level systemd (no sudo — DreamHost VPS supports this via linger)
echo "==> Restarting cuestats service..."
systemctl --user restart cuestats

# Confirm it came back up
sleep 3
if systemctl --user is-active cuestats >/dev/null 2>&1; then
  echo "==> cuestats is running."
else
  echo "ERROR: cuestats failed to start. SSH in and check:"
  echo "       journalctl --user -u cuestats -n 50"
  exit 1
fi

echo "==> Deploy complete."
