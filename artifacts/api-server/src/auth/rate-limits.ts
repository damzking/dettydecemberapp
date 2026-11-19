import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { tokenHash } from "@workspace/db/accounts";

const HOUR = 3_600_000;

// Reserve attempts before hashing, so parallel requests cannot bypass the limit.
export async function reserveAttempts(email: string, ip: string, kind: "signin" | "signup") {
  const now = Date.now();
  const keys = [`${kind}:email:${tokenHash(email)}`, `${kind}:ip:${tokenHash(ip)}`];
  const limits = kind === "signin" ? [10, 30] : [5, 20];
  const rows = await db.transaction(async (tx) => {
    // Opportunistic cleanup; this is not a scheduled job.
    await tx.execute(sql`DELETE FROM auth_limits WHERE expires_at <= now()`);
    const result = [];
    for (const key of keys) {
      const row = await tx.execute<{ attempts: number; expires_at: Date }>(sql`
        INSERT INTO auth_limits (key, attempts, expires_at)
        VALUES (${key}, 1, ${new Date(now + HOUR).toISOString()}::timestamptz)
        ON CONFLICT (key) DO UPDATE SET attempts = auth_limits.attempts + 1
        RETURNING attempts, expires_at`);
      result.push(row.rows[0]!);
    }
    return result;
  });
  return {
    keys,
    allowed: rows.every((row, i) => row.attempts <= limits[i]!),
    attempts: Math.max(...rows.map((row) => row.attempts)),
    retryAfter: Math.max(1, Math.ceil((Math.max(...rows.map((row) => new Date(row.expires_at).getTime())) - now) / 1000)),
  };
}

export async function releaseSuccessfulAttempt(keys: string[]) {
  for (const key of keys) {
    await db.execute(sql`UPDATE auth_limits SET attempts = greatest(attempts - 1, 0) WHERE key = ${key}`);
  }
}

export const slowFailures = (attempts: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, Math.min(4000, 250 * 2 ** Math.min(attempts - 1, 4))));
