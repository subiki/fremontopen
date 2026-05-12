"""Seed fake tournament/player/match data for Replit dev environment.
Run once: python seed_dev.py
Safe to re-run — clears and repopulates each time.
"""
import asyncio
import os
import uuid
import random
from datetime import datetime, timezone, timedelta
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import select, func

from database import make_engine, init_db
import database as T

load_dotenv(Path(__file__).parent / ".env", override=True)

PLAYERS = [
    "Tony Robles", "Shane Van Boening", "Earl Strickland", "Efren Reyes",
    "Johnny Archer", "Alex Pagulayan", "Rodney Morris", "Mike Dechaine",
    "Dennis Orcollo", "Ko Pin Yi", "Chang Jung Lin", "Darren Appleton",
    "Justin Bergman", "Billy Thorpe", "Carlo Biado", "Chris Melling",
    "Jayson Shaw", "Joshua Filler", "Albin Ouschan", "Shane McMinn",
    "Ray Sutton", "Danny Basavich", "Ralf Souquet", "Nick Varner",
    "Mike Sigel", "Bobby Hunter", "Allen Hopkins", "Jose Parica",
]

GAME_TYPES = ["9-Ball", "8-Ball", "9-Ball", "9-Ball", "8-Ball"]

TOURNAMENT_NAMES = [
    "Fremont Open Winter Classic 2024",
    "Fremont Open Spring Invitational 2024",
    "Fremont Open Summer Championship 2024",
    "Fremont Open Fall Masters 2024",
    "Fremont Open New Year Kickoff 2025",
    "Fremont Open Valentine's Classic 2025",
]


def ts(days_ago: int, hour: int = 20) -> str:
    dt = datetime.now(timezone.utc) - timedelta(days=days_ago)
    return dt.replace(hour=hour, minute=0, second=0, microsecond=0).isoformat()


async def seed():
    engine = make_engine()
    await init_db(engine)

    async with engine.begin() as conn:
        # Clear existing data
        print("Clearing existing data...")
        await conn.execute(T.sync_meta.delete())
        await conn.execute(T.chat_messages.delete())
        await conn.execute(T.audit_log.delete())
        await conn.execute(T.user_follows.delete())
        await conn.execute(T.users.delete())
        await conn.execute(T.login_attempts.delete())
        await conn.execute(T.players.delete())
        await conn.execute(T.matches.delete())
        await conn.execute(T.tournaments.delete())

        player_stats: dict = {name: {"wins": 0, "losses": 0} for name in PLAYERS}
        match_id = 1
        all_matches = []
        tournament_rows = []

        for i, tname in enumerate(TOURNAMENT_NAMES):
            days_ago_start = (len(TOURNAMENT_NAMES) - i) * 42 + random.randint(0, 7)
            days_ago_end = days_ago_start - 2
            state = "complete" if days_ago_end > 0 else "underway"
            game = GAME_TYPES[i % len(GAME_TYPES)]
            t_id = 10000 + i

            participants = random.sample(PLAYERS, random.randint(12, min(20, len(PLAYERS))))
            tournament_rows.append({
                "id": t_id,
                "name": tname,
                "state": state,
                "game": game,
                "participants_count": len(participants),
                "started_at": ts(days_ago_start),
                "completed_at": ts(days_ago_end) if state == "complete" else None,
                "url": None,
                "challonge_updated_at": None,
            })

            pool = list(participants)
            round_num = 1
            while len(pool) > 1:
                next_pool = []
                for j in range(0, len(pool) - 1, 2):
                    p1, p2 = pool[j], pool[j + 1]
                    winner, loser = (p1, p2) if random.random() > 0.45 else (p2, p1)
                    games_w = random.randint(2, 3)
                    games_l = random.randint(0, games_w - 1)
                    score = f"{games_w}-{games_l}"
                    completed = ts(days_ago_end - round_num + random.randint(0, 1))

                    all_matches.append({
                        "id": str(match_id),
                        "tournament_id": t_id,
                        "tournament_name": tname,
                        "round": round_num,
                        "winner_name": winner,
                        "loser_name": loser,
                        "scores": score,
                        "state": "complete",
                        "completed_at": completed,
                        "winner_id": None,
                        "loser_id": None,
                    })
                    player_stats[winner]["wins"] += 1
                    player_stats[loser]["losses"] += 1
                    next_pool.append(winner)
                    match_id += 1
                if len(pool) % 2 == 1:
                    next_pool.append(pool[-1])
                pool = next_pool
                round_num += 1

        print(f"Inserting {len(tournament_rows)} tournaments, {len(all_matches)} matches...")
        for t_row in tournament_rows:
            await conn.execute(T.tournaments.insert().values(**t_row))
        for m in all_matches:
            await conn.execute(T.matches.insert().values(**m))

        # Players with computed stats
        fargo_names = random.sample(PLAYERS, 10)
        player_count = 0
        for name in PLAYERS:
            w = player_stats[name]["wins"]
            l = player_stats[name]["losses"]
            total = w + l
            wr = round(w / total * 100, 1) if total else 0.0
            fargo = random.randint(480, 720) if name in fargo_names else None
            await conn.execute(T.players.insert().values(
                id=str(uuid.uuid4()),
                name=name,
                wins=w,
                losses=l,
                win_rate=wr,
                fargo=fargo,
            ))
            player_count += 1

        now = datetime.now(timezone.utc).isoformat()
        await conn.execute(T.sync_meta.insert().values(
            key="last",
            value={
                "status": "ok",
                "last_synced_at": now,
                "tournaments_synced": len(tournament_rows),
                "matches_synced": len(all_matches),
            },
        ))

    print(f"Seeded {player_count} players, {len(all_matches)} matches, {len(tournament_rows)} tournaments.")
    print("Done! Dev database ready.")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
