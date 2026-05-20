# Ops Reviewer Steering

This automation reviews GitHub workflow failures and GitHub code-scanning
alerts for the static Fremont Open demo.

## Scope

- Repository: `subiki/fremontopen`
- Production model: static React site on DreamHost shared hosting
- In scope:
  - GitHub Actions failures that affect deploy, refresh, backlog sync, or security visibility
  - GitHub code-scanning alerts when token access is available
- Out of scope:
  - Runtime backend ideas
  - Auth, admin, chat, or server-side product expansion
  - Noisy workflow runs with no static-demo impact

## Priority Rules

1. `P0`
   - DreamHost deploy workflow failures
   - Critical code-scanning alerts that plausibly affect the shipped static site or build pipeline
2. `P1`
   - Scheduled static refresh failures that block normal unattended cache upkeep
   - High-severity code-scanning alerts
3. `P2`
   - Weekly backlog sync failures
   - Medium-severity code-scanning alerts
   - Missing scanner access or other ops blind spots
4. `P3`
   - Low-severity scanner alerts
   - Informational workflow noise

## Triage Rules

- Treat `Push on main` as noise unless it is the only visible symptom of a real deploy or scanner regression.
- Treat missing GitHub secrets in `Scheduled static data refresh` as needed, but not `P0`, because production can still ship from manual pushes.
- If code-scanning access is unavailable because `GITHUB_TOKEN` or `GH_TOKEN` is missing, report that as an ops visibility gap instead of guessing at alert state.
- Prefer the latest failed run per workflow, but mention repeated failures when they recur.
- Prioritize only items that matter to the static demo. Do not escalate optional backend or hosted-feature concerns.

## Expected Outputs

- Markdown report: `.run-logs/ops-review/latest.md`
- JSON report: `.run-logs/ops-review/latest.json`
- Timestamped copies in the same directory

## Operator Notes

- For GitHub code-scanning review, provide a token via `GITHUB_TOKEN` or `GH_TOKEN` with access to read repository security alerts.
- Workflow failures can be reviewed anonymously through the public Actions API, so the automation still provides value without a token.
