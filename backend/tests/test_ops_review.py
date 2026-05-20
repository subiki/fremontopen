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
