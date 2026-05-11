import { Router } from "express";
import { db } from "@workspace/db";
import { matchesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/matches", async (req, res) => {
  try {
    const { tournament_id } = req.query;

    let query = db
      .select()
      .from(matchesTable)
      .orderBy(desc(matchesTable.createdAt));

    let rows;
    if (tournament_id) {
      rows = await db
        .select()
        .from(matchesTable)
        .where(eq(matchesTable.tournamentId, Number(tournament_id)))
        .orderBy(matchesTable.round);
    } else {
      rows = await query;
    }

    res.json(
      rows.map((m) => ({
        id: m.id,
        tournament_id: m.tournamentId,
        tournament_name: m.tournamentName,
        round: m.round,
        state: m.state,
        scores: m.scores,
        winner_name: m.winnerName,
        loser_name: m.loserName,
        completed_at: m.completedAt,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list matches");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
