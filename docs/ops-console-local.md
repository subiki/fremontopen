# Local Operations Console

The CueStats operations console bundle is a local-only reference tool. Keep it
outside the public React app and run it from the ignored `.local/` workspace.
Do not ship its routes, workflows, dependencies, environment examples, or
generated metadata to the public Fremont Open site.

## Local Webview Setup

Extract the bundle to:

```powershell
.local\cuestats-ops-console
```

Then run the console from that folder:

```powershell
npm install
npm run lint
npm run build
npm run dev
```

Local config stays untracked. Use `.env.local` or another ignored local file for
experiments, and never place credentials or private workspace identifiers in
repo-tracked files.

## Public Repo Boundary

The public repository remains the static DreamHost stats site described in
`docs/DECISIONS.md`:

- no public backend
- no login or identity provider
- no admin console
- no AI chat or advisor surface
- no browser write path
- no browser calls to Challonge, Fargo, GitHub, or deployment endpoints

The browser should continue reading static assets exported under
`frontend/public/data/`. Operational changes belong in local scripts, CI, or
docs, not in public client-side controls.

## Authoritative Public Paths

Use the existing repo implementation as the source of truth:

- `.github/workflows/data-refresh.yml` handles scheduled Challonge sync, static
  export, split data bundle staging, frontend build, DreamHost deploy, and smoke
  testing.
- `.github/workflows/deploy.yml` handles normal static production deploys from
  `main`.
- `scripts/ops_review.py` is the public operations-review path for workflow and
  scanner visibility.
- `backend/export_static.py` writes the public cache and split player/tournament
  JSON bundles.
- `docs/DECISIONS.md` controls the public product boundary.

Treat console snippets that propose new workflows, public admin controls,
serverless write endpoints, terminal emulators, or secrets vault UI as
reference-only until they are reconciled with these files.

## Pre-Commit Check

Before staging any operation-console-derived work, run:

```powershell
.venv\Scripts\python.exe scripts\check_public_boundary.py
```

If the virtual environment is unavailable, any Python 3 interpreter is fine.
The default scan includes tracked files plus untracked non-ignored files, so a
new root-level scratch file is caught before it is staged. It intentionally
ignores `.local/`, dependency folders, generated static data, and its own
pattern definitions.
