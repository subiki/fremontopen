# Agent Session Notes

## 2026-05-19 - Finalize superseded closeout

- Re-ran `git status --short` and `git branch --show-current`; the checkout was clean on `main`.
- Confirmed the cache-freshness and encoding-cleanup work was already merged earlier in commit `c3949ddf2542633794fa3bd0a1eddbfed7f1c634` (`Commit frontend freshness and ops review fixes`), so this pass made no code changes.
- Verified the landed files still exist in place and recorded this pass as `SUPERSEDED`; merged now on `main` as documentation-only closeout with no blocker and no holding branch.

## 2026-05-19 - Freshness slice finalize superseded recheck

- Re-ran `git status --short` and `git branch --show-current`; the checkout was clean on `main`.
- Confirmed the cache-freshness and encoding-cleanup slice was already preserved on the current branch in commit `c3949ddf2542633794fa3bd0a1eddbfed7f1c634` (`Commit frontend freshness and ops review fixes`).
- Verified the landed state by checking `frontend/src/lib/cacheFreshness.js`, the dashboard/topbar freshness imports, and the earlier `Static cache freshness warnings` note; outcome was merged earlier on `main`, not parked, with no blocker.

## 2026-05-19 - Finalize pass after transient index lock

- Re-ran `git status --short` and `git branch --show-current`; the branch was `main`.
- Hit a brief `.git/index.lock` error while probing staged state, then rechecked the repo and confirmed the lock had cleared and the tree was clean.
- Added this note as the only durable change for the pass; merged now on `main` as documentation-only closeout after verification.

## 2026-05-19 - Finalize merge confirmation

- Rechecked the live checkout with `git status --short` and `git branch --show-current`; the tree was clean on `main`.
- Confirmed the useful autonomous work was already merged on the current branch in commit `c3949dd`.
- Verified this finish pass was merged now, not parked, and had no blocker.

## 2026-05-19 - Finalize recheck no-op closeout

- Re-ran `git status --short` and `git branch --show-current` during a second explicit finalize pass; the checkout was still clean on `main`.
- No additional code changes were pending, no holding branch was needed, and the previously superseded event-overperformance work remained already merged in the current branch state.
- Verified this pass was a no-op closeout and preserved that fact here; merged now as documentation-only closeout.

## 2026-05-19 - Superseded single-tournament overperformance closeout

- Verified `git status --short` and `git branch --show-current` before finalizing; the checkout was already clean on `main`.
- Confirmed the `5.5` single-tournament performance-above-ELO slice was already present on the current branch in `backend/export_static.py`, `frontend/src/pages/Dashboard.jsx`, `frontend/src/pages/PlayerDetail.jsx`, and `frontend/src/pages/TournamentDetail.jsx`.
- Verified the existing landed implementation by inspecting the live checkout and recent session notes rather than replaying or re-committing duplicate code.
- Outcome: superseded by already-merged branch state, so no holding branch was needed and only this closeout note was added.

## 2026-05-19 - agent closeout for merged optional static-demo work

- Verified the real checkout state with `git status --short` and `git branch --show-current`; the working tree was clean on `main`.
- Confirmed the previously useful optional static-demo work is already preserved in commit `62f6936` (`Finish optional static demo backlog`), including deterministic player art and static multi-event browsing.
- No holding branch was needed because there were no remaining uncommitted files from this agent slice to preserve.

## 2026-05-19 - Ops review network-blocker fallback

- Reviewed the static-demo ops triage flow against `docs/agents/ops-reviewer.md` and the generated `.run-logs/ops-review/latest.*` report, which currently points to a `P1` scheduled refresh failure from missing `CHALLONGE_API_KEY` and `CHALLONGE_SUBDOMAIN` repo secrets plus a `P2` code-scanning visibility gap from missing `GITHUB_TOKEN` or `GH_TOKEN`.
- Confirmed the local Codex shell cannot reach `api.github.com` in this environment and that `scripts/ops_review.py` previously crashed with `WinError 10013` instead of writing a blocker report.
- Hardened `scripts/ops_review.py` to emit explicit `P2` workflow/code-scanning access blockers when GitHub API requests are denied or otherwise unreachable, and added focused regression coverage in `backend/tests/test_ops_review.py`.
- Verified with `.\.venv\Scripts\python.exe -m pytest backend/tests/test_ops_review.py --basetemp .pytest-tmp-ops-review` and `.\.venv\Scripts\python.exe scripts\ops_review.py --out-dir .run-logs\ops-review-local`.

## 2026-05-19 - Static cache freshness warnings

- Audited the post-backlog static demo for operational clarity and found that the site exposed cache metadata without clearly telling viewers when the exported snapshot was aging or stale.
- Added a shared frontend cache-freshness helper plus a prominent `Data Cache` warning banner on the dashboard that classifies the current snapshot as fresh, aging, stale, error, or empty using the existing `generated_at` and `last_synced_at` values only.
- Added a compact topbar warning pill for aging or stale snapshots so cache drift is visible outside the dashboard too, without introducing any runtime backend dependency.
- Verified the production frontend build with `C:\Users\karmi\OneDrive\Documents\fremontopen\.tools\node-v24.15.0-win-x64\npm.cmd run build --prefix frontend`.

## 2026-05-19 - Frontend encoding cleanup

- Audited the current static-demo checkout after backlog completion and found a real UI defect: several React surfaces rendered mojibake placeholders and separators such as broken dashes, dots, arrows, and ellipses.
- Replaced the affected text in `frontend/src/pages/Dashboard.jsx`, `frontend/src/pages/Players.jsx`, `frontend/src/pages/PlayerDetail.jsx`, `frontend/src/pages/TournamentDetail.jsx`, `frontend/src/components/SearchBar.jsx`, and `frontend/src/components/PlayerArtCard.jsx` with ASCII-safe equivalents to avoid Windows encoding regressions.
- Verified the production frontend build with `C:\Users\karmi\OneDrive\Documents\fremontopen\.tools\node-v24.15.0-win-x64\npm.cmd run build --prefix frontend`.

## 2026-05-19 - Dashboard field and pace trend

- Combined the dashboard field-size and duration trend cards into one static `Field and Pace Trend` list so each recent event shows field size, normalized duration, and whether it finished ahead of, on, or behind its same-bucket average.
- Added exporter logic in `backend/export_static.py` to join each tournament duration row with its game-and-player-count baseline and emit `tournament_field_duration_trend` for the dashboard payload.
- Added regression coverage in `backend/tests/test_export_analytics.py` for the ahead/on/behind duration rating thresholds.
- Regenerated `frontend/public/data/cache.json` with `.\.venv\Scripts\python.exe backend\export_static.py`, which now also proves the repo-root export path remains safe after the prior SQLite normalization fix.
- Verified with `.\.venv\Scripts\python.exe -m pytest backend/tests/test_export_analytics.py --basetemp C:\Users\karmi\.codex\tmp\pytest-field-pace` and `.\.tools\node-v24.15.0-win-x64\npm.cmd run build --prefix frontend`.

## 2026-05-19 - Repo-root SQLite path guard

- Reviewed the current `origin/main` state before pushing and found the static-demo backlog slice was already upstream, so the remaining shippable delta was the local export safety fix rather than another replay of cache/UI work.
- Normalized relative SQLite `DATABASE_URL` values inside `backend/database.py` so repo-root runs now resolve `sqlite+aiosqlite:///./cuestats_dev.db` to `backend/cuestats_dev.db` instead of creating a zero-byte root database.
- Added focused regression coverage in `backend/tests/test_database.py` for both the relative-path fix and the absolute-path pass-through case.
- Added ignore rules for repo-root pytest temp directories and the accidental root `cuestats_dev.db` artifact to keep local-only operational churn out of commits.
- Verified with `.\.venv\Scripts\python.exe -m pytest backend/tests/test_database.py backend/tests/test_export_analytics.py backend/tests/test_fargo_refresh.py --basetemp .pytest-tmp-db-path-fix` and `.\.tools\node-v24.15.0-win-x64\npm.cmd run build --prefix frontend`.

## 2026-05-14 - P3 equipment overrides

- Re-read backlog, docs, and live GitHub labels after printable tournament detail pages.
- No non-stale JFL/P0/P1/P2 items remained, so selected the next small P3 player-profile item.
- Extended `backend/player_overrides.json` support for playing cue, break cue, shaft, tip, and equipment notes.
- Exported equipment metadata in player extras and surfaced it on player profile pages.
- Kept the feature static-first and file-based with no runtime backend, server writes, auth, admin, chat, or Challonge browser calls.

## 2026-05-14 - P3 printable tournament detail

- Re-read backlog, docs, and live GitHub labels after bracket pinch zoom.
- No active non-stale JFL/P0/P1/P2 items remained, so selected the next small static P3 tournament-view item.
- Added a native print action on tournament detail pages.
- Added print-only tournament metadata and print CSS that hides navigation/controls, expands the bracket viewport, and keeps match cards/table rows intact.
- Kept the change static-first with no backend, cache, Challonge browser calls, auth, admin, or chat work.

## 2026-05-14 - P2/P3 bracket pinch zoom

- Re-read backlog, docs, and live GitHub issue labels after the light mode slice.
- Selected open GitHub P2 issue #51, "Pinch-zoom bracket view", matching the backlog static UX bracket item.
- Added tournament bracket zoom controls for zoom in, zoom out, and reset.
- Added wheel zoom with Ctrl/Meta and two-finger pinch handling inside the bracket viewport.
- Kept the change client-only and static-first with no cache, backend, auth, admin, chat, or Challonge browser calls.

## 2026-05-14 - P2 light mode toggle

- Re-read backlog, docs, and live GitHub issue labels after the JFL title fix.
- Confirmed no open P0 issues and selected P2 issue #39, "Light mode toggle", as the next non-stale backlog item.
- Added a topbar theme toggle with a localStorage-backed preference and document-level theme attribute.
- Added light-theme CSS variable values and scoped overrides for existing static color utility classes without changing the deployment model.
- Kept the feature static-first: no runtime backend, server writes, Challonge browser calls, auth, admin, or chat systems.

## 2026-05-14 - JFL placement-derived titles

- Picked up the prepared JFL analytics bug after GitHub issue creation failed due to integration write permissions.
- Confirmed player profile `titles.total` used a player-only highest-round heuristic while `top_1_finishes` used full tournament placement inference.
- Replaced title totals with placement-derived title rows from the same inferred placements used for top finish counts.
- Removed the stale championship heuristic from `players_extras.py` so the export has one title source of truth.
- Kept the change static-first and regenerated only the exported cache data.

## 2026-05-14 - P2 H2H heatmap

- Pulled live GitHub issue priority after backlog refresh; no P0 issues were open and the remaining live JFL/P1 items were already represented as completed backlog work.
- Selected P2 issue #32 as the highest non-stale remaining build item.
- Added a static H2H heatmap export from completed cached matches, capped to top active players for dashboard usability.
- Surfaced the matrix on the dashboard with compare-page links for every populated player pairing.
- Kept the implementation static-first with no runtime backend, browser Challonge calls, auth, admin, or chat systems.

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

## 2026-05-17 - P0 split static cache and tournament stories

- Split the static export into a small dashboard manifest plus lazy-loaded player and tournament detail JSON files.
- Added tournament-level match-of-the-tournament analytics and linked dashboard upset/anniversary rows directly to referenced match anchors.
- Kept the implementation static-first and verified backend tests, frontend build, and browser navigation across dashboard/detail routes.

## 2026-05-17 - P2 accessibility readability pass

- Raised remaining 10px/11px UI labels to Tailwind `text-xs` across navigation, search, dashboard, tournament, player, season, compare, and leaderboard surfaces.
- Brightened dark-theme muted/secondary gray overrides while leaving the existing light-theme mappings intact.
- Updated the backlog so the completed cache split and readability pass no longer remain in the active Top 10.

## 2026-05-17 - Challonge refresh through May 16

- Refreshed the Fremont Open Challonge cache with the May 16, 2026 event, `4Bs 8 ball 5/16/26`.
- Rebuilt the static cache into 589 player bundles and 246 tournament bundles, then verified the production frontend build.
- Added the local ignored `CHALLONGE_SUBDOMAIN=fremontopen` setting after an initial account-level sync showed the subdomain was missing locally.

## 2026-05-17 - P2 desktop bracket scrolling

- Continued from the updated static backlog and took the top remaining P2 item, `4.10 Fix desktop bracket scrolling`.
- Replaced the tournament-detail bracket viewport's CSS `zoom` layout with a measured transform-based wrapper so horizontal and vertical scrolling stay stable on desktop while keeping the existing zoom controls and pinch behavior.
- Updated print CSS to keep the bracket scaled for paper without relying on runtime `zoom`.
- Marked the backlog item done and advanced the Top 10 queue to the next remaining tournament-view cleanup items.
- Frontend build verification in this worktree is currently blocked by local dependency/tooling drift: portable Yarn is outside the worktree, the shared dependency tree is not directly reusable here, and the current local build attempt failed on module resolution rather than the bracket patch itself.

## 2026-05-18 - P2 tournament detail cleanup

- Continued in backlog order after `4.10` and completed `4.11`, `4.12`, and `4.13` together on the tournament archive/detail views.
- Removed the single-tournament print action and match-table State column from `frontend/src/pages/TournamentDetail.jsx`.
- Simplified tournament metadata labels to plain `Date` and `Status`, and surfaced numeric field strength as average field ELO on both the tournament detail page and archive cards/timeline.
- Restored a local `frontend/node_modules` tree in this worktree with the repo's portable Yarn path so frontend validation can run here again.
- Verified the static frontend build with `C:\Users\karmi\OneDrive\Documents\fremontopen\.tools\node-v24.15.0-win-x64\npm.cmd run build --prefix frontend`.

## 2026-05-18 - P2 player profile cleanup

- Continued to the next two small player-profile backlog items, `3.8` and `3.9`, before starting the larger `3.10` summary work.
- Removed the glitchy prev/next player controls from `frontend/src/pages/PlayerDetail.jsx` while keeping the existing share/follow actions and leaderboard position subtitle.
- Removed the equipment panel from the player profile so the page stays focused on stats, rankings, and comparison-oriented cards.
- Verified the static frontend build again with `C:\Users\karmi\OneDrive\Documents\fremontopen\.tools\node-v24.15.0-win-x64\npm.cmd run build --prefix frontend`.

## 2026-05-18 - P2 player core results summary

- Continued to `3.10` and added a dedicated `Core Results` summary section near the top of `frontend/src/pages/PlayerDetail.jsx`.
- Derived race wins/losses, rack wins/losses, scored-race totals, tournaments played, and rank context directly from the cached player matches plus the fetched leaderboard list, keeping the slice client-only and static-first.
- Kept the existing stat cards and deeper analytics sections intact; the new summary acts as a compact at-a-glance block instead of replacing the detailed views.
- Verified the static frontend build with `C:\Users\karmi\OneDrive\Documents\fremontopen\.tools\node-v24.15.0-win-x64\npm.cmd run build --prefix frontend`.

## 2026-05-18 - P2 leaderboard tournament and rack filters

- Continued to `3.12` and extended `backend/export_static.py` so each player summary now carries races won/lost/played plus racks won/lost/played for static filtering and ranking context.
- Added targeted coverage in `backend/tests/test_export_analytics.py` for score parsing and the per-player results summary helper, then passed the export analytics test file with the shared repo venv.
- Regenerated `frontend/public/data/cache.json` plus the player bundle files so the new leaderboard filters have live static data to read at deploy time.
- Updated `frontend/src/pages/Leaderboard.jsx` with minimum tournaments and minimum racks filters, and surfaced tournament/rack totals in each leaderboard row for clearer filter feedback.
- Verified the static frontend build with `C:\Users\karmi\OneDrive\Documents\fremontopen\.tools\node-v24.15.0-win-x64\npm.cmd run build --prefix frontend`.

## 2026-05-18 - Finish remaining P2 demo backlog

- Completed `5.5`, `3.11`, and `3.13` together to clear the last non-P3 static-demo backlog items.
- Extended `backend/export_static.py` with tournament-level performance-above-ELO summaries, global single-event overperformance rankings, and each player's biggest single payout plus best event above expectation.
- Added export analytics coverage in `backend/tests/test_export_analytics.py` for ranking event overperformers from match-level ELO odds.
- Updated `frontend/src/pages/TournamentDetail.jsx`, `frontend/src/pages/Dashboard.jsx`, `frontend/src/pages/PlayerDetail.jsx`, `frontend/src/pages/StatRankings.jsx`, and `frontend/src/pages/Leaderboard.jsx` to surface the new event/payout stories and clarify that current/best leaderboard streaks mean consecutive tournament attendance.
- Regenerated `frontend/public/data/cache.json` and the split player/tournament bundle files, then passed both the shared-repo frontend build and backend export analytics tests.

## 2026-05-18 - Finish optional static-demo backlog

- Completed `6.6` by adding deterministic static player card art to the player directory and profile hero instead of blocking on missing real-photo assets.
- Completed `7.5` with a minimal static-only multi-event slice: tournaments are now classified into local event series such as `4Bs` and `Talarico's`, and that series data is surfaced in the dashboard and tournament archive filters.
- Extended `backend/export_static.py` and `backend/tests/test_export_analytics.py` with event-series classification so the static cache carries reusable series labels and counts.
- Updated `frontend/src/pages/Players.jsx`, `frontend/src/pages/PlayerDetail.jsx`, `frontend/src/pages/Tournaments.jsx`, and `frontend/src/pages/Dashboard.jsx` to use the new card art and series metadata.
- Regenerated `frontend/public/data/cache.json` plus the split player/tournament bundle files, then passed the shared-repo frontend build and backend export analytics tests again.
- Fixed rack-win export normalization so reversed score strings like `2-4` now count as 4 racks for the winner and 2 for the loser instead of trusting score position.
- Added targeted regression coverage for the score-normalization bug and a small reviewed-only single-name alias workflow based on `backend/player_aliases.json`.
- Added `backend/single_name_aliases.py` plus `scripts/review-single-name-aliases.ps1` so unambiguous first-name merges can be reviewed, copied into the alias file, then rebuilt through static dedupe/export without Challonge calls.
- Added a static-first ops review script at `scripts/ops_review.py` that triages public GitHub Actions failures and, when token access is available, GitHub code-scanning alerts into a prioritized report.
- Added `docs/agents/ops-reviewer.md` as the steering spec for recurring ops automation, including priority rules and noise filters for the DreamHost static demo.
- Created a file-backed Codex automation definition under `C:\Users\karmi\.codex\automations\ops-review\` and explicitly avoided OS-level task scheduling after removing the accidental Windows scheduled task.
## 2026-05-19 Ops review follow-up

- Re-reviewed `.run-logs/ops-review/latest.md`, `docs/agents/ops-reviewer.md`, and `scripts/ops_review.py` against the static DreamHost demo scope.
- Removed the redundant `CHALLONGE_SUBDOMAIN` GitHub secret requirement from `.github/workflows/data-refresh.yml` by pinning the workflow to the repo's fixed `fremontopen` subdomain.
- Updated `scripts/ops_review.py` and `backend/tests/test_ops_review.py` so the refresh failure is now reported as the remaining `CHALLONGE_API_KEY` secret gap instead of a combined secret blocker.
- Verification target: targeted `pytest backend/tests/test_ops_review.py` plus a local `scripts/run-ops-review.ps1` run if GitHub API access remains blocked.

## 2026-05-20 - Expanded leaderboard stat sorting

- Added a shared frontend leaderboard metric registry so `/leaderboard` and `/rankings/:stat` expose the same sortable stat set.
- Expanded leaderboard sorting to include tournaments played, wins/losses, win rate, races, racks, rack differential, ELO, ELO upset/loss extremes, schedule strength, placements, streaks, and cash fields from the static cache.
- Extended `backend/export_static.py` with per-player best ELO upset and worst ELO loss summaries derived from existing match ELO odds, then regenerated `frontend/public/data/cache.json` plus split player bundles.
- Verified with `pytest backend/tests/test_export_analytics.py --basetemp .pytest-tmp` and the static frontend build through the repo's portable Yarn path.

## 2026-05-20 - Cache scale optimization handoff

- Current `main` is clean and synced after commit `c25f963` (`Expand leaderboard stat sorting`) was pushed to `origin/main`.
- Initial static-hosting scale audit found `frontend/public/data/cache.json` at roughly 1.6 MB, with the largest split player bundles near 1.0 MB; top player bundles now dominate the worst-case detail-page payload more than the landing cache.
- The current frontend loader in `frontend/src/lib/api.js` always fetches `/data/cache.json` with `cache: "no-cache"`, then lazily fetches split player/tournament bundles with `cache: "no-cache"` as detail pages need them. This is simple but leaves browser/CDN caching value on the table for DreamHost static hosting.
- Next recommended slice: keep the static-first model, add a generated lightweight manifest/index for app boot and list/search pages, and stop forcing `no-cache` for immutable generated JSON except when intentionally checking freshness metadata.
- Suggested implementation order: measure current JSON shapes, decide which fields must remain in `cache.json` for dashboard/search/list pages, export a `manifest.json` or slim `cache-index.json`, update `frontend/src/lib/api.js` to load slim-first and lazy-load heavy detail bundles, then regenerate data and run export tests plus frontend build.

## 2026-05-20 - Ops review workflow persistence fix

- Re-ran the repo-local ops review against the restricted Codex sandbox and confirmed live GitHub visibility is still blocked here, so workflow status beyond the last captured report remains dependent on external Actions access or attached artifacts.
- While validating the scheduled refresh path, found that `.github/workflows/data-refresh.yml` still only diffed and committed `backend/cuestats_dev.db`, `backend/player_overrides.json`, and `frontend/public/data/cache.json`, even though the static export also writes split player and tournament bundles.
- Updated the workflow to treat `frontend/public/data/players` and `frontend/public/data/tournaments` as first-class generated artifacts during change detection and commit staging, then added a regression test at `backend/tests/test_data_refresh_workflow.py`.
