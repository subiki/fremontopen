import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const matchesTable = pgTable("matches", {
  id: text("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull(),
  tournamentName: text("tournament_name"),
  round: integer("round"),
  state: text("state"),
  scores: text("scores"),
  winnerId: integer("winner_id"),
  loserId: integer("loser_id"),
  winnerName: text("winner_name"),
  loserName: text("loser_name"),
  completedAt: text("completed_at"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Match = typeof matchesTable.$inferSelect;
export type InsertMatch = typeof matchesTable.$inferInsert;
