import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { ideasTable } from "./ideas";

export const reportsTable = pgTable("reports", {
  id: text("id").primaryKey(),
  // Ideas are archived instead of deleted; reports always keep a real target.
  ideaId: text("idea_id").notNull().references(() => ideasTable.id, { onDelete: "restrict" }),
  note: text("note").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
