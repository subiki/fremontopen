import importlib.util
import sys
import urllib.error
from pathlib import Path


SCRIPT_PATH = Path(__file__).resolve().parents[2] / "scripts" / "ops_review.py"
SPEC = importlib.util.spec_from_file_location("ops_review", SCRIPT_PATH)
ops_review = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = ops_review
SPEC.loader.exec_module(ops_review)


def test_failed_workflow_summary_reports_network_blocker(monkeypatch):
    def fake_github_json(url, token=None):
        raise urllib.error.URLError(PermissionError(10013, "blocked"))

    monkeypatch.setattr(ops_review, "_github_json", fake_github_json)

    findings = ops_review._summarize_failed_workflows("subiki/fremontopen")

    assert len(findings) == 1
    finding = findings[0]
    assert finding.source == "workflow"
    assert finding.title == "GitHub workflow review unavailable"
    assert finding.priority == "P2"
    assert "blocked" in finding.summary


def test_code_scanning_summary_reports_network_blocker(monkeypatch):
    def fake_github_json(url, token=None):
        raise urllib.error.URLError(PermissionError(10013, "blocked"))

    monkeypatch.setattr(ops_review, "_github_json", fake_github_json)

    findings = ops_review._summarize_code_scanning("subiki/fremontopen", token="test-token")

    assert len(findings) == 1
    finding = findings[0]
    assert finding.source == "code-scanning"
    assert finding.title == "GitHub code scanning request failed"
    assert finding.priority == "P2"
    assert "blocked" in finding.summary


def test_failed_workflow_summary_treats_challonge_api_key_as_only_required_secret(monkeypatch):
    def fake_github_json(url, token=None):
        if url.endswith("/actions/runs?status=completed&per_page=30"):
            return {
                "workflow_runs": [
                    {
                        "name": "Scheduled static data refresh",
                        "conclusion": "failure",
                        "id": 123,
                        "created_at": "2026-05-19T00:00:00Z",
                        "html_url": "https://example.invalid/run/123",
                    }
                ]
            }
        if url.endswith("/actions/runs/123/jobs"):
            return {"jobs": [{"id": 456}]}
        if url.endswith("/check-runs/456/annotations"):
            return [{"message": "CHALLONGE_API_KEY is required"}]
        raise AssertionError(f"unexpected URL: {url}")

    monkeypatch.setattr(ops_review, "_github_json", fake_github_json)

    findings = ops_review._summarize_failed_workflows("subiki/fremontopen")

    assert len(findings) == 1
    finding = findings[0]
    assert finding.priority == "P1"
    assert "CHALLONGE_API_KEY repository secret" in finding.summary
    assert "CHALLONGE_SUBDOMAIN" not in finding.next_step


def test_sync_issues_reconciles_correctly(monkeypatch):
    requests_made = []

    def fake_github_json(url, token=None):
        assert token == "test-token"
        if "issues" in url and "state=open" in url:
            return [
                {
                    "number": 101,
                    "title": "[Ops] Existing Active Finding",
                    "state": "open"
                },
                {
                    "number": 102,
                    "title": "[Ops] Inactive Old Finding",
                    "state": "open"
                },
                {
                    "number": 103,
                    "title": "[Ops] Pull Request Title",
                    "state": "open",
                    "pull_request": {}
                }
            ]
        raise AssertionError(f"unexpected GET URL: {url}")

    def fake_github_request(url, method="GET", data=None, token=None):
        assert token == "test-token"
        requests_made.append({"url": url, "method": method, "data": data})
        if method == "GET":
            return fake_github_json(url, token=token)
        elif method == "POST":
            if "comments" in url:
                return {"id": 999}
            return {"number": 200, "title": data["title"]}
        elif method == "PATCH":
            return {"number": 102, "state": "closed"}
        raise AssertionError(f"unexpected request: {method} {url}")

    monkeypatch.setattr(ops_review, "_github_json", fake_github_json)
    monkeypatch.setattr(ops_review, "_github_request", fake_github_request)

    findings = [
        ops_review.Finding(
            source="workflow",
            title="Existing Active Finding",
            priority="P0",
            needed=True,
            summary="Deploy failed",
            next_step="Fix it",
            url="https://github.com/run/1"
        ),
        ops_review.Finding(
            source="code-scanning",
            title="New Active Finding",
            priority="P1",
            needed=True,
            summary="Vulnerability found",
            next_step="Fix vulnerability",
            url="https://github.com/alert/1"
        ),
        ops_review.Finding(
            source="workflow",
            title="Some Unneeded Finding",
            priority="P2",
            needed=False,
            summary="Workflow push on main failed",
            next_step="Ignore",
        )
    ]

    ops_review._sync_issues("subiki/fremontopen", findings, token="test-token")

    created_issues = [r for r in requests_made if r["method"] == "POST" and "comments" not in r["url"]]
    assert len(created_issues) == 1
    assert created_issues[0]["data"]["title"] == "[Ops] New Active Finding"
    assert "ops" in created_issues[0]["data"]["labels"]
    assert "P1" in created_issues[0]["data"]["labels"]

    comments = [r for r in requests_made if r["method"] == "POST" and "comments" in r["url"]]
    assert len(comments) == 1
    assert comments[0]["url"].endswith("/issues/102/comments")
    assert "Automatically closed by ops-review sync" in comments[0]["data"]["body"]

    closed_issues = [r for r in requests_made if r["method"] == "PATCH"]
    assert len(closed_issues) == 1
    assert closed_issues[0]["url"].endswith("/issues/102")
    assert closed_issues[0]["data"]["state"] == "closed"

