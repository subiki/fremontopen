import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import bcrypt from "bcryptjs";
import * as schema from "../../lib/db/src/schema/index.js";

const { Pool } = pg;

if (!process.env["DATABASE_URL"]) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const db = drizzle(pool, { schema });

const TOURNAMENTS = [
  { id: 1, name: "Fremont Open Spring 2025", game: "9-Ball", state: "complete", startedAt: "2025-03-15" },
  { id: 2, name: "Bay Area 8-Ball Classic", game: "8-Ball", state: "complete", startedAt: "2025-04-20" },
  { id: 3, name: "Fremont Open Summer 2025", game: "9-Ball", state: "underway", startedAt: "2025-05-10" },
  { id: 4, name: "East Bay Straight Pool Championship", game: "Straight Pool", state: "pending", startedAt: null },
];

const PLAYERS = [
  { id: "p1", name: "Marcus Chen", wins: 24, losses: 6, winRate: 0.8, fargo: 650 },
  { id: "p2", name: "Sofia Reyes", wins: 21, losses: 9, winRate: 0.7, fargo: 620 },
  { id: "p3", name: "Derek Watanabe", wins: 19, losses: 11, winRate: 0.633, fargo: 598 },
  { id: "p4", name: "Aaliyah Johnson", wins: 18, losses: 12, winRate: 0.6, fargo: 585 },
  { id: "p5", name: "Carlos Mendez", wins: 17, losses: 13, winRate: 0.567, fargo: 572 },
  { id: "p6", name: "Priya Patel", wins: 15, losses: 15, winRate: 0.5, fargo: 550 },
  { id: "p7", name: "Jake Morrison", wins: 12, losses: 18, winRate: 0.4, fargo: 520 },
  { id: "p8", name: "Elena Kova", wins: 10, losses: 20, winRate: 0.333, fargo: 495 },
  { id: "p9", name: "Tony Huang", wins: 8, losses: 22, winRate: 0.267, fargo: 470 },
  { id: "p10", name: "Brianna Scott", wins: 6, losses: 24, winRate: 0.2, fargo: 445 },
];

const MATCHES = [
  // Tournament 1 — Spring 9-Ball
  { id: "m1", tournamentId: 1, tournamentName: "Fremont Open Spring 2025", round: 1, state: "complete", scores: "9-5", winnerId: 1, loserId: 10, winnerName: "Marcus Chen", loserName: "Brianna Scott", completedAt: "2025-03-15T14:00:00Z" },
  { id: "m2", tournamentId: 1, tournamentName: "Fremont Open Spring 2025", round: 1, state: "complete", scores: "9-7", winnerId: 2, loserId: 9, winnerName: "Sofia Reyes", loserName: "Tony Huang", completedAt: "2025-03-15T15:00:00Z" },
  { id: "m3", tournamentId: 1, tournamentName: "Fremont Open Spring 2025", round: 1, state: "complete", scores: "9-4", winnerId: 3, loserId: 8, winnerName: "Derek Watanabe", loserName: "Elena Kova", completedAt: "2025-03-15T16:00:00Z" },
  { id: "m4", tournamentId: 1, tournamentName: "Fremont Open Spring 2025", round: 1, state: "complete", scores: "9-6", winnerId: 4, loserId: 7, winnerName: "Aaliyah Johnson", loserName: "Jake Morrison", completedAt: "2025-03-15T17:00:00Z" },
  { id: "m5", tournamentId: 1, tournamentName: "Fremont Open Spring 2025", round: 2, state: "complete", scores: "9-3", winnerId: 1, loserId: 2, winnerName: "Marcus Chen", loserName: "Sofia Reyes", completedAt: "2025-03-16T14:00:00Z" },
  { id: "m6", tournamentId: 1, tournamentName: "Fremont Open Spring 2025", round: 2, state: "complete", scores: "9-8", winnerId: 4, loserId: 3, winnerName: "Aaliyah Johnson", loserName: "Derek Watanabe", completedAt: "2025-03-16T15:00:00Z" },
  { id: "m7", tournamentId: 1, tournamentName: "Fremont Open Spring 2025", round: 3, state: "complete", scores: "9-6", winnerId: 1, loserId: 4, winnerName: "Marcus Chen", loserName: "Aaliyah Johnson", completedAt: "2025-03-16T17:00:00Z" },

  // Tournament 2 — 8-Ball Classic
  { id: "m8", tournamentId: 2, tournamentName: "Bay Area 8-Ball Classic", round: 1, state: "complete", scores: "7-4", winnerId: 2, loserId: 7, winnerName: "Sofia Reyes", loserName: "Jake Morrison", completedAt: "2025-04-20T14:00:00Z" },
  { id: "m9", tournamentId: 2, tournamentName: "Bay Area 8-Ball Classic", round: 1, state: "complete", scores: "7-5", winnerId: 5, loserId: 8, winnerName: "Carlos Mendez", loserName: "Elena Kova", completedAt: "2025-04-20T15:00:00Z" },
  { id: "m10", tournamentId: 2, tournamentName: "Bay Area 8-Ball Classic", round: 2, state: "complete", scores: "7-3", winnerId: 2, loserId: 5, winnerName: "Sofia Reyes", loserName: "Carlos Mendez", completedAt: "2025-04-21T14:00:00Z" },
  { id: "m11", tournamentId: 2, tournamentName: "Bay Area 8-Ball Classic", round: 3, state: "complete", scores: "7-6", winnerId: 2, loserId: 1, winnerName: "Sofia Reyes", loserName: "Marcus Chen", completedAt: "2025-04-21T16:00:00Z" },

  // Tournament 3 — Summer (underway)
  { id: "m12", tournamentId: 3, tournamentName: "Fremont Open Summer 2025", round: 1, state: "complete", scores: "9-7", winnerId: 1, loserId: 6, winnerName: "Marcus Chen", loserName: "Priya Patel", completedAt: "2025-05-10T14:00:00Z" },
  { id: "m13", tournamentId: 3, tournamentName: "Fremont Open Summer 2025", round: 1, state: "complete", scores: "9-5", winnerId: 3, loserId: 5, winnerName: "Derek Watanabe", loserName: "Carlos Mendez", completedAt: "2025-05-10T15:00:00Z" },
  { id: "m14", tournamentId: 3, tournamentName: "Fremont Open Summer 2025", round: 2, state: "open", scores: null, winnerId: null, loserId: null, winnerName: null, loserName: null, completedAt: null },
];

async function seed() {
  console.log("🎱 Seeding CueStats database...");

  // Clear existing data
  await db.delete(schema.auditLogTable);
  await db.delete(schema.matchesTable);
  await db.delete(schema.tournamentsTable);
  await db.delete(schema.playersTable);
  await db.delete(schema.adminsTable);
  await db.delete(schema.syncMetaTable);

  // Seed tournaments
  await db.insert(schema.tournamentsTable).values(TOURNAMENTS);
  console.log(`  ✓ ${TOURNAMENTS.length} tournaments`);

  // Seed players
  await db.insert(schema.playersTable).values(PLAYERS);
  console.log(`  ✓ ${PLAYERS.length} players`);

  // Seed matches
  await db.insert(schema.matchesTable).values(MATCHES);
  console.log(`  ✓ ${MATCHES.length} matches`);

  // Seed sync meta
  await db.insert(schema.syncMetaTable).values({
    key: "last_synced_at",
    value: new Date().toISOString(),
  });
  console.log(`  ✓ sync_meta`);

  // Seed admin user
  const adminPassword = process.env["ADMIN_PASSWORD"] ?? "CueStats2025!";
  const adminEmail = process.env["ADMIN_EMAIL"] ?? "admin@cuestats.local";
  const hash = await bcrypt.hash(adminPassword, 12);
  await db.insert(schema.adminsTable).values({ email: adminEmail, passwordHash: hash });
  console.log(`  ✓ admin user: ${adminEmail} (password: ${adminPassword})`);

  console.log("✅ Seed complete!");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
