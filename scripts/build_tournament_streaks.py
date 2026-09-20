"""Build consecutive-week title and in-the-money streak rankings from static tournament exports."""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Callable, Iterable, Mapping

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TOURNAMENT_DIR = PROJECT_ROOT / "frontend" / "public" / "data" / "tournaments"
DEFAULT_OUTPUT = PROJECT_ROOT / "frontend" / "public" / "data" / "streak-leaders.json"
DEFAULT_OVERRIDE_FILE = PROJECT_ROOT / "scripts" / "tournament_streak_overrides.json"
TOURNAMENT_WEEK_ANCHOR = date(1970, 1, 3)  # Saturday


def _parse_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


def _iso_sort_value(value: Any) -> float:
    parsed = _parse_datetime(value)
    return parsed.timestamp() if parsed else 0.0


def _week_index(value: Any) -> int | None:
    """Bucket timestamps into Saturday-Friday Fremont tournament weeks."""
    parsed = _parse_datetime(value)
    if not parsed:
        return None
    return (parsed.date().toordinal() - TOURNAMENT_WEEK_ANCHOR.toordinal()) // 7


def _is_singles_entry(name: Any, entry_type: Any = None) -> bool:
    if entry_type:
        return entry_type == "singles_player"
    text = str(name or "").strip()
    if not text:
        return False
    lowered = text.casefold()
    return "/" not in text and " & " not in lowered and " + " not in text


def _money_map(analytics: dict[str, Any]) -> dict[str, dict[str, Any]]:
    payouts: dict[str, dict[str, Any]] = {}
    for payout in analytics.get("prize_payouts") or []:
        place = payout.get("place")
        players = payout.get("players") or []
        per_player = payout.get("per_player")
        if per_player is None and len(players) == 1:
            per_player = payout.get("amount")
        for player in players:
            if player:
                payouts[str(player)] = {"place": place, "amount": per_player}

    if not payouts:
        for placement in analytics.get("placements") or []:
            player = placement.get("player")
            if player:
                payouts[str(player)] = {
                    "place": placement.get("place"),
                    "amount": placement.get("amount"),
                }
    return payouts


def _participants(matches: Iterable[dict[str, Any]]) -> set[str]:
    names: set[str] = set()
    for match in matches:
        for side in ("winner", "loser"):
            name = match.get(f"{side}_name")
            entry_type = match.get(f"{side}_entry_type")
            if _is_singles_entry(name, entry_type):
                names.add(str(name))
    return names


def tournament_appearances(
    payloads: Iterable[dict[str, Any]],
    title_overrides: Mapping[int, str] | None = None,
) -> dict[str, list[dict[str, Any]]]:
    appearances: dict[str, list[dict[str, Any]]] = defaultdict(list)
    overrides = dict(title_overrides or {})
    ordered_payloads = sorted(
        payloads,
        key=lambda payload: (
            _iso_sort_value((payload.get("tournament") or {}).get("started_at")),
            int((payload.get("tournament") or {}).get("id") or 0),
        ),
    )

    for payload in ordered_payloads:
        tournament = payload.get("tournament") or {}
        if tournament.get("state") not in (None, "complete"):
            continue
        tournament_id = tournament.get("id")
        if tournament_id is None:
            continue
        tournament_id = int(tournament_id)

        analytics = payload.get("analytics") or {}
        money = _money_map(analytics)
        override_winner = overrides.get(tournament_id)
        if override_winner:
            money = {
                player: info
                for player, info in money.items()
                if int(info.get("place") or 0) != 1
            }
            money[override_winner] = {"place": 1, "amount": None}

        participants = _participants(payload.get("matches") or [])
        participants.update(player for player in money if _is_singles_entry(player))

        event_base = {
            "tournament_id": tournament_id,
            "tournament_name": tournament.get("name") or f"Tournament {tournament_id}",
            "date": tournament.get("started_at") or tournament.get("completed_at"),
            "game": tournament.get("game"),
            "url": tournament.get("url"),
        }
        for player in participants:
            payout = money.get(player) or {}
            appearances[player].append(
                {
                    **event_base,
                    "place": payout.get("place"),
                    "amount": payout.get("amount"),
                }
            )

    return dict(appearances)


def _qualifying_week_events(
    events: list[dict[str, Any]],
    qualifies: Callable[[dict[str, Any]], bool],
) -> list[tuple[int, dict[str, Any]]]:
    """Return one representative qualifying event per Saturday-Friday tournament week."""
    by_week: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for event in events:
        week = _week_index(event.get("date"))
        if week is not None:
            by_week[week].append(event)

    qualifying: list[tuple[int, dict[str, Any]]] = []
    for week in sorted(by_week):
        matches = [event for event in by_week[week] if qualifies(event)]
        if not matches:
            continue
        representative = max(
            matches,
            key=lambda event: (
                _iso_sort_value(event.get("date")),
                int(event.get("tournament_id") or 0),
            ),
        )
        qualifying.append((week, representative))
    return qualifying


def _best_week_run(
    events: list[dict[str, Any]],
    qualifies: Callable[[dict[str, Any]], bool],
) -> list[tuple[int, dict[str, Any]]]:
    best: list[tuple[int, dict[str, Any]]] = []
    current: list[tuple[int, dict[str, Any]]] = []

    def consider(run: list[tuple[int, dict[str, Any]]]) -> None:
        nonlocal best
        if not run:
            return
        run_event = run[-1][1]
        best_event = best[-1][1] if best else {}
        run_key = (len(run), _iso_sort_value(run_event.get("date")), int(run_event.get("tournament_id") or 0))
        best_key = (
            len(best),
            _iso_sort_value(best_event.get("date")) if best else 0.0,
            int(best_event.get("tournament_id") or 0) if best else 0,
        )
        if run_key > best_key:
            best = list(run)

    for week, event in _qualifying_week_events(events, qualifies):
        if current and week != current[-1][0] + 1:
            consider(current)
            current = []
        current.append((week, event))
    consider(current)
    return best


def _ranking(
    appearances: dict[str, list[dict[str, Any]]],
    qualifies: Callable[[dict[str, Any]], bool],
    limit: int,
    latest_week: int | None,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for player, events in appearances.items():
        if not events:
            continue
        run = _best_week_run(events, qualifies)
        if not run:
            continue
        run_events = [event for _, event in run]
        rows.append(
            {
                "player": player,
                "streak": len(run),
                "current": latest_week is not None and run[-1][0] == latest_week,
                "start_date": run_events[0].get("date"),
                "end_date": run_events[-1].get("date"),
                "events": run_events,
            }
        )

    rows.sort(
        key=lambda row: (
            -int(row["streak"]),
            -_iso_sort_value(row.get("end_date")),
            str(row["player"]).casefold(),
        )
    )
    for rank, row in enumerate(rows[:limit], start=1):
        row["rank"] = rank
    return rows[:limit]


def build_rankings(
    payloads: Iterable[dict[str, Any]],
    limit: int = 10,
    title_overrides: Mapping[int, str] | None = None,
) -> dict[str, Any]:
    payload_list = list(payloads)
    appearances = tournament_appearances(payload_list, title_overrides=title_overrides)
    latest_week = max(
        (
            week
            for events in appearances.values()
            for event in events
            if (week := _week_index(event.get("date"))) is not None
        ),
        default=None,
    )
    return {
        "schema_version": 3,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "definitions": {
            "consecutive_titles": (
                "Consecutive Saturday-Friday tournament weeks with at least one 1st-place finish. "
                "A missing tournament week breaks the streak; multiple wins in one week count once."
            ),
            "consecutive_in_the_money": (
                "Consecutive Saturday-Friday tournament weeks with at least one recorded payout or paid placement. "
                "A missing tournament week breaks the streak; multiple paid finishes in one week count once."
            ),
        },
        "source": {
            "tournament_files": len(payload_list),
            "players_with_appearances": len(appearances),
            "manual_title_overrides": len(title_overrides or {}),
        },
        "rankings": {
            "consecutive_titles": _ranking(
                appearances,
                lambda event: int(event.get("place") or 0) == 1,
                limit,
                latest_week,
            ),
            "consecutive_in_the_money": _ranking(
                appearances,
                lambda event: event.get("place") is not None,
                limit,
                latest_week,
            ),
        },
    }


def load_tournament_payloads(tournament_dir: Path) -> list[dict[str, Any]]:
    payloads: list[dict[str, Any]] = []
    for path in sorted(tournament_dir.glob("*.json")):
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"Unable to read tournament export {path}: {exc}") from exc
        if isinstance(payload, dict) and payload.get("tournament"):
            payloads.append(payload)
    return payloads


def load_title_overrides(path: Path) -> dict[int, str]:
    if not path.exists():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Unable to read title override file {path}: {exc}") from exc
    if not isinstance(raw, dict):
        raise RuntimeError(f"Title override file must contain a JSON object: {path}")
    overrides: dict[int, str] = {}
    for tournament_id, winner in raw.items():
        text = str(winner or "").strip()
        if text:
            overrides[int(tournament_id)] = text
    return overrides


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tournament-dir", type=Path, default=DEFAULT_TOURNAMENT_DIR)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--override-file", type=Path, default=DEFAULT_OVERRIDE_FILE)
    parser.add_argument("--limit", type=int, default=10)
    args = parser.parse_args()

    payloads = load_tournament_payloads(args.tournament_dir)
    if not payloads:
        raise SystemExit(f"No tournament detail exports found in {args.tournament_dir}")
    title_overrides = load_title_overrides(args.override_file)

    result = build_rankings(
        payloads,
        limit=max(1, args.limit),
        title_overrides=title_overrides,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"Wrote {args.output} with "
        f"{len(result['rankings']['consecutive_titles'])} title streaks and "
        f"{len(result['rankings']['consecutive_in_the_money'])} money streaks."
    )


if __name__ == "__main__":
    main()
