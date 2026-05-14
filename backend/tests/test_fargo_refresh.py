import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import json

from fargo_refresh import refresh_fargo_overrides
from player_overrides import apply_player_overrides, load_player_overrides


def test_refresh_fargo_overrides_from_csv_matches_existing_players(tmp_path):
    overrides = tmp_path / "player_overrides.json"
    csv_text = "Player,Fargo,Robustness,Player ID\nEddie Robinson,612,240,fr-1\nUnknown Player,499,100,fr-2\n"

    report = refresh_fargo_overrides(
        csv_text,
        "csv",
        ["Eddie Robinson", "Chad Galera"],
        overrides_path=overrides,
        source_label="test-export",
    )

    assert report["matched_count"] == 1
    assert report["unmatched_count"] == 1
    data = json.loads(overrides.read_text(encoding="utf-8"))
    assert data["players"]["Eddie Robinson"]["fargo"] == 612
    assert data["players"]["Eddie Robinson"]["fargo_id"] == "fr-1"
    assert data["players"]["Eddie Robinson"]["fargo_source"] == "test-export"


def test_refresh_fargo_overrides_from_html_table(tmp_path):
    overrides = tmp_path / "player_overrides.json"
    html = """
    <table>
      <tr><th>Name</th><th>Rating</th><th>Games</th></tr>
      <tr><td>Chad Galera</td><td>650</td><td>301</td></tr>
    </table>
    """

    report = refresh_fargo_overrides(
        html,
        "html",
        ["Chad Galera"],
        overrides_path=overrides,
    )

    assert report["matched"] == [{"player": "Chad Galera", "fargo": 650, "fargo_id": None}]
    data = load_player_overrides(overrides)
    player = {"name": "Chad Galera", "wins": 1, "losses": 0, "fargo": None}
    apply_player_overrides(player, data)
    assert player["fargo"] == 650
    assert player["fargo_robustness"] == "301"


def test_refresh_fargo_dry_run_does_not_write(tmp_path):
    overrides = tmp_path / "player_overrides.json"

    report = refresh_fargo_overrides(
        "name,fargo\nEddie Robinson,612\n",
        "csv",
        ["Eddie Robinson"],
        overrides_path=overrides,
        dry_run=True,
    )

    assert report["matched_count"] == 1
    assert not overrides.exists()
