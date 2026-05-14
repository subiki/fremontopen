"""Local player metadata overrides for static exports."""
import json
from pathlib import Path
from typing import Any, Dict

from name_cleaning import clean_player_name, player_name_key

DEFAULT_OVERRIDES = Path(__file__).with_name("player_overrides.json")


def _clean_rating(value: Any) -> int | None:
    if value in (None, ""):
        return None
    try:
        rating = int(float(str(value).strip()))
    except (TypeError, ValueError):
        return None
    if 0 < rating < 1000:
        return rating
    return None


def _clean_text(value: Any) -> str | None:
    if value in (None, ""):
        return None
    text = str(value).strip()
    return text or None


def normalize_player_override(name: str, data: Dict[str, Any]) -> Dict[str, Any] | None:
    clean_name = clean_player_name(name)
    if not clean_name:
        return None

    rating = _clean_rating(data.get("fargo", data.get("rating")))
    row: Dict[str, Any] = {"name": clean_name}
    if rating is not None:
        row["fargo"] = rating

    for source_key, target_key in (
        ("fargo_id", "fargo_id"),
        ("player_id", "fargo_id"),
        ("robustness", "fargo_robustness"),
        ("fargo_robustness", "fargo_robustness"),
        ("games", "fargo_robustness"),
        ("source", "fargo_source"),
        ("fargo_source", "fargo_source"),
        ("source_url", "fargo_source_url"),
        ("fargo_source_url", "fargo_source_url"),
        ("updated_at", "fargo_updated_at"),
        ("fargo_updated_at", "fargo_updated_at"),
        ("last_checked", "fargo_updated_at"),
        ("confidence", "fargo_confidence"),
        ("fargo_confidence", "fargo_confidence"),
        ("notes", "notes"),
        ("nickname", "nickname"),
        ("cue", "cue"),
        ("playing_cue", "cue"),
        ("break_cue", "break_cue"),
        ("shaft", "shaft"),
        ("tip", "tip"),
        ("equipment_notes", "equipment_notes"),
        ("equipment_note", "equipment_notes"),
    ):
        value = _clean_text(data.get(source_key))
        if value is not None:
            row[target_key] = value

    return row


def load_player_overrides(path: str | Path | None = None) -> Dict[str, Dict[str, Any]]:
    override_path = Path(path) if path else DEFAULT_OVERRIDES
    if not override_path.exists():
        return {}

    raw = json.loads(override_path.read_text(encoding="utf-8"))
    players = raw.get("players", raw)
    if not isinstance(players, dict):
        raise ValueError("player overrides must be an object or contain a players object")

    out: Dict[str, Dict[str, Any]] = {}
    for name, data in players.items():
        if not isinstance(data, dict):
            continue
        row = normalize_player_override(name, data)
        if row:
            out[player_name_key(row["name"])] = row
    return out


def apply_player_overrides(player: Dict[str, Any], overrides: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    row = overrides.get(player_name_key(player.get("name") or ""))
    if not row:
        return player

    for key, value in row.items():
        if key != "name":
            player[key] = value
    return player
