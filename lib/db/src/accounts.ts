import { createHash, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, desc, eq, gt, lte, sql } from "drizzle-orm";
import { db } from "./index";
import { passesTable, sessionsTable } from "./schema";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const validEmail = (email: string) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const validPassword = (password: string) => password.length >= 10 && Buffer.byteLength(password, "utf8") <= 72;
export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const checkPassword = (password: string, hash: string) => bcrypt.compare(password, hash);
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export const planDays = { day: 1, week: 7, month: 30 } as const;
export type Plan = keyof typeof planDays;
export const passExpiry = (plan: Plan, start: Date) => new Date(start.getTime() + planDays[plan] * 86_400_000);

export async function activePass(userId: string) {
  const [pass] = await db.select().from(passesTable).where(and(
    eq(passesTable.userId, userId), lte(passesTable.startsAt, sql`now()`), gt(passesTable.expiresAt, sql`now()`),
  )).orderBy(desc(passesTable.expiresAt)).limit(1);
  return pass ?? null;
}

export async function grantPass(userId: string, plan: Plan, source: "manual" | "demo") {
  return db.transaction(async (tx) => {
    const startsAt = new Date();
    const expiresAt = passExpiry(plan, startsAt);
    const [pass] = await tx.insert(passesTable).values({ id: randomUUID(), userId, plan, source, startsAt, expiresAt }).returning();
    // Extend live sessions, but never revive an expired or signed-out session.
    await tx.update(sessionsTable).set({
      expiresAt: sql`greatest(${sessionsTable.expiresAt}, ${expiresAt.toISOString()}::timestamptz)`,
    }).where(and(eq(sessionsTable.userId, userId), gt(sessionsTable.expiresAt, sql`now()`)));
    return pass!;
  });
}
