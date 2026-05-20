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
