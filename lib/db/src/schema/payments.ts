import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { passesTable } from "./passes";
export const paymentsTable = pgTable("payments", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id),
  plan: text("plan").notNull(), amount: integer("amount").notNull(),
  currency: text("currency").notNull(), reference: text("reference").notNull().unique(),
  status: text("status").notNull().default("pending"), provider: text("provider").notNull(),
  providerId: text("provider_id").unique(), providerPaymentId: text("provider_payment_id").unique(),
  mockStatus: text("mock_status").notNull().default("pending"),
  passId: text("pass_id").unique().references(() => passesTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});
