import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import json
import socket

from fargo_refresh import _validate_public_source_url, refresh_fargo_overrides
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


def test_player_overrides_apply_equipment_metadata(tmp_path):
    overrides = tmp_path / "player_overrides.json"
    overrides.write_text(json.dumps({
        "players": {
            "Eddie Robinson": {
                "playing_cue": "Meucci Pro",
                "break_cue": "BK Rush",
                "shaft": "Carbon",
                "tip": "Kamui",
                "equipment_note": "Prefers soft tip setup",
            }
        }
    }), encoding="utf-8")

    data = load_player_overrides(overrides)
    player = {"name": "Eddie Robinson", "wins": 1, "losses": 0}
    apply_player_overrides(player, data)

    assert player["cue"] == "Meucci Pro"
    assert player["break_cue"] == "BK Rush"
    assert player["shaft"] == "Carbon"
    assert player["tip"] == "Kamui"
    assert player["equipment_notes"] == "Prefers soft tip setup"


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


def test_validate_public_source_url_rejects_localhost():
    try:
        _validate_public_source_url("http://localhost/export.csv")
    except ValueError as exc:
        assert "local host" in str(exc)
    else:
        raise AssertionError("Expected localhost URL to be rejected")


def test_validate_public_source_url_rejects_private_ip():
    try:
        _validate_public_source_url("https://192.168.1.15/export.csv")
    except ValueError as exc:
        assert "non-public address" in str(exc)
    else:
        raise AssertionError("Expected private IP URL to be rejected")


def test_validate_public_source_url_allows_public_host(monkeypatch):
    def fake_getaddrinfo(host, port, proto):
        assert host == "ratings.example.com"
        return [(socket.AF_INET, socket.SOCK_STREAM, proto, "", ("93.184.216.34", port))]

    monkeypatch.setattr(socket, "getaddrinfo", fake_getaddrinfo)

    parsed = _validate_public_source_url("https://ratings.example.com/export.csv")

    assert parsed.hostname == "ratings.example.com"
