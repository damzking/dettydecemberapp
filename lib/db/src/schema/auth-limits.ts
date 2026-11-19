import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Hashed email/IP buckets persist across restarts and multiple API processes.
export const authLimitsTable = pgTable("auth_limits", {
  key: text("key").primaryKey(),
  attempts: integer("attempts").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
