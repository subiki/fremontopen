"""Generate a local data-quality report for cached tournament data."""

import argparse
import json
import os
import re
import sqlite3
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, Iterable, List

ROOT_DIR = Path(__file__).parent
DEFAULT_DB = ROOT_DIR / "cuestats_dev.db"
DEFAULT_OUT = ROOT_DIR / "validation_report.json"


def _blank(value: Any) -> bool:
    return value is None or str(value).strip() == ""


def _name_key(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").casefold()).strip()


def _score_numbers(score: str) -> list[int]:
    return [int(value) for value in re.findall(r"(?<!\d)-?\d+", score)]


def _issue(code: str, severity: str, message: str, row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "code": code,
        "severity": severity,
        "message": message,
        "row": {key: value for key, value in row.items() if value is not None},
    }


def _match_label(match: Dict[str, Any]) -> str:
    return f"match {match.get('id')} in tournament {match.get('tournament_id')}"


def validate_players(players: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    issues = []
    for player in players:
        if _blank(player.get("name")):
            issues.append(_issue(
                "blank_player_name",
                "error",
                f"Player row {player.get('id')} has a blank name.",
                player,
            ))
    return issues


def validate_tournaments(tournaments: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    issues = []
    for tournament in tournaments:
        if _blank(tournament.get("name")):
            issues.append(_issue(
                "blank_tournament_name",
                "error",
                f"Tournament row {tournament.get('id')} has a blank name.",
                tournament,
            ))
        if (
            not _blank(tournament.get("participants_count"))
            and int(tournament.get("participants_count") or 0) < 0
        ):
            issues.append(_issue(
                "impossible_participant_count",
                "error",
                f"Tournament {tournament.get('id')} has a negative participant count.",
                tournament,
            ))
    return issues


def validate_matches(
    matches: Iterable[Dict[str, Any]],
    tournament_ids: Iterable[Any] | None = None,
) -> List[Dict[str, Any]]:
    issues = []
    duplicate_groups: dict[tuple[Any, ...], list[str]] = defaultdict(list)
    known_tournament_ids = set(tournament_ids or [])

    for match in matches:
        state = str(match.get("state") or "").casefold()
        is_complete = state == "complete"
        winner_blank = _blank(match.get("winner_name"))
        loser_blank = _blank(match.get("loser_name"))
        row = {
            "id": match.get("id"),
            "tournament_id": match.get("tournament_id"),
            "tournament_name": match.get("tournament_name"),
            "round": match.get("round"),
            "state": match.get("state"),
            "scores": match.get("scores"),
            "winner_name": match.get("winner_name"),
            "loser_name": match.get("loser_name"),
            "completed_at": match.get("completed_at"),
        }

        if known_tournament_ids and match.get("tournament_id") not in known_tournament_ids:
            issues.append(_issue(
                "missing_tournament",
                "error",
                f"{_match_label(match)} references a tournament that is not cached.",
                row,
            ))

        for side, is_blank in (("winner", winner_blank), ("loser", loser_blank)):
            if not is_blank:
                continue
            code = "missing_winner" if side == "winner" and is_complete else "blank_match_name"
            severity = "error" if is_complete else "warning"
            issues.append(_issue(
                code,
                severity,
                f"{_match_label(match)} has a blank {side} name.",
                row,
            ))

        if not winner_blank and not loser_blank and _name_key(match["winner_name"]) == _name_key(match["loser_name"]):
            issues.append(_issue(
                "same_player_match",
                "error",
                f"{_match_label(match)} lists the same player as winner and loser.",
                row,
            ))

        score = str(match.get("scores") or "").strip()
        if is_complete and not score:
            issues.append(_issue(
                "missing_score",
                "warning",
                f"{_match_label(match)} is complete but has no score.",
                row,
            ))
        elif score:
            numbers = _score_numbers(score)
            if not numbers:
                issues.append(_issue(
                    "invalid_score",
                    "warning",
                    f"{_match_label(match)} has a score with no numeric values.",
                    row,
                ))
            elif any(number < 0 for number in numbers):
                issues.append(_issue(
                    "impossible_score",
                    "error",
                    f"{_match_label(match)} has a negative score value.",
                    row,
                ))
            elif len(numbers) >= 2 and all(number == 0 for number in numbers):
                issues.append(_issue(
                    "impossible_score",
                    "error",
                    f"{_match_label(match)} has an all-zero score.",
                    row,
                ))
            elif any(number > 99 for number in numbers):
                issues.append(_issue(
                    "suspicious_score",
                    "warning",
                    f"{_match_label(match)} has a score value over 99.",
                    row,
                ))

        duplicate_key = (
            match.get("tournament_id"),
            match.get("round"),
            _name_key(match.get("winner_name")),
            _name_key(match.get("loser_name")),
            re.sub(r"\s+", "", score.casefold()),
            match.get("completed_at") or "",
        )
        if duplicate_key[2] and duplicate_key[3]:
            duplicate_groups[duplicate_key].append(str(match.get("id")))

    for ids in duplicate_groups.values():
        if len(ids) < 2:
            continue
        issues.append(_issue(
            "duplicate_match",
            "warning",
            f"Matches {', '.join(ids)} appear to be exact duplicates.",
            {"match_ids": ids},
        ))

    return sorted(issues, key=lambda item: (item["severity"] != "error", item["code"], str(item["row"].get("id", ""))))


def build_report(
    players: Iterable[Dict[str, Any]],
    tournaments: Iterable[Dict[str, Any]],
    matches: Iterable[Dict[str, Any]],
) -> Dict[str, Any]:
    player_rows = list(players)
    tournament_rows = list(tournaments)
    match_rows = list(matches)
    issues = []
    issues.extend(validate_players(player_rows))
    issues.extend(validate_tournaments(tournament_rows))
    issues.extend(validate_matches(match_rows, {row.get("id") for row in tournament_rows}))

    counts_by_code: dict[str, int] = defaultdict(int)
    counts_by_severity: dict[str, int] = defaultdict(int)
    for issue in issues:
        counts_by_code[issue["code"]] += 1
        counts_by_severity[issue["severity"]] += 1

    return {
        "summary": {
            "player_count": len(player_rows),
            "tournament_count": len(tournament_rows),
            "match_count": len(match_rows),
            "issue_count": len(issues),
            "counts_by_severity": dict(sorted(counts_by_severity.items())),
            "counts_by_code": dict(sorted(counts_by_code.items())),
        },
        "issues": issues,
    }


def _sqlite_path_from_env() -> Path:
    url = os.environ.get("DATABASE_URL", "")
    if url.startswith("sqlite+aiosqlite:///"):
        value = url.removeprefix("sqlite+aiosqlite:///")
        path = Path(value)
        return path if path.is_absolute() else ROOT_DIR / path
    return DEFAULT_DB


def _rows(conn: sqlite3.Connection, table: str) -> list[Dict[str, Any]]:
    conn.row_factory = sqlite3.Row
    return [dict(row) for row in conn.execute(f"select * from {table}").fetchall()]


def load_cached_rows(db_path: Path) -> tuple[list[Dict[str, Any]], list[Dict[str, Any]], list[Dict[str, Any]]]:
    with sqlite3.connect(db_path) as conn:
        return _rows(conn, "players"), _rows(conn, "tournaments"), _rows(conn, "matches")


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate a local data validation report")
    parser.add_argument("--db", default=str(_sqlite_path_from_env()), help="SQLite DB path")
    parser.add_argument("--out", default=str(DEFAULT_OUT), help="JSON report path")
    args = parser.parse_args()

    db_path = Path(args.db)
    report = build_report(*load_cached_rows(db_path))
    report["generated_from"] = str(db_path)

    out = Path(args.out)
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote validation report: {out} ({report['summary']['issue_count']} issues)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
