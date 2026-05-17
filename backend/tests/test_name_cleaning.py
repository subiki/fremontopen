import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import json

import pytest

from name_cleaning import clean_player_name, player_name_key, load_alias_map
from player_entry_classification import classify_player_entry, resolve_player_entry


def test_clean_player_name_removes_markers_and_notes():
    assert clean_player_name("Camilla Keenan-Koch* (invitation pending)") == "Camilla Keenan-Koch"
    assert clean_player_name("Chris Moore* (9900004712156)") == "Chris Moore"
    assert clean_player_name("Catt Edgley* 9900007103098") == "Catt Edgley"
    assert clean_player_name("AJ Johnson / AZ Flynn**") == "AJ Johnson / AZ Flynn"
    assert clean_player_name("Jason Lambert - forfeit") == "Jason Lambert"
    assert clean_player_name("Jen Barr (forfeit)") == "Jen Barr"


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


def test_classify_player_entry_splits_singles_doubles_placeholders_and_unknowns():
    assert classify_player_entry("Jason Lambert")["entry_type"] == "singles_player"

    doubles = classify_player_entry("Jason Lambert / Camilla Keenan-Koch")
    assert doubles["entry_type"] == "doubles_team"
    assert doubles["components"] == ["Jason Lambert", "Camilla Keenan-Koch"]

    assert classify_player_entry("BYE")["entry_type"] == "placeholder"

    shorthand = classify_player_entry("evan chad")
    assert shorthand["entry_type"] == "unknown"
    assert shorthand["review_required"] is True


def test_resolve_player_entry_applies_aliases_only_to_singles():
    aliases = {
        "jason l": "Jason Lambert",
        "jlb0306": "Jen Barr",
    }

    assert resolve_player_entry("Jason L", aliases)["canonical_name"] == "Jason Lambert"
    assert resolve_player_entry("jlb0306", aliases)["canonical_name"] == "Jen Barr"

    doubles = resolve_player_entry("Jason L / Curtis", aliases)
    assert doubles["entry_type"] == "doubles_team"
    assert doubles["canonical_name"] == "Jason L / Curtis"
