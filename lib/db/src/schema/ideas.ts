import { pgTable, text } from "drizzle-orm/pg-core";

export const ideasTable = pgTable("ideas", {
  id: text("id").primaryKey(),
  city: text("city").notNull(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  area: text("area").notNull(),
  priceLevel: text("price_level").notNull(),
  blurb: text("blurb").notNull(),
  seller: text("seller"),
  status: text("status").notNull(),
  // Text keeps the stage-one [DATE] placeholders unchanged.
  dateChecked: text("date_checked").notNull(),
  source: text("source").notNull(),
});
