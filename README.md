# CueStats — Fremont Open Edition

A read-only billiards aggregator + AI Q&A site for the Fremont Open weekly tournament. End-user UI **never** calls Challonge — data is pulled by a CLI on a schedule. Cached in MongoDB. Designed to stay well under Challonge's 500 calls/month free quota (steady state ~3 calls/week).

## Stack
- **Backend**: FastAPI (Python 3.11) — read-only `/api/*` + admin `/api/admin/*` (JWT) + user SSO `/api/auth/{provider}/...`
- **Database**: MongoDB
- **Sync**: `backend/sync_job.py` standalone CLI (incremental, skips frozen tournaments)
- **AI**: Claude Sonnet 4.5 via Anthropic SDK (`anthropic` Python package)
- **Frontend**: React 19 + Tailwind + Shadcn UI, Billiard Noir dark theme
- **Auth**:
  - **Admin** — single account, bcrypt+JWT, brute-force lockout
  - **Users** — SSO via Google, Discord, Facebook (OAuth 2.0 authorization-code flow), 30-day session token

## Features
- Dashboard / Tournaments / Players / Player profiles / Leaderboard / AI Chat (Claude Sonnet 4.5)
- Player profile: Follow, Prev/Next nav, Biggest Rivals, Most Defeated
- **SSO sign-in**: users follow players across devices, **claim** their player profile (privacy-first — usernames never exposed to others)
- **Admin** (`/admin`): merge duplicate players, rename, edit/delete matches, manual sync, audit log
- Health check at `/api/health`

---

## Local development

```bash
git clone https://github.com/subiki/fremontopen.git cuestats && cd cuestats

# backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cat > .env <<'EOF'
MONGO_URL="mongodb://localhost:27017"
DB_NAME="cuestats"
CORS_ORIGINS="*"
FRONTEND_URL="http://localhost:3000"
CHALLONGE_API_KEY="<your-challonge-key>"
ANTHROPIC_API_KEY="<your-anthropic-key>"
JWT_SECRET="<random-64-hex>"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="changeme"
# OAuth (leave empty to disable that provider)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
DISCORD_CLIENT_ID=""
DISCORD_CLIENT_SECRET=""
FACEBOOK_APP_ID=""
FACEBOOK_APP_SECRET=""
EOF
python sync_job.py --force            # one-time data load
uvicorn server:app --reload --port 8001 &

# frontend
cd ../frontend
yarn install
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env
yarn start
```

Public site at http://localhost:3000 — admin at /admin/login.

---

## OAuth Provider Setup

For each SSO provider you want to enable, you need an OAuth app + a redirect URI pointing to your frontend.

The **redirect URI** in every provider should be exactly: `<FRONTEND_URL>/auth/callback`
(e.g. `https://fremontopen.com/auth/callback`)

### Google
1. https://console.cloud.google.com/ → APIs & Services → Credentials → **Create OAuth client ID** (type: Web)
2. Authorized redirect URIs: `https://fremontopen.com/auth/callback` (and `http://localhost:3000/auth/callback` for dev)
3. Copy the **Client ID** and **Client Secret** into `.env`:
   ```
   GOOGLE_CLIENT_ID="<id>.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="<secret>"
   ```

### Discord
1. https://discord.com/developers/applications → **New Application** → OAuth2 tab
2. Redirects: `https://fremontopen.com/auth/callback`
3. Copy **Client ID** and **Client Secret** into `.env`:
   ```
   DISCORD_CLIENT_ID="..."
   DISCORD_CLIENT_SECRET="..."
   ```

### Facebook / Instagram
1. https://developers.facebook.com/apps → **Create App** → type **Consumer**
2. Add product: **Facebook Login** → Settings → Valid OAuth Redirect URIs: `https://fremontopen.com/auth/callback`
3. Make the app **Live** (top-right toggle) for public sign-in
4. Copy **App ID** and **App Secret** (Settings → Basic) into `.env`:
   ```
   FACEBOOK_APP_ID="..."
   FACEBOOK_APP_SECRET="..."
   ```

After updating `.env`, restart the backend: `sudo systemctl restart cuestats`.

---

## Production deployment — DreamHost VPS

Designed for a **DreamHost VPS or DreamCompute** instance (~$10/mo, root access).

### One-time server bootstrap

```bash
ssh you@your-server
git clone https://github.com/subiki/fremontopen.git ~/cuestats
cd ~/cuestats
bash deploy/bootstrap.sh
```

The bootstrap script installs runtime, builds frontend, sets up systemd + nginx + certbot, runs initial Challonge sync, installs the Saturday-11pm cron. Then **edit `~/cuestats/backend/.env`** with real secrets + OAuth credentials and:
```bash
sudo systemctl restart cuestats
```

Visit `https://fremontopen.com` and `/admin/login`.

---

## CI/CD from GitHub Actions

On every push to `main`, GitHub Actions builds the frontend, rsyncs both apps to your server, installs backend deps, and restarts the API.

### 1. Generate a deploy SSH key

```bash
ssh-keygen -t ed25519 -C "github-actions-cuestats" -f ~/.ssh/cuestats_deploy
```

### 2. Authorize the public key on the server

```bash
ssh-copy-id -i ~/.ssh/cuestats_deploy.pub you@your-server
# Verify password-less login:
ssh -i ~/.ssh/cuestats_deploy you@your-server 'echo ok'
```

### 3. Add GitHub repository secrets

At `https://github.com/subiki/fremontopen/settings/secrets/actions` create:

| Secret | Value |
|---|---|
| `SSH_PRIVATE_KEY` | Contents of `~/.ssh/cuestats_deploy` (full private key) |
| `DEPLOY_HOST` | `fremontopen.com` (or server IP) |
| `DEPLOY_USER` | Your SSH username |
| `DEPLOY_PATH` | e.g. `/home/subiki/cuestats` |
| `REACT_APP_BACKEND_URL` | `https://fremontopen.com` |

### 4. Push to main → auto-deploy

```bash
git push origin main
```

Watch progress at `https://github.com/subiki/fremontopen/actions`. The workflow:
- builds the frontend (~1 min) using `REACT_APP_BACKEND_URL` secret
- rsyncs `frontend/build/` and `backend/` to the server
- runs `deploy/remote_deploy.sh` (pip install + systemctl restart)
- smoke-tests `GET /api/health`

You can also trigger manually via **Actions → Deploy to DreamHost → Run workflow**.

### Notes
- `backend/.env` on the server is **never** overwritten by deploys — rotate secrets manually on the server, then `sudo systemctl restart cuestats`.
- `rsync --delete` removes orphan files from `backend/` and `frontend/build/`. The `.env` is excluded.
- The Saturday cron runs `sync_job.py` independently of deploys.

---

## Routes & data flow

| Action | Endpoint | Source | Auth |
|---|---|---|---|
| Public browse | `/api/stats`, `/api/tournaments`, `/api/players`, `/api/leaderboard` | MongoDB | none |
| AI Chat | `/api/chat` | MongoDB → Claude | none |
| User SSO start | `/api/auth/{provider}/start` | — | none |
| User SSO callback | `/api/auth/{provider}/callback?code=...` | provider → MongoDB | none |
| User self | `/api/me`, `/api/me/follow`, `/api/me/claim` | MongoDB | user JWT |
| Player claim status | `/api/players/{name}/claim-info` (returns only `{claimed}` — no identity) | MongoDB | none |
| Admin login | `/api/auth/login` | bcrypt + JWT | none |
| Admin mutations | `/api/admin/*` | MongoDB | admin JWT |
| Cron sync | `python sync_job.py` | Challonge → MongoDB | shell |
| Manual sync | `POST /api/admin/sync` | Challonge → MongoDB | admin JWT |

There is **no public endpoint that calls Challonge**.

---

## Challonge API budget

| Scenario | API calls |
|---|---|
| Steady-state weekly cron | 1–3 |
| Completed tournaments | **never** refetched |
| `--force` rebuild (all 4 tournaments) | 9 |

Cap is 500/month. Actual usage ~12-15/month.

---

## Operations cheat-sheet

```bash
# manual sync
ssh server "cd ~/cuestats/backend && ./venv/bin/python sync_job.py"

# force rebuild (use sparingly)
ssh server "cd ~/cuestats/backend && ./venv/bin/python sync_job.py --force"

# single tournament refresh
ssh server "cd ~/cuestats/backend && ./venv/bin/python sync_job.py --tournament 16321058"

# rotate admin password
ssh server "vi ~/cuestats/backend/.env && sudo systemctl restart cuestats"

# rotate OAuth credentials
ssh server "vi ~/cuestats/backend/.env && sudo systemctl restart cuestats"

# tail logs
ssh server "sudo journalctl -u cuestats -f"
ssh server "tail -f ~/cuestats/sync.log"
```

---

## Privacy model

- **Anonymous visitors** see everything (player stats, matches, chat) — no login required
- **Signed-in users** can additionally: follow players (synced across devices), claim ONE player as theirs
- **What's never exposed**: usernames, emails, providers, or any account info of OTHER users
- The only thing other users can see is the `claimed` boolean on a player profile (yes/no), not WHO claimed it
- No direct messaging
- Sessions are stateless 30-day JWTs in localStorage. Sign-out clears the token immediately.

---

## Backlog & contributing

See [`BACKLOG.md`](BACKLOG.md) — 69 items, 11 epics. Bulk-create issues:
```bash
bash scripts/create_github_issues.sh
```

Issue templates in `.github/ISSUE_TEMPLATE/`.
