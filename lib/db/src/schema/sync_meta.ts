import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const syncMetaTable = pgTable("sync_meta", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SyncMeta = typeof syncMetaTable.$inferSelect;
