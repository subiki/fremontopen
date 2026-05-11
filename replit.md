# CueStats — Fremont Open

A billiards tournament tracker for the Fremont Open — tracks players, matches, and tournament brackets with an AI chat assistant.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port from env)
- `pnpm --filter @workspace/scripts run seed` — seed the database with mock data
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `SESSION_SECRET` — JWT signing secret for admin auth

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (at `/api`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- AI: Anthropic claude-sonnet-4-6 via Replit AI Integrations proxy
- Auth: JWT (`jsonwebtoken`) for admin routes
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React 19 + Vite + Tailwind + Shadcn UI + react-query + wouter

## Where things live

- `lib/db/src/schema/` — all DB table definitions (tournaments, players, matches, sync_meta, admins, audit_log, conversations, messages)
- `lib/api-spec/openapi.yaml` — source-of-truth OpenAPI spec
- `lib/api-zod/src/generated/` — generated Zod validators
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `artifacts/api-server/src/routes/` — Express route files (one per resource)
- `artifacts/cuestats/src/pages/` — frontend page components
- `artifacts/cuestats/src/components/Sidebar.tsx` — persistent nav sidebar
- `scripts/src/seed.ts` — database seeder with mock tournament/player/match data

## Architecture decisions

- Contract-first: OpenAPI spec → Orval codegen → Zod schemas + React Query hooks
- No Challonge API in initial build — mock seed data instead (`scripts/src/seed.ts`)
- Admin auth is JWT-only (no session cookies); token stored in `localStorage`
- AI chat uses SSE streaming: server sends `data: {"text": "..."}` chunks, `data: {"done": true}` at end
- Billiard Noir dark theme: bg `#0B0E14`, surface `#141923`, primary `#10B981` green, secondary `#F59E0B` amber, loss `#EF4444`

## Product

- **Dashboard** — stat cards (tournaments/matches/players), top 5 leaderboard, recent matches feed
- **Tournaments** — list with game type, status badge, start date; click through to match detail
- **Tournament Detail** — bracket matches table with round, winner, loser, score, status
- **Players** — ranked table by win rate with Fargo rating
- **Player Detail** — stat cards + full match history
- **Leaderboard** — Hall of Fame with gold/silver/bronze podium for top 3
- **Compare** — side-by-side head-to-head stat bars for any two players
- **Chat** — AI assistant (CueBot) with SSE streaming, persistent conversation history
- **Admin** — JWT-protected console for managing tournaments/players + audit log

## Default admin credentials (dev/test)

- Email: `admin@cuestats.local`
- Password: `CueStats2025!`
- Override via `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars before running the seed

## User preferences

- Use mock seed data (no live Challonge API integration yet)
- Keep existing monorepo structure — new work goes in existing artifacts unless it's a different product

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after editing `openapi.yaml`
- Always run `pnpm --filter @workspace/db run push` after editing schema files in `lib/db/src/schema/`
- Run `pnpm --filter @workspace/scripts run seed` to repopulate test data (it clears existing rows first)
- API field names are snake_case (e.g. `winner_name`, `started_at`, `win_rate`) — match these exactly in the frontend
- The API response for `/tournaments/:id` is `{tournament: {...}, matches: [...]}` (not a flat object)
- The API response for `/players/:id` is `{player: {...}, matches: [...]}` (not a flat object)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
