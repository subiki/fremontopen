import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sync_job import _canonical_name_map


def row(winner_name, loser_name):
    return SimpleNamespace(winner_name=winner_name, loser_name=loser_name)


def test_first_name_alias_stays_separate_without_explicit_mapping():
    aliases = _canonical_name_map([
        row("John", "Alex Stone"),
        row("John Smith", "Taylor Reed"),
    ])

    assert aliases["John"] == "John"


def test_first_name_alias_stays_separate_when_multiple_full_name_matches():
    aliases = _canonical_name_map([
        row("John", "Alex Stone"),
        row("John Smith", "Taylor Reed"),
        row("John Jones", "Morgan Lee"),
    ])

    assert aliases["John"] == "John"


def test_alias_override_maps_manual_alias_to_canonical(monkeypatch):
    monkeypatch.setattr(
        "sync_job.load_alias_map",
        lambda: {"jimmy s.": "James Smith"},
    )

    aliases = _canonical_name_map([
        row("Jimmy S.", "Alex Stone"),
        row("James Smith", "Taylor Reed"),
    ])

    assert aliases["Jimmy S."] == "James Smith"


def test_doubles_team_entries_are_not_merged_into_singles(monkeypatch):
    monkeypatch.setattr(
        "sync_job.load_alias_map",
        lambda: {"jason l": "Jason Lambert"},
    )

    aliases = _canonical_name_map([
        row("Jason L", "Alex Stone"),
        row("Jason L / Curtis", "Taylor Reed"),
    ])

    assert aliases["Jason L"] == "Jason Lambert"
    assert aliases["Jason L / Curtis"] == "Jason L / Curtis"
