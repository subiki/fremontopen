"""Admin-only routes: rename player, merge players, edit/delete match, trigger sync."""
import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, insert, update

from auth import require_admin
from sync_job import run_sync, _rebuild_players
import database as T

log = logging.getLogger("cuestats.admin")

admin_router = APIRouter(prefix="/api/admin", dependencies=[Depends(require_admin)])


# ---------- Schemas ----------
class RenamePlayer(BaseModel):
    new_name: str = Field(min_length=1, max_length=200)


class MergePlayers(BaseModel):
    canonical_name: str = Field(min_length=1, max_length=200)
    alias_names: List[str] = Field(min_items=1)


class MatchUpdate(BaseModel):
    winner_name: Optional[str] = None
    loser_name: Optional[str] = None
    scores: Optional[str] = None


class SyncTriggerRequest(BaseModel):
    force: bool = False
    tournament_id: Optional[int] = None


# ---------- Router factory ----------
def make_admin_router(engine):

    @admin_router.get("/me")
    async def whoami(admin_email: str = Depends(require_admin)):
        return {"email": admin_email, "role": "admin"}

    @admin_router.post("/players/rename/{name}")
    async def rename_player(name: str, body: RenamePlayer):
        new_name = body.new_name.strip()
        if not new_name:
            raise HTTPException(status_code=400, detail="new_name is required")
        if new_name == name:
            return {"updated": 0, "message": "no-op (same name)"}

        async with engine.begin() as conn:
            w_res = await conn.execute(
                update(T.matches)
                .where(T.matches.c.winner_name == name)
                .values(winner_name=new_name)
            )
            l_res = await conn.execute(
                update(T.matches)
                .where(T.matches.c.loser_name == name)
                .values(loser_name=new_name)
            )
            await _rebuild_players(conn)
            await _audit(conn, "rename_player", {"from": name, "to": new_name})

        return {
            "from": name,
            "to": new_name,
            "matches_updated": w_res.rowcount + l_res.rowcount,
        }

    @admin_router.post("/players/merge")
    async def merge_players(body: MergePlayers):
        canonical = body.canonical_name.strip()
        aliases = [a.strip() for a in body.alias_names if a.strip() and a.strip() != canonical]
        if not canonical:
            raise HTTPException(status_code=400, detail="canonical_name is required")
        if not aliases:
            raise HTTPException(status_code=400, detail="alias_names must include at least one alias")

        total = 0
        async with engine.begin() as conn:
            for alias in aliases:
                w = await conn.execute(
                    update(T.matches)
                    .where(T.matches.c.winner_name == alias)
                    .values(winner_name=canonical)
                )
                l = await conn.execute(
                    update(T.matches)
                    .where(T.matches.c.loser_name == alias)
                    .values(loser_name=canonical)
                )
                total += w.rowcount + l.rowcount
            await _rebuild_players(conn)
            await _audit(conn, "merge_players", {
                "canonical": canonical, "aliases": aliases, "matches_updated": total
            })

        return {"canonical_name": canonical, "aliases": aliases, "matches_updated": total}

    @admin_router.patch("/matches/{match_id}")
    async def update_match(match_id: str, body: MatchUpdate):
        updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        async with engine.begin() as conn:
            result = await conn.execute(
                update(T.matches).where(T.matches.c.id == match_id).values(**updates)
            )
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="Match not found")
            await _rebuild_players(conn)
            await _audit(conn, "update_match", {"id": match_id, **updates})
            row = (await conn.execute(
                select(T.matches).where(T.matches.c.id == match_id)
            )).fetchone()

        return dict(row._mapping)

    @admin_router.delete("/matches/{match_id}")
    async def delete_match(match_id: str):
        async with engine.begin() as conn:
            result = await conn.execute(
                T.matches.delete().where(T.matches.c.id == match_id)
            )
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="Match not found")
            await _rebuild_players(conn)
            await _audit(conn, "delete_match", {"id": match_id})

        return {"deleted": match_id}

    @admin_router.post("/sync")
    async def admin_sync(body: SyncTriggerRequest):
        try:
            summary = await run_sync(force=body.force, only_tournament=body.tournament_id)
            async with engine.begin() as conn:
                await _audit(conn, "sync", summary)
            return summary
        except Exception as e:
            log.exception("Admin sync failed")
            raise HTTPException(status_code=500, detail=f"Sync failed: {e}")

    @admin_router.get("/audit")
    async def list_audit(limit: int = 50):
        async with engine.connect() as conn:
            rows = (await conn.execute(
                select(T.audit_log).order_by(T.audit_log.c.at.desc()).limit(limit)
            )).fetchall()
        return [dict(r._mapping) for r in rows]

    return admin_router


async def _audit(conn, action: str, payload: dict) -> None:
    now = datetime.now(timezone.utc).isoformat()
    await conn.execute(insert(T.audit_log).values(action=action, payload=payload, at=now))
