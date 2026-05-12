# CueStats / Fremont Open — Backlog

Prioritized feature list. Effort labels: **S** ≤ 1 day · **M** 1–3 days · **L** > 3 days.

Legend: `P0` ship next · `P1` near-term · `P2` nice-to-have · `P3` someday/maybe

---

## ✅ Done

- [x] Challonge → MongoDB cache (incremental CLI sync)
- [x] Dashboard, Tournaments, Players, Player profile, Leaderboard
- [x] AI Chat (Claude Sonnet 4.5, grounded in cached data)
- [x] Read-only API surface (users cannot trigger Challonge)
- [x] Player Follow (localStorage) + Prev/Next nav
- [x] Biggest Rivals / Most Defeated split on player profile
- [x] DreamHost deploy guide (README)

---

## EPIC 1 — Tournament Visualization & History

| # | P | Effort | Item |
|---|---|---|---|
| 1.1 | P1 | M | **Bracket visualization** on tournament detail (winners/losers brackets, double-elim) |
| 1.2 | P1 | S | **Tournament timeline** — Saturday-by-Saturday list with winner badges |
| 1.3 | P2 | S | **Tournament filter** by game type (8-ball / 9-ball / snooker / one-pocket) |
| 1.4 | P2 | S | **"Cinderella runs"** card — biggest seed upsets per tournament |
| 1.5 | P2 | M | **Tournament archive search** (by date range, winner, format) |
| 1.6 | P3 | S | **Printable bracket** page (print-friendly CSS) |

## EPIC 2 — Player Profiles, Ratings & Identity

| # | P | Effort | Item |
|---|---|---|---|
| 2.1 | P0 | M | **Player alias / merge tool** — same human across tournaments under different names ("Jim", "Jimbo", "Jimmy S.") |
| 2.2 | P1 | M | **ELO / Glicko rating** computed across all tournaments — new global skill rank |
| 2.3 | P1 | S | **Player streaks** — current W-streak / L-streak / attendance-streak |
| 2.4 | P1 | S | **Player nicknames** field (admin-editable) |
| 2.5 | P2 | M | **Side-by-side compare** page (`/compare/playerA/playerB`) — stats, h2h, common opponents |
| 2.6 | P2 | M | **Player avatars / photos** (admin upload, S3 or local) |
| 2.7 | P2 | S | **Game-type breakdown** per player (8-ball vs 9-ball record) |
| 2.8 | P3 | S | **Custom cue / equipment** listed on profile |

## EPIC 3 — AI Agent Enhancements

| # | P | Effort | Item |
|---|---|---|---|
| 3.1 | P1 | S | **Multi-session chat sidebar** — rename, delete, switch sessions |
| 3.2 | P1 | M | **AI weekly recap auto-generation** after each Saturday sync (saved as a post) |
| 3.3 | P1 | S | **Alias resolution in AI** — "Jimmy" → real player name(s) automatically |
| 3.4 | P2 | M | **Voice input** for AI chat (Web Speech API → existing `/api/chat`) |
| 3.5 | P2 | S | **AI predictive matchup** — given two players, predict winner with reasoning |
| 3.6 | P2 | S | **AI trash-talk generator** ("write a 100-word roast for Dr Seuss") |
| 3.7 | P3 | M | **Streaming responses** for chat (SSE) |

## EPIC 4 — Engagement & Community

| # | P | Effort | Item |
|---|---|---|---|
| 4.1 | P1 | M | **Public shareable player card** (`/p/donkey-from-shrek`) with **OG image** for social previews |
| 4.2 | P1 | M | **Email digest** after each Saturday tournament (Resend integration) |
| 4.3 | P2 | M | **Weekly predictions board** — "I'll beat Jimmy this Saturday" (no auth, sign-with-name) |
| 4.4 | P2 | M | **Match comments** ("clutch 8-ball break") |
| 4.5 | P2 | M | **Photo gallery** per tournament (admin upload) |
| 4.6 | P2 | S | **Rivalry of the week** — featured h2h pair on dashboard |
| 4.7 | P3 | M | **MVP / Play of the Week voting** |
| 4.8 | P3 | S | **Achievement badges** (5-win streak, first perfect run, etc.) |

## EPIC 5 — Admin & Data Quality

| # | P | Effort | Item |
|---|---|---|---|
| 5.1 | P0 | M | **Single-admin auth** (JWT) for any write/edit features below |
| 5.2 | P0 | M | **Manual data corrections UI** — fix names, override scores, merge duplicate players |
| 5.3 | P1 | S | **Sync now (admin only)** — protected `/api/admin/sync` endpoint |
| 5.4 | P1 | M | **Player dedup suggestions** (Levenshtein matching: "Jim S" ↔ "Jim Smith") |
| 5.5 | P1 | S | **Match validation** — flag impossible scores (negative, >ramo-set limits) |
| 5.6 | P2 | M | **Manual match entry** for side games not in Challonge |
| 5.7 | P2 | M | **Multi-Challonge-account** sync (multiple tournament organizers) |
| 5.8 | P2 | S | **Audit log** — every admin edit is recorded |

## EPIC 6 — Visualizations & Charts

| # | P | Effort | Item |
|---|---|---|---|
| 6.1 | P1 | S | **Wins-over-time** chart per player (recharts) |
| 6.2 | P1 | S | **Player rating history** chart (after Epic 2.2 lands) |
| 6.3 | P2 | M | **H2H heatmap matrix** — N×N grid of win-rates across all players |
| 6.4 | P2 | S | **Tournament difficulty** indicator (avg opponent rating) |
| 6.5 | P3 | S | **Geographic map** of where players are from (if data exists) |

## EPIC 7 — Mobile & UX

| # | P | Effort | Item |
|---|---|---|---|
| 7.1 | P1 | S | **PWA install** (manifest + service worker) |
| 7.2 | P1 | S | **Sidebar collapse** on mobile (hamburger + drawer) |
| 7.3 | P2 | S | **Light mode** toggle |
| 7.4 | P2 | S | **Pinch-zoom** on bracket view |
| 7.5 | P3 | S | **Keyboard shortcuts** (`/` to search, `g p` go to players, etc.) |

## EPIC 8 — Series, Seasons & League Standings

| # | P | Effort | Item |
|---|---|---|---|
| 8.1 | P1 | M | **Season groupings** ("2026 Spring") with cumulative standings across weeks |
| 8.2 | P2 | M | **Attendance tracker** (who showed up each Saturday — visible streak counter) |
| 8.3 | P2 | S | **Prize pool** tracking per tournament + per-season totals |
| 8.4 | P3 | M | **League-wide points** system (configurable scoring) |

## EPIC 9 — Integrations

| # | P | Effort | Item |
|---|---|---|---|
| 9.1 | P1 | S | **iCal feed** of upcoming Saturday tournaments |
| 9.2 | P2 | S | **Discord webhook** — post results to a server channel after sync |
| 9.3 | P2 | M | **Twitter/X auto-post** of weekly winner (uses X API v2) |
| 9.4 | P2 | M | **Resend email** for digests & follow notifications |
| 9.5 | P3 | M | **Stripe entry-fee registration** for next Saturday |
| 9.6 | P3 | M | **Google Calendar** — auto-create event for next tournament |

## EPIC 10 — Platform, Scaling & Performance

| # | P | Effort | Item |
|---|---|---|---|
| 10.1 | P1 | M | **SQLite migration path** for shared-hosting deploys (no Mongo) |
| 10.2 | P1 | S | **SSR / static export** of player pages for SEO |
| 10.3 | P1 | S | **Leaderboard cache** in sessionStorage (avoid re-fetch on Prev/Next) |
| 10.4 | P2 | S | **Case-insensitive player URL** matching |
| 10.5 | P2 | S | **API ETag + 304** support |
| 10.6 | P2 | S | **Health check endpoint** `/api/health` for uptime monitoring |
| 10.7 | P2 | M | **Backfill script** for arbitrary historical Challonge tournament IDs |
| 10.8 | P3 | L | **Multi-tenant** — host other tournaments alongside Fremont Open |

## EPIC 11 — Monetization & Smart Business

| # | P | Effort | Item |
|---|---|---|---|
| 11.1 | P2 | S | **Sponsor slot** on dashboard ("This week sponsored by Talarico's") |
| 11.2 | P3 | M | **Pro Shop affiliate** links (cues, chalk) on player profiles |
| 11.3 | P3 | M | **Premium tier** — branded weekly newsletter, custom subdomain |
| 11.4 | P3 | M | **Crowd-funding** for tournament cash pots |

---

## Top 10 — "Next Quarter" recommendation

If I had to pick what to build next, in order:

1. **5.1 + 5.2** Admin auth + manual data corrections (P0 — unblocks data quality)
2. **2.1** Player alias / merge (P0 — directly answers "who beat Jimmy" with real player consolidation)
3. **1.1** Bracket visualization (P1 — biggest visual upgrade)
4. **4.1** Public shareable player card with OG image (P1 — viral acquisition)
5. **2.2** ELO/Glicko ratings (P1 — long-term retention)
6. **8.1** Seasons / cumulative standings (P1 — gives the league a "story arc")
7. **3.2** AI weekly recap auto-generation (P1 — automation of newsletter content)
8. **4.2** Email digest after Saturday (P1 — engagement loop)
9. **6.1 + 6.2** Charts: wins over time + rating history (P1 — depth on profiles)
10. **9.1** iCal feed for next tournament (P1 — simple but sticky)

---

## Tracking

This file is the source of truth. To populate it as **GitHub Issues** on https://github.com/subiki/fremontopen, run after pushing:

```bash
bash scripts/create_github_issues.sh
```
See [`scripts/create_github_issues.sh`](scripts/create_github_issues.sh) for details and requirements.
