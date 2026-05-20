import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from single_name_aliases import suggest_single_name_aliases


def test_suggest_single_name_aliases_returns_unique_first_name_match():
    suggestions = suggest_single_name_aliases([
        "Jim",
        "Jim Catlin",
        "Alex Stone",
    ])

    assert suggestions == [{
        "alias": "Jim",
        "canonical": "Jim Catlin",
        "reason": "single-token name matches exactly one full-name player by first name",
    }]


def test_suggest_single_name_aliases_skips_ambiguous_first_names():
    suggestions = suggest_single_name_aliases([
        "John",
        "John Smith",
        "John Jones",
    ])

    assert suggestions == []


def test_suggest_single_name_aliases_skips_existing_aliases():
    suggestions = suggest_single_name_aliases(
        ["Jim", "Jim Catlin"],
        alias_map={"jim": "Jim Catlin"},
    )

    assert suggestions == []
