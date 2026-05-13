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

From the repo root, run the full local refresh workflow:

```powershell
.\scripts\refresh-static-data.ps1
```

That runs Challonge sync, conservative dedupe, the validation report, static
cache export, and the static React build. To verify export/build without calling
Challonge, run:

```powershell
.\scripts\refresh-static-data.ps1 -SkipSync
```

If local PowerShell script execution is disabled, use:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\refresh-static-data.ps1 -SkipSync
```

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

## Local Player Alias Mapping

Use `backend/player_aliases.json` for deliberate player-name merges during the
local dedupe/export path. The file is safe to keep empty by default:

```json
{
  "aliases": {
    "Canonical Player Name": ["Alias Name", "Nickname Variant"]
  }
}
```

After editing aliases, run `sync_job.py --dedupe-only` from `backend/`, then run
`export_static.py` to rebuild `frontend/public/data/cache.json`. Conflicting
aliases are rejected so one alias cannot silently map to multiple canonical
players.

To generate a review-only report of likely duplicates before editing the alias
file:

```powershell
cd backend
.venv\Scripts\python.exe alias_suggestions.py
```

The report is written to `backend/alias_suggestions.json` and is not applied
automatically.

## Local Validation Report

Generate a local data-quality report before publishing refreshed cache data:

```powershell
cd backend
.venv\Scripts\python.exe validation_report.py
```

The report is written to `backend/validation_report.json` and is intentionally
ignored by Git. It flags missing winners, blank names, impossible or suspicious
scores, duplicate cached matches, and matches that reference missing tournaments.

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
