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
- [x] Mobile drawer navigation for full site menu access
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
- [x] Case-insensitive player profile URLs
- [x] 404 and unknown player/tournament fallback polish
- [x] Rivalry index ranked by matches, closeness, and streak swings
- [x] Season groupings page with cumulative standings
- [x] Player form chart with rolling last-10 match win rate
- [x] Bracket visualization on tournament detail pages
- [x] Tournament archive search by date range, winner, and format
- [x] Manual side-match CSV import for matches not tracked in Challonge
- [x] Strength of schedule from opponent win rate and ELO
- [x] Player nicknames from local overrides file
- [x] Cinderella runs from tournament ELO underdog wins
- [x] Upset tracker for rating-underdog wins
- [x] Attendance tracker by season
- [x] Anniversary stats for matches near this week last year or previous season
- [x] Prize pool tracking from local override file
- [x] Tournament difficulty indicator from field ELO
- [x] Keyboard shortcuts for search and quick navigation
- [x] PWA manifest and offline cache for static shell and `cache.json`
- [x] Configurable season points system for weekly standings
- [x] H2H heatmap matrix across top active players
- [x] Tournament title totals unified with placement-based first-place logic
- [x] Light mode toggle with persistent local preference
- [x] Pinch-zoom bracket view for tournament detail pages
- [x] Printable tournament bracket/detail pages
- [x] Equipment/custom cue fields from local player overrides
- [x] Split static cache for faster weak-signal loads
- [x] Lean static search/lookup indexes for topbar search, compare picker, and followed-player cards
- [x] Accessibility readability pass with larger small labels and improved gray-on-dark contrast
- [x] Desktop bracket scrolling fix for tournament detail pages
- [x] Remove tournament match State column and print button from single-tournament views
- [x] Numeric tournament difficulty metric showing average field ELO
- [x] Simplify tournament date and state labels
- [x] Remove player profile prev/next controls
- [x] Remove player equipment panel
- [x] Player profile core results summary
- [x] Leaderboard filters for tournaments and racks played
- [x] Player directory filters for tournaments, racks, and richer stat sorting
- [x] Biggest single tournament pot won per player
- [x] Clarify leaderboard current and best columns
- [x] Single-tournament performance above ELO view
- [x] Player photo/card art from local static assets
- [x] Multi-event support for other tournaments beyond Fremont Open

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

All current static deploy and data-refresh items are complete.

## EPIC 2 - Data Quality Without Admin UI

All current data-quality items are complete.

## EPIC 3 - Player Stats And Rankings

All current player-stats and ranking items are complete.

## EPIC 4 - Tournament Views

All current tournament-view items are complete.

## EPIC 5 - Compare, Rivalries, And Story Views

All current compare, rivalry, and story-view items are complete.

## EPIC 6 - Charts And Visual Polish

All current charts and visual polish items are complete.

## EPIC 7 - Seasons And League Standings

All current season and multi-event items are complete.

## EPIC 8 - Static Site UX

All current static UX items are complete.

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

All current static-demo backlog items are complete. Remaining `EPIC 9` items stay deferred until the product has a backend again.

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

- [x] Compute the number of players in each tournament.
- [x] Show the average number of players over time.
- [x] Display the trend in a chart, table, or dashboard card.
- [x] Compute tournament duration when start/end timestamps are available.
- [x] Show duration on tournament detail pages.
- [x] Add a duration trend or summary view.
- [x] Count tournament wins by player.
- [x] Show the players with the most tournament wins.
- [x] Clearly display 1st, 2nd, 3rd, and 4th ranked tournament winners.
- [x] Handle ties clearly and consistently.
- [x] Handle missing or incomplete tournament data gracefully.

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

- [x] Compute each player's placement per tournament where placement data is available.
- [x] Compute average placement per player.
- [x] Display average placement on player detail pages.
- [x] Make clear that lower average placement is better.
- [x] Count 1st-place finishes per player.
- [x] Count top-2 finishes per player.
- [x] Count top-3 finishes per player.
- [x] Count top-4 finishes per player.
- [x] Display top finish counts on player detail pages.
- [x] Consider adding average placement and top finish counts to leaderboard/table views.
- [x] Handle ties and missing placement data consistently.

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

### Legacy Issue Titles To Close

These older manually-created issue titles describe static-demo work that has already shipped
and should be auto-closed by the backlog sync even though they predate the newer `epic:*`
labels used by the current automation.

- mobile navigation
- race versus rack
- normalize data
- auto refresh
- fargo

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
