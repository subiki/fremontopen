import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const adminsTable = pgTable("admins", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const loginAttemptsTable = pgTable("login_attempts", {
  identifier: text("identifier").primaryKey(),
  count: text("count").notNull().default("0"),
  lastAttempt: timestamp("last_attempt", { withTimezone: true }),
});

export type Admin = typeof adminsTable.$inferSelect;
export type LoginAttempt = typeof loginAttemptsTable.$inferSelect;
