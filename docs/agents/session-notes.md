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
