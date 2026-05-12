# Architecture Decision Records

A running log of significant tech choices. Each entry: context, decision, rationale, alternatives considered.

---

## ADR-001 — MongoDB, not PostgreSQL

**Context**: Need a primary store for tournaments, matches, players, users. Schema is wide and evolving.

**Decision**: MongoDB.

**Why**: Documents map cleanly to Challonge's JSON shape. We avoid schema migrations during early iteration. Aggregation pipelines fit our W/L/streak computations. Motor (async driver) integrates with FastAPI without ceremony.

**Alternatives**:
- Postgres + JSONB — better at relations but overkill for this dataset size (hundreds of matches/year)
- SQLite — considered for ultra-cheap shared hosting; backlogged as Epic 10.1.

---

## ADR-002 — Read-only public API; users cannot trigger Challonge calls

**Context**: Challonge free tier is 500 calls/month. A typo or scrape attempt could nuke the quota.

**Decision**: The web UI is pure cache reader. Only the CLI (`sync_job.py`) or admin-protected `/api/admin/sync` ever calls Challonge.

**Why**: Cost ceiling + reliability. A user-triggerable refresh button was explicitly killed in iteration 3.

**Cost**: ~3 calls/week steady state.

---

## ADR-003 — Skip-frozen sync optimization

**Context**: Even with caching, refetching completed brackets every sync still burned calls.

**Decision**: Tournaments in state `complete` or `ended` are **never** refetched once we've cached them, regardless of Challonge `updated_at` changes.

**Why**: Brackets are immutable once a tournament ends. If Challonge re-touches `updated_at` (which it does occasionally), we don't care.

**Override**: `python sync_job.py --force` rebuilds everything. ~9 calls.

---

## ADR-004 — Two independent JWT systems for admin vs user

**Context**: Two distinct auth flows: single-admin (manual data corrections) and multi-user SSO (follow + claim).

**Decision**: Share `JWT_SECRET` but use distinct `role` + `type` claims (`admin/access` vs `user/session`). Separate localStorage keys. Separate FastAPI dependencies (`require_admin` vs `require_user`).

**Why**: Simplest possible separation. No token blacklist needed. Cannot impersonate.

**Alternatives**:
- Two separate secrets — needlessly complex.
- HttpOnly cookies — recommended in playbook, but our CORS=* setup + cross-origin dev makes Bearer-in-localStorage simpler. Acceptable XSS risk for a single-admin tool.

---

## ADR-005 — Privacy-first: don't share account info between users

**Context**: User explicitly requested no exposure of usernames, no DMs.

**Decision**:
- `/api/players/{name}/claim-info` returns only `{claimed: bool}` — never WHO claimed it.
- No endpoint returns another user's display_name, email, provider, or id.
- No follow-graph endpoint (can't see who follows whom).
- No comments / messages / "predictions board" until / unless we add a moderation story.

**Why**: User-requested. Also dramatically simplifies the privacy/abuse surface.

---

## ADR-006 — Bearer tokens in localStorage (not httpOnly cookies)

**Context**: Integration playbook recommends httpOnly cookies; we chose Bearer.

**Decision**: Both admin and user tokens live in localStorage and are sent as `Authorization: Bearer ...`.

**Why**:
- Same-origin + cross-origin dev parity (Emergent preview is single-domain via /api proxy; cookies would need explicit CORS origin).
- This is a single-admin operator tool + low-stakes follow/claim flow. XSS exposure is acceptable.
- Migration to cookies is straightforward later (Epic 10.x candidate).

---

## ADR-007 — Pillow for OG card generation (not headless browser)

**Context**: Need 1200×630 social-share images per player.

**Decision**: Pillow (PIL) draws the card directly to PNG.

**Why**: Zero external dependencies (no Chromium, no Puppeteer service). ~50ms per render. Cached 10 min by HTTP header. Good enough for the scale.

**Alternatives**:
- Headless Chromium — better for HTML-driven designs; massive ops overhead.
- Pre-rendered static PNGs — would require re-rendering on every sync; not worth it for ~100 players.

---

## ADR-008 — Recharts (frontend) for charts

**Decision**: `recharts` for the wins-over-time line chart and future rating history.

**Why**: Tree-shakable, no canvas, plays well with Tailwind dark theme. Simple API.

**Alternatives**: Chart.js (heavier), Victory (more verbose), D3 (more code).

---

## ADR-009 — Player canonical name = match-record name

**Context**: Same human enters tournaments as "Jim", "Jimmy", "Jim S." — they're different player records in our DB.

**Decision**: The `players` collection key is the literal display name from Challonge. To unify, an admin uses **Merge Players** (`/api/admin/players/merge`) which rewrites all `winner_name`/`loser_name` references and rebuilds the aggregate.

**Why**: Simple, lossless, reversible (admin can split again by reverting). Avoids a brittle "alias table" with edge cases.

**Future**: Levenshtein-based suggestion (BACKLOG 5.4).

---

## ADR-010 — Manual Fargo entry (no FargoRate API)

**Context**: User asked for Fargo ratings + above/below-rating analytics.

**Decision**: Admin can set any player's Fargo (200–900). A claimed user can set their own. Stored as `players.fargo` (nullable int).

**Why**: FargoRate has no public API. Scraping is grey. Manual entry covers the use case immediately.

**Future**: If/when FargoRate access opens up, swap the data source — same field name, same UI.

---

## ADR-011 — Performance-vs-Fargo uses ELO 200-point spread

**Context**: Need an "above/on/below rating" label per player.

**Decision**: `expected_win = 1 / (1 + 10^((rating_b - rating_a) / 200))` (ELO formula but scaled to Fargo's 200-point standard). Aggregate `(actual - expected)` over all rated matches.

**Why**: Heuristic, well-understood, transparent. Demo-quality.

**Caveat**: This is NOT the real FargoRate algorithm (which uses race-length-aware Glicko-like math). Good enough for "above/below" labelling. Documented inline in `players_extras.py`.

---

## ADR-012 — Single bootstrap script for first-run, GitHub Actions for ongoing

**Decision**: `deploy/bootstrap.sh` does one-time server setup (install Mongo/nginx, write systemd unit, set up cron, run first sync, run certbot). After that, GitHub Actions on push to `main` handles deploys.

**Why**: Separation of concerns. Bootstrap is opinionated and "destructive" (writes systemd, nginx). CI/CD is idempotent and incremental.

---

## ADR-013 — `frontend/build/` is built per-deploy, not committed

**Decision**: `.gitignore` excludes `frontend/build/`. The CI job runs `yarn build` with the `REACT_APP_BACKEND_URL` secret as build-time env.

**Why**: Built artifacts shouldn't be in git. The build is fast (<2 min on a Linux runner).

---

## ADR-014 — No public sign-up / no anonymous data writes

**Context**: We have SSO, but anonymous visitors can still browse and chat.

**Decision**: SSO is required ONLY for follow + claim. Browsing, stats, and AI chat work without auth.

**Why**: Lower the friction for casual visitors. The valuable account features (cross-device follow, claimed profile) are the carrots.

---

## ADR-015 — AI chat is read-only over current DB snapshot

**Decision**: `/api/chat` builds a compact text snapshot of the entire `players` + `matches` collections and passes it to Claude as the system prompt context. The AI never has tool access or write capability.

**Why**: Simple, safe, fast at current scale (~100 players, ~120 matches → ~10 KB context). The Claude Sonnet 4.5 context window is far larger.

**Future** (BACKLOG 3.7 streaming, 3.1 multi-session, 3.3 alias resolution): all additive without changing this core pattern.
