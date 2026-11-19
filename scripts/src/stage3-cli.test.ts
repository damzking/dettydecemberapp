import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { eq } from "drizzle-orm";
import { db, pool, usersTable, passesTable, sessionsTable } from "@workspace/db";
import { checkPassword, hashPassword } from "@workspace/db/accounts";

const exec = promisify(execFile);
const cwd = fileURLToPath(new URL("../../", import.meta.url));

test("manual grant and hidden password reset commands work", async () => {
  const id = randomUUID();
  const email = `stage3-cli-${id}@example.invalid`;
  const before = randomUUID();
  const after = randomUUID();
  try {
    await db.insert(usersTable).values({ id, email, passwordHash: await hashPassword(before) });
    await db.insert(sessionsTable).values({ tokenHash: randomUUID(), userId: id, expiresAt: new Date(Date.now() + 3600000) });
    await exec("pnpm", ["pass:grant", email.toUpperCase(), "month"], { cwd });
    const [pass] = await db.select().from(passesTable).where(eq(passesTable.userId, id));
    assert.equal(pass!.plan, "month");
    assert.equal(pass!.source, "manual");
    assert.equal(pass!.expiresAt.getTime() - pass!.startsAt.getTime(), 30 * 86_400_000);

    // A real pseudoterminal exercises hidden interactive input, without logging it.
    await new Promise<void>((resolve, reject) => {
      const child = spawn("script", ["-q", "-c", `pnpm user:set-password ${email}`, "/dev/null"], { cwd });
      let transcript = "";
      let step = 0;
      const timeout = setTimeout(() => { child.kill(); reject(new Error("Hidden password prompt timed out.")); }, 30000);
      child.stdout.on("data", (data) => {
        transcript += String(data);
        if (step === 0 && transcript.includes("New password (hidden)")) {
          step = 1;
          child.stdin.write(`${after}\r`);
        } else if (step === 1 && transcript.includes("Type the new password again (hidden)")) {
          step = 2;
          child.stdin.write(`${after}\r`);
        }
      });
      child.on("error", () => { clearTimeout(timeout); reject(new Error("Could not start the pseudoterminal test.")); });
      child.on("close", (code) => {
        clearTimeout(timeout);
        if (code !== 0 || !transcript.includes("Password reset.")) {
          reject(new Error("Hidden password reset command failed.")); return;
        }
        assert.equal(transcript.includes(after), false, "The hidden password must never be echoed.");
        resolve();
      });
    });
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    assert.equal(await checkPassword(after, user!.passwordHash), true);
    assert.equal(await checkPassword(before, user!.passwordHash), false);
    assert.equal((await db.select().from(sessionsTable).where(eq(sessionsTable.userId, id))).length, 0);
  } finally {
    await db.delete(usersTable).where(eq(usersTable.id, id));
    await pool.end();
  }
});
