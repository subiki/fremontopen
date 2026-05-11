import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";

export const playersTable = pgTable("players", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  winRate: real("win_rate").notNull().default(0),
  fargo: integer("fargo"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Player = typeof playersTable.$inferSelect;
export type InsertPlayer = typeof playersTable.$inferInsert;
