#!/usr/bin/env bash
# One-time bootstrap for CueStats on DreamHost VPS — NO sudo required.
#
# DreamHost VPS does NOT provide sudo access. This script works entirely in
# user space using:
#   - Python venv (system python3 is pre-installed on DreamHost VPS)
#   - loginctl enable-linger  (user-level systemd, supported on DreamHost VPS)
#   - ~/.config/systemd/user/ (user service, no /etc/ writes needed)
#   - DreamHost panel Proxy Server (replaces nginx config)
#   - MongoDB Atlas free tier   (replaces local mongod install)
#
# Run ONCE on the VPS before enabling GitHub Actions CD:
#   bash deploy/bootstrap.sh
#
# Before running, complete the two panel prerequisites below.
#
# ─── PREREQUISITES (do these first in the DreamHost panel) ──────────────────
#
# 1. MongoDB Atlas (free, no credit card):
#    a. Create a free account at https://cloud.mongodb.com
#    b. Build a free M0 cluster (512 MB, free forever)
#    c. Database Access → Add a user → save the username & password
#    d. Network Access → Allow access from anywhere (0.0.0.0/0) for simplicity,
#       or add your VPS IP only for better security.
#    e. Clusters → Connect → Drivers → copy the connection string
#       (looks like: mongodb+srv://user:pass@cluster.mongodb.net/cuestats)
#
# 2. DreamHost panel Proxy Server:
#    a. Log in to panel.dreamhost.com
#    b. Servers & Usage → click Manage next to your VPS
#    c. Scroll to "Proxy Server" section
#    d. Fill in:
#         URL to set up Proxy under: fremontopen.com  (your domain)
#         Path:                      api              (so /api/ is proxied)
#         Port Number to Proxy:      8001
#    e. Click Add Proxy
#    (SSL is handled automatically by the panel — no certbot needed)
#
# ─── OPTIONAL: check Python version ─────────────────────────────────────────
# DreamHost VPS ships with Python 3.x. Verify before running:
#   python3 --version       # should be 3.9+ (3.11 preferred)
# If it's older than 3.9, install a newer version via pyenv:
#   https://help.dreamhost.com/hc/en-us/articles/115000702772-Installing-a-custom-version-of-Python-3
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-$HOME/cuestats}"
DOMAIN="${DOMAIN:-fremontopen.com}"
REPO="${REPO:-https://github.com/subiki/fremontopen.git}"
WEBROOT="${WEBROOT:-$HOME/$DOMAIN}"   # DreamHost serves static files from here
PORT=8001                              # Must match the panel proxy config above

echo "==> Bootstrapping CueStats at $DEPLOY_PATH for $DOMAIN"
echo "    Webroot (static files): $WEBROOT"
echo "    API port:               $PORT"
echo ""

# ── 1. Clone repo ─────────────────────────────────────────────────────────────
if [ ! -d "$DEPLOY_PATH" ]; then
  git clone "$REPO" "$DEPLOY_PATH"
  echo "==> Cloned repo."
else
  echo "==> Repo already present at $DEPLOY_PATH"
fi
cd "$DEPLOY_PATH"

# ── 2. Python venv (no sudo) ─────────────────────────────────────────────────
echo "==> Creating Python venv..."
cd backend
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt
cd ..
echo "==> Python venv ready."

# ── 3. Write backend/.env template ───────────────────────────────────────────
if [ ! -f backend/.env ]; then
  cat > backend/.env <<EOF
# ┌─────────────────────────────────────────────────────────────────┐
# │  CueStats backend secrets — fill in every CHANGEME value below  │
# │  Keep this file private. It is never committed or deployed.      │
# └─────────────────────────────────────────────────────────────────┘

# ── MongoDB Atlas ──────────────────────────────────────────────────
# How to get this:
#   1. Go to https://cloud.mongodb.com  →  sign up free (no card needed)
#   2. Create a free M0 cluster  →  any region
#   3. Database Access  →  Add new database user
#      Username: cuestats       Password: choose something strong
#   4. Network Access  →  Add IP Address  →  Allow access from anywhere  (0.0.0.0/0)
#   5. Clusters  →  Connect  →  Drivers  →  copy the string that looks like:
#      mongodb+srv://cuestats:<password>@cluster0.abcde.mongodb.net/
#   6. Paste it below, replace <password> with your actual password,
#      and add ?retryWrites=true&w=majority at the end
#
# Example (yours will have a different cluster ID):
#   mongodb+srv://cuestats:MyPass123@cluster0.ab1cd.mongodb.net/cuestats?retryWrites=true&w=majority
MONGO_URL="mongodb+srv://CHANGEME_USER:CHANGEME_PASSWORD@cluster0.CHANGEME.mongodb.net/cuestats?retryWrites=true&w=majority"
DB_NAME="cuestats"

# ── Your domain (leave as-is for fremontopen.com) ──────────────────
CORS_ORIGINS="https://${DOMAIN}"
FRONTEND_URL="https://${DOMAIN}"

# ── Challonge API key ──────────────────────────────────────────────
# Get it at: https://challonge.com/settings/developer
# (free, just needs a Challonge account)
CHALLONGE_API_KEY="CHANGEME_challonge_api_key"

# ── Anthropic API key (powers the AI chat) ────────────────────────
# Get it at: https://console.anthropic.com  →  API Keys  →  Create key
# (requires a paid account; skip for now — chat page will just error)
ANTHROPIC_API_KEY="CHANGEME_anthropic_api_key"

# ── Admin login credentials ────────────────────────────────────────
# These are seeded into the database on first startup.
# Use any email and a strong password you'll remember.
ADMIN_EMAIL="CHANGEME_your@email.com"
ADMIN_PASSWORD="CHANGEME_strong_password"

# ── JWT secret (already generated — do not change) ────────────────
JWT_SECRET="$(openssl rand -hex 32)"

# ── OAuth providers (all optional — leave blank to disable) ───────
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
DISCORD_CLIENT_ID=""
DISCORD_CLIENT_SECRET=""
FACEBOOK_APP_ID=""
FACEBOOK_APP_SECRET=""
EOF
  echo ""
  echo "════════════════════════════════════════════════════════════"
  echo " ACTION REQUIRED: fill in backend/.env before continuing"
  echo "════════════════════════════════════════════════════════════"
  echo ""
  echo " Open the file:"
  echo "   nano $DEPLOY_PATH/backend/.env"
  echo ""
  echo " You MUST replace every CHANGEME_ value:"
  echo "   MONGO_URL          — Atlas connection string (see instructions above)"
  echo "   CHALLONGE_API_KEY  — from challonge.com/settings/developer"
  echo "   ANTHROPIC_API_KEY  — from console.anthropic.com (skip = chat won't work)"
  echo "   ADMIN_EMAIL        — your email address"
  echo "   ADMIN_PASSWORD     — any strong password"
  echo ""
  read -rp " Press Enter once .env is saved, or Ctrl-C to stop here..."
fi

# ── 4. Build React frontend → copy to DreamHost web root ─────────────────────
echo "==> Building frontend..."
cd frontend
yarn install --frozen-lockfile
echo "REACT_APP_BACKEND_URL=https://${DOMAIN}" > .env.production
yarn build
cd ..

mkdir -p "$WEBROOT"
cp -r frontend/build/. "$WEBROOT/"
echo "==> Frontend built and copied to $WEBROOT"

# ── 5. Enable linger so user services persist after logout ───────────────────
# DreamHost VPS supports loginctl enable-linger (per DreamHost docs:
# help.dreamhost.com/hc/en-us/articles/26354404192404-Using-linger-with-Node-js)
loginctl enable-linger
echo "==> Linger enabled."

# ── 6. User-level systemd service (no sudo required) ─────────────────────────
mkdir -p ~/.config/systemd/user/

cat > ~/.config/systemd/user/cuestats.service <<EOF
[Unit]
Description=CueStats FastAPI backend
After=network.target

[Service]
WorkingDirectory=${DEPLOY_PATH}/backend
ExecStart=${DEPLOY_PATH}/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port ${PORT}
Environment=PYTHONUNBUFFERED=1
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now cuestats
echo "==> cuestats user service started."

# ── 7. Initial Challonge data sync ───────────────────────────────────────────
echo "==> Running initial Challonge sync..."
cd backend
./venv/bin/python sync_job.py --force || {
  echo "WARN: Initial sync failed. Run manually once .env is filled in:"
  echo "      cd $DEPLOY_PATH/backend && ./venv/bin/python sync_job.py --force"
}
cd ..

# ── 8. Cron — weekly sync every Saturday at 11pm ─────────────────────────────
CRON_LINE="0 23 * * 6 cd ${DEPLOY_PATH}/backend && ./venv/bin/python sync_job.py >> ${DEPLOY_PATH}/sync.log 2>&1"
if ! crontab -l 2>/dev/null | grep -qF "${DEPLOY_PATH}/backend"; then
  (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
  echo "==> Cron installed (Saturdays at 11pm)."
fi

# ── 9. Smoke test ─────────────────────────────────────────────────────────────
echo ""
echo "==> Checking API is up on localhost..."
sleep 3
curl -sf "http://127.0.0.1:${PORT}/api/health" && echo "OK" || echo "API not responding yet — give it a few seconds and try: curl http://127.0.0.1:${PORT}/api/health"

echo ""
echo "══════════════════════════════════════════════════════════════"
echo " Bootstrap complete!"
echo "══════════════════════════════════════════════════════════════"
echo ""
echo " Verify everything:"
echo "   curl http://127.0.0.1:${PORT}/api/health    ← local"
echo "   curl https://${DOMAIN}/api/health           ← through panel proxy"
echo ""
echo " Useful commands:"
echo "   systemctl --user status cuestats            ← check service"
echo "   systemctl --user restart cuestats           ← restart API"
echo "   journalctl --user -u cuestats -f            ← live logs"
echo ""
echo " GitHub Actions CD:"
echo "   Add these 6 secrets to your repo → Settings → Secrets → Actions:"
echo "     SSH_PRIVATE_KEY       your private key"
echo "     DEPLOY_HOST           your VPS hostname or IP"
echo "     DEPLOY_USER           your SSH username"
echo "     DEPLOY_PATH           ${DEPLOY_PATH}"
echo "     DEPLOY_WEBROOT        ${WEBROOT}"
echo "     REACT_APP_BACKEND_URL https://${DOMAIN}"
