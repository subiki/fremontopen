#!/usr/bin/env bash
# One-time bootstrap on a fresh DreamHost VPS.
#
# Run this ONCE manually on the server before enabling GitHub Actions CD.
# It sets up the Python venv, MongoDB, nginx config, systemd unit, and cron.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/subiki/fremontopen/main/deploy/bootstrap.sh | bash
#   OR after cloning:
#   bash deploy/bootstrap.sh

set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-$HOME/cuestats}"
DOMAIN="${DOMAIN:-fremontopen.com}"
REPO="${REPO:-https://github.com/subiki/fremontopen.git}"

echo "==> Bootstrapping CueStats at $DEPLOY_PATH for $DOMAIN"

# 1. System packages
if [ -z "${SKIP_APT:-}" ]; then
  sudo apt update
  sudo apt install -y python3 python3-venv python3-pip nodejs npm nginx mongodb-org git rsync curl
fi

# 2. Clone repo if not present
if [ ! -d "$DEPLOY_PATH" ]; then
  git clone "$REPO" "$DEPLOY_PATH"
fi
cd "$DEPLOY_PATH"

# 3. Backend venv
cd backend
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt
cd ..

# 4. .env
if [ ! -f backend/.env ]; then
  cat > backend/.env <<EOF
MONGO_URL="mongodb://localhost:27017"
DB_NAME="cuestats"
CORS_ORIGINS="https://${DOMAIN}"
FRONTEND_URL="https://${DOMAIN}"
CHALLONGE_API_KEY="REPLACE_ME"
ANTHROPIC_API_KEY="REPLACE_ME"
JWT_SECRET="$(openssl rand -hex 32)"
ADMIN_EMAIL="admin@${DOMAIN}"
ADMIN_PASSWORD="REPLACE_ME"
# OAuth — fill in after creating provider apps (see README)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
DISCORD_CLIENT_ID=""
DISCORD_CLIENT_SECRET=""
FACEBOOK_APP_ID=""
FACEBOOK_APP_SECRET=""
EOF
  echo "==> Wrote backend/.env — EDIT IT NOW with real secrets."
fi

# 5. Frontend build (so /frontend/build exists for nginx)
cd frontend
yarn install
echo "REACT_APP_BACKEND_URL=https://${DOMAIN}" > .env.production
yarn build
cd ..

# 6. systemd unit
SERVICE_FILE="/etc/systemd/system/cuestats.service"
if [ ! -f "$SERVICE_FILE" ]; then
  sudo tee "$SERVICE_FILE" >/dev/null <<EOF
[Unit]
Description=CueStats API
After=network.target mongod.service

[Service]
User=$USER
WorkingDirectory=$DEPLOY_PATH/backend
ExecStart=$DEPLOY_PATH/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001
Restart=always
RestartSec=5
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF
  sudo systemctl daemon-reload
  sudo systemctl enable --now cuestats
  echo "==> systemd cuestats enabled."
fi

# 7. Allow this user to restart cuestats without password (for CD)
SUDOERS_FILE="/etc/sudoers.d/cuestats-restart"
if [ ! -f "$SUDOERS_FILE" ]; then
  echo "$USER ALL=NOPASSWD: /bin/systemctl restart cuestats, /bin/systemctl is-active cuestats" \
    | sudo tee "$SUDOERS_FILE" >/dev/null
  sudo chmod 440 "$SUDOERS_FILE"
fi

# 8. nginx config
NGINX_FILE="/etc/nginx/sites-available/cuestats"
if [ ! -f "$NGINX_FILE" ]; then
  sudo tee "$NGINX_FILE" >/dev/null <<EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    root ${DEPLOY_PATH}/frontend/build;
    index index.html;

    location / {
        try_files \$uri /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }

    # caching for hashed static assets
    location ~* \\.(?:js|css|png|jpg|jpeg|gif|webp|svg|woff2?)\$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF
  sudo ln -sf "$NGINX_FILE" /etc/nginx/sites-enabled/cuestats
  sudo nginx -t && sudo systemctl reload nginx
  echo "==> nginx configured for $DOMAIN"
fi

# 9. HTTPS via certbot (skip if SKIP_CERTBOT=1)
if [ -z "${SKIP_CERTBOT:-}" ] && command -v certbot >/dev/null 2>&1; then
  sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" || true
fi

# 10. Initial data load (only if DB is empty)
TOURN_COUNT=$(mongosh --quiet --eval "db.getSiblingDB('cuestats').tournaments.countDocuments({})" || echo "0")
if [ "$TOURN_COUNT" = "0" ]; then
  echo "==> Empty DB — running initial Challonge sync"
  cd "$DEPLOY_PATH/backend" && ./venv/bin/python sync_job.py --force
fi

# 11. Cron — weekly sync after Saturday matches
CRON_LINE="0 23 * * 6 cd $DEPLOY_PATH/backend && ./venv/bin/python sync_job.py >> $DEPLOY_PATH/sync.log 2>&1"
if ! crontab -l 2>/dev/null | grep -qF "$DEPLOY_PATH/backend"; then
  (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
  echo "==> Cron installed (Saturday 11pm)"
fi

echo ""
echo "==> Bootstrap complete!"
echo "==> Edit $DEPLOY_PATH/backend/.env with real CHALLONGE_API_KEY, ANTHROPIC_API_KEY, ADMIN_PASSWORD"
echo "==> Then: sudo systemctl restart cuestats"
echo "==> Visit: https://$DOMAIN"
