# Fremont Open — PRD

## Architecture
- **Backend**: FastAPI (3.11) — read-only `/api/*` + admin `/api/admin/*` + user SSO + extras (search, OG cards, compare, fargo)
- **Database**: MySQL (DreamHost panel, production) · SQLite (local dev)
- **Sync**: `backend/sync_job.py` standalone CLI — incremental, skips frozen tournaments
- **AI**: Claude Sonnet 4.5 via Anthropic SDK
- **Frontend**: React 19 + Tailwind + Shadcn UI + recharts, Billiard Noir dark theme
- **Auth**: Admin JWT (bcrypt+lockout) + User SSO (Google/Discord/Facebook OAuth, 30d tokens)
- **CI/CD**: GitHub Actions → DreamHost VPS

## Iteration 5 (2026-02-10) — Demo-prep features
- [x] **Global search** (Topbar dropdown — players + tournaments)
- [x] **Public shareable player cards** at `/p/:name` with OG meta + 1200×630 PNG generated via Pillow
- [x] **Cross-tournament streaks** (current type/length + longest W/L)
- [x] **Tournament championships by game type** (final-match winner aggregated per game label)
- [x] **Fargo rating** — manual entry by admin (any player) or by claimed user (their own)
- [x] **Performance vs Fargo** — ELO-style expected vs actual, label "above/on/below rating"
- [x] **Wins-over-time** chart (recharts line: cumulative W and L)
- [x] **Compare** page at `/compare/:a/:b` — side-by-side stats, head-to-head, common opponents
- [x] **Share** button on player profile copies the `/p/:name` URL to clipboard

## Previous iterations
- Iter 4: SSO (Google/Discord/Facebook) + claim profile + privacy
- Iter 3: Sync optimization + Admin JWT + manual data corrections + player merge + CI/CD
- Iter 2: Follow / Prev-Next / Biggest Rivals / Most Defeated
- Iter 1: Foundation (sync, dashboard, players, tournaments, AI chat)

## API Surface (new this iteration)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/search?q=` | none | Players + tournaments quick search |
| GET | `/api/players/{name}/extras` | none | Streaks + titles + perf + chart data |
| GET | `/api/compare/{a}/{b}` | none | Head-to-head + common opponents |
| GET | `/api/og/players/{name}.png` | none | 1200×630 OG card |
| GET | `/api/p/{name}` | none | Public HTML with OG meta + redirect |
| PUT | `/api/me/fargo` | user JWT | Set own (claimed) player's Fargo |
| PUT | `/api/admin/players/{name}/fargo` | admin JWT | Set any player's Fargo |

## Backlog (P1 still pending)
- Bracket visualization on tournament detail
- ELO/Glicko ratings (sitewide) + rating history chart
- Seasons / cumulative standings (8.1)
- AI weekly recap auto-generation (3.2)
- Email digest (Resend) (4.2)
- iCal feed (9.1)
- PWA install (7.1)
- Player streaks chip on leaderboard (2.3 polish)
- Player nicknames editable (2.4)
- AI "interesting anecdotes" (use existing `/api/chat` with a templated prompt)
- **Discord bot** (deferred — interactive natural-language Q&A bot)
- **Fargo API integration** (deferred — requires FargoRate partnership; current solution is manual entry)
- Player vs Player trends/strengths-weaknesses ("trend chart" depth on Compare page)
- Tournament participants by game type (currently in Compare context only)

## Test Credentials
- Admin: `admin@fremontopen.com` / `fremont2026!` (rotate via `backend/.env` + `systemctl --user restart fremontopen`)
- SSO: configured via `{PROVIDER}_CLIENT_ID/SECRET` in `backend/.env`

## Deployment
See [`README.md`](../README.md) — full DreamHost VPS bootstrap + GitHub Actions CI/CD walkthrough with OAuth setup for all 3 providers.

## Demo readiness
- Sample player: `Donkey from Shrek` (5W-0L, undefeated, has tournament title) — perfect demo subject
- OG cards verified rendering at `/p/Donkey%20from%20Shrek` — paste into WhatsApp/Twitter for social previews
- Compare flow: `/compare/Donkey%20from%20Shrek/Captain%20Hook`
- Search: type "donkey" or "captain" in the topbar
- Fargo: admin can set rating on any profile via the inline editor
