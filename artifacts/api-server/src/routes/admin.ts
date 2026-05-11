import { Router } from "express";
import { db } from "@workspace/db";
import { adminsTable, tournamentsTable, matchesTable, playersTable, auditLogTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { requireAdmin } from "./middleware/auth";

const router = Router();

router.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const [admin] = await db
      .select()
      .from(adminsTable)
      .where(eq(adminsTable.email, email));

    if (!admin) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const secret = process.env["SESSION_SECRET"];
    if (!secret) {
      res.status(500).json({ error: "Server misconfigured" });
      return;
    }

    const token = jwt.sign(
      { adminId: admin.id, email: admin.email },
      secret,
      { expiresIn: "24h" }
    );

    res.json({ token });
  } catch (err) {
    req.log.error({ err }, "Admin login failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/me", requireAdmin, (req, res) => {
  res.json({ adminId: req.admin!.adminId, email: req.admin!.email });
});

router.delete("/admin/tournaments/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid tournament id" });
      return;
    }

    await db.delete(matchesTable).where(eq(matchesTable.tournamentId, id));
    await db.delete(tournamentsTable).where(eq(tournamentsTable.id, id));

    await db.insert(auditLogTable).values({
      action: "delete_tournament",
      payload: { tournament_id: id, admin: req.admin!.email },
    });

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete tournament");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/tournaments/:id/freeze", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const { frozen } = req.body as { frozen: boolean };

    await db
      .update(tournamentsTable)
      .set({ frozen: frozen ?? true })
      .where(eq(tournamentsTable.id, id));

    await db.insert(auditLogTable).values({
      action: "toggle_freeze",
      payload: { tournament_id: id, frozen, admin: req.admin!.email },
    });

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to freeze tournament");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/players/:id", requireAdmin, async (req, res) => {
  try {
    const id = String(req.params["id"]);
    await db.delete(playersTable).where(eq(playersTable.id, id));

    await db.insert(auditLogTable).values({
      action: "delete_player",
      payload: { player_id: id, admin: req.admin!.email },
    });

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete player");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/audit-log", requireAdmin, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(auditLogTable)
      .orderBy(auditLogTable.createdAt);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to get audit log");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/sync/status", async (req, res) => {
  res.json({
    status: "mock",
    last_synced_at: null,
    tournaments_synced: null,
    matches_synced: null,
    players_rebuilt: null,
  });
});

export default router;
