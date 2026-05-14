# Fremont Open Static Stats - Backlog

Prioritized feature list for the current product direction:

- DreamHost shared hosting serves a static React site.
- Challonge data is synced/exported into `frontend/public/data/cache.json`.
- No public backend, login, admin UI, AI chat, or server-side writes for the demo.
- Agentic/local coding is the workflow for new stats, views, and data-quality fixes.

Effort labels: **S** <= 1 day, **M** 1-3 days, **L** > 3 days.

Legend: `JFL` always first, `P0` ship next, `P1` near-term, `P2` nice-to-have, `P3` later/maybe.

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
- [x] Unique first-name dedupe rule for unambiguous first-name-only Challonge duplicates
- [x] Mobile navigation polish with bottom nav and tighter mobile spacing
- [x] Sort controls for players, tournaments, and leaderboard
- [x] Game-type labels surfaced in match/stat views
- [x] Expanded visible stats for placements, top finishes, tournament size, duration, and title leaders
- [x] Tournament analytics for player count, duration, and winner leaderboard
- [x] Player analytics for average placement and top finish counts
- [x] Alias mapping file for deliberate local player-name merges during dedupe/export
- [x] Alias suggestion report for fuzzy duplicate player-name review
- [x] Validation report for missing winners, impossible scores, duplicate matches, and blank names
- [x] ELO ratings computed from cached matches and surfaced in player ranking views
- [x] Tournament timeline archive with winner badges
- [x] Compare picker UI for choosing two players without hand-editing URLs
- [x] Dashboard trend cards for latest sync, active players, hottest player, and closest rivalry
- [x] Cache metadata panel showing generated time, last sync, tournament count, and player count
- [x] Refresh-data workflow script for sync, dedupe, validation, export, and static build
- [x] Tuesday GitHub Actions static data refresh and DreamHost deploy
- [x] Attendance streak and tournaments-played stats
- [x] Leaderboard streak chips for current streak, best streak, and titles
- [x] Rating history chart per player
- [x] Normalized ranking and duration data to reduce low-volume and left-open tournament skew
- [x] Race versus rack stats with ELO odds in compare views
- [x] Historical tournament backfill CLI for arbitrary Challonge tournament IDs or slugs
- [x] Tournament filter by game type for faster 8-ball and 9-ball browsing
- [x] Season standings chart for latest seasonal player records
- [x] Tournament cash measurement with $10 entries and rounded prize payouts
- [x] Head-to-head ELO odds promoted into compare payloads and UI
- [x] Info page with latest bracket, GitHub, Discord, schedule, and tournament details
- [x] Fargo monthly refresh plan for authorized sources, overrides, and review reports
- [x] Manual player overrides file for Fargo ratings, Fargo IDs, nicknames, and notes
- [x] Tourney timing min/max baselines by game and player count
- [x] Rivalry of the week dashboard card from the closest high-volume matchup
- [x] Monthly Fargo refresh wiring for an authorized source URL
- [x] Keyboard shortcuts for search and quick navigation
- [x] PWA manifest and offline cache for static shell and `cache.json`
- [x] Configurable season points system for weekly standings

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

All current static deploy and refresh items are complete.

## EPIC 2 - Data Quality Without Admin UI

| # | P | Effort | Item |
|---|---|---|---|
| 2.6 | P2 | M | **Manual side-match import** - CSV import for matches not tracked in Challonge |

## EPIC 3 - Player Stats And Rankings

| # | P | Effort | Item |
|---|---|---|---|
| 3.7 | P2 | M | **Strength of schedule** using opponent win rate / rating |
| 3.8 | P2 | S | **Player nicknames** from local overrides file |
| 3.9 | P3 | S | **Equipment/custom cue fields** from local overrides file |

## EPIC 4 - Tournament Views

| # | P | Effort | Item |
|---|---|---|---|
| 4.1 | P1 | M | **Bracket visualization** on tournament detail |
| 4.4 | P2 | S | **Cinderella runs** - biggest upset paths per tournament once ratings exist |
| 4.5 | P2 | M | **Tournament archive search** by date range, winner, and format |
| 4.6 | P3 | S | **Printable bracket/detail page** |

## EPIC 5 - Compare, Rivalries, And Story Views

| # | P | Effort | Item |
|---|---|---|---|
| 5.2 | P1 | M | **Rivalry index** - rank pairs by matches played, closeness, and streak swings |
| 5.4 | P2 | M | **H2H heatmap matrix** across all players |
| 5.5 | P2 | S | **Upset tracker** - rating underdog wins after ELO lands |
| 5.6 | P2 | S | **Anniversary stats** - notable matches from one year ago / last season |

## EPIC 6 - Charts And Visual Polish

| # | P | Effort | Item |
|---|---|---|---|
| 6.3 | P1 | M | **Player form chart** - rolling last-10 match win rate |
| 6.4 | P2 | S | **Tournament difficulty indicator** |
| 6.5 | P2 | S | **Light mode toggle** |
| 6.6 | P3 | M | **Player photo/card art** from local static assets |

## EPIC 7 - Seasons And League Standings

| # | P | Effort | Item |
|---|---|---|---|
| 7.1 | P1 | M | **Season groupings** like "2026 Spring" with cumulative standings |
| 7.3 | P2 | S | **Attendance tracker** by season |
| 7.4 | P2 | S | **Prize pool tracking** from local overrides/import file |
| 7.5 | P3 | M | **Multi-event support** for other tournaments beyond Fremont Open |

## EPIC 8 - Static Site UX

| # | P | Effort | Item |
|---|---|---|---|
| 8.5 | P2 | S | **Case-insensitive player URLs** |
| 8.6 | P2 | S | **404/static fallback polish** for unknown players and tournaments |
| 8.7 | P3 | S | **Pinch-zoom bracket view** |

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

1. **5.2 Rivalry index** - rank meaningful rivalries instead of just individual players.
2. **2.8 Monthly Fargo refresh** - connect an authorized source or override workflow with reports.
3. **7.1 Season groupings** - organize stats into spring/summer/fall sessions.
4. **6.3 Player form chart** - show rolling last-10 match win rate.
5. **4.1 Bracket visualization** - make tournament detail pages easier to inspect.
6. **4.5 Tournament archive search** - add date, winner, and format search to the archive.
7. **2.6 Manual side-match import** - capture matches not tracked in Challonge.

---

## JFL Issue Details

### Tournament analytics: player count, duration, and winner leaderboard

Labels: `jfl`, `epic:tournaments`, `enhancement`

### Epic
tournaments

### Summary
Add tournament analytics showing player count trends, tournament duration, and the players with the most tournament wins.

### Feature request
For tournament views and/or dashboard analytics, add metrics that help understand tournament size, length, and historical winners.

### Acceptance criteria

- [ ] Compute the number of players in each tournament.
- [ ] Show the average number of players over time.
- [ ] Display the trend in a chart, table, or dashboard card.
- [ ] Compute tournament duration when start/end timestamps are available.
- [ ] Show duration on tournament detail pages.
- [ ] Add a duration trend or summary view.
- [ ] Count tournament wins by player.
- [ ] Show the players with the most tournament wins.
- [ ] Clearly display 1st, 2nd, 3rd, and 4th ranked tournament winners.
- [ ] Handle ties clearly and consistently.
- [ ] Handle missing or incomplete tournament data gracefully.

### Notes
JFL-priority feature request.

### Player analytics: average placement and top finish counts

Labels: `jfl`, `epic:rankings`, `enhancement`

### Epic
rankings

### Summary
Add player analytics showing average placement and how often each player finishes in the top 1, 2, 3, and 4.

### Feature request
For player detail pages and rankings, add placement-based statistics that show player consistency and top finishes beyond simple win/loss records.

### Acceptance criteria

- [ ] Compute each player's placement per tournament where placement data is available.
- [ ] Compute average placement per player.
- [ ] Display average placement on player detail pages.
- [ ] Make clear that lower average placement is better.
- [ ] Count 1st-place finishes per player.
- [ ] Count top-2 finishes per player.
- [ ] Count top-3 finishes per player.
- [ ] Count top-4 finishes per player.
- [ ] Display top finish counts on player detail pages.
- [ ] Consider adding average placement and top finish counts to leaderboard/table views.
- [ ] Handle ties and missing placement data consistently.

### Notes
JFL-priority feature request.

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
