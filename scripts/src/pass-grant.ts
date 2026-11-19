import { eq } from "drizzle-orm";
import { db, pool, usersTable } from "@workspace/db";
import { grantPass, normalizeEmail, planDays, type Plan } from "@workspace/db/accounts";

try {
  const [input, choice, ...extra] = process.argv.slice(2);
  if (!input || !choice || !Object.hasOwn(planDays, choice) || extra.length) {
    throw new Error("Usage: pnpm pass:grant <email> <day|week|month>");
  }
  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, normalizeEmail(input))).limit(1);
  if (!user) throw new Error("Account not found. Create the account in the app first.");
  const pass = await grantPass(user.id, choice as Plan, "manual");
  console.log(`Pass granted. Starts ${pass.startsAt.toISOString()}; ends ${pass.expiresAt.toISOString()}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Could not grant a pass.");
  process.exitCode = 1;
} finally { await pool.end(); }
