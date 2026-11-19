import { randomBytes } from "node:crypto";
import type { Request, Response, RequestHandler } from "express";
import { and, eq, gt, sql } from "drizzle-orm";
import { db, sessionsTable, usersTable } from "@workspace/db";
import { activePass, tokenHash } from "@workspace/db/accounts";
import { demoPaymentsEnabled, supportWhatsappUrl } from "./security";

export const COOKIE = "detty_session";
const cookieOptions = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };

export async function readSession(req: Request) {
  const token = req.cookies?.[COOKIE];
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const [row] = await db.select({ user: usersTable, session: sessionsTable }).from(sessionsTable)
    .innerJoin(usersTable, eq(usersTable.id, sessionsTable.userId))
    .where(and(eq(sessionsTable.tokenHash, tokenHash(token)), gt(sessionsTable.expiresAt, sql`now()`))).limit(1);
  return row ?? null;
}

export async function startSession(userId: string, req: Request, res: Response) {
  const token = randomBytes(32).toString("base64url");
  const pass = await activePass(userId);
  const [user] = await db.select({ isAdmin: usersTable.isAdmin }).from(usersTable).where(eq(usersTable.id, userId));
  // A visitor without a pass gets one day to choose one, but no guide access.
  const expiresAt = user?.isAdmin ? new Date(Date.now() + 30 * 86_400_000)
    : pass?.expiresAt ?? new Date(Date.now() + 86_400_000);
  await db.transaction(async (tx) => {
    const old = req.cookies?.[COOKIE];
    if (typeof old === "string") await tx.delete(sessionsTable).where(eq(sessionsTable.tokenHash, tokenHash(old)));
    await tx.insert(sessionsTable).values({ userId, tokenHash: tokenHash(token), expiresAt });
  });
  res.cookie(COOKIE, token, { ...cookieOptions, expires: expiresAt });
  req.cookies[COOKIE] = token;
}

export async function sessionInfo(req: Request, res: Response) {
  const row = await readSession(req);
  if (!row) {
    res.clearCookie(COOKIE, cookieOptions);
    return { user: null, pass: null, demoPayments: demoPaymentsEnabled(), supportWhatsappUrl: supportWhatsappUrl() };
  }
  const pass = await activePass(row.user.id);
  // Refresh the cookie after a manual grant. Tokens are never exposed to JS.
  const expiresAt = row.user.isAdmin ? row.session.expiresAt : pass?.expiresAt ?? row.session.expiresAt;
  res.cookie(COOKIE, req.cookies[COOKIE], { ...cookieOptions, expires: expiresAt });
  return {
    user: { id: row.user.id, email: row.user.email, emailVerified: row.user.emailVerified, isAdmin: row.user.isAdmin },
    pass: pass ? {
      id: pass.id, plan: pass.plan, startsAt: pass.startsAt.toISOString(),
      expiresAt: pass.expiresAt.toISOString(), source: pass.source,
    } : null,
    demoPayments: demoPaymentsEnabled(),
    supportWhatsappUrl: supportWhatsappUrl(),
  };
}

export async function endSession(req: Request, res: Response) {
  const token = req.cookies?.[COOKIE];
  if (typeof token === "string") await db.delete(sessionsTable).where(eq(sessionsTable.tokenHash, tokenHash(token)));
  res.clearCookie(COOKIE, cookieOptions);
}

export const requirePass: RequestHandler = async (req, res, next) => {
  const session = await readSession(req);
  if (!session) { res.status(401).json({ error: "Please sign in." }); return; }
  // This flag is assigned by database maintenance, never by signup or the client.
  if (session.user.isAdmin) { next(); return; }
  const pass = await activePass(session.user.id);
  if (!pass) { res.status(403).json({ error: "A valid pass is required." }); return; }
  next();
};
