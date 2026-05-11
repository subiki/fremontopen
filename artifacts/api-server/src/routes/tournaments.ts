import { Router } from "express";
import { db } from "@workspace/db";
import { tournamentsTable, matchesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/tournaments", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(tournamentsTable)
      .orderBy(tournamentsTable.id);
    res.json(
      rows.map((t) => ({
        id: t.id,
        name: t.name,
        game: t.game,
        state: t.state,
        started_at: t.startedAt,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list tournaments");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/tournaments/:id", async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid tournament id" });
      return;
    }

    const [tournament] = await db
      .select()
      .from(tournamentsTable)
      .where(eq(tournamentsTable.id, id));

    if (!tournament) {
      res.status(404).json({ error: "Tournament not found" });
      return;
    }

    const matches = await db
      .select()
      .from(matchesTable)
      .where(eq(matchesTable.tournamentId, id))
      .orderBy(matchesTable.round);

    res.json({
      tournament: {
        id: tournament.id,
        name: tournament.name,
        game: tournament.game,
        state: tournament.state,
        started_at: tournament.startedAt,
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
    req.log.error({ err }, "Failed to get tournament");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
