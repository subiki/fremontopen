"""Generate local player alias suggestions from cached player names."""

import argparse
import json
import os
import re
import sqlite3
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Dict, Iterable, List

from name_cleaning import clean_player_name, player_name_key

ROOT_DIR = Path(__file__).parent
DEFAULT_DB = ROOT_DIR / "cuestats_dev.db"
DEFAULT_OUT = ROOT_DIR / "alias_suggestions.json"


def _simple_name(name: str) -> str:
    value = player_name_key(name)
    value = re.sub(r"[^a-z0-9\s]", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def _tokens(name: str) -> list[str]:
    return [token for token in _simple_name(name).split() if token]


def _initial_signature(name: str) -> str:
    return "".join(token[:1] for token in _tokens(name))


def similarity(a: str, b: str) -> float:
    a_simple = _simple_name(a)
    b_simple = _simple_name(b)
    if not a_simple or not b_simple:
        return 0.0

    seq = SequenceMatcher(None, a_simple, b_simple).ratio()
    a_tokens = set(a_simple.split())
    b_tokens = set(b_simple.split())
    token_overlap = len(a_tokens & b_tokens) / max(1, len(a_tokens | b_tokens))

    score = max(seq, token_overlap)
    if _initial_signature(a) and _initial_signature(a) == _initial_signature(b):
        score = max(score, 0.82)
    if a_tokens and b_tokens and (a_tokens <= b_tokens or b_tokens <= a_tokens):
        score = max(score, 0.9)
    return round(score, 3)


def _canonical_guess(names: Iterable[str]) -> str:
    return sorted(
        names,
        key=lambda name: (len(_tokens(name)), len(name), name.casefold()),
        reverse=True,
    )[0]


def suggest_alias_groups(names: Iterable[str], threshold: float = 0.86) -> List[Dict[str, Any]]:
    clean_names = sorted({clean_player_name(name) for name in names if clean_player_name(name)})
    parent = {name: name for name in clean_names}

    def find(name: str) -> str:
        while parent[name] != name:
            parent[name] = parent[parent[name]]
            name = parent[name]
        return name

    def union(a: str, b: str) -> None:
        root_a = find(a)
        root_b = find(b)
        if root_a != root_b:
            parent[root_b] = root_a

    pair_scores: Dict[tuple[str, str], float] = {}
    for index, left in enumerate(clean_names):
        for right in clean_names[index + 1:]:
            score = similarity(left, right)
            if score >= threshold:
                union(left, right)
                pair_scores[(left, right)] = score

    groups: Dict[str, list[str]] = {}
    for name in clean_names:
        groups.setdefault(find(name), []).append(name)

    suggestions = []
    for grouped_names in groups.values():
        if len(grouped_names) < 2:
            continue
        best_score = max(
            pair_scores.get((a, b), pair_scores.get((b, a), similarity(a, b)))
            for i, a in enumerate(grouped_names)
            for b in grouped_names[i + 1:]
        )
        suggestions.append({
            "canonical_guess": _canonical_guess(grouped_names),
            "names": sorted(grouped_names, key=str.casefold),
            "score": best_score,
            "reason": "similar normalized names, shared tokens, or matching initials",
        })

    suggestions.sort(key=lambda row: (-row["score"], row["canonical_guess"].casefold()))
    return suggestions


def _sqlite_path_from_env() -> Path:
    url = os.environ.get("DATABASE_URL", "")
    if url.startswith("sqlite+aiosqlite:///"):
        value = url.removeprefix("sqlite+aiosqlite:///")
        path = Path(value)
        return path if path.is_absolute() else ROOT_DIR / path
    return DEFAULT_DB


def load_player_names(db_path: Path) -> list[str]:
    with sqlite3.connect(db_path) as conn:
        rows = conn.execute("select name from players order by lower(name)").fetchall()
    return [row[0] for row in rows if row and row[0]]


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate likely player alias suggestions")
    parser.add_argument("--db", default=str(_sqlite_path_from_env()), help="SQLite DB path")
    parser.add_argument("--out", default=str(DEFAULT_OUT), help="JSON report path")
    parser.add_argument("--threshold", type=float, default=0.86, help="Similarity threshold from 0 to 1")
    args = parser.parse_args()

    names = load_player_names(Path(args.db))
    suggestions = suggest_alias_groups(names, threshold=args.threshold)
    report = {
        "generated_from": str(Path(args.db)),
        "player_count": len(names),
        "threshold": args.threshold,
        "suggestion_count": len(suggestions),
        "suggestions": suggestions,
    }

    out = Path(args.out)
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote alias suggestions: {out} ({len(suggestions)} groups)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
