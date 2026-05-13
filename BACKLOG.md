# Fremont Open Static Stats - Backlog

Prioritized feature list for the current product direction:

- DreamHost shared hosting serves a static React site.
- Challonge data is synced/exported into `frontend/public/data/cache.json`.
- No public backend, login, admin UI, AI chat, or server-side writes for the demo.
- Agentic/local coding is the workflow for new stats, views, and data-quality fixes.

Effort labels: **S** <= 1 day, **M** 1-3 days, **L** > 3 days.

Legend: `P0` ship next, `P1` near-term, `P2` nice-to-have, `P3` later/maybe.

---

## Done

- [x] Challonge sync CLI into local SQLite cache
- [x] Static JSON export via `backend/export_static.py`
- [x] Static React build mode for DreamHost shared hosting
- [x] One-command static build path for export + frontend build
- [x] GitHub Actions deploy of `frontend/build/` to shared hosting
- [x] GitHub Actions deploy verification with preflight, rsync, and smoke test
- [x] README reset for static shared-hosting workflow
- [x] Challonge marker/note name dedupe in cached matches and players
- [x] Dashboard, tournaments, players, player profiles, leaderboard
- [x] Global search over cached players and tournaments
- [x] Player follow bookmarks using localStorage only
- [x] Prev/Next player navigation
- [x] Biggest Rivals / Most Defeated split on player profile
- [x] Player streaks, tournament titles, wins-over-time chart
- [x] Side-by-side compare page
- [x] DreamHost shared-hosting deployment guide

## Removed From Demo Scope

These were intentionally removed for the shared-hosting demo. They can return later if the app moves to VPS/serverless hosting.

- AI chat and AI chat sessions
- Admin login, admin edits, audit log, and browser-based sync
- User login, OAuth/SSO, profile claims, and cross-device follows
- Public FastAPI deployment and API health checks
- Dynamic OG image generation
- Email digests, webhooks, and push-style notifications

---

## EPIC 1 - Static Deploy And Data Refresh

| # | P | Effort | Item |
|---|---|---|---|
| 1.4 | P1 | M | **Refresh-data workflow** - document and script local Challonge sync -> export -> commit -> deploy |
| 1.5 | P1 | S | **Cache metadata panel** - show generated time, last Challonge sync, tournament count, player count |
| 1.6 | P2 | M | **GitHub Actions data refresh** - optional scheduled workflow if secrets and runtime are suitable |

## EPIC 2 - Data Quality Without Admin UI

| # | P | Effort | Item |
|---|---|---|---|
| 2.1 | P0 | M | **Alias mapping file** - local config to merge names like "Jim", "Jimbo", "Jimmy S." during export |
| 2.2 | P0 | M | **Alias suggestion report** - fuzzy-match likely duplicate player names before export |
| 2.3 | P1 | S | **Manual overrides file** - local JSON/YAML for Fargo, nicknames, hidden tournaments, and notes |
| 2.4 | P1 | S | **Validation report** - flag missing winners, impossible scores, duplicate matches, blank names |
| 2.5 | P1 | M | **Historical tournament backfill** - local script for arbitrary Challonge tournament IDs |
| 2.6 | P2 | M | **Manual side-match import** - CSV import for matches not tracked in Challonge |

## EPIC 3 - Player Stats And Rankings

| # | P | Effort | Item |
|---|---|---|---|
| 3.1 | P0 | M | **ELO rating** computed from all cached matches |
| 3.2 | P1 | M | **Rating history chart** per player |
| 3.3 | P1 | S | **Game-type breakdown** per player |
| 3.4 | P1 | S | **Attendance streak** and tournaments-played stats |
| 3.5 | P1 | S | **Leaderboard streak chips** - current streak, best streak, titles |
| 3.6 | P2 | M | **Strength of schedule** using opponent win rate / rating |
| 3.7 | P2 | S | **Player nicknames** from local overrides file |
| 3.8 | P3 | S | **Equipment/custom cue fields** from local overrides file |

## EPIC 4 - Tournament Views

| # | P | Effort | Item |
|---|---|---|---|
| 4.1 | P1 | M | **Bracket visualization** on tournament detail |
| 4.2 | P1 | S | **Tournament timeline** - week-by-week archive with winner badges |
| 4.3 | P1 | S | **Tournament filter** by game type |
| 4.4 | P2 | S | **Cinderella runs** - biggest upset paths per tournament once ratings exist |
| 4.5 | P2 | M | **Tournament archive search** by date range, winner, and format |
| 4.6 | P3 | S | **Printable bracket/detail page** |

## EPIC 5 - Compare, Rivalries, And Story Views

| # | P | Effort | Item |
|---|---|---|---|
| 5.1 | P1 | M | **Compare picker UI** - choose two players without hand-editing URLs |
| 5.2 | P1 | M | **Rivalry index** - rank pairs by matches played, closeness, and streak swings |
| 5.3 | P1 | S | **Rivalry of the week** on dashboard |
| 5.4 | P2 | M | **H2H heatmap matrix** across all players |
| 5.5 | P2 | S | **Upset tracker** - rating underdog wins after ELO lands |
| 5.6 | P2 | S | **Anniversary stats** - notable matches from one year ago / last season |

## EPIC 6 - Charts And Visual Polish

| # | P | Effort | Item |
|---|---|---|---|
| 6.1 | P1 | S | **Dashboard trend cards** - latest sync, active players, hottest player, closest rivalry |
| 6.2 | P1 | S | **Season standings chart** |
| 6.3 | P1 | M | **Player form chart** - rolling last-10 match win rate |
| 6.4 | P2 | S | **Tournament difficulty indicator** |
| 6.5 | P2 | S | **Light mode toggle** |
| 6.6 | P3 | M | **Player photo/card art** from local static assets |

## EPIC 7 - Seasons And League Standings

| # | P | Effort | Item |
|---|---|---|---|
| 7.1 | P1 | M | **Season groupings** like "2026 Spring" with cumulative standings |
| 7.2 | P1 | S | **Configurable points system** for weekly league standings |
| 7.3 | P2 | S | **Attendance tracker** by season |
| 7.4 | P2 | S | **Prize pool tracking** from local overrides/import file |
| 7.5 | P3 | M | **Multi-event support** for other tournaments beyond Fremont Open |

## EPIC 8 - Static Site UX

| # | P | Effort | Item |
|---|---|---|---|
| 8.1 | P1 | S | **PWA install / offline cache** for static assets and `cache.json` |
| 8.2 | P1 | S | **Mobile navigation polish** - hamburger/drawer, better table scrolling |
| 8.3 | P1 | S | **Keyboard shortcuts** - `/` search, `g p`, `g t`, `g l` |
| 8.4 | P2 | S | **Case-insensitive player URLs** |
| 8.5 | P2 | S | **404/static fallback polish** for unknown players and tournaments |
| 8.6 | P3 | S | **Pinch-zoom bracket view** |

## EPIC 9 - Future Hosted Features

These are deferred until the app has a backend again.

| # | P | Effort | Item |
|---|---|---|---|
| 9.1 | P3 | M | **Server-side admin corrections UI** |
| 9.2 | P3 | M | **User login and claimed profiles** |
| 9.3 | P3 | M | **AI weekly recap generation** |
| 9.4 | P3 | M | **Email digest / notifications** |
| 9.5 | P3 | M | **Dynamic OG image generation** |
| 9.6 | P3 | M | **Discord or Slack result posts** |

---

## Top 10 - Next Build Order

1. **2.1 Alias mapping file** - biggest data-quality unlock.
2. **2.2 Alias suggestion report** - helps clean names without an admin UI.
3. **2.4 Validation report** - catch bad Challonge/import data before publishing.
4. **1.4 Refresh-data workflow** - make local sync -> export -> commit repeatable.
5. **3.1 ELO rating** - creates a stronger leaderboard than raw wins.
6. **4.2 Tournament timeline** - makes the archive easier to browse.
7. **5.1 Compare picker UI** - makes the existing compare feature discoverable.
8. **6.1 Dashboard trend cards** - better first impression for the demo.
9. **1.5 Cache metadata panel** - make the production data age obvious.
10. **8.2 Mobile navigation polish** - improve demo usability on phones.

---

## Tracking

This file is the source of truth. GitHub Issues are kept in sync automatically by
`.github/workflows/sync_backlog.yml` on pushes to `BACKLOG.md`, every Monday at
09:00 UTC, and on manual workflow dispatch.

The sync uses the built-in GitHub Actions token with `issues: write` permission.

Because the backlog was reset for the static shared-hosting demo, running the
sync with `--close-done` may close old issues for removed server/login/chat/admin
features. That is expected.

To trigger the sync manually, go to **Actions -> Weekly Backlog Sync -> Run workflow**
in the GitHub UI, or run locally after pushing:

```bash
bash scripts/create_github_issues.sh --close-done
```

To populate issues without closing anything:

```bash
bash scripts/create_github_issues.sh
```

To preview what would be created or closed without touching GitHub:

```bash
bash scripts/create_github_issues.sh --dry-run
bash scripts/create_github_issues.sh --dry-run --close-done
```

The automated workflow requires a `GH_TOKEN` secret in the repo with
`issues: write` scope.
