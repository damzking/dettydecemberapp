import { pool } from "@workspace/db";
try {
  const { rows } = await pool.query(`SELECT reference,plan,amount,currency,status,provider,created_at,paid_at
    FROM payments ORDER BY created_at DESC LIMIT 50`);
  console.table(rows);
} finally { await pool.end(); }
