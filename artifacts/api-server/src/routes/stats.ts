import { Router } from "express";
import { db } from "@workspace/db";
import { tournamentsTable, matchesTable, playersTable, syncMetaTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";

const router = Router();

router.get("/stats", async (req, res) => {
  try {
    const [[{ total: totalTournaments }], [{ total: totalMatches }], [{ total: totalPlayers }]] =
      await Promise.all([
        db.select({ total: count() }).from(tournamentsTable),
        db.select({ total: count() }).from(matchesTable),
        db.select({ total: count() }).from(playersTable),
      ]);

    const [syncMeta] = await db
      .select()
      .from(syncMetaTable)
      .where(eq(syncMetaTable.key, "last_synced_at"));

    const players = await db
      .select()
      .from(playersTable)
      .orderBy(desc(playersTable.winRate))
      .limit(10);

    const recentMatches = await db
      .select()
      .from(matchesTable)
      .orderBy(desc(matchesTable.createdAt))
      .limit(10);

    res.json({
      total_tournaments: totalTournaments,
      total_matches: totalMatches,
      total_players: totalPlayers,
      last_synced_at: syncMeta?.value ?? null,
      players: players.map((p) => ({
        id: p.id,
        name: p.name,
        wins: p.wins,
        losses: p.losses,
        win_rate: p.winRate,
        fargo: p.fargo,
      })),
      recent_matches: recentMatches.map((m) => ({
        id: m.id,
        tournament_id: m.tournamentId,
        tournament_name: m.tournamentName,
        round: m.round,
        state: m.state,
        scores: m.scores,
        winner_name: m.winnerName,
        loser_name: m.loserName,
        completed_at: m.completedAt,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stats/compare", async (req, res) => {
  try {
    const { a, b } = req.query;
    if (!a || !b) {
      res.status(400).json({ error: "Query params a and b (player ids) required" });
      return;
    }

    const [playerA] = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.id, String(a)));

    const [playerB] = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.id, String(b)));

    if (!playerA || !playerB) {
      res.status(404).json({ error: "One or both players not found" });
      return;
    }

    const matchesA = await db
      .select()
      .from(matchesTable)
      .where(eq(matchesTable.winnerName, playerA.name))
      .limit(20);

    const matchesB = await db
      .select()
      .from(matchesTable)
      .where(eq(matchesTable.winnerName, playerB.name))
      .limit(20);

    res.json({
      player_a: {
        id: playerA.id,
        name: playerA.name,
        wins: playerA.wins,
        losses: playerA.losses,
        win_rate: playerA.winRate,
        fargo: playerA.fargo,
        recent_wins: matchesA.length,
      },
      player_b: {
        id: playerB.id,
        name: playerB.name,
        wins: playerB.wins,
        losses: playerB.losses,
        win_rate: playerB.winRate,
        fargo: playerB.fargo,
        recent_wins: matchesB.length,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to compare players");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      res.json({ players: [], tournaments: [] });
      return;
    }

    const term = String(q).toLowerCase();

    const [players, tournaments] = await Promise.all([
      db.select().from(playersTable),
      db.select().from(tournamentsTable),
    ]);

    res.json({
      players: players
        .filter((p) => p.name.toLowerCase().includes(term))
        .slice(0, 10)
        .map((p) => ({ id: p.id, name: p.name, wins: p.wins, losses: p.losses })),
      tournaments: tournaments
        .filter((t) => t.name.toLowerCase().includes(term))
        .slice(0, 10)
        .map((t) => ({ id: t.id, name: t.name, state: t.state })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to search");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
