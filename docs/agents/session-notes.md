# Agent Session Notes

## 2026-05-14 - JFL timing baseline

- Pulled `main`, read `BACKLOG.md`, docs, and live GitHub issues.
- Highest open priority was JFL issue #71, "Tourney timing min max".
- Added static export timing baselines for shortest/longest normal-duration tournaments overall and by game plus player count.
- Surfaced timing baselines on the dashboard and tournament detail pages.
- Kept the implementation static-first: no runtime backend, no browser Challonge calls, and no auth/admin/chat work.

## 2026-05-14 - JFL Tuesday refresh

- Continued down live JFL issues after #71 and selected #67, "auto refresh".
- Added a scheduled Tuesday GitHub Actions workflow that refreshes local SQLite/cache data, builds the static frontend, commits changed data, and deploys the DreamHost static build.
- The workflow uses only the Challonge API from CI tooling and keeps the production site static.

## 2026-05-14 - JFL monthly Fargo wiring

- Continued to live JFL issue #68, "fargo".
- Extended the scheduled static refresh workflow with a monthly Fargo pass using `FARGO_SOURCE_URL`.
- Kept Fargo refresh source-gated: no bypassing logins, captchas, robots.txt, or anti-bot controls.

## 2026-05-14 - P1 case-insensitive player URLs

- Continued to open P1 issue #49 after JFL implementation work.
- Added static API canonical player-name resolution for player detail, extras, and compare routes.
- Player detail pages now replace lowercase or mixed-case URLs with the canonical player URL after load.

## 2026-05-14 - P1 static fallback polish

- Continued to open P1 issue #50.
- Replaced the wildcard home redirect with a static 404 page.
- Added useful missing-player and missing-tournament states with links back to directory/search entry points.

## 2026-05-14 - P1 rivalry index

- Started open P1 issue #30.
- Added static export rivalry ranking based on match volume, record closeness, and winner streak swings.
- Surfaced the top rivalry index rows on the dashboard with links to compare pages.

## 2026-05-14 - P1 season groupings

- Continued to open P1 issue #41.
- Added a dedicated `/seasons` static page with spring/summer/fall/winter groups and cumulative standings.
- Widened static season export to include full season player standings instead of dashboard-only slices.

## 2026-05-14 - P1 player form chart

- Continued by backlog priority after the season standings slice.
- Added rolling last-10 match form analytics to the static player extras export.
- Surfaced recent form on player detail pages alongside wins-over-time and ELO charts.
- Kept the implementation static-first with no new runtime backend requirement.

## 2026-05-14 - P1 bracket visualization

- Continued to the next backlog P1, bracket visualization on tournament detail pages.
- Added a compact static bracket view grouped by Challonge winner/loser rounds above the match table.
- Kept the table as the detailed source of match state, scores, and ELO odds.

## 2026-05-14 - P2 tournament archive search

- Continued to the next build-order item after active P1 work was clear.
- Added tournament archive filtering by tournament/winner text, winner, game format, and date range.
- Reused the existing static tournament list payload and kept cards/timeline views unchanged.

## 2026-05-14 - P2 manual side-match import

- Added a local CSV importer for side matches not tracked in Challonge.
- Wired the static refresh script and scheduled workflow to import `backend/manual_side_matches.csv` when present.
- Documented the CSV path and kept the importer local/static-first with no admin UI.

## 2026-05-14 - JFL mobile navigation follow-up

- Rechecked open JFL issue #58 after backlog P1/P2 work was clear.
- Added a mobile drawer menu so the full site navigation can kick out from the bottom bar.
- Kept the quick bottom navigation for the highest-traffic routes and moved secondary routes into the drawer.

## 2026-05-14 - P2 strength of schedule

- Continued to the next active backlog P2 item after stale JFL/P1 issue review.
- Added weighted strength-of-schedule stats from opponents' win rates and ELO ratings.
- Surfaced schedule strength on player profiles, stat rankings, and leaderboard sorting.

## 2026-05-14 - P2 player nicknames

- Confirmed the local player override schema already accepts `nickname`.
- Added nickname matching to player/global search.
- Surfaced nicknames in the player directory and on player profile pages.

## 2026-05-14 - P2 Cinderella runs

- Added tournament-level Cinderella run analytics from cached ELO odds.
- Ranked players by accumulated underdog-win score per tournament.
- Surfaced the top Cinderella runs on tournament detail pages above the bracket.

## 2026-05-14 - P2 upset tracker

- Added a global ELO upset tracker for rating-underdog match wins.
- Ranked upsets by the favorite's pre-match win probability.
- Surfaced the top upset rows on the dashboard.

## 2026-05-14 - P2 season attendance tracker

- Added per-season unique tournament attendance counts for each player.
- Added season attendance leader rows to the Seasons page.
- Kept the data derived from cached matches and tournament IDs only.

## 2026-05-14 - P2 anniversary stats

- Added dashboard anniversary stats from cached completed matches.
- Uses the latest cached match as reference and shows nearby matches from the same week last year.
- Falls back to recent previous-season matches when no one-year window exists.

## 2026-05-14 - P2 prize-pool overrides

- Added optional `backend/prize_overrides.json` support for default entry fee and tournament-level pot/payout overrides.
- Added an example override file and README documentation.
- Kept default payout behavior unchanged when no override file is present.

## 2026-05-14 - P2 tournament difficulty

- Added tournament difficulty labels from the field's average and top ELO.
- Surfaced difficulty on tournament archive cards, timeline rows, and tournament detail pages.
- Kept the calculation in the static export using cached ratings only.
