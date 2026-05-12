# Architecture

## High-level diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                          USER BROWSER                                │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  React 19 SPA · Tailwind · Shadcn UI · recharts · phosphor  │    │
│  │  Topbar+Search   Sidebar   Pages   AI Chat   Admin   /me    │    │
│  └────────────────────────────┬────────────────────────────────┘    │
│                               │ HTTPS                                │
└───────────────────────────────┼──────────────────────────────────────┘
                                │
                ┌───────────────▼─────────────────┐
                │           nginx (443)            │
                │   /  → static frontend/build/    │
                │   /api → 127.0.0.1:8001 (uvicorn)│
                └───────────────┬─────────────────┘
                                │
                ┌───────────────▼─────────────────┐
                │      FastAPI (cuestats.service)  │
                │  Routers:                        │
                │  - read-only public /api/*       │
                │  - /api/auth (admin login)       │
                │  - /api/admin/* (admin JWT)      │
                │  - /api/auth/{provider} (SSO)    │
                │  - /api/me/* (user JWT)          │
                │  - extras (search,OG,compare)    │
                │  - /api/chat (Claude Sonnet 4.5) │
                └───┬───────────┬──────────┬───────┘
                    │           │          │
        ┌───────────▼──┐   ┌────▼────┐   ┌─▼──────────┐
        │   MongoDB    │   │  Claude │   │ Pillow OG  │
        │  tournaments │   │ Sonnet  │   │  card PNG  │
        │  matches     │   │  4.5    │   │ generator  │
        │  players     │   │  (LLM)  │   └────────────┘
        │  users       │   └─────────┘
        │  admins      │
        │  chat_msgs   │
        │  audit_log   │
        │  sync_meta   │
        └──────────────┘
                ▲
                │ (CRON, Saturday 23:00)
                │
        ┌───────┴───────────┐
        │  sync_job.py CLI  │
        │   (only entity    │
        │   that calls      │
        │   Challonge)      │
        └───────┬───────────┘
                │ HTTPS (User-Agent header required)
                │
        ┌───────▼───────────┐
        │   Challonge API   │
        │  ~3 calls / week  │
        └───────────────────┘
```

## Data model

### `tournaments`
| field | source |
|---|---|
| `id` (int) | Challonge id |
| `name` | Challonge |
| `game` | Challonge `game_name` |
| `state` | Challonge — drives sync skip decisions |
| `started_at`, `completed_at`, `participants_count`, `url` | Challonge |

### `matches`
| field | notes |
|---|---|
| `id` (string of Challonge match id) | primary key |
| `tournament_id`, `tournament_name`, `round`, `state` | from Challonge |
| `scores` (Challonge `scores_csv`) | string like "5-2,3-5,5-3" |
| `winner_id`, `loser_id` | Challonge participant ids |
| `winner_name`, `loser_name` | resolved from participants |
| `completed_at` | sortable timestamp |

### `players`
Aggregate, recomputed from `matches` after each sync.
| field | notes |
|---|---|
| `id` (uuid), `name` | name is the join key |
| `wins`, `losses`, `win_rate` | aggregates |
| `fargo` | nullable, admin/owner-editable |

### `users` (SSO)
| field | notes |
|---|---|
| `id` (uuid) | internal pk |
| `provider` ∈ {google, discord, facebook}, `provider_user_id` | unique pair |
| `display_name`, `email`, `avatar_url` | from provider |
| `claimed_player` (string, nullable) | links account → one player |
| `followed_players` (array of names) | cross-device follow list |
| `created_at`, `last_login_at`, `claimed_at` | timestamps |

### `admins`
Single record. `email`, `password_hash` (bcrypt). Seeded from `.env` on each startup.

### `audit_log`
Every admin mutation: `{action, payload, at}`.

### `sync_meta`
- `_id="last"` → last-run summary (when, status, counts)
- `_id="tournaments"` → `seen: {tournament_id: updated_at}` for skip-frozen logic

## Auth model

Two distinct JWT systems sharing `JWT_SECRET`:

| | Admin | User |
|---|---|---|
| `sub` | email | user id (uuid) |
| `role` | `admin` | `user` |
| `type` | `access` | `session` |
| TTL | 24h | 30d |
| Storage | localStorage `cuestats_admin_token` | localStorage `cuestats_user_token` |
| Dependency | `require_admin` | `require_user` / `optional_user` |
| Cannot impersonate | each other (different role+type) |

## Sync algorithm (cost: ~3 API calls / week)

```
fetch Challonge tournament list                          [+1 call]
for each tournament t:
    upsert tournament doc
    if t.state ∈ {complete, ended} AND seen[t.id]:
        skip                                              [+0 calls]
    elif seen[t.id] == t.updated_at:
        skip                                              [+0 calls]
    else:
        fetch participants                                [+1 call]
        fetch matches                                     [+1 call]
        upsert; mark seen[t.id] = t.updated_at
recompute players from matches                            [+0 calls]
```

Force-mode (`--force`) ignores `seen` and refetches everything. Used after destructive admin operations.

## Privacy boundaries

- The **public API** never exposes user identity (no usernames, emails, providers).
- `/api/players/{name}/claim-info` returns only `{claimed: bool}` — never WHO.
- No direct messaging between users. There is no inbox model. There is no "find friends" endpoint.
- Admin and user auth are isolated. An admin login does not grant user-level access and vice-versa.

## CI/CD flow

```
git push origin main
  → GitHub Actions: deploy.yml
    → checkout
    → yarn build (with REACT_APP_BACKEND_URL secret)
    → rsync frontend/build/ → server:DEPLOY_PATH/frontend/build/
    → rsync backend/ → server:DEPLOY_PATH/backend/    (preserves .env)
    → ssh: bash deploy/remote_deploy.sh
      → pip install -r requirements.txt
      → sudo systemctl restart cuestats   (passwordless via sudoers rule)
    → smoke test: curl /api/health
```

Cron runs weekly (Saturday 11pm) on the server, independent of deploys.
