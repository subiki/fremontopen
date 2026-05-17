"""Classify cleaned Challonge participant entries for stats export."""

import re
from typing import Any, Dict, Optional

from name_cleaning import clean_player_name, player_name_key

DOUBLES_SEPARATOR_RE = re.compile(r"\s*(?:/|&|\band\b)\s*", re.IGNORECASE)
DOUBLES_SHORTHAND_REVIEW = {
    "evan chad",
    "owen jorge",
    "chris aubrey",
}


def split_doubles_components(name: str) -> list[str]:
    parts = [
        clean_player_name(part)
        for part in DOUBLES_SEPARATOR_RE.split(name)
        if clean_player_name(part)
    ]
    return parts if len(parts) > 1 else []


def classify_player_entry(name: str | None) -> Dict[str, Any]:
    raw_name = name or ""
    clean_name = clean_player_name(raw_name)
    normalized_key = player_name_key(clean_name)
    if not clean_name:
        return {
            "raw_name": raw_name,
            "display_name": "",
            "normalized_key": "",
            "entry_type": "placeholder",
            "components": [],
            "review_required": False,
        }

    components = split_doubles_components(clean_name)
    if components:
        return {
            "raw_name": raw_name,
            "display_name": clean_name,
            "normalized_key": normalized_key,
            "entry_type": "doubles_team",
            "components": components,
            "review_required": False,
        }

    if normalized_key in DOUBLES_SHORTHAND_REVIEW:
        return {
            "raw_name": raw_name,
            "display_name": clean_name,
            "normalized_key": normalized_key,
            "entry_type": "unknown",
            "components": [],
            "review_required": True,
        }

    return {
        "raw_name": raw_name,
        "display_name": clean_name,
        "normalized_key": normalized_key,
        "entry_type": "singles_player",
        "components": [],
        "review_required": False,
    }


def resolve_player_entry(
    name: str | None,
    alias_map: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    entry = classify_player_entry(name)
    if entry["entry_type"] != "singles_player":
        entry["canonical_name"] = entry["display_name"] or None
        return entry

    alias_map = alias_map or {}
    canonical = alias_map.get(entry["normalized_key"], entry["display_name"])
    entry["canonical_name"] = canonical
    return entry
