"""Seed fake tournament/player/match data for Replit dev environment.
Run once: python seed_dev.py
Safe to re-run — clears and repopulates each time.
"""
import asyncio
import os
import random
from datetime import datetime, timezone, timedelta
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / ".env")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "cuestats")

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
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    print("Clearing existing data...")
    await asyncio.gather(
        db.tournaments.delete_many({}),
        db.matches.delete_many({}),
        db.players.delete_many({}),
        db.sync_meta.delete_many({}),
        db.chat_messages.delete_many({}),
    )

    # Build player win/loss accumulators
    player_stats: dict = {name: {"wins": 0, "losses": 0} for name in PLAYERS}

    # Tournaments
    tournaments = []
    match_id = 1
    all_matches = []

    for i, tname in enumerate(TOURNAMENT_NAMES):
        days_ago_start = (len(TOURNAMENT_NAMES) - i) * 42 + random.randint(0, 7)
        days_ago_end = days_ago_start - 2
        state = "complete" if days_ago_end > 0 else "underway"
        game = GAME_TYPES[i % len(GAME_TYPES)]
        t_id = 10000 + i

        participants = random.sample(PLAYERS, random.randint(12, min(20, len(PLAYERS))))
        tournaments.append({
            "id": t_id,
            "name": tname,
            "state": state,
            "game": game,
            "participants_count": len(participants),
            "started_at": ts(days_ago_start),
            "completed_at": ts(days_ago_end) if state == "complete" else None,
        })

        # Generate single-elimination bracket matches
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
                    "id": match_id,
                    "tournament_id": t_id,
                    "tournament_name": tname,
                    "round": round_num,
                    "winner_name": winner,
                    "loser_name": loser,
                    "scores": score,
                    "state": "complete",
                    "completed_at": completed,
                })
                player_stats[winner]["wins"] += 1
                player_stats[loser]["losses"] += 1
                next_pool.append(winner)
                match_id += 1
            if len(pool) % 2 == 1:
                next_pool.append(pool[-1])
            pool = next_pool
            round_num += 1

    print(f"Inserting {len(tournaments)} tournaments, {len(all_matches)} matches...")
    await db.tournaments.insert_many(tournaments)
    await db.matches.insert_many(all_matches)

    # Players with computed stats
    fargo_names = random.sample(PLAYERS, 10)
    players_docs = []
    for name in PLAYERS:
        w = player_stats[name]["wins"]
        l = player_stats[name]["losses"]
        total = w + l
        wr = round(w / total * 100, 1) if total else 0.0
        doc = {
            "name": name,
            "wins": w,
            "losses": l,
            "win_rate": wr,
        }
        if name in fargo_names:
            doc["fargo"] = random.randint(480, 720)
        players_docs.append(doc)

    await db.players.insert_many(players_docs)

    # Sync meta so the topbar shows "data updated X min ago"
    await db.sync_meta.insert_one({
        "_id": "last",
        "status": "ok",
        "last_synced_at": datetime.now(timezone.utc).isoformat(),
        "tournaments_synced": len(tournaments),
        "matches_synced": len(all_matches),
    })

    print(f"Seeded {len(players_docs)} players.")
    print("Done! Dev database ready.")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
