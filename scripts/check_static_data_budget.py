"""Fail when exported static JSON grows past agreed demo-scale thresholds."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


DEFAULT_REPORT = Path(__file__).resolve().parents[1] / "frontend" / "public" / "data" / "data-size-report.json"
DEFAULT_CACHE_LIMIT = 1_100_000
DEFAULT_PLAYER_LIMIT = 700_000
DEFAULT_BOOT_LIMIT = 20_000


def _load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description="Check Fremont Open static JSON size budgets.")
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT, help="Path to data-size-report.json")
    parser.add_argument("--cache-limit", type=int, default=DEFAULT_CACHE_LIMIT, help="Maximum allowed cache.json bytes")
    parser.add_argument("--player-limit", type=int, default=DEFAULT_PLAYER_LIMIT, help="Maximum allowed single player shard bytes")
    parser.add_argument("--boot-limit", type=int, default=DEFAULT_BOOT_LIMIT, help="Maximum allowed size for any boot-time stats section bytes")
    args = parser.parse_args()

    report = _load_json(args.report)
    cache = report.get("cache") or {}
    largest_files = report.get("largest_files") or []
    stats_sections = (cache.get("stats_sections") or {})

    failures: list[str] = []

    cache_bytes = int(cache.get("bytes") or 0)
    if cache_bytes > args.cache_limit:
        failures.append(
            f"cache.json is {cache_bytes} bytes, above limit {args.cache_limit}"
        )

    heaviest_player = next(
        (
            row for row in largest_files
            if str(row.get("path") or "").startswith("data/players/")
        ),
        None,
    )
    if heaviest_player and int(heaviest_player.get("bytes") or 0) > args.player_limit:
        failures.append(
            f"largest player shard {heaviest_player['path']} is {heaviest_player['bytes']} bytes, above limit {args.player_limit}"
        )

    boot_section_limits = {
        "h2h_heatmap": 0,
        "players": 0,
        "season_standings": max(args.boot_limit, 5_000),
        "recent_matches": args.boot_limit,
        "rivalry_index": args.boot_limit,
        "upset_tracker": args.boot_limit,
    }
    for section, limit in boot_section_limits.items():
        size = int(stats_sections.get(section) or 0)
        if size > limit:
            failures.append(
                f"stats.{section} is {size} bytes, above limit {limit}"
            )

    print(f"cache.json: {cache_bytes} bytes")
    if heaviest_player:
        print(f"largest player shard: {heaviest_player['path']} ({heaviest_player['bytes']} bytes)")
    for section in sorted(stats_sections):
        print(f"stats.{section}: {stats_sections[section]} bytes")

    if failures:
        for failure in failures:
            print(f"ERROR: {failure}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
