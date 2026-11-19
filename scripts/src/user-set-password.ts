import { password } from "@inquirer/prompts";
import { eq } from "drizzle-orm";
import { db, pool, sessionsTable, usersTable } from "@workspace/db";
import { hashPassword, normalizeEmail, validPassword } from "@workspace/db/accounts";

try {
  const [input, ...extra] = process.argv.slice(2);
  if (!input || extra.length) throw new Error("Usage: pnpm user:set-password <email>");
  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, normalizeEmail(input))).limit(1);
  if (!user) throw new Error("Account not found.");
  if (!process.stdin.isTTY) throw new Error("Run this command in an interactive terminal. Never pass the password as an argument.");
  const value = await password({ message: "New password (hidden):", mask: false });
  if (!validPassword(value)) throw new Error("Use at least 10 characters and at most 72 UTF-8 bytes.");
  const confirmation = await password({ message: "Type the new password again (hidden):", mask: false });
  if (value !== confirmation) throw new Error("Passwords did not match. Nothing changed.");
  const passwordHash = await hashPassword(value);
  await db.transaction(async (tx) => {
    await tx.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, user.id));
    await tx.delete(sessionsTable).where(eq(sessionsTable.userId, user.id));
  });
  console.log("Password reset. All existing sessions for this account were signed out.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Could not reset the password.");
  process.exitCode = 1;
} finally { await pool.end(); }
