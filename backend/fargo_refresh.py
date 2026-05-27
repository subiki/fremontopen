"""Refresh local Fargo overrides from an authorized export or saved page.

This script intentionally does not bypass logins, captchas, rate limits, or
anti-bot controls. Use it with an allowed CSV/JSON export, saved HTML table, or
an authorized URL that permits crawling.
"""
import argparse
import csv
import html
import ipaddress
import json
import re
import socket
import sys
import time
import urllib.parse
import urllib.request
import urllib.robotparser
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Dict, Iterable, List

from name_cleaning import clean_player_name, player_name_key
from player_overrides import DEFAULT_OVERRIDES, normalize_player_override

ROOT_DIR = Path(__file__).parent
PROJECT_ROOT = ROOT_DIR.parent
DEFAULT_CACHE = PROJECT_ROOT / "frontend" / "public" / "data" / "cache.json"
DEFAULT_REPORT = ROOT_DIR / "fargo_refresh_report.json"
USER_AGENT = "CueStats-FargoRefresh/1.0 (+https://github.com/subiki/fremontopen)"

NAME_COLUMNS = ("player", "name", "player_name", "full_name")
RATING_COLUMNS = ("fargo", "rating", "fargo_rating")
ROBUSTNESS_COLUMNS = ("robustness", "games", "game_count")
ID_COLUMNS = ("fargo_id", "player_id", "id")


class TableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.rows: List[List[str]] = []
        self._in_cell = False
        self._current_row: List[str] = []
        self._current_cell: List[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag == "tr":
            self._current_row = []
        if tag in {"td", "th"}:
            self._in_cell = True
            self._current_cell = []

    def handle_data(self, data: str) -> None:
        if self._in_cell:
            self._current_cell.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag in {"td", "th"} and self._in_cell:
            text = " ".join("".join(self._current_cell).split())
            self._current_row.append(html.unescape(text))
            self._in_cell = False
        if tag == "tr" and self._current_row:
            self.rows.append(self._current_row)
            self._current_row = []


def _canonical_header(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.strip().casefold()).strip("_")


def _first_present(row: Dict[str, Any], keys: Iterable[str]) -> Any:
    for key in keys:
        if row.get(key) not in (None, ""):
            return row[key]
    return None


def _rating(value: Any) -> int | None:
    try:
        rating = int(float(str(value).strip()))
    except (TypeError, ValueError):
        return None
    return rating if 0 < rating < 1000 else None


def _load_player_names(path: Path) -> List[str]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return [p["name"] for p in data.get("players", []) if p.get("name")]


def _validate_public_source_url(url: str) -> urllib.parse.ParseResult:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("Source URL must use http or https")

    hostname = parsed.hostname
    if not hostname:
        raise ValueError("Source URL must include a hostname")

    blocked_names = {"localhost", "localhost.localdomain"}
    if hostname.casefold() in blocked_names:
        raise ValueError("Source URL must not target a local host")

    try:
        addresses = {ipaddress.ip_address(hostname)}
    except ValueError:
        try:
            addresses = {
                ipaddress.ip_address(info[4][0])
                for info in socket.getaddrinfo(hostname, parsed.port or 443, proto=socket.IPPROTO_TCP)
            }
        except socket.gaierror as exc:
            raise RuntimeError(f"Could not resolve source host {hostname}") from exc

    for address in addresses:
        if (
            address.is_private
            or address.is_loopback
            or address.is_link_local
            or address.is_multicast
            or address.is_reserved
            or address.is_unspecified
        ):
            raise ValueError(f"Source URL host {hostname} resolved to a non-public address")

    return parsed


def _read_source(path: Path | None, url: str | None, delay: float) -> tuple[str, str]:
    if path:
        return path.read_text(encoding="utf-8"), path.suffix.lower().lstrip(".")

    if not url:
        raise ValueError("Provide --source-file or --source-url")

    parsed = _validate_public_source_url(url)
    robots_url = urllib.parse.urlunparse((parsed.scheme, parsed.netloc, "/robots.txt", "", "", ""))
    parser = urllib.robotparser.RobotFileParser()
    parser.set_url(robots_url)
    parser.read()
    if not parser.can_fetch(USER_AGENT, url):
        raise RuntimeError(f"robots.txt does not allow fetching {url}")

    time.sleep(max(0, delay))
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/json,text/csv"})
    with urllib.request.urlopen(request, timeout=30) as response:
        content_type = response.headers.get("Content-Type", "")
        body = response.read().decode(response.headers.get_content_charset() or "utf-8")

    if "json" in content_type:
        kind = "json"
    elif "csv" in content_type:
        kind = "csv"
    else:
        kind = "html"
    return body, kind


def _parse_csv(text: str) -> List[Dict[str, Any]]:
    reader = csv.DictReader(text.splitlines())
    rows = []
    for raw in reader:
        normalized = {_canonical_header(k or ""): v for k, v in raw.items()}
        rows.append(normalized)
    return rows


def _parse_json(text: str) -> List[Dict[str, Any]]:
    data = json.loads(text)
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get("players"), list):
        return data["players"]
    if isinstance(data, dict):
        return [{"name": name, **value} for name, value in data.items() if isinstance(value, dict)]
    return []


def _parse_html(text: str) -> List[Dict[str, Any]]:
    parser = TableParser()
    parser.feed(text)
    rows: List[Dict[str, Any]] = []
    for table_index in range(max(0, len(parser.rows) - 1)):
        header = [_canonical_header(cell) for cell in parser.rows[table_index]]
        if not set(header).intersection(NAME_COLUMNS) or not set(header).intersection(RATING_COLUMNS):
            continue
        for values in parser.rows[table_index + 1:]:
            if len(values) != len(header):
                break
            rows.append(dict(zip(header, values)))
        if rows:
            return rows
    return rows


def _parse_rows(text: str, kind: str) -> List[Dict[str, Any]]:
    if kind == "json":
        return _parse_json(text)
    if kind == "csv":
        return _parse_csv(text)
    return _parse_html(text)


def _source_row_to_override(row: Dict[str, Any], now: str, source_label: str) -> Dict[str, Any] | None:
    normalized = {_canonical_header(str(k)): v for k, v in row.items()}
    name = clean_player_name(str(_first_present(normalized, NAME_COLUMNS) or ""))
    rating = _rating(_first_present(normalized, RATING_COLUMNS))
    if not name or rating is None:
        return None

    data: Dict[str, Any] = {
        "fargo": rating,
        "source": source_label,
        "updated_at": now,
    }
    robustness = _first_present(normalized, ROBUSTNESS_COLUMNS)
    if robustness not in (None, ""):
        data["robustness"] = robustness
    fargo_id = _first_present(normalized, ID_COLUMNS)
    if fargo_id not in (None, ""):
        data["fargo_id"] = fargo_id
    return normalize_player_override(name, data)


def _load_overrides(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {"players": {}}
    data = json.loads(path.read_text(encoding="utf-8"))
    if "players" not in data or not isinstance(data["players"], dict):
        data = {"players": data if isinstance(data, dict) else {}}
    return data


def _write_json(path: Path, data: Dict[str, Any]) -> None:
    path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def refresh_fargo_overrides(
    source_text: str,
    source_kind: str,
    player_names: List[str],
    overrides_path: Path = DEFAULT_OVERRIDES,
    source_label: str = "authorized-export",
    dry_run: bool = False,
) -> Dict[str, Any]:
    rows = _parse_rows(source_text, source_kind)
    now = datetime.now(timezone.utc).isoformat()
    current = _load_overrides(overrides_path)
    players = current.setdefault("players", {})
    by_key = {player_name_key(name): name for name in player_names}
    seen_source_keys = set()
    matched = []
    unmatched = []

    for raw in rows:
        override = _source_row_to_override(raw, now, source_label)
        if not override:
            continue
        source_key = player_name_key(override["name"])
        seen_source_keys.add(source_key)
        canonical_name = by_key.get(source_key)
        if not canonical_name:
            unmatched.append(override)
            continue
        existing = players.get(canonical_name, {})
        players[canonical_name] = {**existing, **{k: v for k, v in override.items() if k != "name"}}
        matched.append({"player": canonical_name, "fargo": override.get("fargo"), "fargo_id": override.get("fargo_id")})

    duplicate_fargo_ids: Dict[str, List[str]] = {}
    for name, data in players.items():
        fargo_id = str(data.get("fargo_id") or "").strip()
        if fargo_id:
            duplicate_fargo_ids.setdefault(fargo_id, []).append(name)
    duplicate_fargo_ids = {key: names for key, names in duplicate_fargo_ids.items() if len(names) > 1}

    report = {
        "source_kind": source_kind,
        "source_label": source_label,
        "rows_parsed": len(rows),
        "matched_count": len(matched),
        "unmatched_count": len(unmatched),
        "matched": matched,
        "unmatched": unmatched,
        "missing_from_source": [name for name in player_names if player_name_key(name) not in seen_source_keys],
        "duplicate_fargo_ids": duplicate_fargo_ids,
        "dry_run": dry_run,
    }

    if not dry_run:
        _write_json(overrides_path, current)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Refresh local Fargo player overrides")
    parser.add_argument("--source-file", type=Path, help="Authorized CSV/JSON export or saved HTML table")
    parser.add_argument("--source-url", help="Authorized URL to fetch if robots.txt allows it")
    parser.add_argument("--kind", choices=["csv", "json", "html"], help="Override source type")
    parser.add_argument("--players-file", type=Path, default=DEFAULT_CACHE)
    parser.add_argument("--overrides", type=Path, default=DEFAULT_OVERRIDES)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--source-label", default="authorized-export")
    parser.add_argument("--delay", type=float, default=2.0)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    try:
        source_text, detected_kind = _read_source(args.source_file, args.source_url, args.delay)
        kind = args.kind or detected_kind
        player_names = _load_player_names(args.players_file)
        report = refresh_fargo_overrides(
            source_text,
            kind,
            player_names,
            overrides_path=args.overrides,
            source_label=args.source_label,
            dry_run=args.dry_run,
        )
        _write_json(args.report, report)
        print(
            f"Fargo refresh: {report['matched_count']} matched, "
            f"{report['unmatched_count']} unmatched, report={args.report}"
        )
        return 0
    except Exception as exc:
        print(f"Fargo refresh failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
