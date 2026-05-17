"""Player-name cleanup for Challonge participant data."""

import json
import re
from pathlib import Path
from typing import Dict, Iterable

NOTE_RE = re.compile(
    r"\s*[\[(]\s*(?:invitation pending|pending|director|td|note|paid|unpaid|dq|drop|dropped|sub|late|added|removed|"
    r"forfeit|ff|\d{6,})\s*[\])]\s*",
    re.IGNORECASE,
)
STATUS_SUFFIX_RE = re.compile(r"\s*[-_/]\s*(?:forfeit|ff|dq|drop|dropped)\s*$", re.IGNORECASE)
LONG_ID_RE = re.compile(r"\s+\d{6,}\s*$")
SPACE_RE = re.compile(r"\s+")
BYE_RE = re.compile(r"^(?:\d+[a-z]?\s+)?bye(?:\s+\d+)?$", re.IGNORECASE)


def clean_player_name(name: str | None) -> str:
    """Return the public canonical-ish form of a Challonge participant name.

    This removes tournament-director markers and non-player placeholders while
    preserving meaningful nicknames such as "Andrew (Drew) MacDonald".
    """
    value = (name or "").strip()
    if not value:
        return ""

    value = value.replace("\u200b", "").replace("\ufeff", "")
    value = value.replace("*", "")
    value = NOTE_RE.sub(" ", value)
    value = STATUS_SUFFIX_RE.sub("", value)
    value = LONG_ID_RE.sub("", value)
    value = SPACE_RE.sub(" ", value).strip(" -_/")

    if not value or BYE_RE.match(value):
        return ""
    return value


def player_name_key(name: str | None) -> str:
    return SPACE_RE.sub(" ", clean_player_name(name).casefold()).strip()


def _iter_alias_pairs(config: object) -> Iterable[tuple[str, str]]:
    if not isinstance(config, dict):
        return

    aliases = config.get("aliases", config)
    if not isinstance(aliases, dict):
        return

    for canonical, values in aliases.items():
        canonical_name = clean_player_name(str(canonical))
        if not canonical_name:
            continue
        if isinstance(values, str):
            values = [values]
        if not isinstance(values, list):
            continue
        for alias in values:
            alias_name = clean_player_name(str(alias))
            if alias_name and player_name_key(alias_name) != player_name_key(canonical_name):
                yield alias_name, canonical_name


def load_alias_map(path: str | Path | None = None) -> Dict[str, str]:
    """Load local player alias overrides as alias-key -> canonical-name.

    Expected JSON shape:
    {
      "aliases": {
        "Canonical Name": ["Alias One", "Alias Two"]
      }
    }
    """
    alias_path = Path(path) if path else Path(__file__).with_name("player_aliases.json")
    if not alias_path.exists():
        return {}

    config = json.loads(alias_path.read_text(encoding="utf-8"))
    out: Dict[str, str] = {}
    conflicts = []
    for alias_name, canonical_name in _iter_alias_pairs(config):
        key = player_name_key(alias_name)
        existing = out.get(key)
        if existing and player_name_key(existing) != player_name_key(canonical_name):
            conflicts.append((alias_name, existing, canonical_name))
            continue
        out[key] = canonical_name

    if conflicts:
        labels = ", ".join(
            f"{alias} -> {old} / {new}" for alias, old, new in conflicts[:5]
        )
        raise ValueError(f"Conflicting player aliases: {labels}")
    return out
