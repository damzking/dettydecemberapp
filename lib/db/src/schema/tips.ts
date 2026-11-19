import { pgTable, text } from "drizzle-orm/pg-core";

export const tipsTable = pgTable("tips", {
  id: text("id").primaryKey(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
});
