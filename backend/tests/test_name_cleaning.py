import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import json

import pytest

from name_cleaning import clean_player_name, player_name_key, load_alias_map


def test_clean_player_name_removes_markers_and_notes():
    assert clean_player_name("Camilla Keenan-Koch* (invitation pending)") == "Camilla Keenan-Koch"
    assert clean_player_name("Chris Moore* (9900004712156)") == "Chris Moore"
    assert clean_player_name("Catt Edgley* 9900007103098") == "Catt Edgley"
    assert clean_player_name("AJ Johnson / AZ Flynn**") == "AJ Johnson / AZ Flynn"


def test_clean_player_name_preserves_meaningful_parenthetical_nicknames():
    assert clean_player_name("Andrew (Drew) MacDonald*") == "Andrew (Drew) MacDonald"


def test_clean_player_name_removes_bye_placeholders():
    assert clean_player_name("4B BYE 1") == ""
    assert clean_player_name("BYE") == ""


def test_player_name_key_casefolds_and_normalizes_space():
    assert player_name_key("  CAMILLA   KEENAN-KOCH* ") == "camilla keenan-koch"


def test_load_alias_map_uses_canonical_to_aliases_shape(tmp_path):
    path = tmp_path / "player_aliases.json"
    path.write_text(
        json.dumps({
            "aliases": {
                "James Smith": ["Jim", "Jimmy S.* (invitation pending)"]
            }
        }),
        encoding="utf-8",
    )

    aliases = load_alias_map(path)

    assert aliases["jim"] == "James Smith"
    assert aliases["jimmy s."] == "James Smith"


def test_load_alias_map_rejects_conflicting_aliases(tmp_path):
    path = tmp_path / "player_aliases.json"
    path.write_text(
        json.dumps({
            "aliases": {
                "James Smith": ["Jim"],
                "Jim Stone": ["Jim"],
            }
        }),
        encoding="utf-8",
    )

    with pytest.raises(ValueError):
        load_alias_map(path)
