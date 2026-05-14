# Architecture Decisions

## ADR-001 - Static Site Is The Product

The deployed demo is a static React app on DreamHost shared hosting. It does not
run a public FastAPI service, login system, admin UI, chat endpoint, or browser
write path. Local scripts regenerate `frontend/public/data/cache.json`.

## ADR-002 - Challonge Calls Stay In Local/CI Tooling

The browser never calls Challonge. Syncs run through `backend/sync_job.py`, which
keeps completed tournaments frozen unless explicitly forced or replaced.

## ADR-003 - SQLite Is The Local Cache

`backend/cuestats_dev.db` is the working cache used by sync/export scripts.
DreamHost receives only built static files.

## ADR-004 - Manual Corrections Are Files

Because the public app is static, corrections are repo/local files:

- `player_aliases.json` for player-name merges
- `player_overrides.json` for Fargo, equipment, and profile metadata
- `season_points.json` for standings scoring

After edits, run the export/build workflow.

## ADR-005 - Fargo Import Requires An Authorized Source

Fargo values may be imported from an allowed CSV, JSON, saved HTML table, or URL
that permits crawling. The importer must not bypass logins, captchas, robots.txt,
or blocking controls.

## ADR-006 - Rankings Use Normalization Guards

Rankings that can be skewed by tiny samples use minimum-match filters or
normalized fields. Tournament duration summaries exclude likely left-open
brackets above the configured duration threshold.
