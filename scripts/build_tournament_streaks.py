"""Build consecutive title and in-the-money streak rankings from static tournament exports."""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Iterable

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TOURNAMENT_DIR = PROJECT_ROOT / "frontend" / "public" / "data" / "tournaments"
DEFAULT_OUTPUT = PROJECT_ROOT / "frontend" / "public" / "data" / "streak-leaders.json"


def _iso_sort_value(value: Any) -> float:
    if not value:
        return 0.0
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp()
    except (TypeError, ValueError):
        return 0.0


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

    # Older exports may only contain placements. Keep those events eligible while
    # leaving the payout amount unknown.
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


def tournament_appearances(payloads: Iterable[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    appearances: dict[str, list[dict[str, Any]]] = defaultdict(list)
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

        analytics = payload.get("analytics") or {}
        money = _money_map(analytics)
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


def _best_run(
    events: list[dict[str, Any]],
    qualifies: Callable[[dict[str, Any]], bool],
) -> list[dict[str, Any]]:
    best: list[dict[str, Any]] = []
    current: list[dict[str, Any]] = []

    def consider(run: list[dict[str, Any]]) -> None:
        nonlocal best
        if not run:
            return
        run_key = (len(run), _iso_sort_value(run[-1].get("date")), int(run[-1].get("tournament_id") or 0))
        best_key = (
            len(best),
            _iso_sort_value(best[-1].get("date")) if best else 0.0,
            int(best[-1].get("tournament_id") or 0) if best else 0,
        )
        if run_key > best_key:
            best = list(run)

    for event in events:
        if qualifies(event):
            current.append(event)
        else:
            consider(current)
            current = []
    consider(current)
    return best


def _ranking(
    appearances: dict[str, list[dict[str, Any]]],
    qualifies: Callable[[dict[str, Any]], bool],
    limit: int,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for player, events in appearances.items():
        if not events:
            continue
        run = _best_run(events, qualifies)
        if not run:
            continue
        current = run[-1] is events[-1] and qualifies(events[-1])
        rows.append(
            {
                "player": player,
                "streak": len(run),
                "current": current,
                "start_date": run[0].get("date"),
                "end_date": run[-1].get("date"),
                "events": run,
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


def build_rankings(payloads: Iterable[dict[str, Any]], limit: int = 10) -> dict[str, Any]:
    payload_list = list(payloads)
    appearances = tournament_appearances(payload_list)
    return {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "definitions": {
            "consecutive_titles": (
                "Consecutive tournament appearances ending in 1st place. "
                "Skipped tournaments neither extend nor break a player's run."
            ),
            "consecutive_in_the_money": (
                "Consecutive tournament appearances with a recorded payout or paid placement. "
                "An appearance outside the money breaks the run."
            ),
        },
        "source": {
            "tournament_files": len(payload_list),
            "players_with_appearances": len(appearances),
        },
        "rankings": {
            "consecutive_titles": _ranking(
                appearances,
                lambda event: int(event.get("place") or 0) == 1,
                limit,
            ),
            "consecutive_in_the_money": _ranking(
                appearances,
                lambda event: event.get("place") is not None,
                limit,
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


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tournament-dir", type=Path, default=DEFAULT_TOURNAMENT_DIR)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--limit", type=int, default=10)
    args = parser.parse_args()

    payloads = load_tournament_payloads(args.tournament_dir)
    if not payloads:
        raise SystemExit(f"No tournament detail exports found in {args.tournament_dir}")

    result = build_rankings(payloads, limit=max(1, args.limit))
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
