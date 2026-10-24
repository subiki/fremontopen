"""Offline unit tests: no Challonge writes."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import publish_challonge_oct31 as publisher


def event(name=publisher.NAME, tid="99", start="2026-10-31T13:00:00-07:00",
          slug=publisher.SLUG):
    return {"id": tid, "attributes": {
        "name": name, "url": slug, "starts_at": start,
        "tournament_type": "double elimination", "game_name": "8-ball",
        "private": False, "state": "pending",
        "station_options": {
            "auto_assign": True, "only_start_matches_with_assigned_stations": True,
        },
    }}


class FakeClient:
    def __init__(self, current=None, stations=()):
        self.current = current
        self.stations = list(stations)
        self.created = 0

    def list_tournaments(self):
        return [self.current] if self.current else []

    def create_tournament(self):
        self.created += 1
        self.current = event()
        return self.current

    def list_stations(self, tid):
        return [{"attributes": {"name": n}} for n in self.stations]

    def create_station(self, tid, name):
        self.stations.append(name)

    def enable_station_options(self, tid):
        pass

    def get_tournament(self, tid):
        return self.current


class PublisherTests(unittest.TestCase):
    def test_new_event_has_four_tables(self):
        client = FakeClient()
        publisher.publish(client)
        self.assertEqual(client.created, 1)
        self.assertEqual(client.stations, list(publisher.TABLES))

    def test_existing_event_is_repaired_not_duplicated(self):
        client = FakeClient(event(), ("Table 1", "Table 3"))
        publisher.publish(client)
        self.assertEqual(client.created, 0)
        self.assertCountEqual(client.stations, publisher.TABLES)

    def test_different_event_same_day_blocks_creation(self):
        with self.assertRaises(publisher.ChallongeError):
            publisher.pick_existing([event(name="4Bs 9 ball 10/31/26", slug="wrong")])

    def test_extra_station_blocks_success(self):
        with self.assertRaises(publisher.ChallongeError):
            publisher.publish(FakeClient(event(), (*publisher.TABLES, "Table 5")))


if __name__ == "__main__":
    unittest.main()
