"""Public extras router: search, /p/:name (OG-meta HTML), OG image, compare, player extras, fargo edits."""
import html
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from urllib.parse import quote

from fastapi import APIRouter, HTTPException, Depends, Response, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, update, insert

from players_extras import compute_elo_ratings, compute_streaks, compute_tourney_championships, compute_perf_vs_fargo, wins_over_time
from og_image import render_player_card
from users import require_user
from auth import require_admin
import database as T

log = logging.getLogger("cuestats.extras")


class FargoUpdate(BaseModel):
    fargo: Optional[int] = Field(default=None, ge=200, le=900)


def _public_url(request: Request) -> str:
    import os
    fe = os.environ.get("FRONTEND_URL")
    if fe:
        return fe.rstrip("/")
    return f"{request.url.scheme}://{request.url.netloc}"


def make_extras_router(engine):
    router = APIRouter(prefix="/api")

    # ---------- Search ----------
    @router.get("/search")
    async def search(q: str = "", limit: int = 10):
        q = q.strip()
        if not q:
            return {"players": [], "tournaments": []}
        pat = f"%{q}%"
        async with engine.connect() as conn:
            p_rows = (await conn.execute(
                select(
                    T.players.c.name,
                    T.players.c.wins,
                    T.players.c.losses,
                    T.players.c.fargo,
                ).where(T.players.c.name.ilike(pat)).limit(limit)
            )).fetchall()
            t_rows = (await conn.execute(
                select(
                    T.tournaments.c.id,
                    T.tournaments.c.name,
                    T.tournaments.c.game,
                    T.tournaments.c.state,
                ).where(T.tournaments.c.name.ilike(pat)).limit(limit)
            )).fetchall()
        return {
            "players": [dict(r._mapping) for r in p_rows],
            "tournaments": [dict(r._mapping) for r in t_rows],
        }

    # ---------- Player extras ----------
    @router.get("/players/{name}/extras")
    async def player_extras(name: str):
        async with engine.connect() as conn:
            p_row = (await conn.execute(
                select(T.players).where(T.players.c.name == name)
            )).fetchone()
            if not p_row:
                raise HTTPException(status_code=404, detail="Player not found")

            m_rows = (await conn.execute(
                select(T.matches).where(
                    (T.matches.c.winner_name == name) | (T.matches.c.loser_name == name)
                )
            )).fetchall()
            t_rows = (await conn.execute(select(T.tournaments))).fetchall()

            opp_names = set()
            for r in m_rows:
                if r.winner_name:
                    opp_names.add(r.winner_name)
                if r.loser_name:
                    opp_names.add(r.loser_name)
            opp_names.discard(name)

            opp_rows = (await conn.execute(
                select(T.players.c.name, T.players.c.fargo)
                .where(T.players.c.name.in_(list(opp_names)))
            )).fetchall()

        player = dict(p_row._mapping)
        matches = [dict(r._mapping) for r in m_rows]
        tournaments = [dict(r._mapping) for r in t_rows]
        fargos = {r.name: r.fargo for r in opp_rows if r.fargo}

        return {
            "streaks": compute_streaks(matches, name),
            "titles": compute_tourney_championships(tournaments, matches, name),
            "perf_vs_fargo": compute_perf_vs_fargo(matches, name, player.get("fargo"), fargos),
            "wins_over_time": wins_over_time(matches, name),
            "fargo": player.get("fargo"),
        }

    # ---------- Compare two players ----------
    @router.get("/compare/{a}/{b}")
    async def compare(a: str, b: str):
        async with engine.connect() as conn:
            pa_row = (await conn.execute(
                select(T.players).where(T.players.c.name == a)
            )).fetchone()
            pb_row = (await conn.execute(
                select(T.players).where(T.players.c.name == b)
            )).fetchone()
            if not pa_row or not pb_row:
                raise HTTPException(status_code=404, detail="One or both players not found")

            h2h_rows = (await conn.execute(
                select(T.matches).where(
                    ((T.matches.c.winner_name == a) & (T.matches.c.loser_name == b)) |
                    ((T.matches.c.winner_name == b) & (T.matches.c.loser_name == a))
                ).order_by(T.matches.c.completed_at)
            )).fetchall()

            a_rows = (await conn.execute(
                select(T.matches.c.winner_name, T.matches.c.loser_name).where(
                    (T.matches.c.winner_name == a) | (T.matches.c.loser_name == a)
                )
            )).fetchall()

            b_rows = (await conn.execute(
                select(T.matches.c.winner_name, T.matches.c.loser_name).where(
                    (T.matches.c.winner_name == b) | (T.matches.c.loser_name == b)
                )
            )).fetchall()
            all_match_rows = (await conn.execute(select(T.matches))).fetchall()

        h2h_matches = [dict(r._mapping) for r in h2h_rows]
        a_wins = sum(1 for m in h2h_matches if m["winner_name"] == a)
        b_wins = sum(1 for m in h2h_matches if m["winner_name"] == b)
        pa = dict(pa_row._mapping)
        pb = dict(pb_row._mapping)
        elo = compute_elo_ratings([dict(r._mapping) for r in all_match_rows])
        a_rating = elo["ratings"].get(a, elo["initial_rating"])
        b_rating = elo["ratings"].get(b, elo["initial_rating"])
        a_probability = 1.0 / (1.0 + pow(10, (b_rating - a_rating) / 400.0))
        odds = {
            "a_win_probability": round(a_probability * 100, 1),
            "b_win_probability": round((1 - a_probability) * 100, 1),
            "a_rating": a_rating,
            "b_rating": b_rating,
            "rating_gap": a_rating - b_rating,
            "favorite": a if a_probability >= 0.5 else b,
            "basis": "ELO",
        }

        def _opp_record(rows, name):
            rec: Dict[str, Dict[str, int]] = {}
            for r in rows:
                opp = r.loser_name if r.winner_name == name else r.winner_name
                if not opp:
                    continue
                rec.setdefault(opp, {"w": 0, "l": 0})
                if r.winner_name == name:
                    rec[opp]["w"] += 1
                else:
                    rec[opp]["l"] += 1
            return rec

        rec_a = _opp_record(a_rows, a)
        rec_b = _opp_record(b_rows, b)
        common = sorted(set(rec_a.keys()) & set(rec_b.keys()) - {a, b})
        common_rows = [{"opponent": o, "a": rec_a[o], "b": rec_b[o]} for o in common]

        return {
            "a": {**pa, "elo_rating": a_rating},
            "b": {**pb, "elo_rating": b_rating},
            "h2h": {"a_wins": a_wins, "b_wins": b_wins, "matches": h2h_matches, "odds": odds},
            "race_stats": {
                "races_played": len(h2h_matches),
                "scored_races": 0,
                "a_race_wins": a_wins,
                "b_race_wins": b_wins,
                "a_racks_won": 0,
                "a_racks_lost": 0,
                "b_racks_won": 0,
                "b_racks_lost": 0,
                "elo_odds": odds,
            },
            "common_opponents": common_rows,
        }

    # ---------- OG image (PNG) ----------
    @router.get("/og/players/{name}.png")
    async def og_player_png(name: str):
        async with engine.connect() as conn:
            p_row = (await conn.execute(
                select(T.players).where(T.players.c.name == name)
            )).fetchone()
            if not p_row:
                raise HTTPException(status_code=404, detail="Player not found")
            m_rows = (await conn.execute(
                select(T.matches).where(
                    (T.matches.c.winner_name == name) | (T.matches.c.loser_name == name)
                )
            )).fetchall()
            t_rows = (await conn.execute(select(T.tournaments))).fetchall()

        player = dict(p_row._mapping)
        matches = [dict(r._mapping) for r in m_rows]
        tournaments = [dict(r._mapping) for r in t_rows]
        streaks = compute_streaks(matches, name)
        titles = compute_tourney_championships(tournaments, matches, name)
        png = render_player_card(player, streaks, titles.get("by_game", {}))
        return Response(content=png, media_type="image/png", headers={
            "Cache-Control": "public, max-age=600"
        })

    # ---------- Public OG-meta HTML page ----------
    @router.get("/p/{name}", response_class=HTMLResponse)
    async def public_player_card(name: str, request: Request):
        async with engine.connect() as conn:
            p_row = (await conn.execute(
                select(T.players).where(T.players.c.name == name)
            )).fetchone()
        if not p_row:
            raise HTTPException(status_code=404, detail="Player not found")
        player = dict(p_row._mapping)
        base = _public_url(request)
        png_url = f"{base}/api/og/players/{quote(name)}.png"
        app_url = f"{base}/players/{quote(name)}"
        title = html.escape(f"{name} · CueStats — Fremont Open")
        desc = html.escape(
            f"{player.get('wins',0)}W-{player.get('losses',0)}L · "
            f"{player.get('win_rate',0)}% win rate at the Fremont Open"
        )
        body = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{png_url}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="{app_url}">
<meta property="og:type" content="profile">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{png_url}">
<meta http-equiv="refresh" content="0; url={app_url}">
</head>
<body style="background:#0B0E14;color:#F3F4F6;font-family:system-ui;padding:40px;text-align:center">
<a href="{app_url}" style="color:#10B981">Open player profile →</a>
</body>
</html>"""
        return HTMLResponse(content=body, headers={"Cache-Control": "public, max-age=300"})

    # ---------- Fargo: claimed user can set their own ----------
    @router.put("/me/fargo")
    async def set_my_fargo(body: FargoUpdate, user_id: str = Depends(require_user)):
        async with engine.begin() as conn:
            user_row = (await conn.execute(
                select(T.users).where(T.users.c.id == user_id)
            )).fetchone()
            if not user_row or not user_row.claimed_player:
                raise HTTPException(status_code=400, detail="Claim a player first")
            await conn.execute(
                update(T.players)
                .where(T.players.c.name == user_row.claimed_player)
                .values(fargo=body.fargo)
            )
        return {"name": user_row.claimed_player, "fargo": body.fargo}

    # ---------- Fargo: admin can set anyone's ----------
    @router.put("/admin/players/{name}/fargo")
    async def admin_set_fargo(name: str, body: FargoUpdate, admin_email: str = Depends(require_admin)):
        now = datetime.now(timezone.utc).isoformat()
        async with engine.begin() as conn:
            result = await conn.execute(
                update(T.players).where(T.players.c.name == name).values(fargo=body.fargo)
            )
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="Player not found")
            await conn.execute(insert(T.audit_log).values(
                action="set_fargo",
                payload={"name": name, "fargo": body.fargo, "by": admin_email},
                at=now,
            ))
        return {"name": name, "fargo": body.fargo}

    return router
