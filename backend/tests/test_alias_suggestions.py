import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from alias_suggestions import similarity, suggest_alias_groups


def test_similarity_detects_shared_token_variants():
    assert similarity("Jimmy Smith", "Jim Smith") >= 0.86


def test_suggest_alias_groups_clusters_likely_duplicates():
    suggestions = suggest_alias_groups([
        "Jimmy Smith",
        "Jim Smith",
        "Alex Stone",
    ])

    assert suggestions[0]["canonical_guess"] == "Jimmy Smith"
    assert suggestions[0]["names"] == ["Jim Smith", "Jimmy Smith"]


def test_suggest_alias_groups_ignores_unrelated_names():
    assert suggest_alias_groups(["Alex Stone", "Taylor Reed"]) == []
