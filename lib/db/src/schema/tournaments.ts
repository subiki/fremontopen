import { pgTable, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const tournamentsTable = pgTable("tournaments", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  game: text("game"),
  state: text("state").notNull().default("pending"),
  startedAt: text("started_at"),
  updatedAtChallonge: text("updated_at_challonge"),
  frozen: boolean("frozen").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Tournament = typeof tournamentsTable.$inferSelect;
export type InsertTournament = typeof tournamentsTable.$inferInsert;
