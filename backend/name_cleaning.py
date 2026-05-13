"""Player-name cleanup for Challonge participant data."""

import re

NOTE_RE = re.compile(
    r"\s*[\[(]\s*(?:invitation pending|pending|director|td|note|paid|unpaid|dq|drop|dropped|sub|late|added|removed|"
    r"\d{6,})\s*[\])]\s*",
    re.IGNORECASE,
)
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
    value = LONG_ID_RE.sub("", value)
    value = SPACE_RE.sub(" ", value).strip(" -_/")

    if not value or BYE_RE.match(value):
        return ""
    return value


def player_name_key(name: str | None) -> str:
    return SPACE_RE.sub(" ", clean_player_name(name).casefold()).strip()
