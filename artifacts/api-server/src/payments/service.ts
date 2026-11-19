import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import { getProvider, providerName, type Payment } from "./provider";
import { logger } from "../lib/logger";

const prices = { day: 300, week: 600, month: 1000 } as const;
const days = { day: 1, week: 7, month: 30 } as const;
export async function startPayment(userId: string, plan: string, origin: string) {
  if (!Object.hasOwn(prices, plan)) throw new Error("Choose day, week or month.");
  const provider = providerName();
  const reference = randomUUID();
  const payment: Payment = { reference, user_id: userId, plan: plan as keyof typeof prices,
  amount: prices[plan as keyof typeof prices], currency: (process.env.PAYMENT_CURRENCY ?? "USD").toUpperCase(), provider, provider_id: null, mock_status: "pending" };
  await pool.query(`INSERT INTO payments(id,user_id,plan,amount,currency,reference,provider)
    VALUES($1,$2,$3,$4,$5,$1,$6)`, [reference,userId,plan,payment.amount,payment.currency,provider]);
  try {
    const result = await (await getProvider()).startPayment(payment, `${origin}/payment-return?reference=${reference}`);
    await pool.query("UPDATE payments SET provider_id=$2 WHERE reference=$1", [reference,result.id]);
    logger.info({ event: "payment.started", reference, provider });
    return { reference, checkoutUrl: result.url };
  } catch {
    await pool.query("UPDATE payments SET status='failed' WHERE reference=$1", [reference]);
    logger.warn({ event: "payment.rejected", reference, reason: "initialization" });
    throw new Error("Checkout could not be started. No pass was granted.");
  }
}

// Both the return screen and webhook enter here. Only this function grants paid passes.
export async function confirmPayment(reference: string, userId?: string) {
  const { rows } = await pool.query("SELECT * FROM payments WHERE reference=$1", [reference]);
  const payment = rows[0] as Payment & { status: string; pass_id: string };
  if (!payment || (userId && payment.user_id !== userId)) throw new Error("Payment not found.");
  if (payment.amount !== prices[payment.plan] || payment.currency !== (process.env.PAYMENT_CURRENCY ?? "USD").toUpperCase()) {
    throw new Error("Stored payment does not match the server price.");
  }
  if (payment.provider !== providerName()) throw new Error("Payment provider is disabled.");
  const verified = await (await getProvider()).confirmPayment(reference, payment);
  if (verified.reference !== reference || verified.amount !== payment.amount || verified.currency !== payment.currency) {
    logger.warn({ event: "payment.rejected", reference, reason: "verification mismatch" });
    throw new Error("Payment verification failed.");
  }
  if (verified.status !== "success") {
    const status = ["failed","abandoned"].includes(verified.status) ? verified.status : "pending";
    await pool.query("UPDATE payments SET status=$2 WHERE reference=$1 AND status!='success'", [reference,status]);
    if (status !== "pending") logger.info({ event: "payment.rejected", reference, reason: status });
    return { reference, status };
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Lock the user as well as the reference so simultaneous purchases queue correctly.
    await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [payment.user_id]);
    const locked = await client.query("SELECT * FROM payments WHERE reference=$1 FOR UPDATE", [reference]);
    if (locked.rows[0].status === "success") {
      await client.query("COMMIT");
      logger.info({ event: "payment.duplicate", reference });
      return { reference, status: "success" };
    }
    const times = await client.query(`SELECT greatest(now(),coalesce(max(expires_at),now())) AS start
      FROM passes WHERE user_id=$1 AND expires_at>now()`, [payment.user_id]);
    const start = new Date(times.rows[0].start);
    const end = new Date(start.getTime() + days[payment.plan] * 86400000);
    const passId = randomUUID();
    await client.query(`INSERT INTO passes(id,user_id,plan,starts_at,expires_at,source)
      VALUES($1,$2,$3,$4,$5,$6)`, [passId,payment.user_id,payment.plan,start,end,payment.provider]);
    await client.query(`UPDATE payments SET status='success',pass_id=$2,provider_payment_id=$3,paid_at=now()
      WHERE reference=$1`, [reference,passId,verified.paymentId]);
    await client.query(`UPDATE sessions SET expires_at=greatest(expires_at,$2)
      WHERE user_id=$1 AND expires_at>now()`, [payment.user_id,end]);
    await client.query("COMMIT");
    logger.info({ event: "payment.confirmed", reference });
    return { reference, status: "success" };
  } catch (error) {
    await client.query("ROLLBACK"); throw error;
  } finally { client.release(); }
}
