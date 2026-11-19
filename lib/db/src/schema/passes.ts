import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const passesTable = pgTable("passes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  plan: text("plan", { enum: ["day", "week", "month"] }).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  source: text("source").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("passes_user_expiry").on(table.userId, table.expiresAt),
  check("passes_valid_plan", sql`${table.plan} IN ('day', 'week', 'month')`),
  check("passes_valid_dates", sql`${table.expiresAt} > ${table.startsAt}`),
]);
