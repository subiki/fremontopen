import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from players_extras import compute_elo_ratings, compute_perf_vs_fargo, rolling_match_form
from import_side_matches import load_side_match_rows
from export_static import (
    _anniversary_matches,
    _closest_rivalry,
    _attendance_stats,
    _cinderella_runs,
    _duration_baselines,
    _duration_delta_summary,
    _duration_minutes,
    _event_series_label,
    _infer_tournament_placements,
    _h2h_heatmap,
    _load_prize_overrides,
    _is_qualified_player,
    _load_season_points,
    _match_elo_odds,
    _match_of_tournament,
    _normalized_duration_minutes,
    _parse_score_totals,
    _performance_above_elo,
    _peer_group_summary,
    _player_elo_extremes,
    _player_results_summary,
    _recent_activity_summary,
    _rivalry_index,
    _season_standings,
    _season_standings_preview,
    _split_player_extras_payload,
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


def test_parse_score_totals_normalizes_winner_and_loser_racks():
    assert _parse_score_totals("5-3") == {
        "winner_racks": 5,
        "loser_racks": 3,
    }
    assert _parse_score_totals("2-4") == {
        "winner_racks": 4,
        "loser_racks": 2,
    }
    assert _parse_score_totals("hill/hill") is None


def test_player_results_summary_tracks_races_and_racks():
    summary = _player_results_summary([
        {**match(1, "A", "B"), "scores": "5-3"},
        {**match(2, "C", "A"), "scores": "2-4"},
        {**match(3, "A", "D"), "scores": ""},
    ], "A")

    assert summary == {
        "races_won": 2,
        "races_lost": 1,
        "races_played": 3,
        "racks_won": 7,
        "racks_lost": 7,
        "racks_played": 14,
        "scored_races": 2,
    }


def test_event_series_label_uses_tournament_name_markers():
    assert _event_series_label({"name": "4Bs 9 ball 5/9/26"}) == "4Bs"
    assert _event_series_label({"name": "Aug 14 Talarico's"}) == "Talarico's"
    assert _event_series_label({"name": "Fremont Open Finals"}) == "Fremont Open"
    assert _event_series_label({"name": "Weekly Mixer"}) == "Other"


def test_performance_above_elo_ranks_event_overperformers():
    rows = _performance_above_elo([
        {
            **match(1, "Underdog", "Favorite"),
            "scores": "1-0",
            "elo_odds": {
                "favorite": "Favorite",
                "winner_probability": 25.0,
                "loser_probability": 75.0,
            },
        },
        {
            **match(2, "Underdog", "Contender"),
            "scores": "1-0",
            "elo_odds": {
                "favorite": "Contender",
                "winner_probability": 40.0,
                "loser_probability": 60.0,
            },
        },
        {
            **match(3, "Favorite", "Contender"),
            "scores": "1-0",
            "elo_odds": {
                "favorite": "Favorite",
                "winner_probability": 55.0,
                "loser_probability": 45.0,
            },
        },
    ], {"Underdog": 1, "Favorite": 2, "Contender": 3}, limit=3)

    assert rows[0]["player"] == "Underdog"
    assert rows[0]["wins"] == 2
    assert rows[0]["expected_wins"] == 0.65
    assert rows[0]["above_expectation"] == 1.35
    assert rows[0]["upset_wins"] == 2
    assert rows[0]["place"] == 1
    assert rows[0]["biggest_upset"]["opponent"] == "Favorite"


def test_peer_group_summary_prefers_fargo_and_expands_sparse_bands():
    players = [
        {"name": "A", "fargo": 612, "elo_rating": 1640, "win_rate": 60.0, "wins": 12, "losses": 8},
        {"name": "B", "fargo": 618, "elo_rating": 1620, "win_rate": 66.7, "wins": 10, "losses": 5},
        {"name": "C", "fargo": 645, "elo_rating": 1660, "win_rate": 55.0, "wins": 11, "losses": 9},
        {"name": "D", "fargo": 689, "elo_rating": 1700, "win_rate": 50.0, "wins": 8, "losses": 8},
        {"name": "E", "fargo": 590, "elo_rating": 1590, "win_rate": 48.0, "wins": 12, "losses": 13},
    ]

    summary = _peer_group_summary(players[0], players)

    assert summary["available"] is True
    assert summary["basis"] == "fargo"
    assert summary["band_label"] == "600-649 Fargo"
    assert summary["expanded"] is True
    assert summary["player_rank_by_win_rate"] == 2
    assert summary["peer_count"] == 4
    assert summary["nearest_peers"][0]["name"] == "B"
    assert "sparse" in summary["note"]


def test_peer_group_summary_falls_back_to_elo():
    players = [
        {"name": "A", "fargo": None, "elo_rating": 1510, "win_rate": 60.0, "wins": 6, "losses": 4},
        {"name": "B", "fargo": None, "elo_rating": 1535, "win_rate": 50.0, "wins": 5, "losses": 5},
        {"name": "C", "fargo": None, "elo_rating": 1580, "win_rate": 55.6, "wins": 5, "losses": 4},
        {"name": "D", "fargo": None, "elo_rating": 1610, "win_rate": 42.9, "wins": 3, "losses": 4},
    ]

    summary = _peer_group_summary(players[0], players)

    assert summary["basis"] == "elo"
    assert summary["band_label"] == "1500-1599 ELO"
    assert summary["expanded"] is True
    assert summary["average_peer_win_rate"] == 49.5


def test_split_player_extras_payload_moves_heavy_chart_histories():
    light, history = _split_player_extras_payload({
        "wins_over_time": [{"label": "Week 1", "wins": 1}],
        "elo": {
            "rating": 1532,
            "peak": 1601,
            "history": [{"label": "May", "rating": 1532}],
        },
        "form": {
            "window": 10,
            "history": [{"wins": 6, "losses": 4, "win_rate": 60.0}],
            "latest": {"wins": 6, "losses": 4, "win_rate": 60.0},
        },
        "peer_group": {"available": True},
    })

    assert light["elo"]["rating"] == 1532
    assert "history" not in light["elo"]
    assert light["form"]["latest"]["win_rate"] == 60.0
    assert "history" not in light["form"]
    assert "wins_over_time" not in light

    assert history == {
        "wins_over_time": [{"label": "Week 1", "wins": 1}],
        "elo_history": [{"label": "May", "rating": 1532}],
        "form": {
            "window": 10,
            "history": [{"wins": 6, "losses": 4, "win_rate": 60.0}],
            "latest": {"wins": 6, "losses": 4, "win_rate": 60.0},
        },
    }


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


def test_duration_delta_summary_rates_ahead_behind_and_on_pace():
    baseline = {"average_minutes": 210, "average_label": "3h 30m", "sample_count": 4}

    ahead = _duration_delta_summary(180, baseline)
    on_pace = _duration_delta_summary(218, baseline)
    behind = _duration_delta_summary(255, baseline)

    assert ahead["status"] == "ahead"
    assert ahead["label"] == "30m ahead of avg"
    assert ahead["delta_minutes"] == -30

    assert on_pace["status"] == "on"
    assert on_pace["label"] == "On pace"
    assert on_pace["delta_minutes"] == 8

    assert behind["status"] == "behind"
    assert behind["label"] == "45m behind avg"
    assert behind["delta_minutes"] == 45


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


def test_player_elo_extremes_tracks_best_upset_and_worst_favorite_loss():
    rows = [
        {
            **match(1, "A", "B"),
            "tournament_id": 10,
            "tournament_name": "Eight",
            "scores": "5-3",
            "elo_odds": {
                "favorite": "B",
                "winner_probability": 22.0,
                "loser_probability": 78.0,
                "rating_gap": -220,
            },
        },
        {
            **match(2, "C", "A"),
            "tournament_id": 11,
            "tournament_name": "Nine",
            "scores": "5-4",
            "elo_odds": {
                "favorite": "A",
                "winner_probability": 30.0,
                "loser_probability": 70.0,
                "rating_gap": -150,
            },
        },
    ]

    extremes = _player_elo_extremes(rows, "A")

    assert extremes["best_upset"]["opponent"] == "B"
    assert extremes["best_upset"]["rating_gap"] == 220
    assert extremes["best_upset"]["win_probability"] == 22.0
    assert extremes["worst_loss"]["opponent"] == "C"
    assert extremes["worst_loss"]["rating_gap"] == 150
    assert extremes["worst_loss"]["favorite_probability"] == 70.0


def test_match_of_tournament_prefers_biggest_upset():
    rows = [
        {
            **match(1, "Favorite", "Runner"),
            "scores": "3-1",
            "elo_odds": {
                "favorite": "Favorite",
                "winner_probability": 72.0,
                "loser_probability": 28.0,
                "rating_gap": 160,
            },
        },
        {
            **match(2, "Underdog", "Heavy Favorite"),
            "scores": "3-2",
            "elo_odds": {
                "favorite": "Heavy Favorite",
                "winner_probability": 18.0,
                "loser_probability": 82.0,
                "rating_gap": -260,
            },
        },
    ]

    featured = _match_of_tournament(rows)

    assert featured["reason"] == "upset"
    assert featured["match_id"] == rows[1]["id"]
    assert featured["winner"] == "Underdog"
    assert featured["favorite"] == "Heavy Favorite"


def test_match_of_tournament_can_pick_heated_repeat_rivalry():
    rows = [
        {
            **match(1, "A", "B"),
            "scores": "3-2",
            "elo_odds": {
                "favorite": "A",
                "winner_probability": 55.0,
                "loser_probability": 45.0,
                "rating_gap": 35,
            },
        },
        {
            **match(2, "B", "A"),
            "scores": "3-2",
            "elo_odds": {
                "favorite": "A",
                "winner_probability": 47.0,
                "loser_probability": 53.0,
                "rating_gap": -20,
            },
        },
    ]

    featured = _match_of_tournament(rows)

    assert featured["reason"] == "rivalry"
    assert featured["winner"] == "B"
    assert "met 2 times" in featured["detail"]


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


def test_perf_vs_fargo_reports_expected_and_actual_wins():
    perf = compute_perf_vs_fargo(
        [
            match(1, "A", "B", "2026-05-01T17:00:00-07:00"),
            match(2, "B", "A", "2026-05-02T17:00:00-07:00"),
            match(3, "A", "C", "2026-05-03T17:00:00-07:00"),
        ],
        "A",
        500,
        {"B": 500, "C": 540},
    )

    assert perf["has_fargo"] is True
    assert perf["rated_matches"] == 3
    assert perf["actual_wins"] == 2
    assert perf["expected_wins"] == 1.39
    assert perf["wins_above_expected"] == 0.61
    assert perf["performance_score"] == 0.61
    assert perf["average_delta"] == 0.204
    assert perf["label"] == "above rating"
    assert "Wins above expected" in perf["explanation"]


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


def test_season_standings_preview_trims_player_rows_and_season_count():
    seasons = [
        {
            "season": f"2026 Season {index}",
            "season_key": f"2026-s{index}",
            "points_config": {"win_points": 3, "loss_points": 1},
            "matches": 10 + index,
            "tournaments": 2 + index,
            "players": [
                {"player": f"Player {player}", "points": 20 - player}
                for player in range(8)
            ],
        }
        for index in range(5)
    ]

    preview = _season_standings_preview(seasons, season_limit=4, player_limit=3)

    assert len(preview) == 4
    assert preview[0]["season_key"] == "2026-s0"
    assert len(preview[0]["players"]) == 3
    assert preview[0]["players"][0]["player"] == "Player 0"


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
