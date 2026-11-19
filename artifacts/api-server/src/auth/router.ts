import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { checkPassword, grantPass, hashPassword, normalizeEmail, validEmail, validPassword } from "@workspace/db/accounts";
import { SignUpBody, SignInBody, GrantDemoPassBody, GetSessionResponse } from "@workspace/api-zod";
import { demoPaymentsEnabled } from "./security";
import { endSession, readSession, sessionInfo, startSession } from "./sessions";
import { releaseSuccessfulAttempt, reserveAttempts, slowFailures } from "./rate-limits";

export const authRouter: IRouter = Router();
export const passRouter: IRouter = Router();
// Match the password-check cost even when an email does not exist.
const dummyHash = hashPassword("dummy-password-never-an-account");

authRouter.get("/session", async (req, res) => {
  res.json(GetSessionResponse.parse(await sessionInfo(req, res)));
});

authRouter.post("/signup", async (req, res) => {
  const body = SignUpBody.strict().safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Enter both emails and a password of at least 10 characters (at most 72 UTF-8 bytes)." }); return; }
  const email = normalizeEmail(body.data.email);
  if (!validEmail(email) || email !== normalizeEmail(body.data.emailAgain) || !validPassword(body.data.password)) {
    res.status(400).json({ error: "Emails must match and the password must have at least 10 characters (at most 72 UTF-8 bytes)." }); return;
  }
  const rate = await reserveAttempts(email, req.ip ?? "unknown", "signup");
  if (!rate.allowed) { res.set("Retry-After", String(rate.retryAfter)); res.status(429).json({ error: "Too many attempts. Please try again later." }); return; }
  const passwordHash = await hashPassword(body.data.password);
  const [user] = await db.insert(usersTable).values({ id: randomUUID(), email, passwordHash })
    .onConflictDoNothing({ target: usersTable.email }).returning({ id: usersTable.id });
  if (!user) { res.status(409).json({ error: "Unable to create an account with these details. Try signing in." }); return; }
  await startSession(user.id, req, res);
  res.status(201).json(GetSessionResponse.parse(await sessionInfo(req, res)));
});

authRouter.post("/signin", async (req, res) => {
  const body = SignInBody.strict().safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Email or password is incorrect." }); return; }
  const email = normalizeEmail(body.data.email);
  const rate = await reserveAttempts(email, req.ip ?? "unknown", "signin");
  if (!rate.allowed) { res.set("Retry-After", String(rate.retryAfter)); res.status(429).json({ error: "Too many attempts. Please try again later." }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  const passwordFits = Buffer.byteLength(body.data.password, "utf8") <= 72;
  const matches = await checkPassword(body.data.password, user?.passwordHash ?? await dummyHash);
  if (!user || !matches || !passwordFits) {
    await slowFailures(rate.attempts);
    res.status(401).json({ error: "Email or password is incorrect." }); return;
  }
  await releaseSuccessfulAttempt(rate.keys);
  await startSession(user.id, req, res);
  res.json(GetSessionResponse.parse(await sessionInfo(req, res)));
});

authRouter.post("/signout", async (req, res) => {
  await endSession(req, res);
  res.sendStatus(204);
});

passRouter.post("/demo", async (req, res) => {
  // Both checks are mandatory. Never enable this endpoint in production.
  if (!demoPaymentsEnabled()) { res.status(403).json({ error: "Demo payments are disabled. No pass was granted." }); return; }
  const session = await readSession(req);
  if (!session) { res.status(401).json({ error: "Please sign in." }); return; }
  const body = GrantDemoPassBody.strict().safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Choose day, week or month." }); return; }
  await grantPass(session.user.id, body.data.plan, "demo");
  res.json(GetSessionResponse.parse(await sessionInfo(req, res)));
});
