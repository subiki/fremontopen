# Agent Operating Spec

Operational rules for Codex and other coding agents working on this repo. These are not product backlog items.

## Windows Prompt Suppression

Goal: keep local agent runs non-interactive on Windows so autonomous work is not blocked by avoidable prompts.

Rules:

- Prefer non-interactive command flags when available: `--yes`, `--force`, `--non-interactive`.
- Set CI-style environment where the tool supports it, such as `CI=true`.
- For PowerShell sessions, prefer explicit non-interactive execution and set `$ConfirmPreference = "None"` in scripts that would otherwise prompt.
- Prefer WSL or bash execution paths for shell scripts when available and documented.
- Keep Git operations non-interactive. Do not use commands that open an editor unless the user explicitly asks.
- Document shell, PATH, and DreamHost assumptions in repo docs when they matter to a change.

## Backlog Execution Order

`BACKLOG.md` is the source of truth for product work and GitHub issue sync.

Priority order:

1. `JFL`
2. `P0`
3. `P1`
4. `P2`
5. `P3`

Within a priority bucket:

1. Unblockers before dependent work
2. Infrastructure before features
3. Schema or export data before API/UI
4. Tests before polish
5. Documentation last for the completed change

Blocked `JFL` work should leave blocker notes, dependency issues, an implementation plan, and partial progress commits when useful.

## Autonomous Session Loop

For larger autonomous sessions:

1. Pull latest main.
2. Read `BACKLOG.md`.
3. Read active handoff and blocker notes if present.
4. Select the highest-priority unblocked task.
5. Implement incrementally.
6. Verify with focused tests or builds.
7. Commit frequently when requested by the user.
8. Update handoff notes before stopping.

Stop conditions:

- Missing credentials
- Unresolved merge conflict
- Destructive migration or production data deletion risk
- Three consecutive failing verification attempts
- Ambiguous product/business rule
- Token budget too low to leave the repo in a clear state

## Inter-Agent Coordination

Agents should coordinate through durable repo artifacts:

- Commits
- PR descriptions
- `docs/agents/`
- `handoff/`
- `notes/`
- `docs/DECISIONS.md`

Use append-only notes where possible. Avoid requiring future agents to reread old chat history.

## Commit Message Template

Use this structure for autonomous backlog commits when practical:

```text
[Priority][Agent-Codex][Session-YYYY-MM-DD-NN]
Short task summary

Completed:
- ...

Remaining:
- ...

Blockers:
- ...

Next:
- ...
```

## Safety Rules

- Never commit `.env` or secrets.
- Never force-push shared branches without explicit user approval.
- Never rewrite shared history without explicit user approval.
- Stop before destructive production database changes.
- Prefer rollback notes before infrastructure changes.

## Token Budget Strategy

Before stopping near token limits:

1. Commit or clearly describe uncommitted work.
2. Update handoff notes.
3. Document blockers.
4. Leave exact next commands.
5. Identify partially completed files.
6. Estimate remaining work.

The goal is for a new agent to resume in under five minutes without chat history.

## DreamHost Constraints

Assume the current demo target is DreamHost shared hosting:

- Static React site
- Cached Challonge data
- No Docker or Kubernetes
- Lightweight scripts over long-running workers
- Cron-friendly refresh workflows
- Minimal memory footprint
- Fast cold starts

