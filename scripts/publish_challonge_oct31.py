"""One-shot, retry-safe Challonge publisher for Fremont Open 8-ball on 2026-10-31.

Uses the existing CHALLONGE_API_KEY repo secret. Does not start the bracket.
"""
from __future__ import annotations

import os
import sys
from datetime import date, datetime
from urllib.parse import quote
from zoneinfo import ZoneInfo

import requests

BASE = "https://api.challonge.com/v2.1"
COMMUNITY = "fremontopen"
NAME = "4Bs 8 ball 10/31/26"
SLUG = "4bs8ball103126"
WHEN = date(2026, 10, 31)
PACIFIC = ZoneInfo("America/Los_Angeles")
START = datetime(2026, 10, 31, 13, tzinfo=PACIFIC).isoformat()
TABLES = ("Table 1", "Table 2", "Table 3", "Table 4")
DESCRIPTION = (
    "4B's Tavern, 4300 Leary Way NW, Seattle, WA 98107. "
    "Saturday 8-ball, double elimination, BCA rules. "
    "Signups and $10 entry collected in person 12:00-1:00 PM; "
    "first break 1:00 PM Pacific. Ages 21+. All skill levels welcome."
)


class ChallongeError(RuntimeError):
    pass


class Client:
    def __init__(self, key: str):
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": key,
            "Authorization-Type": "v1",
            "Content-Type": "application/vnd.api+json",
            "Accept": "application/json",
            "User-Agent": "FremontOpen-OneTimePublisher/1.0",
        })

    def call(self, method, path, data=None, params=None):
        kwargs = {"timeout": 30}
        if data is not None:
            kwargs["json"] = data
        if params is not None:
            kwargs["params"] = params
        response = self.session.request(method, BASE + path, **kwargs)
        if not response.ok:
            raise ChallongeError(
                f"Challonge {method} {path} failed: HTTP {response.status_code} "
                f"({response.text[:400]})"
            )
        try:
            return response.json()
        except ValueError as exc:
            raise ChallongeError("Challonge returned a non-JSON response") from exc

    def list_tournaments(self):
        events = []
        for page in range(1, 21):
            payload = self.call("GET", "/tournaments.json", params={
                "community_id": COMMUNITY, "page": page, "per_page": 100,
            })
            batch = payload.get("data")
            if not isinstance(batch, list):
                raise ChallongeError("Cannot verify tournament list; refusing a duplicate")
            events.extend(batch)
            if len(batch) < 100:
                return events
        raise ChallongeError("Tournament pagination incomplete; refusing a duplicate")

    def get_tournament(self, tid):
        return self.call(
            "GET", f"/tournaments/{quote(str(tid), safe='')}.json",
            params={"community_id": COMMUNITY},
        )["data"]

    def list_stations(self, tid):
        payload = self.call(
            "GET", f"/tournaments/{quote(str(tid), safe='')}/stations.json",
            params={"community_id": COMMUNITY},
        )
        stations = payload.get("data")
        if not isinstance(stations, list):
            raise ChallongeError("Cannot verify tournament stations")
        return stations

    def create_tournament(self):
        attributes = {
            "name": NAME,
            "url": SLUG,
            "tournament_type": "double elimination",
            "game_name": "8-ball",
            "private": False,
            "starts_at": START,
            "description": DESCRIPTION,
            "registration_options": {"open_signup": False},
            "group_stage_enabled": False,
            "double_elimination_options": {
                "split_participants": False,
                "grand_finals_modifier": "",
            },
            "station_options": {
                "auto_assign": False,
                "only_start_matches_with_assigned_stations": False,
            },
        }
        return self.call(
            "POST", "/tournaments.json",
            data={"data": {"type": "tournament", "attributes": attributes}},
            params={"community_id": COMMUNITY},
        )["data"]

    def create_station(self, tid, name):
        return self.call(
            "POST", f"/tournaments/{quote(str(tid), safe='')}/stations.json",
            data={"data": {"type": "station", "attributes": {"name": name}}},
            params={"community_id": COMMUNITY},
        )

    def enable_station_options(self, tid):
        return self.call(
            "PUT", f"/tournaments/{quote(str(tid), safe='')}.json",
            data={"data": {"type": "tournament", "attributes": {
                "station_options": {
                    "auto_assign": True,
                    "only_start_matches_with_assigned_stations": True,
                },
            }}},
            params={"community_id": COMMUNITY},
        )


def local_date(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(PACIFIC).date()
    except (TypeError, ValueError):
        return None


def pick_existing(events):
    exact = [
        event for event in events
        if event.get("attributes", {}).get("name", "").strip().casefold() == NAME.casefold()
        or event.get("attributes", {}).get("url") == SLUG
    ]
    if len(exact) > 1:
        raise ChallongeError("Multiple matching tournaments; aborting")
    conflict = [
        event for event in events
        if (
            local_date(event.get("attributes", {}).get("starts_at")) == WHEN
            or any(d in event.get("attributes", {}).get("name", "") for d in ("10/31/26", "10/31/2026"))
        )
        and "4b" in event.get("attributes", {}).get("name", "").lower()
    ]
    if conflict and (not exact or any(e["id"] != exact[0]["id"] for e in conflict)):
        raise ChallongeError("Another 4Bs tournament exists for 10/31; aborting")
    return exact[0] if exact else None


def publish(client):
    current = pick_existing(client.list_tournaments())
    if current is None:
        print("Creating 2026-10-31 8-ball tournament.")
        current = client.create_tournament()
    else:
        print("Existing tournament found; only repairing missing setup.")
    tid = current["id"]

    stations = client.list_stations(tid)
    names = [item.get("attributes", {}).get("name", "") for item in stations]
    if len(names) != len(set(names)):
        raise ChallongeError("Duplicate station names; manual review required")
    for name in TABLES:
        if name not in names:
            client.create_station(tid, name)
            print(f"Created {name}.")
    stations = client.list_stations(tid)
    names = [item.get("attributes", {}).get("name", "") for item in stations]
    if sorted(names) != sorted(TABLES):
        raise ChallongeError(f"Unexpected station configuration: {names}")

    client.enable_station_options(tid)
    event = client.get_tournament(tid)
    attrs = event.get("attributes", {})
    flags = attrs.get("station_options", {})
    if not all(flags.get(k) is True for k in (
        "auto_assign", "only_start_matches_with_assigned_stations"
    )):
        raise ChallongeError("Station assignment settings failed verification")
    if attrs.get("name") != NAME or attrs.get("tournament_type") != "double elimination":
        raise ChallongeError("Name or bracket format failed verification")
    if attrs.get("game_name", "").lower() not in ("8-ball", "8 ball"):
        raise ChallongeError("Game failed verification")
    if local_date(attrs.get("starts_at")) != WHEN:
        raise ChallongeError("Date failed verification")
    if attrs.get("private") is not False:
        raise ChallongeError("Tournament is not public")
    if attrs.get("state") not in ("pending", "awaiting_review", None):
        raise ChallongeError(f"Unexpected bracket state: {attrs.get('state')}")
    url = f"https://{COMMUNITY}.challonge.com/{attrs.get('url') or SLUG}"
    print(f"VERIFIED: {NAME}; four stations; two enabled flags; bracket unstarted")
    print(f"LINK: {url}")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as out:
            out.write(
                f"## Challonge bracket verified\n\n- [{NAME}]({url})\n"
                f"- Stations: {', '.join(TABLES)}\n"
                "- Both automatic station options: enabled\n- Bracket: not started\n"
            )
    return url


def main():
    key = os.environ.get("CHALLONGE_API_KEY", "")
    if not key:
        print("CHALLONGE_API_KEY is missing", file=sys.stderr)
        return 2
    try:
        publish(Client(key))
        return 0
    except (ChallongeError, requests.RequestException, KeyError, ValueError) as exc:
        print(f"FAILED: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
