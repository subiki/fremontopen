import { Router } from "express";
import { db } from "@workspace/db";
import { playersTable, matchesTable } from "@workspace/db";
import { eq, or, desc } from "drizzle-orm";

const router = Router();

router.get("/players", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(playersTable)
      .orderBy(desc(playersTable.wins));
    res.json(
      rows.map((p) => ({
        id: p.id,
        name: p.name,
        wins: p.wins,
        losses: p.losses,
        win_rate: p.winRate,
        fargo: p.fargo,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list players");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/players/:id", async (req, res) => {
  try {
    const id = req.params["id"]!;

    const [player] = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.id, id));

    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    const matches = await db
      .select()
      .from(matchesTable)
      .where(
        or(
          eq(matchesTable.winnerId, Number(id)),
          eq(matchesTable.loserId, Number(id))
        )
      )
      .orderBy(desc(matchesTable.createdAt));

    res.json({
      player: {
        id: player.id,
        name: player.name,
        wins: player.wins,
        losses: player.losses,
        win_rate: player.winRate,
        fargo: player.fargo,
      },
      matches: matches.map((m) => ({
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
    req.log.error({ err }, "Failed to get player");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
