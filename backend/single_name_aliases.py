"""Report unambiguous single-name aliases for manual review."""

import argparse
import json
import os
import sqlite3
from pathlib import Path
from typing import Any, Dict, Iterable, List

from name_cleaning import clean_player_name, load_alias_map, player_name_key
from player_entry_classification import classify_player_entry

ROOT_DIR = Path(__file__).parent
DEFAULT_DB = ROOT_DIR / "cuestats_dev.db"
DEFAULT_OUT = ROOT_DIR / "single_name_aliases.json"


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


def suggest_single_name_aliases(
    names: Iterable[str],
    alias_map: Dict[str, str] | None = None,
) -> List[Dict[str, Any]]:
    alias_map = alias_map or {}
    singles = []
    for raw_name in names:
        cleaned = clean_player_name(raw_name)
        if not cleaned:
            continue
        entry = classify_player_entry(cleaned)
        if entry["entry_type"] != "singles_player":
            continue
        singles.append(cleaned)

    full_names: Dict[str, set[str]] = {}
    for name in singles:
        parts = name.split()
        if len(parts) < 2:
            continue
        first = parts[0].casefold()
        full_names.setdefault(first, set()).add(name)

    suggestions = []
    for name in sorted(set(singles), key=str.casefold):
        parts = name.split()
        if len(parts) != 1:
            continue
        alias_key = player_name_key(name)
        if alias_key in alias_map:
            continue
        matches = sorted(full_names.get(parts[0].casefold(), set()), key=str.casefold)
        if len(matches) != 1:
            continue
        canonical = matches[0]
        suggestions.append({
            "alias": name,
            "canonical": canonical,
            "reason": "single-token name matches exactly one full-name player by first name",
        })
    return suggestions


def _alias_patch(suggestions: Iterable[Dict[str, Any]]) -> Dict[str, list[str]]:
    patch: Dict[str, list[str]] = {}
    for row in suggestions:
        patch.setdefault(row["canonical"], []).append(row["alias"])
    return patch


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate unambiguous single-name alias suggestions")
    parser.add_argument("--db", default=str(_sqlite_path_from_env()), help="SQLite DB path")
    parser.add_argument("--out", default=str(DEFAULT_OUT), help="JSON report path")
    args = parser.parse_args()

    names = load_player_names(Path(args.db))
    alias_map = load_alias_map()
    suggestions = suggest_single_name_aliases(names, alias_map=alias_map)
    report = {
        "generated_from": str(Path(args.db)),
        "player_count": len(names),
        "suggestion_count": len(suggestions),
        "suggestions": suggestions,
        "aliases_json_patch": _alias_patch(suggestions),
    }

    out = Path(args.out)
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote single-name alias suggestions: {out} ({len(suggestions)} candidates)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
