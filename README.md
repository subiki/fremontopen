# Fremont Open

Fremont Open is a static billiards stats site built from cached Challonge data.
The demo is designed for DreamHost shared hosting: no public backend, no login,
no admin UI, no AI chat, and no server-side writes.

The local workflow is:

1. Sync Challonge into local SQLite.
2. Export a static JSON cache.
3. Build the React site in static mode.
4. Deploy `frontend/build/` to the DreamHost web root.

The deployed site never calls Challonge directly.

## Stack

- Frontend: React 19, Tailwind, Recharts, static JSON data mode
- Data cache: `frontend/public/data/cache.json`
- Local database: SQLite at `backend/cuestats_dev.db`
- Sync/export: Python CLI scripts in `backend/`
- Hosting: DreamHost shared hosting static web root
- CI/CD: GitHub Actions rsync deploy on pushes to `main`

## Current Features

- Dashboard summary
- Tournament browser
- Player directory and player profiles
- Leaderboard
- Global search over cached players and tournaments
- Local player follow bookmarks with `localStorage`
- Player profile previous/next navigation
- Biggest rivals and most defeated split
- Player streaks, titles, and wins-over-time chart
- Side-by-side player comparison

## Local Data Refresh

Use normal incremental refreshes most of the time. This keeps Challonge API
usage low after historical tournaments are cached.

```powershell
cd backend
.venv\Scripts\python.exe sync_job.py
.venv\Scripts\python.exe sync_job.py --dedupe-only
.venv\Scripts\python.exe export_static.py
```

For a one-time full replacement from `https://fremontopen.challonge.com`, set
`CHALLONGE_SUBDOMAIN="fremontopen"` in `backend/.env`, then run:

```powershell
cd backend
.venv\Scripts\python.exe sync_job.py --replace
.venv\Scripts\python.exe sync_job.py --dedupe-only
.venv\Scripts\python.exe export_static.py
```

Do not run `--replace` casually. It fetches participants and matches for every
tournament returned by Challonge and can use a large share of the monthly
free-tier API budget.

## Local Static Build

From the repo root:

```powershell
cd frontend
$env:REACT_APP_STATIC_DATA='true'
yarn build
```

The deployable files are written to:

```text
frontend/build/
```

## DreamHost Shared Hosting Deploy

The production deploy workflow is:

```text
.github/workflows/deploy.yml
```

It runs on every push to `main` and can also be started manually from the
GitHub Actions tab.

Required GitHub repository secrets:

| Secret | Example |
|---|---|
| `SSH_PRIVATE_KEY` | Full private deploy key text |
| `DEPLOY_HOST` | `iad1-shared-b8-43.dreamhost.com` |
| `DEPLOY_USER` | `dh_vykniy` |
| `DEPLOY_WEBROOT` | `/home/dh_vykniy/fremontopen.com` |
| `DEPLOY_SITE_HOST` | `fremontopen.com` |

The matching public key must be present on DreamHost in:

```bash
~/.ssh/authorized_keys
```

Verify SSH from your local machine with the same private key:

```powershell
ssh -i $HOME\.ssh\fremontopen_deploy dh_vykniy@iad1-shared-b8-43.dreamhost.com 'echo ok'
```

The workflow preflights secrets, SSH login, webroot existence, and webroot
write permissions before running `rsync`.

## Manual Upload

If GitHub Actions is blocked, build locally and upload the contents of
`frontend/build/` into the DreamHost domain directory:

```text
/home/dh_vykniy/fremontopen.com/
```

Include hidden files. The build includes `.htaccess` so direct React routes like
`/players/Dennis%20Orcollo` load correctly.

## Backlog And Issues

The backlog lives in:

```text
BACKLOG.md
```

GitHub issues are synced by:

```text
.github/workflows/sync_backlog.yml
scripts/create_github_issues.sh
```

The sync workflow creates issues from active backlog rows and closes old issues
when rows are moved out of the active backlog.

## Legacy Hosted Features

FastAPI, MySQL production hosting, login, admin edits, AI chat, OAuth, and
dynamic server-side features are intentionally out of scope for the shared
hosting demo. They can return later if the project moves to VPS or serverless
hosting.
