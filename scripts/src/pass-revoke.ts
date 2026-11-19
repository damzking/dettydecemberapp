import { pool } from "@workspace/db";
import { normalizeEmail } from "@workspace/db/accounts";
const client = await pool.connect();
try {
  const [email, ...extra] = process.argv.slice(2);
  if (!email || extra.length) throw new Error("Usage: pnpm pass:revoke <email>");
  await client.query("BEGIN");
  const user = await client.query("SELECT id FROM users WHERE email=$1 FOR UPDATE", [normalizeEmail(email)]);
  if (!user.rowCount) throw new Error("Account not found.");
  // Shift queued starts backwards to preserve the existing valid-dates constraint.
  const result = await client.query(`UPDATE passes SET
    starts_at=least(starts_at,now()-interval '1 millisecond'),expires_at=now()
    WHERE user_id=$1 AND expires_at>now()`, [user.rows[0].id]);
  await client.query("DELETE FROM sessions WHERE user_id=$1", [user.rows[0].id]);
  await client.query("COMMIT");
  console.log(`Revoked ${result.rowCount} passes and signed the account out. No money was refunded. Admin access is unchanged.`);
} catch (error) {
  await client.query("ROLLBACK");
  console.error(error instanceof Error ? error.message : "Revoke failed."); process.exitCode=1;
} finally { client.release(); await pool.end(); }
