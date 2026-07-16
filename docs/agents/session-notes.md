# Agent Session Notes

## 2026-07-15 - Added unlisted Onda form page

- Added `frontend/src/pages/Onda.jsx` as a standalone unlisted page at `/onda`, outside the normal Fremont Open sidebar/topbar layout.
- Linked the page to `https://forms.gle/tbyQyPmQgVE5y9Vr5` with `noopener noreferrer` and a mobile-friendly full-width button.
- Verified the frontend production build succeeds before deployment.
- Added crawler-discouragement controls for `/onda`: `robots.txt` disallow rules, a static `frontend/public/onda/index.html` with `noindex,nofollow,noarchive`, `X-Robots-Tag` via `.htaccess`, and a runtime robots meta tag.
- Restyled `/onda` with sourced trip copy from the Google Docs overview/form build sheet and a lightweight Onda ocean hero image rendered from the shared buyout PDF.
- Swapped the `/onda` hero to the Onda pool-table/bar photo and moved headline copy out of the image area so mobile text no longer overlaps source-image lettering.
- Shifted `/onda` copy toward a more personal JFL invite centered on experiencing Costa Rica with good people.
- Rebalanced `/onda` copy to clarify the trip is open-ended: people can join group plans or do their own thing, while JFL negotiates hostel pricing and helps with coordination/options.
- Added the Pura Vida at Onda Trip Guide GPT link and swapped the hero to the Cabo Star photo optimized as a webp asset.

## 2026-06-14 - Added quick compare search to player profiles

- Added an inline compare picker near the top of `frontend/src/pages/PlayerDetail.jsx` so a profile can search for another player and open the existing head-to-head comparison route.
- Reused the leaderboard data already loaded for profile rank context, avoiding another lookup request and excluding the current player from suggestions.
- Kept the picker mobile-first and accessible with a labeled search field, native suggestions, 44px controls, disabled-state validation, and route-change state reset.
- Verified with the frontend production build and `git diff --check`; interactive browser verification was blocked by the in-app browser client with `ERR_BLOCKED_BY_CLIENT` for local URLs.

## 2026-05-27 - Expanded dashboard deep links and tournament archive entry points

- Re-read `BACKLOG.md` and `docs/agents/session-notes.md`, then checked the live dashboard/archive code because the request was to improve navigation without inventing new backend scope.
- Updated `frontend/src/pages/Dashboard.jsx` so previously plain-text dashboard surfaces now deep-link to relevant existing pages: info/cache cards, event-series cards, timing group cards, analytics badges, top-player stat lines, and recent-match score/game blocks.
- Added lightweight query-param support in `frontend/src/pages/Tournaments.jsx` for `series`, `game`, `winner`, `sort`, `view`, `q`, and date filters so dashboard deep links can open the tournament archive in a pre-filtered state instead of dropping users on the generic archive.
- Updated `BACKLOG.md` so the source-of-truth done list reflects the shipped dashboard navigation pass.
- Verified with `C:\Users\karmi\OneDrive\Documents\fremontopen\.tools\node-v24.15.0-win-x64\npm.cmd run build --prefix frontend`.

## 2026-05-27 - Fixed static leaderboard ordering for profile rank context

- Re-read `BACKLOG.md` and `docs/agents/session-notes.md`, then checked the live checkout before choosing work because the static-demo backlog was otherwise complete and this needed to come from an actual current app regression.
- Fixed `frontend/src/lib/api.js` so the static `/leaderboard` fallback now sorts players by the same default wins-first leaderboard metric the UI expects instead of returning raw player-index order.
- Updated `frontend/src/pages/PlayerDetail.jsx` so the subtitle rank and `Rank Context` card resolve against the canonical player name after redirects, which keeps case-insensitive profile URLs from missing the corrected static leaderboard position.
- Updated `BACKLOG.md` so the source-of-truth done list records the shipped static leaderboard ordering fix.
- Verified with `C:\Users\karmi\OneDrive\Documents\fremontopen\.tools\node-v24.15.0-win-x64\npm.cmd run build --prefix frontend`.

## 2026-05-26 - Branch merge and prune troubleshooting

- Started from clean `main` at `32c05f06` after the Dependabot merge and verified the DreamHost deploy had already succeeded for that head.
- Replayed the safe non-workflow portion of `origin/codex/p0-static-refresh-hardening`: Fargo source URL public-host validation, validation-report table allowlisting, related tests, and `noopener noreferrer` on the Info page. Committed as `58b8bd8c`.
- Replayed the safe issue-sync portion of `origin/codex/continuity-sync-playerdetail`: explicit legacy issue title closure from `BACKLOG.md` and normalized issue title matching in `scripts/create_github_issues.sh`. Committed as `a4cf41fd`.
- Confirmed `d412c6b3` is an empty/no-op replay against current `main`.
- Left the remaining workflow-preflight commits blocked because `d0565b87`, `d62ee2b6`, and `a55df242` conflict in `.github/workflows/data-refresh.yml`; local `codex/backup-static-demo-ship` also remains unsafe because it conflicts across generated data, exporter/tests, and frontend pages.
- Added the exact branch/prune handoff to `BACKLOG.md` so parallel or future agents do not delete unmerged work blindly.

## 2026-05-25 - Expanded player-directory stat sorting and sample filters

- Re-read `BACKLOG.md` and `docs/agents/session-notes.md`, then checked the live checkout state before choosing work because the static-demo backlog is otherwise complete and this slice needed to come from a real current UI gap rather than stale automation memory.
- Updated `frontend/src/pages/Players.jsx` to reuse the existing leaderboard metric registry so the player directory can now sort by the broader shipped stat set instead of only a narrow fixed subset.
- Added player-directory sample filters for minimum matches, tournaments, racks, and placement samples, keeping placement sorting honest without introducing any backend or export change.
- Reworked the player table so it shows a dynamic selected-stat column plus better record and rack context, making the directory more useful as a browsing surface instead of only a name list.
- Added a clear-filters action so the expanded controls are easier to unwind on mobile and after deeper stat browsing.
- Updated `BACKLOG.md` so the source-of-truth done list reflects the new player-directory sorting/filtering capability.
- Verification target for this slice is the production frontend build with the repo-local portable Node path.

## 2026-05-24 - Split lean search and lookup indexes out of the player directory payload

- Re-read `BACKLOG.md` and `docs/agents/session-notes.md`, then checked the live checkout and current static size report before continuing so this slice stayed anchored to the actual cache shape rather than stale automation memory.
- Added generated `frontend/public/data/players-search-index.json` and `frontend/public/data/tournaments-search-index.json` in `backend/export_static.py` so global search, the compare picker, and followed-player lookups can use lean static rows instead of loading the full directory indexes.
- Updated `frontend/src/lib/api.js` static fallbacks plus `frontend/src/pages/Compare.jsx` and `frontend/src/pages/Dashboard.jsx` so those lookup surfaces now read the new lean indexes, while the existing full directory pages still use `players-index.json` and `tournaments-index.json`.
- Updated `.github/workflows/data-refresh.yml` and `backend/tests/test_data_refresh_workflow.py` so scheduled refreshes track and commit the new generated search-index files with the rest of the static export surface.
- Verified with `.\.venv\Scripts\python.exe export_static.py` from `backend\`, `.\.venv\Scripts\python.exe -m pytest backend/tests/test_export_analytics.py backend/tests/test_data_refresh_workflow.py --basetemp .pytest-tmp-search-index-verify-2`, and `C:\Users\karmi\OneDrive\Documents\fremontopen\.tools\node-v24.15.0-win-x64\npm.cmd run build --prefix frontend`.

## 2026-05-23 - Fixed winter season rollover

- Updated `backend/export_static.py` so December tournaments are grouped into the following year's Winter season, matching the Jan/Feb half of the same winter period.
- Regenerated the static export; `2026 Winter` now runs from `2025-12-06T16:32:25.004-05:00` through `2026-02-28T16:28:25.717-05:00` with 13 tournaments.
- Verified with `.\.venv\Scripts\python.exe -m pytest backend/tests/test_export_analytics.py -k "season_for_date or season_standings or rivalry_win_counts"` and `REACT_APP_STATIC_DATA=true .\node_modules\.bin\craco.cmd build`.

## 2026-05-23 - Added rivalry wins leaderboard metric

- Added `_rivalry_win_counts()` in `backend/export_static.py` so each exported player now gets `rivalry_wins`, counting qualifying head-to-head rivalry pairs with at least 3 matches where the player leads; tied rivalries are intentionally excluded.
- Added `Rivalries Won` to `frontend/src/lib/leaderboardMetrics.js`, surfaced the metric on the leaderboard chips, and added a player-profile stat card linking to `/rankings/rivalry_wins`.
- Regenerated the static export; current leaders include Chad Galera with `52`, Eddie Robinson with `49`, and Jason Lambert with `46` rivalry wins.
- Verified with `.\.venv\Scripts\python.exe -m pytest backend/tests/test_export_analytics.py -k "rivalry_win_counts or rivalry_index"`, `.\.venv\Scripts\python.exe export_static.py` from `backend\`, `REACT_APP_STATIC_DATA=true .\node_modules\.bin\craco.cmd build` from `frontend\`, and a browser smoke check of `/rankings/rivalry_wins`.

## 2026-05-23 - Seasonal date ranges, active H2H focus, and bracket drag-to-pan

- Re-read `BACKLOG.md` and `docs/agents/session-notes.md`, then inspected the live dirty checkout before continuing so this slice stayed aligned with the actual in-progress export/frontend work instead of stale automation memory.
- Updated `backend/export_static.py` so season standings now carry `start_date` and `end_date`, and the H2H heatmap now limits its featured player set to competitors active within the last 90 days while still preserving the same split static-file structure.
- Added focused regression coverage in `backend/tests/test_export_analytics.py` for the pruned boot cache helper, active-window H2H selection, and the new season date fields.
- Updated `frontend/src/pages/Dashboard.jsx` so season cards are selectable, recent-match rows show fuller context, stat cards deep-link into relevant surfaces, and the H2H panel explains that it is based on recent activity rather than all-time volume.
- Updated `frontend/src/pages/Seasons.jsx` to show each season's actual date range, and `frontend/src/pages/TournamentDetail.jsx` to support mouse drag-to-pan on the bracket viewport without changing the static hosting model.
- Regenerated the static export and confirmed the data budget stayed flat: `frontend/public/data/cache.json` is `17,051` bytes and `frontend/public/data/h2h-heatmap.json` is `13,842` bytes in the current export snapshot.
- Verified with `.\.venv\Scripts\pytest.exe backend/tests/test_export_analytics.py --basetemp .pytest-tmp-burninator-season-heatmap`, `.\.venv\Scripts\python.exe export_static.py` from `backend\`, and `C:\Users\karmi\OneDrive\Documents\fremontopen\.tools\node-v24.15.0-win-x64\npm.cmd run build --prefix frontend`.

## 2026-05-22 - Pruned unused tournament analytics from boot cache

- Re-read `BACKLOG.md` and `docs/agents/session-notes.md`, then verified the live export still inlined a top-level `tournament_analytics` blob into `frontend/public/data/cache.json` even though the static frontend already reads its tournament summaries from `stats` plus the existing split files.
- Updated `backend/export_static.py` with `_prune_boot_cache()` so the static boot cache now drops the unused top-level `tournament_analytics`, `players`, and `tournaments` sections before writing `cache.json`, while leaving the existing split indexes and analytics files unchanged.
- Added focused regression coverage in `backend/tests/test_export_analytics.py` to keep that heavy top-level payload out of the boot cache.
- Regenerated the static export and confirmed `frontend/public/data/cache.json` fell from `184,647` bytes to `16,699` bytes, a `167,948` byte reduction, while total JSON footprint dropped by `168,029` bytes.
- Verified with `backend\.venv\Scripts\pytest.exe backend/tests/test_export_analytics.py --basetemp .pytest-tmp-prune-cache`, `backend\.venv\Scripts\python.exe export_static.py` from `backend\`, and `C:\Users\karmi\OneDrive\Documents\fremontopen\.tools\node-v24.15.0-win-x64\npm.cmd run build --prefix frontend`.

## 2026-05-21 - Fixed player-profile redirect flapping on in-profile links

- Updated `frontend/src/pages/PlayerDetail.jsx` so the main player fetch now clears stale profile state immediately and ignores late responses after the route changes.
- This prevents the case-insensitive canonicalization effect from seeing the previous player record and redirecting the page back to the original profile after clicking another player link inside the page.
- Verified with `C:\\Users\\karmi\\OneDrive\\Documents\\fremontopen\\.tools\\node-v24.15.0-win-x64\\npm.cmd run build --prefix frontend`.

## 2026-05-21 - Unified timeline chart dates with year context

- Added a shared formatter in `frontend/src/lib/timelineDates.js` for date-based chart labels.
- Updated `WinsOverTimeChart`, `EloRatingChart`, and `PlayerFormChart` so x-axis ticks now show month plus year, and chart tooltips show the full date including year.
- Verified with `C:\\Users\\karmi\\OneDrive\\Documents\\fremontopen\\.tools\\node-v24.15.0-win-x64\\npm.cmd run build --prefix frontend`.

## 2026-05-21 - Fixed stale Fargo performance card and clarified the metric

- Updated `frontend/src/pages/PlayerDetail.jsx` so player-profile extras reset on route changes before the next static fetch resolves, which prevents the `Vs Fargo` card from temporarily reusing the previous player's numbers.
- Expanded `backend/players_extras.py` Fargo performance output with `wins_above_expected`, `expected_wins`, `actual_wins`, and `average_delta` so the static export explains what the metric is instead of only emitting a vague cumulative score.
- Updated the player profile `Vs Fargo` card copy to explain that the headline is wins above Fargo expectation against rated opponents, plus actual wins, expected wins, and per-match average context.
- Added focused export coverage in `backend/tests/test_export_analytics.py` for the new Fargo-performance summary fields.
- Verified with `backend\\.venv\\Scripts\\python.exe export_static.py` from `backend\\`, `backend\\.venv\\Scripts\\pytest.exe backend/tests/test_export_analytics.py --basetemp .pytest-tmp-fargo-perf-fix`, and `\\.tools\\node-v24.15.0-win-x64\\npm.cmd run build --prefix frontend`.

## 2026-05-21 - Added top-player Fargo overrides

- Updated `backend/player_overrides.json` with file-backed Fargo ratings for `Eddie Robinson` (`535`), `Chad Galera` (`554`), `Paul Alexander` (`493`), `Jeff Nguyen` (`500`), `Sean Keenan` (`512`), and `Mark Smith` (`519`).
- Regenerated the static export so those Fargo values now flow into the public player index and player detail payloads without any backend scope change.
- Verified with `python export_static.py` from `backend\\`, `pytest backend/tests/test_export_analytics.py --basetemp .pytest-tmp-fargo-overrides`, and `npm run build --prefix frontend`.
- The first frontend build attempt hit a transient missing-generated-folder error for `frontend/public/data/players/46872ffd8e1b`; a direct re-run succeeded once the regenerated shard tree was in place.

## 2026-05-21 - Dashboard anniversary/toppers copy and Jason Lambert Fargo override

- Updated `frontend/src/pages/Dashboard.jsx` so the `On This Week`/`Previous Season` panel now shows the full year in its date label and includes a direct tournament link under each match row.
- Expanded the dashboard `Top Players` card to show races W-L, racks W-L, and average tournament placement instead of only the simpler single-line summary.
- Added a file-backed player override in `backend/player_overrides.json` setting `Jason Lambert` to Fargo `450`, then regenerated the static export so that value lands in the public data bundle.
- Verified with `python export_static.py` from `backend\\`, `pytest backend/tests/test_export_analytics.py --basetemp .pytest-tmp-dashboard-copy`, and `npm run build --prefix frontend`.

## 2026-05-21 - Split player chart history out of extras payloads

- Re-read `BACKLOG.md` and `docs/agents/session-notes.md`, then rechecked the live checkout and current static size report before continuing the cache-efficiency path.
- Split the heaviest player-profile chart history fields out of each generated `extras.json`: `wins_over_time`, `elo.history`, and `form.history` now live in per-player `history.json` files written by `backend/export_static.py`.
- Updated `frontend/src/lib/api.js` with a new static `/players/:name/history` route and fallback handling so player pages can lazy-load chart history without bloating the lighter profile extras payload.
- Updated `frontend/src/pages/PlayerDetail.jsx` so the top profile cards still render from lightweight extras while the three history charts load separately with explicit loading copy.
- Added targeted export coverage in `backend/tests/test_export_analytics.py` for the new extras/history payload split helper.
- Verified with `python export_static.py` from `backend\\`, `pytest backend/tests/test_export_analytics.py --basetemp .pytest-tmp-player-history-split`, and `npm run build --prefix frontend`.
- Current artifact snapshot: `cache.json` stayed flat at `184,647` bytes; a previously heavy player extras file such as `frontend/public/data/players/a5ac7684edbf/extras.json` is now `13,666` bytes while its new deferred `history.json` is `464,994` bytes.

## 2026-05-20 - Split player and tournament indexes out of cache boot

- Re-read `BACKLOG.md` and `docs/agents/session-notes.md`, then attempted live GitHub issue visibility; both local `gh` and direct GitHub API access are still blocked in this sandbox, so this slice used the repo backlog/session notes as the current source of truth and could not close a live issue from here.
- Moved the heavy player and tournament directory payloads plus their static file maps out of `frontend/public/data/cache.json` into dedicated generated files at `frontend/public/data/players-index.json` and `frontend/public/data/tournaments-index.json`.
- Updated `frontend/src/lib/api.js` so the static loader now lazily fetches those indexes for `/players`, `/tournaments`, `/search`, leaderboard reads, compare resolution, and detail-file lookup instead of carrying those arrays in the initial boot cache.
- Updated `.github/workflows/data-refresh.yml` and `backend/tests/test_data_refresh_workflow.py` so scheduled refreshes track and commit the new generated index files with the rest of the static export surface.
- Verified with `backend\\.venv\\Scripts\\python.exe export_static.py` from `backend\\`, `\\.venv\\Scripts\\pytest.exe backend/tests/test_data_refresh_workflow.py --basetemp .pytest-tmp-cache-index`, and `\\.tools\\node-v24.15.0-win-x64\\npm.cmd run build --prefix frontend`.
- Post-change `frontend/public/data/cache.json` is `184,647` bytes instead of `964,121`, while the heavier directory data now lives in `players-index.json` (`512,575` bytes) and `tournaments-index.json` (`266,985` bytes) that only load when those surfaces are actually used.

## 2026-05-20 - Node 24 workflow action refresh

- Reviewed the static-demo ops surface against `docs/agents/ops-reviewer.md`, the existing `.run-logs/ops-review/latest.*` snapshot, and the live public Actions page.
- Identified a repo-side maintenance risk in the GitHub Actions layer: the static refresh, deploy, backlog, seed, ops-review, and Codacy workflows still pinned Node 20-era action majors (`actions/checkout@v4`, `actions/setup-node@v4`, `actions/setup-python@v5`, and `github/codeql-action/upload-sarif@v3`).
- Updated those workflow references to the current Node 24-capable majors (`actions/checkout@v6`, `actions/setup-node@v6`, `actions/setup-python@v6`, and `github/codeql-action/upload-sarif@v4`) without changing the product scope or deploy model.
- Added `backend/tests/test_workflow_action_versions.py` to keep the repo from drifting back to the older action pins.
- Verified with `pytest backend/tests/test_data_refresh_workflow.py backend/tests/test_ops_review.py backend/tests/test_workflow_action_versions.py --basetemp .pytest-tmp-ops-node24`.

## 2026-05-20 - Improved accessibility and mobile navigation

- Added a real skip link in `frontend/src/components/Layout.jsx` with supporting styles in `frontend/src/App.css` so keyboard users can jump directly to the app content.
- Tightened `frontend/src/components/Sidebar.jsx` mobile navigation with labeled landmarks, dialog semantics, Escape-to-close, scroll locking, route-change close behavior, and focus restoration back to the menu trigger.
- Updated `frontend/src/components/Topbar.jsx` to expose a small-screen search toggle so mobile users can reach player and tournament search without relying on the desktop-only inline search slot.
- Added search labeling in `frontend/src/components/SearchBar.jsx` so the main site search has explicit accessible naming and announces its results container consistently.
- Verification target for this slice is `npm run build --prefix frontend`.

## 2026-05-20 - Added peer-group player comparisons

- Added `peer_group` summaries in `backend/export_static.py` so each player `extras` payload now includes a nearby-rating comparison set that prefers Fargo bands, falls back to ELO bands, and expands to nearest-rated peers when a base band is too sparse.
- Added targeted coverage in `backend/tests/test_export_analytics.py` for both Fargo-based and ELO-fallback peer grouping.
- Updated `frontend/src/pages/PlayerDetail.jsx` with a new `Peer Group` card that shows the player's rating band, win-rate rank inside that peer set, average peer benchmarks, and quick links to the nearest comparable players.
- Verification target for this slice is `python backend/export_static.py` from `backend/`, `pytest backend/tests/test_export_analytics.py --basetemp .pytest-tmp-peer-group`, and `npm run build --prefix frontend`.
- This closes ranked issue `#89` with a static-first comparison surface that stays off the dashboard boot payload.

## 2026-05-20 - Added static JSON asset versioning

- Added `frontend/public/data/version.json` generation in `backend/export_static.py`, with a deterministic `asset_version` derived from the current static size snapshot.
- Updated `frontend/src/lib/api.js` so static JSON loads now fetch `version.json` with `cache: "no-cache"` and append `?v=<asset_version>` to `cache.json` and all split data-file requests.
- Updated `.github/workflows/data-refresh.yml` and `backend/tests/test_data_refresh_workflow.py` so automated refreshes track `version.json` along with the other generated static artifacts.
- Verified with `python backend/export_static.py` from `backend/`, `python scripts/check_static_data_budget.py`, `pytest backend/tests/test_data_refresh_workflow.py --basetemp .pytest-tmp-versioning`, and `npm run build --prefix frontend`.
- This keeps the loader repo-contained and static-first while giving DreamHost-hosted JSON a deterministic cache-busting key after each refresh.

## 2026-05-20 - Added static change report since previous refresh

- Added `frontend/public/data/refresh-change-report.json` generation in `backend/export_static.py` by reading the previous committed `data-size-report.json` before overwrite and computing deltas against the new export.
- Updated `frontend/public/data/refresh-summary.md` so it now includes a `Since Previous Refresh` section with JSON count delta, total byte delta, `cache.json` delta, top-level file deltas, and stats-section deltas.
- Updated `.github/workflows/data-refresh.yml` and `backend/tests/test_data_refresh_workflow.py` so automated refreshes track `refresh-change-report.json` alongside the existing summary/report artifacts.
- Verified with `python backend/export_static.py` from `backend/`, `python scripts/check_static_data_budget.py`, `pytest backend/tests/test_data_refresh_workflow.py --basetemp .pytest-tmp-change-report`, and `npm run build --prefix frontend`.
- Current no-data-change run correctly shows a near-zero diff with only the summary/report artifact growth called out, which keeps the report useful without inventing changes.

## 2026-05-20 - Deferred dashboard analytics panel loading

- Updated `frontend/src/pages/Dashboard.jsx` so the dashboard core now loads `fetchStats()` and the top-five leaderboard first, while lower-priority analytics panels fetch afterward in an idle/deferred pass.
- Deferred analytics now use a second effect with `requestIdleCallback` when available and fall back to `setTimeout(0)` otherwise, with `startTransition` used for the background state updates.
- Added lightweight loading states for deferred dashboard panels such as H2H heatmap, rivalry index, recent matches, and timing-group cards so the page stays intentional while those panels fill in.
- Verified with `npm run build --prefix frontend`.
- This implements ranked issue `#90` and keeps the static-first architecture intact while making the dashboard feel faster on weaker connections.

## 2026-05-20 - Added static refresh summary artifact

- Added `frontend/public/data/refresh-summary.md` generation in `backend/export_static.py` from the existing static size report so every export now leaves a readable summary of cache size, total JSON footprint, heaviest stats sections, largest files, and generated analytics files.
- Updated `.github/workflows/data-refresh.yml` to append `refresh-summary.md` into `$GITHUB_STEP_SUMMARY` after refresh/export and to track the file in change detection and auto-commit steps.
- Extended `backend/tests/test_data_refresh_workflow.py` coverage so the scheduled refresh workflow must keep the refresh summary path and summary append step.
- Verified with `python backend/export_static.py` from `backend/`, `python scripts/check_static_data_budget.py`, `pytest backend/tests/test_data_refresh_workflow.py --basetemp .pytest-tmp-refresh-summary2`, and `npm run build --prefix frontend`.
- The generated summary now reports the final current state in one place: `cache.json` at `964,121` bytes, `1,844` total JSON files, and the major split analytics artifacts such as `season-standings.json`, `h2h-heatmap.json`, and `recent-matches.json`.

## 2026-05-20 - Split duration groups and event overperformers out of boot stats

- Moved `tournament_duration_groups` and `single_tournament_overperformers` out of `stats` into dedicated static files at `frontend/public/data/tournament-duration-groups.json` and `frontend/public/data/single-tournament-overperformers.json`.
- Added `/analytics/tournament-duration-groups` and `/analytics/single-tournament-overperformers` in `frontend/src/lib/api.js`, and updated `frontend/src/pages/Dashboard.jsx` to fetch those analytics panels separately from the initial `/stats` payload.
- Updated `.github/workflows/data-refresh.yml` and `backend/tests/test_data_refresh_workflow.py` so automated refreshes also track the new generated analytics files.
- Verified with `python backend/export_static.py` from `backend/`, `python scripts/check_static_data_budget.py`, `pytest backend/tests/test_data_refresh_workflow.py --basetemp .pytest-tmp-continue2`, and `npm run build --prefix frontend`.
- Post-change `frontend/public/data/cache.json` is `964,121` bytes, down another `6,878` bytes, while `tournament-duration-groups.json` is `3,679` bytes and `single-tournament-overperformers.json` is `3,281` bytes.

## 2026-05-20 - Split recent matches and rivalry index out of boot stats

- Moved `recent_matches` and `rivalry_index` out of `stats` into dedicated static files at `frontend/public/data/recent-matches.json` and `frontend/public/data/rivalry-index.json`.
- Added `/analytics/recent-matches` and `/analytics/rivalry-index` in `frontend/src/lib/api.js`, and updated `frontend/src/pages/Dashboard.jsx` to fetch those panels separately instead of carrying them in the initial `/stats` payload.
- Updated `.github/workflows/data-refresh.yml` and `backend/tests/test_data_refresh_workflow.py` so automated refreshes track the new generated analytics files alongside the existing static artifacts.
- Verified with `python backend/export_static.py` from `backend/`, `python scripts/check_static_data_budget.py`, `pytest backend/tests/test_data_refresh_workflow.py --basetemp .pytest-tmp-continue`, and `npm run build --prefix frontend`.
- Post-change `frontend/public/data/cache.json` is `970,999` bytes, down another `11,292` bytes from the prior budget-automation slice, while `recent-matches.json` is `6,956` bytes and `rivalry-index.json` is `4,387` bytes.

## 2026-05-20 - Added static data budget automation and split H2H heatmap

- Moved the dashboard H2H heatmap out of `stats` into a dedicated static file at `frontend/public/data/h2h-heatmap.json`, added `/analytics/h2h-heatmap` in `frontend/src/lib/api.js`, and updated `frontend/src/pages/Dashboard.jsx` to load it separately from the boot payload.
- Added `frontend/public/data/data-size-report.json` generation in `backend/export_static.py` so every export now records total JSON count/bytes, largest files, and the size of top-level `cache.json` and `stats` sections.
- Added `scripts/check_static_data_budget.py` and wired it into both `scripts/refresh-static-data.ps1` and `.github/workflows/data-refresh.yml` so oversized static payload regressions fail the refresh path automatically.
- Updated `backend/tests/test_data_refresh_workflow.py` to keep the workflow tracking `data-size-report.json`, `h2h-heatmap.json`, and `season-standings.json`, and to require the budget-check script step.
- Verified with `python backend/export_static.py` from `backend/`, `python scripts/check_static_data_budget.py`, `pytest backend/tests/test_export_analytics.py backend/tests/test_data_refresh_workflow.py --basetemp .pytest-tmp-static-automation`, and `npm run build --prefix frontend`.
- Current exported footprint is `1,839` JSON files totaling `31,791,997` bytes, with `cache.json` down to `982,291` bytes and the largest player shard still `645,247` bytes.

## 2026-05-20 - Slimmed cache.json by moving full seasons out of stats

- Removed duplicated `stats.players` from the dashboard payload and switched `frontend/src/pages/Dashboard.jsx` to load its top-five leaderboard rows through `fetchLeaderboard(5)` instead.
- Split full season standings into a dedicated static file at `frontend/public/data/season-standings.json` via `backend/export_static.py`, while keeping a compact `stats.season_standings` preview for the dashboard chart/cards.
- Added `/seasons` to the static API in `frontend/src/lib/api.js` and updated `frontend/src/pages/Seasons.jsx` to fetch the full season table from that file instead of pulling it through `/stats`.
- Added `backend/tests/test_export_analytics.py` coverage for the season preview helper and verified with `python backend/export_static.py` from `backend/`, `pytest backend/tests/test_export_analytics.py --basetemp .pytest-tmp-json-slim`, and `npm run build --prefix frontend`.
- Post-change `frontend/public/data/cache.json` is `996,246` bytes instead of about `1.53 MiB`, and the full season standings now live in a separate `181,959` byte static file that only loads on the Seasons page.

## 2026-05-20 - Player JSON split and cache-friendly loading

- Removed forced `cache: "no-cache"` fetches from the static loader in `frontend/src/lib/api.js` so normal browser/CDN caching can work for generated JSON.
- Split each exported player bundle into separate `detail.json`, `extras.json`, and `matches.json` files in `backend/export_static.py`, while keeping tournament bundles unchanged.
- Updated the static API loader so compare pages can load player match history directly, and player detail pages now fetch matches separately instead of requiring the full match history inside the primary player detail payload.
- Updated `frontend/src/pages/PlayerDetail.jsx` to use `extras.results` for the core-results summary and lazy-load match history through `/players/:name/matches`.
- Verified with `python backend/export_static.py` from `backend/`, `pytest backend/tests/test_export_analytics.py --basetemp .pytest-tmp-json-opt`, and `npm run build --prefix frontend`.
- Post-change static JSON footprint is still about `30.72 MiB` total, but the largest per-player route payloads are now separated into smaller detail/matches/extras files instead of one monolithic player bundle.

## 2026-05-20 - Ops review fallback closeout

- Finished the previously uncommitted ops-review fallback slice in `scripts/ops_review.py` and `backend/tests/test_ops_review.py`.
- The reviewer now preserves the last non-blocker actionable findings from prior `.run-logs/ops-review/*.json` history when a local run can only see GitHub visibility blockers, instead of overwriting the report with sandbox-only noise.
- Verified with `pytest backend/tests/test_ops_review.py --basetemp .pytest-tmp-closeout` and a fresh `scripts/run-ops-review.ps1` execution.

## 2026-05-20 - Secret scanner cleanup and export-static lint fix

- Queried live GitHub code-scanning and secret-scanning alerts with authenticated `gh` access instead of relying on the sandboxed ops-review fallback.
- Confirmed the three open secret-scanning alerts were historical placeholder MongoDB Atlas URIs from removed deployment/docs files (`deploy/bootstrap.sh` and `docs/SHARED_HOSTING.md`), not current-tree secrets; resolved alerts `#1`, `#2`, and `#3` as `false_positive` in GitHub.
- Identified the remaining non-test production-file scanner findings as mostly Codacy lint noise, with the clearest repo-side target in `backend/export_static.py`.
- Refactored `_player_elo_extremes` to use an explicit sort-key helper and local `best_upset` / `worst_loss` bindings so the exported ELO-extremes logic keeps the same behavior while avoiding the `unsubscriptable-object` alert family on that helper.
- Verified with `pytest backend/tests/test_export_analytics.py --basetemp .pytest-tmp-scanner`.

## 2026-05-20 - Ops review last-known snapshot fallback

- Re-ran the repo-local ops review in the restricted Codex sandbox and confirmed the current environment still cannot reach `api.github.com`; `gh auth status` also shows the local `subiki` token is invalid, so live GitHub workflow and code-scanning visibility remains blocked here.
- Found a reporting regression in `scripts/ops_review.py`: when GitHub access was blocked, the local run overwrote `.run-logs/ops-review/latest.*` with generic `P2` visibility blockers and dropped the last actionable findings for the static DreamHost demo.
- Updated `scripts/ops_review.py` so blocker-only local runs preserve and surface the last non-blocker findings from the prior successful report as an explicitly stale `Last Known Actionable Findings` section plus JSON fallback payload fields, without using those carried-forward items for issue sync.
- Added regression coverage in `backend/tests/test_ops_review.py` for the blocker fallback extraction and end-to-end report write path.

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

## 2026-05-20 - Operations and Backlog Automation Issue Sync

- Created a new GitHub Actions workflow at `.github/workflows/ops-review.yml` configured to run daily and on dispatch.
- Refactored `scripts/ops_review.py` by adding `_github_request` to support POST/PATCH requests to the GitHub API.
- Implemented `_sync_issues` inside `scripts/ops_review.py` to reconcile active findings with open issues labeled `ops`. It creates new issues prefixed with `[Ops]` and labeled with their priority (`jfl`, `P0`, `P1`, `P2`, `P3`), and comments on and closes issues for findings that are no longer active.
- Added comprehensive unit test coverage in `backend/tests/test_ops_review.py` validating the reconciliation logic.
- Pushed all changes directly to `main` so the workflow is active and executable on GitHub.

## 2026-05-20 - Placement-aware ranking filters and backlog truth cleanup

- Re-read `BACKLOG.md` and the existing session notes against the live checkout, then confirmed placement metrics were already exported and linked from player profiles but the `/rankings/:stat` page still lacked sample-size filters and placement context.
- Updated `frontend/src/pages/StatRankings.jsx` so ranking pages now support minimum match and tournament filters for every metric, and placement-based rankings also default to a minimum of three counted placements with an explicit placement-sample filter.
- Added per-row context on the rankings page so placement metrics show counted placements and top-4 totals instead of a bare single number, which makes low-sample average-placement rows easier to interpret.
- Cleaned the stale unchecked acceptance boxes inside the JFL detail sections of `BACKLOG.md` so the source-of-truth backlog matches the already-shipped tournament and placement analytics work.
- Verified with `C:\Users\karmi\OneDrive\Documents\fremontopen\.tools\node-v24.15.0-win-x64\npm.cmd run build --prefix frontend`.

## 2026-05-26 - Guarded Fargo hydration expansion

- Ran two additional human-paced local FairMatch lookup batches of 30 names each against the exported Fremont Open player list, with zero request/backoff errors across all 60 attempts.
- The guarded matcher updated 50 players, skipped 10 ambiguous or no-exact-name cases, and increased exported Fargo coverage from 20 players to 69 players.
- Found and fixed a local-only WA-location bug where `Washington PA` could be misread as Washington state; the bad `John Miller` assignment was removed before export so ambiguous multi-match names remain unassigned.
- Re-exported static data and kept the local scheduler code/settings under `.local/` so the repo only tracks the refreshed player data artifacts.

## 2026-05-26 - Fargo matcher refinement and continued hydration

- Tightened the local-only FairMatch hydrator under `.local/` so obviously low-value names are screened before any network call, exact non-WA matches now need a usable rating plus reported robustness, and negative sentinel ratings are rejected instead of being exported.
- Ran three more guarded local batches (`30 + 30 + 24` searched) with the same human-paced delays and coffee breaks. Results across those 84 attempts: 70 updates, 14 normal skips, 4 screened-out names, and 0 request/backoff errors.
- Removed two bad `-90` sentinel matches from tracked data before export and left them as local failures so they back off instead of reappearing immediately.
- Re-exported the static data snapshot and increased exported Fargo coverage from 69 players to 137 players.

## 2026-05-26 - Searchable Fargo queue drained

- Continued the same local-only guarded refresh flow until the current searchable queue was exhausted; the hydrator reported `next_pending 0` after the final pass.
- Added 13 more sequential guarded batches for `350` searched names total, yielding `262` updates, `88` normal skips, `17` screened-out names, and `0` request/backoff errors.
- Re-exported the static snapshot again and confirmed the live export now carries Fargo ratings for `392 / 530` players.
- The remaining uncovered players for this pass are non-searchable partial names, typo variants, or ambiguous matches that need alias-quality handling rather than more exact-name lookups.

## 2026-05-27 - Local operations console boundary

- Continued the admin/operations-console cleanup as a local-only boundary slice rather than a public static-site admin UI.
- Added `docs/ops-console-local.md` and linked it from the docs index so console experiments stay under ignored `.local/` space with no public backend, login, browser write path, or third-party browser calls.
- Added `scripts/check_public_boundary.py` plus regression coverage to catch private orchestration markers, model-vendor scaffolding, and secret-shaped values in tracked and untracked non-ignored files.
- Wired the boundary check into deploy and scheduled-refresh workflows with tracked-only CI mode, and ignored root-level local FairMatch capture files.
