import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from players_extras import compute_elo_ratings
from export_static import (
    _closest_rivalry,
    _attendance_stats,
    _duration_minutes,
    _infer_tournament_placements,
    _is_qualified_player,
    _normalized_duration_minutes,
    _recent_activity_summary,
    _season_standings,
)


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


def test_normalized_duration_excludes_likely_left_open_tournaments():
    assert _normalized_duration_minutes(719) == 719
    assert _normalized_duration_minutes(721) is None
    assert _normalized_duration_minutes(None) is None


def test_qualified_player_requires_minimum_matches():
    assert _is_qualified_player({"wins": 6, "losses": 4})
    assert not _is_qualified_player({"wins": 5, "losses": 4})


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


def test_compute_elo_ratings_rewards_winners_and_tracks_history():
    ratings = compute_elo_ratings([
        match(1, "A", "B", "2026-05-09T17:00:00-07:00"),
        match(2, "A", "B", "2026-05-09T18:00:00-07:00"),
    ])

    assert ratings["rated_match_count"] == 2
    assert ratings["ratings"]["A"] > 1500
    assert ratings["ratings"]["B"] < 1500
    assert ratings["peaks"]["A"] == ratings["ratings"]["A"]
    assert len(ratings["history"]["A"]) == 2
    assert ratings["history"]["A"][0]["delta"] > 0


def test_recent_activity_summary_counts_active_players_and_hottest_player():
    summary = _recent_activity_summary([
        match(1, "A", "B", "2026-05-01T12:00:00-07:00"),
        match(2, "A", "C", "2026-05-02T12:00:00-07:00"),
        match(3, "B", "C", "2026-05-03T12:00:00-07:00"),
    ])

    assert summary["active_players"] == 3
    assert summary["match_count"] == 3
    assert summary["hottest_player"]["player"] == "A"


def test_closest_rivalry_prefers_tightest_record_then_more_matches():
    rivalry = _closest_rivalry([
        match(1, "A", "B"),
        match(2, "B", "A"),
        match(3, "A", "B"),
        match(4, "C", "D"),
        match(5, "D", "C"),
        match(6, "C", "D"),
        match(7, "D", "C"),
    ])

    assert rivalry["label"] == "C vs D"
    assert rivalry["matches"] == 4
    assert rivalry["difference"] == 0


def test_attendance_stats_tracks_played_and_streaks():
    tournaments = [
        {"id": 1, "name": "One", "started_at": "2026-05-01T12:00:00-07:00"},
        {"id": 2, "name": "Two", "started_at": "2026-05-02T12:00:00-07:00"},
        {"id": 3, "name": "Three", "started_at": "2026-05-03T12:00:00-07:00"},
        {"id": 4, "name": "Four", "started_at": "2026-05-04T12:00:00-07:00"},
    ]
    matches = [
        {**match(1, "A", "B"), "tournament_id": 1},
        {**match(1, "C", "D"), "tournament_id": 2},
        {**match(1, "A", "C"), "tournament_id": 3},
        {**match(1, "A", "D"), "tournament_id": 4},
    ]

    stats = _attendance_stats(tournaments, matches)

    assert stats["A"]["tournaments_played"] == 3
    assert stats["A"]["current_streak"] == 2
    assert stats["A"]["best_streak"] == 2
    assert stats["B"]["current_streak"] == 0


def test_season_standings_group_matches_by_tournament_date():
    tournaments = [
        {"id": 1, "name": "Spring One", "started_at": "2026-04-01T12:00:00-07:00"},
        {"id": 2, "name": "Summer One", "started_at": "2026-07-01T12:00:00-07:00"},
    ]
    matches = [
        {**match(1, "A", "B"), "tournament_id": 1},
        {**match(2, "A", "C"), "tournament_id": 1},
        {**match(1, "B", "A"), "tournament_id": 2},
    ]

    seasons = _season_standings(tournaments, matches)

    assert [season["season"] for season in seasons] == ["2026 Summer", "2026 Spring"]
    assert seasons[1]["matches"] == 2
    assert seasons[1]["tournaments"] == 1
    assert seasons[1]["players"][0]["player"] == "A"
    assert seasons[1]["players"][0]["wins"] == 2
