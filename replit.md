# CueStats — Fremont Open

A billiards tournament tracker for the Fremont Open — tracks players, matches, and tournament brackets with an AI chat assistant.

Replit is used as a **code editor only**. The application runs on a DreamHost VPS and is deployed via GitHub Actions on every push to `main`.

## Run & Operate (on DreamHost VPS)

- `bash deploy/bootstrap.sh` — one-time VPS setup (Python venv, MongoDB, nginx, systemd, cron)
- `cd backend && ./venv/bin/python sync_job.py --force` — manual Challonge sync
- `sudo systemctl restart cuestats` — restart the API server
- `sudo systemctl status cuestats` — check service health
- Weekly cron runs sync_job.py every Saturday at 11pm automatically

## Stack

- **Backend**: FastAPI (Python 3.11) + MongoDB (on VPS) + Motor (async driver)
- **Frontend**: React 19 (JavaScript) + Craco + Tailwind v3 + Shadcn UI + Recharts + react-router-dom v7
- **AI**: Anthropic `claude-sonnet-4-5-20250929` via direct `anthropic` Python SDK
- **Auth**: Admin JWT + user SSO via Google / Discord / Facebook (OAuth2)
- **Sync**: Standalone CLI `backend/sync_job.py` — pulls from Challonge API, weekly cron on VPS
- **Deploy**: GitHub Actions → rsync to DreamHost VPS → pip install → systemctl restart

## Where things live

- `backend/server.py` — FastAPI entry point, all public routes
- `backend/ai_agent.py` — CueStats AI chat (Anthropic SDK)
- `backend/auth.py` — admin JWT auth + seeding
- `backend/users.py` — user SSO OAuth routes + follow/claim logic
- `backend/admin_routes.py` — admin CRUD + audit log
- `backend/extras_routes.py` — search, compare, OG image, player extras, Fargo
- `backend/players_extras.py` — streaks, titles, Fargo performance analytics
- `backend/og_image.py` — OG card PNG generation (Pillow)
- `backend/sync_job.py` — Challonge → MongoDB sync CLI
- `backend/requirements.txt` — Python dependencies (no Emergent)
- `backend/.env.example` — env var template; real `.env` lives on VPS only
- `frontend/src/pages/` — all page components
- `frontend/src/components/` — shared components (Sidebar, SearchBar, FargoEditor…)
- `frontend/src/lib/api.js` — axios client pointed at REACT_APP_BACKEND_URL
- `deploy/bootstrap.sh` — one-time VPS setup script
- `deploy/remote_deploy.sh` — remote-side hook run by GitHub Actions over SSH
- `deploy/nginx.conf` — nginx config reference (bootstrap.sh generates the real one)
- `deploy/cuestats.service` — systemd unit reference (bootstrap.sh generates the real one)
- `.github/workflows/deploy.yml` — CI/CD: build frontend → rsync → pip install → restart

## GitHub Actions secrets required

Set these in your repo → Settings → Secrets → Actions:

| Secret | Value |
|---|---|
| `SSH_PRIVATE_KEY` | Private key matching the VPS `~/.ssh/authorized_keys` |
| `DEPLOY_HOST` | VPS IP or hostname |
| `DEPLOY_USER` | SSH username on VPS |
| `DEPLOY_PATH` | Absolute path on VPS, e.g. `/home/youruser/cuestats` |
| `REACT_APP_BACKEND_URL` | `https://fremontopen.com` |

## VPS environment variables (backend/.env — never committed)

See `backend/.env.example` for the full list. Key vars:

- `MONGO_URL` — `mongodb://localhost:27017`
- `DB_NAME` — `cuestats`
- `ANTHROPIC_API_KEY` — from console.anthropic.com
- `CHALLONGE_API_KEY` — from challonge.com/settings/developer
- `JWT_SECRET` — 32-byte hex (`openssl rand -hex 32`)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — seeded on first startup
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — optional OAuth
- `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` — optional OAuth
- `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` — optional OAuth

## Product features

- **Dashboard** — stat cards, top leaderboard, recent matches feed
- **Tournaments** — list by date; click through to bracket match detail
- **Players** — ranked by wins, Fargo rating, search
- **Player Detail** — stat cards, match history, head-to-head, streaks, OG card
- **Leaderboard** — gold/silver/bronze podium for top 3
- **Compare** — side-by-side head-to-head stat bars for any two players
- **Chat** — AI assistant (CueStats AI) powered by Claude
- **Admin** — JWT-protected console for tournaments/players + audit log
- **SSO** — Google / Discord / Facebook login; claim & follow players

## User preferences

- DreamHost VPS is the production runtime — Replit is code editor + GitHub push only
- MongoDB runs on the VPS itself (no Atlas)
- No Emergent LLM integration — use Anthropic SDK directly
- Keep backend and frontend as flat directories (not a monorepo)

## Gotchas

- `backend/.env` is never deployed by GitHub Actions (excluded in rsync `--exclude .env`)
- `backend/venv` is never deployed either — `remote_deploy.sh` runs `pip install` on the VPS
- Frontend build uses `REACT_APP_BACKEND_URL` env var — set via GitHub Actions secret
- The `/api/search` endpoint lives in `extras_routes.py`, not `server.py`
- `MONGO_URL` on the VPS is `mongodb://localhost:27017` — MongoDB is local, not Atlas
