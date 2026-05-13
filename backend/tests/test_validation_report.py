import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from validation_report import build_report, validate_matches


def match(**overrides):
    row = {
        "id": "m1",
        "tournament_id": 1,
        "tournament_name": "Weekly 8 Ball",
        "round": 1,
        "state": "complete",
        "scores": "5-3",
        "winner_name": "Winner",
        "loser_name": "Loser",
        "completed_at": "2026-05-09T17:00:00-07:00",
    }
    row.update(overrides)
    return row


def test_validate_matches_flags_missing_winner_and_blank_loser():
    issues = validate_matches([match(winner_name="", loser_name="  ")], {1})

    assert {issue["code"] for issue in issues} == {"missing_winner", "blank_match_name"}
    assert all(issue["severity"] == "error" for issue in issues)


def test_validate_matches_flags_impossible_scores():
    issues = validate_matches([
        match(id="negative", scores="5--1"),
        match(id="zero", scores="0-0"),
    ], {1})

    assert [issue["code"] for issue in issues] == ["impossible_score", "impossible_score"]


def test_validate_matches_flags_exact_duplicates():
    issues = validate_matches([
        match(id="a"),
        match(id="b"),
    ], {1})

    assert len(issues) == 1
    assert issues[0]["code"] == "duplicate_match"
    assert issues[0]["row"]["match_ids"] == ["a", "b"]


def test_build_report_summarizes_issue_counts():
    report = build_report(
        players=[{"id": "p1", "name": ""}],
        tournaments=[{"id": 1, "name": "Weekly 8 Ball", "participants_count": 8}],
        matches=[match(scores="0-0")],
    )

    assert report["summary"]["issue_count"] == 2
    assert report["summary"]["counts_by_code"] == {
        "blank_player_name": 1,
        "impossible_score": 1,
    }
