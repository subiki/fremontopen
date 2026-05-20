"""Review GitHub workflow failures and code-scanning alerts for Fremont Open.

The report is static-first and conservative: it flags only items that appear
actionable for the current DreamHost demo scope and deprioritizes noisy or
non-essential automation.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO = "subiki/fremontopen"
API_ROOT = "https://api.github.com"
ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_OUT_DIR = ROOT_DIR / ".run-logs" / "ops-review"
WORKFLOW_WINDOW = 30


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _iso_to_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _github_json(url: str, token: str | None = None) -> Any:
    headers = {
        "User-Agent": "fremontopen-ops-review",
        "Accept": "application/vnd.github+json",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


@dataclass
class Finding:
    source: str
    title: str
    priority: str
    needed: bool
    summary: str
    next_step: str
    url: str | None = None
    metadata: dict[str, Any] | None = None


def _priority_rank(value: str) -> int:
    order = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}
    return order.get(value, 9)


def _workflow_base_priority(name: str) -> tuple[str, bool]:
    mapping = {
        "Deploy static demo to DreamHost shared hosting": ("P0", True),
        "Scheduled static data refresh": ("P1", True),
        "Weekly Backlog Sync": ("P2", True),
        "Codacy Security Scan": ("P2", True),
        "CodeQL": ("P2", True),
        "Push on main": ("P3", False),
    }
    return mapping.get(name, ("P3", False))


def _format_request_error(exc: Exception) -> str:
    if isinstance(exc, urllib.error.HTTPError):
        detail = exc.read().decode("utf-8", errors="replace").strip()
        if detail:
            return detail[:200]
    reason = getattr(exc, "reason", None)
    if reason:
        return str(reason)
    return str(exc)


def _request_blocker_finding(source: str, title: str, detail: str, next_step: str) -> Finding:
    return Finding(
        source=source,
        title=title,
        priority="P2",
        needed=True,
        summary=f"GitHub API access is blocked: {detail[:200]}",
        next_step=next_step,
    )


def _summarize_failed_workflows(repo: str, token: str | None = None) -> list[Finding]:
    try:
        payload = _github_json(
            f"{API_ROOT}/repos/{repo}/actions/runs?status=completed&per_page={WORKFLOW_WINDOW}",
            token=token,
        )
    except (urllib.error.HTTPError, urllib.error.URLError) as exc:
        return [
            _request_blocker_finding(
                source="workflow",
                title="GitHub workflow review unavailable",
                detail=_format_request_error(exc),
                next_step="Run the ops review where outbound HTTPS access to api.github.com is allowed, or attach a captured Actions report artifact.",
            )
        ]
    runs = payload.get("workflow_runs") or []
    failures = [run for run in runs if run.get("conclusion") == "failure"]
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for run in failures:
        grouped[str(run.get("name") or "Unknown")].append(run)

    findings: list[Finding] = []
    for name, grouped_runs in grouped.items():
        latest = sorted(grouped_runs, key=lambda row: row.get("created_at") or "", reverse=True)[0]
        priority, needed = _workflow_base_priority(name)
        run_id = latest.get("id")
        try:
            jobs = _github_json(f"{API_ROOT}/repos/{repo}/actions/runs/{run_id}/jobs", token=token)
        except (urllib.error.HTTPError, urllib.error.URLError):
            jobs = {"jobs": []}
        job = (jobs.get("jobs") or [{}])[0]
        annotations = []
        if job.get("id"):
            try:
                annotations = _github_json(
                    f"{API_ROOT}/repos/{repo}/check-runs/{job['id']}/annotations",
                    token=token,
                )
            except (urllib.error.HTTPError, urllib.error.URLError):
                annotations = []

        annotation_messages = [row.get("message") for row in annotations if row.get("message")]
        title_bits = [row.get("title") for row in annotations if row.get("title")]
        root_cause = annotation_messages[0] if annotation_messages else "No annotation details available"

        if "CHALLONGE_API_KEY is required" in " ".join(annotation_messages):
            root_cause = "Missing CHALLONGE_API_KEY and CHALLONGE_SUBDOMAIN repository secrets"
            priority = "P1"
            needed = True
        elif name == "Push on main":
            needed = False
        elif any("Node.js 20 actions are deprecated" in msg for msg in annotation_messages):
            if name not in {"Codacy Security Scan", "CodeQL"}:
                priority = min(priority, "P2", key=_priority_rank)

        findings.append(
            Finding(
                source="workflow",
                title=name,
                priority=priority,
                needed=needed,
                summary=f"{len(grouped_runs)} recent failure(s); latest root cause: {root_cause}",
                next_step=_workflow_next_step(name, annotation_messages, title_bits),
                url=latest.get("html_url"),
                metadata={
                    "run_id": run_id,
                    "head_sha": latest.get("head_sha"),
                    "created_at": latest.get("created_at"),
                    "annotation_titles": title_bits,
                },
            )
        )
    return findings


def _workflow_next_step(name: str, messages: list[str], titles: list[str]) -> str:
    joined = " ".join(messages + titles)
    if "CHALLONGE_API_KEY is required" in joined:
        return "Set CHALLONGE_API_KEY and CHALLONGE_SUBDOMAIN in GitHub repo secrets, then rerun Scheduled static data refresh."
    if name == "Deploy static demo to DreamHost shared hosting":
        return "Inspect the failed deploy job first; production shipping is blocked until it passes."
    if name == "Weekly Backlog Sync":
        return "Re-run backlog sync only if issue state drift matters; otherwise treat as P2 bookkeeping."
    if name in {"Codacy Security Scan", "CodeQL"}:
        return "Inspect the scanner failure and decide whether it hides a real regression or only tooling drift."
    return "Review the failed run and decide whether it affects the static demo shipping path."


def _summarize_code_scanning(repo: str, token: str | None = None) -> list[Finding]:
    if not token:
        return [
            Finding(
                source="code-scanning",
                title="GitHub code scanning unavailable",
                priority="P2",
                needed=True,
                summary="Open code-scanning alerts require a GitHub token; the ops agent cannot review them anonymously.",
                next_step="Set GITHUB_TOKEN or GH_TOKEN with repo security-events read access for the scheduled task.",
            )
        ]

    try:
        alerts = _github_json(
            f"{API_ROOT}/repos/{repo}/code-scanning/alerts?state=open&per_page=100",
            token=token,
        )
    except (urllib.error.HTTPError, urllib.error.URLError) as exc:
        detail = _format_request_error(exc)
        return [
            Finding(
                source="code-scanning",
                title="GitHub code scanning request failed",
                priority="P2",
                needed=True,
                summary=f"GitHub code-scanning access failed: {detail[:200]}",
                next_step="Verify the token has permission to read code-scanning alerts and that outbound HTTPS access to api.github.com is allowed.",
            )
        ]

    findings: list[Finding] = []
    for alert in alerts:
        rule = alert.get("rule") or {}
        severity = (
            rule.get("security_severity_level")
            or rule.get("severity")
            or alert.get("rule", {}).get("severity")
            or "unknown"
        )
        priority = _severity_to_priority(str(severity))
        findings.append(
            Finding(
                source="code-scanning",
                title=rule.get("description") or rule.get("id") or f"Alert {alert.get('number')}",
                priority=priority,
                needed=True,
                summary=f"Open GitHub code-scanning alert #{alert.get('number')} with severity {severity}.",
                next_step="Review the alert path and validate whether it affects the static demo threat model before fixing.",
                url=alert.get("html_url"),
                metadata={
                    "alert_number": alert.get("number"),
                    "rule_id": rule.get("id"),
                    "severity": severity,
                    "state": alert.get("state"),
                },
            )
        )

    if not findings:
        findings.append(
            Finding(
                source="code-scanning",
                title="No open GitHub code-scanning alerts",
                priority="P3",
                needed=False,
                summary="No open alerts were returned by the GitHub code-scanning API.",
                next_step="No action needed.",
            )
        )
    return findings


def _severity_to_priority(value: str) -> str:
    normalized = value.casefold()
    if normalized in {"critical", "9.0", "10.0"}:
        return "P0"
    if normalized in {"high", "7.0", "8.0", "8.1", "8.2", "8.3", "8.4", "8.5", "8.6", "8.7", "8.8", "8.9"}:
        return "P1"
    if normalized in {"medium", "4.0", "5.0", "6.0"}:
        return "P2"
    return "P3"


def _build_report(findings: list[Finding], repo: str) -> str:
    now = _utc_now().isoformat()
    lines = [
        f"# Fremont Open Ops Review",
        "",
        f"- Repo: `{repo}`",
        f"- Generated: `{now}`",
        "",
        "## Prioritized Findings",
        "",
        "| Priority | Needed | Source | Item | Summary | Next Step |",
        "|---|---|---|---|---|---|",
    ]
    for finding in sorted(findings, key=lambda row: (_priority_rank(row.priority), not row.needed, row.title.casefold())):
        needed = "yes" if finding.needed else "no"
        item = finding.title.replace("|", "/")
        summary = finding.summary.replace("|", "/")
        next_step = finding.next_step.replace("|", "/")
        if finding.url:
            item = f"[{item}]({finding.url})"
        lines.append(f"| {finding.priority} | {needed} | {finding.source} | {item} | {summary} | {next_step} |")

    lines.extend([
        "",
        "## Steering",
        "",
        "- Treat DreamHost deploy failures as `P0` because they block production shipping.",
        "- Treat scheduled data refresh failures as `P1` unless they are clearly optional or already superseded by a recent successful manual refresh.",
        "- Ignore `Push on main` failures unless they hide a linked deploy or security regression.",
        "- Deprioritize scanner or workflow noise that does not affect the static demo scope.",
    ])
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Review GitHub workflow failures and code-scanning alerts.")
    parser.add_argument("--repo", default=REPO, help="Repository in owner/name form.")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Directory for markdown/json reports.")
    args = parser.parse_args()

    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    findings = []
    findings.extend(_summarize_failed_workflows(args.repo, token=token))
    findings.extend(_summarize_code_scanning(args.repo, token=token))

    report = _build_report(findings, args.repo)
    timestamp = _utc_now().strftime("%Y%m%d-%H%M%S")
    md_path = out_dir / "latest.md"
    json_path = out_dir / "latest.json"
    history_md_path = out_dir / f"{timestamp}.md"
    history_json_path = out_dir / f"{timestamp}.json"

    md_path.write_text(report, encoding="utf-8")
    history_md_path.write_text(report, encoding="utf-8")
    payload = {
        "repo": args.repo,
        "generated_at": _utc_now().isoformat(),
        "findings": [finding.__dict__ for finding in findings],
    }
    serialized = json.dumps(payload, indent=2) + "\n"
    json_path.write_text(serialized, encoding="utf-8")
    history_json_path.write_text(serialized, encoding="utf-8")

    print(f"Wrote ops review: {md_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
