# Architecture

Fremont Open is a static React stats site backed by a generated JSON cache.
There is no public backend in the deployed demo.

## Runtime

```text
Challonge API
  -> backend/sync_job.py
  -> backend/cuestats_dev.db
  -> backend/export_static.py
  -> frontend/public/data/cache.json
  -> frontend build
  -> DreamHost static web root
```

The browser reads only static assets and `data/cache.json`. Features that look
interactive, such as follows, use `localStorage`.

## Kept Source Areas

- `backend/` - local sync, dedupe, validation, Fargo import, and cache export
- `frontend/` - static React application
- `scripts/` - repo-level helper scripts
- `.github/workflows/deploy.yml` - static build and DreamHost rsync deploy
- `BACKLOG.md` - product priority and GitHub issue sync source

## Data Tables

The local SQLite cache keeps only the tables needed to regenerate the static
site:

- `tournaments`
- `matches`
- `players`
- `sync_meta`

Manual correction inputs live in JSON files:

- `backend/player_aliases.json` for deliberate dedupe aliases
- `backend/player_overrides.json` for Fargo, nicknames, and notes
- `backend/season_points.json` for standings scoring

## Deploy

Pushes to `main` trigger `.github/workflows/deploy.yml`. The workflow builds the
frontend with `REACT_APP_STATIC_DATA=true`, then rsyncs `frontend/build/` to the
configured DreamHost web root.
