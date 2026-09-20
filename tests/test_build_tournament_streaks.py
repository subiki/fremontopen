import importlib.util
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).parents[1] / "scripts" / "build_tournament_streaks.py"
SPEC = importlib.util.spec_from_file_location("build_tournament_streaks", MODULE_PATH)
module = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(module)


def event(tournament_id, date, placements, participants):
    matches = []
    for index, player in enumerate(participants[1:], start=1):
        matches.append(
            {
                "winner_name": participants[0],
                "winner_entry_type": "singles_player",
                "loser_name": player,
                "loser_entry_type": "singles_player",
                "id": f"{tournament_id}-{index}",
            }
        )
    payouts = [
        {"place": place, "players": [player], "per_player": 10}
        for player, place in placements.items()
    ]
    return {
        "tournament": {
            "id": tournament_id,
            "name": f"Event {tournament_id}",
            "state": "complete",
            "started_at": date,
            "game": "8-ball",
        },
        "matches": matches,
        "analytics": {"prize_payouts": payouts},
    }


class StreakRankingsTests(unittest.TestCase):
    def test_missing_tournament_week_breaks_title_run(self):
        payloads = [
            event(1, "2026-01-01T12:00:00+00:00", {"Sean": 1}, ["Sean", "A"]),
            event(2, "2026-01-08T12:00:00+00:00", {"A": 1}, ["A", "B"]),
            event(3, "2026-01-15T12:00:00+00:00", {"Sean": 1}, ["Sean", "C"]),
            event(4, "2026-01-22T12:00:00+00:00", {"Sean": 1}, ["Sean", "D"]),
        ]
        rankings = module.build_rankings(payloads)
        sean = next(
            row
            for row in rankings["rankings"]["consecutive_titles"]
            if row["player"] == "Sean"
        )
        self.assertEqual(sean["streak"], 2)
        self.assertTrue(sean["current"])
        self.assertEqual([row["tournament_id"] for row in sean["events"]], [3, 4])

    def test_multiple_wins_in_same_saturday_friday_week_count_once(self):
        payloads = [
            event(1, "2026-01-03T12:00:00+00:00", {"Sean": 1}, ["Sean", "A"]),
            event(2, "2026-01-04T12:00:00+00:00", {"Sean": 1}, ["Sean", "B"]),
            event(3, "2026-01-10T12:00:00+00:00", {"Sean": 1}, ["Sean", "C"]),
        ]
        rankings = module.build_rankings(payloads)
        sean = rankings["rankings"]["consecutive_titles"][0]
        self.assertEqual(sean["streak"], 2)
        self.assertEqual([row["tournament_id"] for row in sean["events"]], [2, 3])

    def test_non_qualifying_week_breaks_money_run(self):
        payloads = [
            event(1, "2026-01-01T12:00:00+00:00", {"Sean": 2}, ["Sean", "A"]),
            event(2, "2026-01-08T12:00:00+00:00", {"A": 1}, ["Sean", "A"]),
            event(3, "2026-01-15T12:00:00+00:00", {"Sean": 3}, ["Sean", "C"]),
            event(4, "2026-01-22T12:00:00+00:00", {"Sean": 1}, ["Sean", "D"]),
        ]
        rankings = module.build_rankings(payloads)
        sean = next(
            row
            for row in rankings["rankings"]["consecutive_in_the_money"]
            if row["player"] == "Sean"
        )
        self.assertEqual(sean["streak"], 2)
        self.assertEqual([row["place"] for row in sean["events"]], [3, 1])

    def test_equal_length_run_prefers_most_recent(self):
        payloads = [
            event(1, "2026-01-01T12:00:00+00:00", {"Sean": 1}, ["Sean", "A"]),
            event(2, "2026-01-08T12:00:00+00:00", {"Sean": 1}, ["Sean", "B"]),
            event(3, "2026-01-15T12:00:00+00:00", {"A": 1}, ["Sean", "A"]),
            event(4, "2026-01-22T12:00:00+00:00", {"Sean": 1}, ["Sean", "C"]),
            event(5, "2026-01-29T12:00:00+00:00", {"Sean": 1}, ["Sean", "D"]),
        ]
        rankings = module.build_rankings(payloads)
        sean = next(
            row
            for row in rankings["rankings"]["consecutive_titles"]
            if row["player"] == "Sean"
        )
        self.assertEqual([row["tournament_id"] for row in sean["events"]], [4, 5])
        self.assertTrue(sean["current"])

    def test_consecutive_weeks_across_year_boundary(self):
        payloads = [
            event(1, "2025-12-27T12:00:00+00:00", {"Sean": 1}, ["Sean", "A"]),
            event(2, "2026-01-03T12:00:00+00:00", {"Sean": 1}, ["Sean", "B"]),
        ]
        rankings = module.build_rankings(payloads)
        sean = rankings["rankings"]["consecutive_titles"][0]
        self.assertEqual(sean["streak"], 2)

    def test_manual_title_override_repairs_missing_bracket_results(self):
        payloads = [
            event(1, "2026-01-03T12:00:00+00:00", {"Sean": 1}, ["Sean", "A"]),
            event(2, "2026-01-10T12:00:00+00:00", {}, ["A", "B"]),
        ]
        rankings = module.build_rankings(payloads, title_overrides={2: "Sean"})
        sean = rankings["rankings"]["consecutive_titles"][0]
        self.assertEqual(sean["streak"], 2)
        self.assertEqual([row["tournament_id"] for row in sean["events"]], [1, 2])

    def test_one_best_record_per_player_and_limit(self):
        payloads = []
        for i in range(12):
            name = f"Player {i:02d}"
            payloads.append(
                event(
                    i + 1,
                    f"2026-02-{i + 1:02d}T12:00:00+00:00",
                    {name: 1},
                    [name, "Opponent"],
                )
            )
        rankings = module.build_rankings(payloads, limit=10)
        title_rows = rankings["rankings"]["consecutive_titles"]
        self.assertEqual(len(title_rows), 10)
        self.assertEqual([row["rank"] for row in title_rows], list(range(1, 11)))


if __name__ == "__main__":
    unittest.main()
