import { pgTable, text } from "drizzle-orm/pg-core";

export const priceItemsTable = pgTable("price_items", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  rangeText: text("range_text").notNull(),
  lastChecked: text("last_checked").notNull(),
});
