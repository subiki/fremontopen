# CueStats — Fremont Open

A billiards tournament tracker for the Fremont Open — tracks players, matches, and tournament brackets with an AI chat assistant.

Replit is used as a **code editor only**. The application runs on a DreamHost VPS and is deployed via GitHub Actions on every push to `main`.

## Run & Operate (on DreamHost VPS)

- `bash deploy/bootstrap.sh` — one-time VPS setup (Python venv, MySQL tables, user systemd, cron)
- `cd backend && ./venv/bin/python sync_job.py --force` — manual Challonge sync
- `systemctl --user restart fremontopen` — restart the API server (no sudo needed)
- `systemctl --user status fremontopen` — check service health
- Weekly cron runs sync_job.py every Saturday at 11pm automatically

## Stack

- **Backend**: FastAPI (Python 3.11) + SQLAlchemy 2.0 async + aiomysql (prod) / aiosqlite (dev)
- **Database**: DreamHost panel MySQL (production) · SQLite file (Replit dev — no server needed)
- **Frontend**: React 19 (JavaScript) + Craco + Tailwind v3 + Shadcn UI + Recharts + react-router-dom v7
- **AI**: Anthropic `claude-sonnet-4-5-20250929` via direct `anthropic` Python SDK
- **Auth**: Admin JWT + user SSO via Google / Discord / Facebook (OAuth2)
- **Sync**: Standalone CLI `backend/sync_job.py` — pulls from Challonge API, weekly cron on VPS
- **Deploy**: GitHub Actions → rsync to DreamHost VPS → pip install → systemctl --user restart

## Where things live

- `backend/database.py` — SQLAlchemy table definitions, `make_engine()`, `init_db()` (NEW)
- `backend/server.py` — FastAPI entry point, all public routes
- `backend/ai_agent.py` — CueStats AI chat (Anthropic SDK)
- `backend/auth.py` — admin JWT auth + seeding
- `backend/users.py` — user SSO OAuth routes + follow/claim logic
- `backend/admin_routes.py` — admin CRUD + audit log
- `backend/extras_routes.py` — search, compare, OG image, player extras, Fargo
- `backend/players_extras.py` — streaks, titles, Fargo performance analytics
- `backend/og_image.py` — OG card PNG generation (Pillow)
- `backend/sync_job.py` — Challonge → MySQL sync CLI
- `backend/seed_dev.py` — fake data seeder for Replit SQLite dev db
- `backend/requirements.txt` — Python dependencies
- `backend/.env.example` — env var template; real `.env` lives on VPS only
- `frontend/src/pages/` — all page components
- `frontend/src/components/` — shared components (Sidebar, SearchBar, FargoEditor…)
- `frontend/src/lib/api.js` — axios client pointed at REACT_APP_BACKEND_URL
- `deploy/bootstrap.sh` — one-time VPS setup script
- `deploy/remote_deploy.sh` — remote-side hook run by GitHub Actions over SSH
- `.github/workflows/deploy.yml` — CI/CD: build frontend → rsync → pip install → restart
- `.github/workflows/sync_backlog.yml` — weekly BACKLOG.md → GitHub Issues sync (Mondays 09:00 UTC)

## GitHub Actions secrets required

Set these in your repo → Settings → Secrets → Actions:

| Secret | Value |
|---|---|
| `SSH_PRIVATE_KEY` | Private key matching the VPS `~/.ssh/authorized_keys` |
| `DEPLOY_HOST` | VPS IP or hostname |
| `DEPLOY_USER` | SSH username on VPS |
| `DEPLOY_PATH` | Absolute path on VPS, e.g. `/home/youruser/fremontopen.com` |
| `DEPLOY_WEBROOT` | Absolute path to domain web root, e.g. `/home/youruser/fremontopen.com` |
| `REACT_APP_BACKEND_URL` | `https://fremontopen.com` |
| `GH_TOKEN` | GitHub PAT with `issues: write` scope — used by the weekly backlog sync |

## VPS environment variables (backend/.env — never committed)

See `backend/.env.example` for the full list. Key vars:

- `DATABASE_URL` — `mysql+aiomysql://USER:PASS@mysql.fremontopen.com/cuestats` (from DreamHost panel → MySQL Databases)
- `ANTHROPIC_API_KEY` — from console.anthropic.com
- `CHALLONGE_API_KEY` — from challonge.com/settings/developer
- `JWT_SECRET` — 32-byte hex (`openssl rand -hex 32`)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — seeded into MySQL on first startup
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — optional OAuth
- `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` — optional OAuth
- `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` — optional OAuth

## DreamHost MySQL setup (one time, in panel)

1. panel.dreamhost.com → **MySQL Databases** (under "More" in sidebar)
2. Create a database (e.g. `cuestats`)
3. Create a MySQL hostname (e.g. `mysql.fremontopen.com`)
4. Create a MySQL user → grant ALL privileges on `cuestats`
5. Your `DATABASE_URL`: `mysql+aiomysql://USER:PASS@mysql.fremontopen.com/cuestats`
6. Tables are created automatically on first `bootstrap.sh` run — nothing else to do

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
- DreamHost panel MySQL is the production database (no Atlas, no local mongod)
- Dev database is SQLite (file at `backend/cuestats_dev.db`) — no server to start
- No Emergent LLM integration — use Anthropic SDK directly
- Keep backend and frontend as flat directories (not a monorepo)

## Gotchas

- `backend/.env` is never deployed by GitHub Actions (excluded in rsync `--exclude .env`)
- `backend/venv` is never deployed either — `remote_deploy.sh` runs `pip install` on the VPS
- Frontend build uses `REACT_APP_BACKEND_URL` env var — set via GitHub Actions secret
- The `/api/search` endpoint lives in `extras_routes.py`, not `server.py`
- Replit injects `DATABASE_URL` pointing to its PostgreSQL — `load_dotenv(override=True)` in all Python entry points ensures `backend/.env` (SQLite) takes precedence in dev
- Mobile app: `restart_workflow` port detection is broken for the Expo artifact (see Mobile App section above)
