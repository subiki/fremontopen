import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from players_extras import compute_elo_ratings, rolling_match_form
from import_side_matches import load_side_match_rows
from export_static import (
    _anniversary_matches,
    _closest_rivalry,
    _attendance_stats,
    _cinderella_runs,
    _duration_baselines,
    _duration_minutes,
    _infer_tournament_placements,
    _h2h_heatmap,
    _load_prize_overrides,
    _is_qualified_player,
    _load_season_points,
    _match_elo_odds,
    _normalized_duration_minutes,
    _recent_activity_summary,
    _rivalry_index,
    _season_standings,
    _strength_of_schedule,
    _tournament_difficulty,
    _tournament_prize_payouts,
    _titles_from_placements,
    _upset_tracker,
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


def test_duration_baselines_group_by_game_and_player_count():
    baselines = _duration_baselines([
        {
            "tournament_id": 1,
            "tournament_name": "Fast 8",
            "game": "8 Ball",
            "player_count": 12,
            "duration_minutes": 180,
            "date": "2026-05-01T12:00:00-07:00",
        },
        {
            "tournament_id": 2,
            "tournament_name": "Slow 8",
            "game": "8 Ball",
            "player_count": 12,
            "duration_minutes": 240,
            "date": "2026-05-08T12:00:00-07:00",
        },
        {
            "tournament_id": 3,
            "tournament_name": "Left Open",
            "game": "8 Ball",
            "player_count": 12,
            "duration_minutes": 900,
            "date": "2026-05-15T12:00:00-07:00",
        },
        {
            "tournament_id": 5,
            "tournament_name": "Bad Clock",
            "game": "8 Ball",
            "player_count": 12,
            "duration_minutes": 2,
            "date": "2026-05-16T12:00:00-07:00",
        },
        {
            "tournament_id": 6,
            "tournament_name": "Long Cleanup",
            "game": "8 Ball",
            "player_count": 12,
            "duration_minutes": 620,
            "date": "2026-05-17T12:00:00-07:00",
        },
        {
            "tournament_id": 4,
            "tournament_name": "Fast 9",
            "game": "9 Ball",
            "player_count": 16,
            "duration_minutes": 210,
            "date": "2026-05-22T12:00:00-07:00",
        },
    ])

    assert baselines["overall"]["shortest"]["tournament_id"] == 1
    assert baselines["overall"]["longest"]["tournament_id"] == 2
    assert baselines["overall"]["sample_count"] == 3

    group = baselines["by_key"]["8 Ball|12"]
    assert group["sample_count"] == 2
    assert group["excluded_outlier_count"] == 2
    assert group["average_label"] == "3h 30m"
    assert group["shortest"]["duration_label"] == "3h"
    assert group["longest"]["duration_label"] == "4h"


def test_qualified_player_requires_minimum_matches():
    assert _is_qualified_player({"wins": 6, "losses": 4})
    assert not _is_qualified_player({"wins": 5, "losses": 4})


def test_load_season_points_overrides_defaults(tmp_path):
    path = tmp_path / "season_points.json"
    path.write_text('{"win_points": 5, "loss_points": 0}', encoding="utf-8")

    config = _load_season_points(path)

    assert config["win_points"] == 5
    assert config["loss_points"] == 0
    assert config["title_bonus"] == 0


def test_tournament_prize_payouts_round_to_five_and_award_whole_pot():
    payouts = _tournament_prize_payouts(
        15,
        {"Winner": 1, "Runner Up": 2, "Third": 3, "Fourth": 4},
    )

    assert payouts["pot"] == 150
    assert payouts["awarded"] == 150
    assert payouts["unassigned"] == 0
    assert [row["amount"] for row in payouts["payouts"]] == [75, 45, 25, 5]


def test_tournament_prize_payouts_splits_tied_places():
    payouts = _tournament_prize_payouts(
        8,
        {"Winner": 1, "Runner Up": 2, "Third A": 3, "Third B": 3},
    )

    third = next(row for row in payouts["payouts"] if row["place"] == 3)
    assert payouts["pot"] == 80
    assert payouts["awarded"] == 80
    assert third["split"] is True
    assert third["players"] == ["Third A", "Third B"]


def test_tournament_prize_payouts_accept_manual_override():
    payouts = _tournament_prize_payouts(
        12,
        {"Winner": 1, "Runner Up": 2, "Third": 3},
        10,
        {
            "pot": 200,
            "payouts": {"1": 120, "2": 60, "3": 20, "4": 0},
            "note": "Manual payout sheet",
        },
    )

    assert payouts["source"] == "override"
    assert payouts["pot"] == 200
    assert payouts["awarded"] == 200
    assert [row["amount"] for row in payouts["payouts"]] == [120, 60, 20]
    assert payouts["rules"] == "Manual payout sheet"


def test_load_prize_overrides_reads_defaults_and_tournaments(tmp_path):
    path = tmp_path / "prize_overrides.json"
    path.write_text(
        '{"default_entry_fee": 15, "tournaments": {"123": {"pot": 240}}}',
        encoding="utf-8",
    )

    overrides = _load_prize_overrides(path)

    assert overrides["default_entry_fee"] == 15
    assert overrides["tournaments"]["123"]["pot"] == 240


def test_match_elo_odds_compares_two_players():
    odds = _match_elo_odds(
        {"winner_name": "A", "loser_name": "B"},
        {"ratings": {"A": 1600, "B": 1500}, "initial_rating": 1500},
    )

    assert odds["winner_rating"] == 1600
    assert odds["loser_rating"] == 1500
    assert odds["favorite"] == "A"
    assert odds["winner_probability"] > 50


def test_cinderella_runs_rank_underdog_paths():
    rows = [
        {
            **match(1, "Underdog", "Favorite"),
            "elo_odds": {
                "favorite": "Favorite",
                "winner_probability": 25.0,
                "loser_probability": 75.0,
                "rating_gap": -180,
            },
        },
        {
            **match(2, "Underdog", "Other Favorite"),
            "elo_odds": {
                "favorite": "Other Favorite",
                "winner_probability": 40.0,
                "loser_probability": 60.0,
                "rating_gap": -90,
            },
        },
        {
            **match(3, "Favorite", "Underdog"),
            "elo_odds": {
                "favorite": "Favorite",
                "winner_probability": 70.0,
                "loser_probability": 30.0,
                "rating_gap": 140,
            },
        },
    ]

    runs = _cinderella_runs(rows)

    assert runs[0]["player"] == "Underdog"
    assert runs[0]["upset_count"] == 2
    assert runs[0]["upset_score"] == 135.0
    assert runs[0]["biggest_upset"]["opponent"] == "Favorite"


def test_upset_tracker_ranks_biggest_underdog_wins():
    rows = [
        {
            **match(1, "A", "B"),
            "tournament_id": 10,
            "tournament_name": "Ten",
            "elo_odds": {
                "favorite": "B",
                "winner_probability": 20.0,
                "loser_probability": 80.0,
                "rating_gap": -240,
            },
        },
        {
            **match(2, "C", "D"),
            "tournament_id": 11,
            "tournament_name": "Eleven",
            "elo_odds": {
                "favorite": "D",
                "winner_probability": 35.0,
                "loser_probability": 65.0,
                "rating_gap": -130,
            },
        },
        {
            **match(3, "E", "F"),
            "elo_odds": {
                "favorite": "E",
                "winner_probability": 70.0,
                "loser_probability": 30.0,
                "rating_gap": 150,
            },
        },
    ]

    upsets = _upset_tracker(rows)

    assert [row["winner"] for row in upsets] == ["A", "C"]
    assert upsets[0]["favorite_probability"] == 80.0
    assert upsets[0]["tournament_name"] == "Ten"


def test_anniversary_matches_find_prior_year_window():
    rows = [
        {**match(1, "A", "B", "2025-05-10T17:00:00-07:00"), "tournament_name": "Last Year"},
        {**match(2, "C", "D", "2026-05-09T17:00:00-07:00"), "tournament_name": "Latest"},
    ]

    anniversary = _anniversary_matches(rows, window_days=3)

    assert anniversary["mode"] == "anniversary"
    assert anniversary["target_date"] == "2025-05-09"
    assert anniversary["matches"][0]["winner"] == "A"
    assert anniversary["matches"][0]["days_from_target"] == 1


def test_anniversary_matches_fallback_to_previous_season():
    rows = [
        {**match(1, "A", "B", "2026-01-10T17:00:00-07:00"), "tournament_name": "Winter"},
        {**match(2, "C", "D", "2026-05-09T17:00:00-07:00"), "tournament_name": "Spring"},
    ]

    anniversary = _anniversary_matches(rows, window_days=3)

    assert anniversary["mode"] == "previous_season"
    assert anniversary["matches"][0]["tournament_name"] == "Winter"


def test_tournament_difficulty_uses_field_elo():
    difficulty = _tournament_difficulty(
        [
            match(1, "A", "B"),
            match(2, "C", "D"),
        ],
        {"initial_rating": 1500, "ratings": {"A": 1800, "B": 1600, "C": 1500, "D": 1500}},
    )

    assert difficulty["label"] == "Elite"
    assert difficulty["average_elo"] == 1600
    assert difficulty["top_elo"] == 1800
    assert difficulty["field_size"] == 4


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


def test_titles_from_placements_match_first_place_counts():
    tournaments = [
        {
            "id": 1,
            "name": "Eight Ball Open",
            "game": "8 Ball",
            "completed_at": "2026-05-01T20:00:00-07:00",
        },
        {
            "id": 2,
            "name": "Nine Ball Open",
            "game": "9 Ball",
            "completed_at": "2026-05-02T20:00:00-07:00",
        },
    ]

    titles = _titles_from_placements(tournaments, {"1": 1, "2": 2})

    assert titles["total"] == 1
    assert titles["by_game"] == {"8-ball": 1}
    assert titles["titles"] == [
        {
            "tournament_id": 1,
            "tournament_name": "Eight Ball Open",
            "game": "8 Ball",
            "completed_at": "2026-05-01T20:00:00-07:00",
        }
    ]


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


def test_rolling_match_form_tracks_last_ten_win_rate():
    matches = [
        match(
            i,
            "A" if i in {1, 3, 5, 7, 9, 11} else "B",
            "B" if i in {1, 3, 5, 7, 9, 11} else "A",
            f"2026-05-{i:02d}T17:00:00-07:00",
        )
        for i in range(1, 13)
    ]

    form = rolling_match_form(matches, "A", 10)

    assert len(form) == 12
    assert form[-1]["window"] == 10
    assert form[-1]["wins"] == 5
    assert form[-1]["losses"] == 5
    assert form[-1]["win_rate"] == 50.0


def test_recent_activity_summary_counts_active_players_and_hottest_player():
    summary = _recent_activity_summary([
        match(1, "A", "B", "2026-05-01T12:00:00-07:00"),
        match(2, "A", "C", "2026-05-02T12:00:00-07:00"),
        match(3, "B", "C", "2026-05-03T12:00:00-07:00"),
    ])

    assert summary["active_players"] == 3
    assert summary["match_count"] == 3
    assert summary["hottest_player"]["player"] == "A"


def test_strength_of_schedule_weights_opponents_by_matches():
    rows = [
        match(1, "A", "B"),
        match(2, "C", "A"),
        match(3, "C", "A"),
    ]
    players = {
        "B": {"win_rate": 40.0},
        "C": {"win_rate": 70.0},
    }
    elo = {"initial_rating": 1500, "ratings": {"B": 1450, "C": 1700}}

    schedule = _strength_of_schedule(rows, "A", players, elo)

    assert schedule["match_count"] == 3
    assert schedule["opponent_count"] == 2
    assert schedule["average_opponent_win_rate"] == 60.0
    assert schedule["average_opponent_elo"] == 1617


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


def test_rivalry_index_scores_volume_closeness_and_swings():
    rows = _rivalry_index([
        match(1, "A", "B", "2026-05-01T12:00:00-07:00"),
        match(2, "B", "A", "2026-05-02T12:00:00-07:00"),
        match(3, "A", "B", "2026-05-03T12:00:00-07:00"),
        match(4, "B", "A", "2026-05-04T12:00:00-07:00"),
        match(5, "C", "D", "2026-05-01T12:00:00-07:00"),
        match(6, "C", "D", "2026-05-02T12:00:00-07:00"),
        match(7, "C", "D", "2026-05-03T12:00:00-07:00"),
    ])

    assert rows[0]["label"] == "A vs B"
    assert rows[0]["matches"] == 4
    assert rows[0]["difference"] == 0
    assert rows[0]["streak_swings"] == 3
    assert rows[0]["score"] > rows[1]["score"]


def test_h2h_heatmap_builds_top_player_matrix():
    heatmap = _h2h_heatmap([
        match(1, "A", "B"),
        match(2, "A", "B"),
        match(3, "B", "A"),
        match(4, "A", "C"),
        match(5, "D", "A"),
        match(6, "C", "B"),
    ], player_limit=3)

    assert [row["player"] for row in heatmap["players"]] == ["A", "B", "C"]
    row_a = heatmap["matrix"][0]
    assert row_a["player"] == "A"
    assert row_a["cells"][0]["win_rate"] is None
    assert row_a["cells"][1] == {
        "opponent": "B",
        "wins": 2,
        "losses": 1,
        "matches": 3,
        "win_rate": 66.7,
    }
    assert heatmap["top_pairs"][0]["label"] == "A vs B"
    assert heatmap["top_pairs"][0]["matches"] == 3


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

    seasons = _season_standings(
        tournaments,
        matches,
        {"win_points": 3, "loss_points": 1, "title_bonus": 0, "attendance_bonus": 0},
    )

    assert [season["season"] for season in seasons] == ["2026 Summer", "2026 Spring"]
    assert seasons[1]["matches"] == 2
    assert seasons[1]["tournaments"] == 1
    assert seasons[1]["players"][0]["player"] == "A"
    assert seasons[1]["players"][0]["wins"] == 2
    assert seasons[1]["players"][0]["points"] == 6
    assert seasons[1]["players"][0]["attendance"] == 1
    assert seasons[1]["attendance_leaders"][0]["player"] == "A"


def test_load_side_match_rows_defaults_manual_bucket(tmp_path):
    path = tmp_path / "side_matches.csv"
    path.write_text(
        "winner_name,loser_name,scores,completed_at,game\n"
        "A,B,5-3,2026-05-14T19:00:00-07:00,8-ball\n",
        encoding="utf-8",
    )

    rows = load_side_match_rows(path)

    assert rows[0]["id"].startswith("side:")
    assert rows[0]["tournament_id"] == -900001
    assert rows[0]["tournament_name"] == "Manual side matches"
    assert rows[0]["winner_name"] == "A"
    assert rows[0]["loser_name"] == "B"
