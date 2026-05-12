"""Public extras router: search, /p/:name (OG-meta HTML), OG image, compare, player extras, fargo edits."""
import html
import logging
from typing import Optional, List, Dict, Any
from urllib.parse import quote

from fastapi import APIRouter, HTTPException, Depends, Response, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

from players_extras import compute_streaks, compute_tourney_championships, compute_perf_vs_fargo, wins_over_time
from og_image import render_player_card
from users import require_user
from auth import require_admin

log = logging.getLogger("cuestats.extras")


class FargoUpdate(BaseModel):
    fargo: Optional[int] = Field(default=None, ge=200, le=900)


def _public_url(request: Request) -> str:
    # Prefer FRONTEND_URL env if set
    import os
    fe = os.environ.get("FRONTEND_URL")
    if fe:
        return fe.rstrip("/")
    return f"{request.url.scheme}://{request.url.netloc}"


def make_extras_router(db):
    router = APIRouter(prefix="/api")

    # ---------- Search ----------
    @router.get("/search")
    async def search(q: str = "", limit: int = 10):
        q = q.strip()
        if not q:
            return {"players": [], "tournaments": []}
        regex = {"$regex": q, "$options": "i"}
        players = await db.players.find({"name": regex}, {"_id": 0, "name": 1, "wins": 1, "losses": 1, "fargo": 1}).limit(limit).to_list(length=limit)
        tournaments = await db.tournaments.find({"name": regex}, {"_id": 0, "id": 1, "name": 1, "game": 1, "state": 1}).limit(limit).to_list(length=limit)
        return {"players": players, "tournaments": tournaments}

    # ---------- Player extras (streaks, titles, perf vs fargo, wins_over_time) ----------
    @router.get("/players/{name}/extras")
    async def player_extras(name: str):
        player = await db.players.find_one({"name": name}, {"_id": 0})
        if not player:
            raise HTTPException(status_code=404, detail="Player not found")
        matches = await db.matches.find(
            {"$or": [{"winner_name": name}, {"loser_name": name}]},
            {"_id": 0},
        ).to_list(length=5000)
        tournaments = await db.tournaments.find({}, {"_id": 0}).to_list(length=2000)
        # Fargo map for the opponents
        opp_names = set()
        for m in matches:
            if m.get("winner_name"):
                opp_names.add(m["winner_name"])
            if m.get("loser_name"):
                opp_names.add(m["loser_name"])
        opp_names.discard(name)
        opp_players = await db.players.find(
            {"name": {"$in": list(opp_names)}}, {"_id": 0, "name": 1, "fargo": 1}
        ).to_list(length=5000)
        fargos = {p["name"]: p["fargo"] for p in opp_players if p.get("fargo")}

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
        pa = await db.players.find_one({"name": a}, {"_id": 0})
        pb = await db.players.find_one({"name": b}, {"_id": 0})
        if not pa or not pb:
            raise HTTPException(status_code=404, detail="One or both players not found")

        # Head-to-head
        h2h_matches = await db.matches.find(
            {"$or": [
                {"winner_name": a, "loser_name": b},
                {"winner_name": b, "loser_name": a},
            ]},
            {"_id": 0},
        ).sort("completed_at", 1).to_list(length=2000)
        a_wins = sum(1 for m in h2h_matches if m["winner_name"] == a)
        b_wins = sum(1 for m in h2h_matches if m["winner_name"] == b)

        # Common opponents — who each has played; for each common opp record (a_wins, a_losses, b_wins, b_losses)
        async def opp_record(name):
            ms = await db.matches.find(
                {"$or": [{"winner_name": name}, {"loser_name": name}]},
                {"_id": 0, "winner_name": 1, "loser_name": 1},
            ).to_list(length=5000)
            rec: Dict[str, Dict[str, int]] = {}
            for m in ms:
                opp = m["loser_name"] if m["winner_name"] == name else m["winner_name"]
                if not opp:
                    continue
                rec.setdefault(opp, {"w": 0, "l": 0})
                if m["winner_name"] == name:
                    rec[opp]["w"] += 1
                else:
                    rec[opp]["l"] += 1
            return rec

        rec_a = await opp_record(a)
        rec_b = await opp_record(b)
        common = sorted(set(rec_a.keys()) & set(rec_b.keys()) - {a, b})
        common_rows = [
            {
                "opponent": o,
                "a": rec_a[o],
                "b": rec_b[o],
            }
            for o in common
        ]
        return {
            "a": pa,
            "b": pb,
            "h2h": {"a_wins": a_wins, "b_wins": b_wins, "matches": h2h_matches},
            "common_opponents": common_rows,
        }

    # ---------- OG image (PNG) ----------
    @router.get("/og/players/{name}.png")
    async def og_player_png(name: str):
        player = await db.players.find_one({"name": name}, {"_id": 0})
        if not player:
            raise HTTPException(status_code=404, detail="Player not found")
        matches = await db.matches.find(
            {"$or": [{"winner_name": name}, {"loser_name": name}]},
            {"_id": 0},
        ).to_list(length=5000)
        tournaments = await db.tournaments.find({}, {"_id": 0}).to_list(length=2000)
        streaks = compute_streaks(matches, name)
        titles = compute_tourney_championships(tournaments, matches, name)
        png = render_player_card(player, streaks, titles.get("by_game", {}))
        return Response(content=png, media_type="image/png", headers={
            "Cache-Control": "public, max-age=600"
        })

    # ---------- Public OG-meta HTML page ----------
    @router.get("/p/{name}", response_class=HTMLResponse)
    async def public_player_card(name: str, request: Request):
        player = await db.players.find_one({"name": name}, {"_id": 0})
        if not player:
            raise HTTPException(status_code=404, detail="Player not found")
        base = _public_url(request)
        png_url = f"{base}/api/og/players/{quote(name)}.png"
        app_url = f"{base}/players/{quote(name)}"
        title = html.escape(f"{name} · CueStats — Fremont Open")
        desc = html.escape(
            f"{player.get('wins',0)}W-{player.get('losses',0)}L · {player.get('win_rate',0)}% win rate at the Fremont Open"
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
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user or not user.get("claimed_player"):
            raise HTTPException(status_code=400, detail="Claim a player first")
        await db.players.update_one(
            {"name": user["claimed_player"]},
            {"$set": {"fargo": body.fargo}},
        )
        return {"name": user["claimed_player"], "fargo": body.fargo}

    # ---------- Fargo: admin can set anyone's ----------
    @router.put("/admin/players/{name}/fargo")
    async def admin_set_fargo(name: str, body: FargoUpdate, admin_email: str = Depends(require_admin)):
        r = await db.players.update_one({"name": name}, {"$set": {"fargo": body.fargo}})
        if r.matched_count == 0:
            raise HTTPException(status_code=404, detail="Player not found")
        await db.audit_log.insert_one({
            "action": "set_fargo",
            "payload": {"name": name, "fargo": body.fargo, "by": admin_email},
        })
        return {"name": name, "fargo": body.fargo}

    return router
