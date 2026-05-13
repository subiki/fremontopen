import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from export_static import _duration_minutes, _infer_tournament_placements


def match(round_number, winner, loser, completed_at="2026-05-09T17:00:00-07:00"):
    return {
        "id": f"{round_number}-{winner}-{loser}",
        "round": round_number,
        "state": "complete",
        "winner_name": winner,
        "loser_name": loser,
        "completed_at": completed_at,
    }


def test_duration_minutes_uses_start_and_end_timestamps():
    assert _duration_minutes(
        "2026-05-09T13:26:54.541-07:00",
        "2026-05-09T17:10:07.615-07:00",
    ) == 223


def test_double_elimination_placements_use_late_loser_bracket():
    placements = _infer_tournament_placements([
        match(6, "Winner", "Runner Up"),
        match(-7, "Runner Up", "Third"),
        match(-6, "Third", "Fourth"),
    ])

    assert placements == {
        "Winner": 1,
        "Runner Up": 2,
        "Third": 3,
        "Fourth": 4,
    }


def test_single_elimination_semifinal_losers_tie_for_third():
    placements = _infer_tournament_placements([
        match(3, "Winner", "Runner Up"),
        match(2, "Winner", "Third A"),
        match(2, "Runner Up", "Third B"),
    ])

    assert placements["Winner"] == 1
    assert placements["Runner Up"] == 2
    assert placements["Third A"] == 3
    assert placements["Third B"] == 3
