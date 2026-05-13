"""Backfill specific historical Challonge tournaments into the static cache."""
import argparse
import asyncio
import sys
from pathlib import Path

from export_static import DEFAULT_OUT, write_cache
from sync_job import run_backfill_tournaments


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Backfill arbitrary Challonge tournament IDs or slugs."
    )
    parser.add_argument(
        "tournaments",
        nargs="+",
        help="Challonge tournament ids or URL slugs to fetch.",
    )
    parser.add_argument(
        "--no-export",
        action="store_true",
        help="Skip rebuilding frontend/public/data/cache.json after backfill.",
    )
    parser.add_argument(
        "--out",
        default=str(DEFAULT_OUT),
        help="Static cache output path when export is enabled.",
    )
    args = parser.parse_args()

    async def run() -> None:
        result = await run_backfill_tournaments(args.tournaments)
        print(result)
        if not args.no_export:
            await write_cache(Path(args.out))

    try:
        asyncio.run(run())
        return 0
    except Exception as e:
        print(f"Backfill failed: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
