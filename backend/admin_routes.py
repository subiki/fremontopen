"""Admin-only routes: rename player, merge players, edit/delete match, trigger sync."""
import asyncio
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import require_admin
from sync_job import run_sync, _rebuild_players

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


# ---------- Helpers (db is injected from server.py) ----------
def make_admin_router(db):

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

        # update matches
        winners = await db.matches.update_many(
            {"winner_name": name}, {"$set": {"winner_name": new_name}}
        )
        losers = await db.matches.update_many(
            {"loser_name": name}, {"$set": {"loser_name": new_name}}
        )
        # rebuild players aggregate
        await _rebuild_players(db)
        # audit
        await _audit(db, "rename_player", {"from": name, "to": new_name})
        return {
            "from": name,
            "to": new_name,
            "matches_updated": winners.modified_count + losers.modified_count,
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
        for alias in aliases:
            w = await db.matches.update_many(
                {"winner_name": alias}, {"$set": {"winner_name": canonical}}
            )
            l = await db.matches.update_many(
                {"loser_name": alias}, {"$set": {"loser_name": canonical}}
            )
            total += w.modified_count + l.modified_count

        await _rebuild_players(db)
        await _audit(db, "merge_players", {"canonical": canonical, "aliases": aliases, "matches_updated": total})
        return {"canonical_name": canonical, "aliases": aliases, "matches_updated": total}

    @admin_router.patch("/matches/{match_id}")
    async def update_match(match_id: str, body: MatchUpdate):
        updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        result = await db.matches.update_one({"id": match_id}, {"$set": updates})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Match not found")
        await _rebuild_players(db)
        await _audit(db, "update_match", {"id": match_id, **updates})
        m = await db.matches.find_one({"id": match_id}, {"_id": 0})
        return m

    @admin_router.delete("/matches/{match_id}")
    async def delete_match(match_id: str):
        result = await db.matches.delete_one({"id": match_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Match not found")
        await _rebuild_players(db)
        await _audit(db, "delete_match", {"id": match_id})
        return {"deleted": match_id}

    @admin_router.post("/sync")
    async def admin_sync(body: SyncTriggerRequest):
        """Run sync inline (returns the summary). Beware of long-running times if force=True."""
        try:
            summary = await run_sync(force=body.force, only_tournament=body.tournament_id)
            await _audit(db, "sync", summary)
            return summary
        except Exception as e:
            log.exception("Admin sync failed")
            raise HTTPException(status_code=500, detail=f"Sync failed: {e}")

    @admin_router.get("/audit")
    async def list_audit(limit: int = 50):
        items = await db.audit_log.find({}, {"_id": 0}).sort("at", -1).limit(limit).to_list(length=limit)
        return items

    return admin_router


async def _audit(db, action: str, payload: dict) -> None:
    from datetime import datetime, timezone
    await db.audit_log.insert_one({
        "action": action,
        "payload": payload,
        "at": datetime.now(timezone.utc).isoformat(),
    })
