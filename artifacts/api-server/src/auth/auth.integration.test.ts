import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { test } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import { db, pool, usersTable, passesTable, sessionsTable, authLimitsTable, reportsTable } from "@workspace/db";
import { checkPassword, grantPass, passExpiry, tokenHash } from "@workspace/db/accounts";
import { demoPaymentsEnabled, supportWhatsappUrl } from "./security";
import { reserveAttempts, releaseSuccessfulAttempt } from "./rate-limits";
import { GetSessionResponse } from "@workspace/api-zod";
import app from "../app";

test("stage-three access, sessions, passwords and rate limits", async () => {
  const email = `stage3-${randomUUID()}@example.invalid`;
  const secret = `${randomUUID()}-test`;
  let cookie = "";
  let accountId: string | undefined;
  let reportId: string | undefined;
  const syntheticKeys: string[] = [];
  const initialCounts = await db.execute(sql`SELECT
    (SELECT count(*) FROM ideas)::int AS ideas, (SELECT count(*) FROM tips)::int AS tips,
    (SELECT count(*) FROM price_items)::int AS prices, (SELECT count(*) FROM reports)::int AS reports`);
  async function request(path: string, body?: object, useCookie = true, extraHeaders?: Record<string, string>) {
    return fetch(`http://localhost:80/api${path}`, {
      method: body ? "POST" : "GET",
      headers: { "content-type": "application/json", "x-guide-client": "app", ...(useCookie && cookie ? { cookie } : {}), ...extraHeaders },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }
  const dataPaths = ["/guide/ideas", "/guide/tips", "/guide/prices"];
  try {
    for (const path of dataPaths) assert.equal((await request(path)).status, 401);
    assert.equal((await request("/guide/reports", { ideaId: "lagos-coffee-1", note: "test" })).status, 401);
    assert.equal((await request("/auth/signup", { email, emailAgain: "wrong@example.invalid", password: secret })).status, 400);
    assert.equal((await request("/auth/signup", { email, emailAgain: email, password: "too-short" })).status, 400);
    const signup = await request("/auth/signup", { email: email.toUpperCase(), emailAgain: email, password: secret });
    assert.equal(signup.status, 201);
    const account = GetSessionResponse.parse(await signup.json());
    assert.ok(account.user);
    accountId = account.user.id;
    assert.equal(account.user.email, email);
    assert.equal(account.user.emailVerified, false);
    assert.equal(account.user.isAdmin, false);
    assert.equal(account.pass, null);
    assert.equal(account.demoPayments, false);
    const header = signup.headers.get("set-cookie")!;
    assert.match(header, /HttpOnly/i); assert.match(header, /Secure/i); assert.match(header, /SameSite=Lax/i);
    assert.match(header, /Expires=/i);
    cookie = header.match(/detty_session=[A-Za-z0-9_-]+/)![0];
    const [stored] = await db.select().from(usersTable).where(eq(usersTable.id, accountId!));
    assert.match(stored!.passwordHash, /^\$2[aby]\$12\$/);
    assert.notEqual(stored!.passwordHash, secret);
    assert.equal(await checkPassword(secret, stored!.passwordHash), true);
    const dup = await request("/auth/signup", { email, emailAgain: email, password: secret });
    assert.equal(dup.status, 409);
    for (const path of dataPaths) assert.equal((await request(path)).status, 403);
    assert.equal((await request("/guide/reports", { ideaId: "lagos-coffee-1", note: "test" })).status, 403);
    assert.equal((await request("/passes/demo", { plan: "month" })).status, 403);
    assert.equal((await db.select().from(passesTable).where(eq(passesTable.userId, accountId!))).length, 0);
    // Clients cannot promote themselves. A trusted database flag grants access
    // without creating a paid pass, and revocation takes effect immediately.
    assert.equal((await request("/auth/signup", { email, emailAgain: email, password: secret, isAdmin: true })).status, 400);
    assert.equal((await request("/auth/signin", { email, password: secret, isAdmin: true })).status, 400);
    await db.update(usersTable).set({ isAdmin: true }).where(eq(usersTable.id, accountId!));
    for (const path of dataPaths) assert.equal((await request(path)).status, 200);
    const adminInfo = GetSessionResponse.parse(await (await request("/auth/session")).json());
    assert.equal(adminInfo.user?.isAdmin, true);
    assert.equal(adminInfo.pass, null);
    const adminReport = await request("/guide/reports", { ideaId: "lagos-coffee-1", note: `admin-check-${email}` });
    assert.equal(adminReport.status, 201);
    reportId = (await adminReport.json() as { id: string }).id;
    await db.delete(reportsTable).where(eq(reportsTable.id, reportId));
    reportId = undefined;
    assert.equal((await request("/guide/ideas", undefined, false)).status, 401);
    await db.update(usersTable).set({ isAdmin: false }).where(eq(usersTable.id, accountId!));
    for (const path of dataPaths) assert.equal((await request(path)).status, 403);
    // A short-lived test listener exercises both settings without changing the
    // real workflow's environment or enabling demo payments for other users.
    const listener = app.listen(0, "127.0.0.1");
    await once(listener, "listening");
    const address = listener.address();
    assert.ok(address && typeof address !== "string");
    const nodeMode = process.env.NODE_ENV;
    const demoMode = process.env.DEMO_PAYMENTS;
    try {
      process.env.DEMO_PAYMENTS = "true";
      const sendDemo = () => fetch(`http://127.0.0.1:${address.port}/api/passes/demo`, {
        method: "POST", headers: { cookie, "x-guide-client": "app", "content-type": "application/json" },
        body: JSON.stringify({ plan: "day" }),
      });
      process.env.NODE_ENV = "production";
      assert.equal((await sendDemo()).status, 403);
      process.env.NODE_ENV = "development";
      const granted = await sendDemo();
      assert.equal(granted.status, 200);
      assert.equal(GetSessionResponse.parse(await granted.json()).pass?.source, "demo");
      await db.delete(passesTable).where(and(eq(passesTable.userId, accountId!), eq(passesTable.source, "demo")));
    } finally {
      if (nodeMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = nodeMode;
      if (demoMode === undefined) delete process.env.DEMO_PAYMENTS; else process.env.DEMO_PAYMENTS = demoMode;
      await new Promise<void>((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
    }

    const wrong = await request("/auth/signin", { email, password: "wrong-password" }, false);
    const unknown = await request("/auth/signin", { email: `absent-${email}`, password: "wrong-password" }, false);
    assert.equal(wrong.status, 401); assert.equal(unknown.status, 401);
    assert.deepEqual(await wrong.json(), await unknown.json());
    const signin = await request("/auth/signin", { email, password: secret });
    assert.equal(signin.status, 200);
    const oldCookie = cookie;
    cookie = signin.headers.get("set-cookie")!.match(/detty_session=[A-Za-z0-9_-]+/)![0];
    assert.notEqual(oldCookie, cookie);
    assert.equal((await request("/guide/ideas", undefined, false, { cookie: oldCookie })).status, 401);

    const start = new Date("2030-01-01T00:00:00Z");
    for (const [plan, days] of [["day", 1], ["week", 7], ["month", 30]] as const) {
      assert.equal(passExpiry(plan, start).getTime() - start.getTime(), days * 86_400_000);
    }
    const pass = await grantPass(accountId!, "week", "manual");
    for (const path of dataPaths) assert.equal((await request(path)).status, 200);
    const savedReport = await request("/guide/reports", { ideaId: "lagos-coffee-1", note: `auth-check-${email}` });
    assert.equal(savedReport.status, 201);
    const report = await savedReport.json() as { id: string };
    reportId = report.id;
    const [storedReport] = await db.select().from(reportsTable).where(eq(reportsTable.id, reportId));
    assert.equal(storedReport?.note, `auth-check-${email}`);
    await db.delete(reportsTable).where(eq(reportsTable.id, reportId));
    reportId = undefined;
    const current = await request("/auth/session");
    assert.equal(GetSessionResponse.parse(await current.json()).pass?.id, pass.id);
    assert.match(current.headers.get("set-cookie")!, /Expires=/i);
    const malicious = await request("/guide/reports", { ideaId: "lagos-coffee-1", note: "test" }, true, { origin: "https://evil.example" });
    assert.equal(malicious.status, 403);
    await db.update(passesTable).set({ startsAt: new Date(Date.now() - 172800000), expiresAt: new Date(Date.now() - 86400000) }).where(eq(passesTable.id, pass.id));
    for (const path of dataPaths) assert.equal((await request(path)).status, 403);
    assert.equal((await request("/guide/reports", { ideaId: "lagos-coffee-1", note: "test" })).status, 403);
    assert.equal((await request("/auth/signout", {})).status, 204);
    assert.equal((await request("/guide/ideas")).status, 401);
    assert.equal((await db.select().from(sessionsTable).where(eq(sessionsTable.userId, accountId!))).length, 0);
    // A local-storage pass or forged cookie is never accepted by the server.
    assert.equal((await request("/guide/ideas", undefined, false, { cookie: `detty_session=${"a".repeat(43)}` })).status, 401);

    const ip = `test-${randomUUID()}`;
    const rateEmail = `rate-${email}`;
    const first = await reserveAttempts(rateEmail, ip, "signin");
    syntheticKeys.push(...first.keys);
    await releaseSuccessfulAttempt(first.keys);
    for (let i = 0; i < 10; i++) assert.equal((await reserveAttempts(rateEmail, ip, "signin")).allowed, true);
    assert.equal((await reserveAttempts(rateEmail, `${ip}-other`, "signin")).allowed, false);
    syntheticKeys.push(`signin:ip:${tokenHash(`${ip}-other`)}`);
    for (let i = 0; i < 20; i++) {
      const r = await reserveAttempts(`${i}-${email}`, ip, "signin");
      syntheticKeys.push(r.keys[0]!);
    }
    const ipBlocked = await reserveAttempts(`blocked-${email}`, ip, "signin");
    syntheticKeys.push(ipBlocked.keys[0]!);
    assert.equal(ipBlocked.allowed, false);

    const beforeNode = process.env.NODE_ENV;
    const beforeDemo = process.env.DEMO_PAYMENTS;
    try {
      process.env.NODE_ENV = "production"; process.env.DEMO_PAYMENTS = "true";
      assert.equal(demoPaymentsEnabled(), false);
      process.env.NODE_ENV = "development"; delete process.env.DEMO_PAYMENTS;
      assert.equal(demoPaymentsEnabled(), false);
      process.env.DEMO_PAYMENTS = "TRUE"; assert.equal(demoPaymentsEnabled(), false);
      process.env.DEMO_PAYMENTS = "true"; assert.equal(demoPaymentsEnabled(), true);
    } finally {
      if (beforeNode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = beforeNode;
      if (beforeDemo === undefined) delete process.env.DEMO_PAYMENTS; else process.env.DEMO_PAYMENTS = beforeDemo;
    }
    if (process.env.SUPPORT_WHATSAPP_NUMBER) {
      assert.equal(new URL(supportWhatsappUrl()!).searchParams.get("text"), "Hi, I forgot my password for Detty December Guide. My account email is: ");
    }
    const finalCounts = await db.execute(sql`SELECT
      (SELECT count(*) FROM ideas)::int AS ideas, (SELECT count(*) FROM tips)::int AS tips,
      (SELECT count(*) FROM price_items)::int AS prices, (SELECT count(*) FROM reports)::int AS reports`);
    assert.deepEqual(finalCounts.rows, initialCounts.rows);
  } finally {
    if (reportId) await db.delete(reportsTable).where(eq(reportsTable.id, reportId));
    if (accountId) await db.delete(usersTable).where(eq(usersTable.id, accountId));
    for (const key of [
      ...syntheticKeys, `signup:email:${tokenHash(email)}`, `signin:email:${tokenHash(email)}`,
      `signin:email:${tokenHash(`absent-${email}`)}`,
    ]) await db.delete(authLimitsTable).where(eq(authLimitsTable.key, key));
    await pool.end();
  }
});
