import asyncio
import sys
from pathlib import Path

from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import database as T
from database import init_db, make_engine
from sync_job import _tournament_doc, run_backfill_tournaments


def test_tournament_doc_uses_challonge_game_and_url_fields():
    doc = _tournament_doc({
        "id": 123,
        "name": "Fremont 9 Ball",
        "game_name": "9-Ball",
        "tournament_type": "double elimination",
        "state": "complete",
        "started_at": "2026-05-01T18:00:00-07:00",
        "completed_at": "2026-05-01T22:00:00-07:00",
        "participants_count": 16,
        "full_challonge_url": "https://fremontopen.challonge.com/fremont-9",
        "updated_at": "2026-05-02T01:00:00-07:00",
    })

    assert doc == {
        "id": 123,
        "name": "Fremont 9 Ball",
        "game": "9-Ball",
        "state": "complete",
        "started_at": "2026-05-01T18:00:00-07:00",
        "completed_at": "2026-05-01T22:00:00-07:00",
        "participants_count": 16,
        "url": "https://fremontopen.challonge.com/fremont-9",
        "challonge_updated_at": "2026-05-02T01:00:00-07:00",
    }


def test_backfill_fetches_direct_tournament_id_and_rebuilds_players(tmp_path, monkeypatch):
    db_path = tmp_path / "backfill.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{db_path.as_posix()}")

    class FakeChallongeClient:
        def get_tournament(self, tournament_id):
            assert tournament_id == "old-event"
            return {
                "id": 456,
                "name": "Old Event",
                "game_name": "8-Ball",
                "state": "complete",
                "started_at": "2026-04-01T18:00:00-07:00",
                "completed_at": "2026-04-01T21:00:00-07:00",
                "participants_count": 2,
                "full_challonge_url": "https://fremontopen.challonge.com/old-event",
                "updated_at": "2026-04-02T01:00:00-07:00",
            }

        def list_participants(self, tournament_id):
            assert tournament_id == 456
            return [
                {"id": 1, "display_name": "Winner"},
                {"id": 2, "display_name": "Runner Up"},
            ]

        def list_matches(self, tournament_id):
            assert tournament_id == 456
            return [{
                "id": 9001,
                "winner_id": 1,
                "loser_id": 2,
                "round": 1,
                "state": "complete",
                "scores_csv": "5-3",
                "completed_at": "2026-04-01T20:00:00-07:00",
            }]

    monkeypatch.setattr("sync_job.ChallongeClient", FakeChallongeClient)

    result = asyncio.run(run_backfill_tournaments(["old-event"]))

    assert result["status"] == "ok"
    assert result["tournaments_refreshed"] == 1
    assert result["players"] == 2
    assert result["challonge_api_calls"] == 3

    async def read_rows():
        engine = make_engine()
        await init_db(engine)
        async with engine.begin() as conn:
            tournaments = (await conn.execute(select(T.tournaments))).fetchall()
            matches = (await conn.execute(select(T.matches))).fetchall()
            players = (await conn.execute(select(T.players))).fetchall()
            seen = (await conn.execute(
                select(T.sync_meta).where(T.sync_meta.c.key == "tournaments_seen")
            )).fetchone()
        await engine.dispose()
        return tournaments, matches, players, seen

    tournaments, matches, players, seen = asyncio.run(read_rows())
    assert tournaments[0].name == "Old Event"
    assert matches[0].winner_name == "Winner"
    assert {player.name for player in players} == {"Winner", "Runner Up"}
    assert seen.value["456"] == "2026-04-02T01:00:00-07:00"
