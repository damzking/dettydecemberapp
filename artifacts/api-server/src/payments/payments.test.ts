import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import { startPayment, confirmPayment } from "./service";
import { getProvider, mockSignature, providerName, validMockSignature } from "./provider";
import app from "../app";

test("mock payment invariants without any provider network requests", async () => {
  const userId = randomUUID();
  process.env.NODE_ENV="development";
  process.env.PAYMENT_PROVIDER="mock";
  process.env.MOCK_WEBHOOK_SECRET=randomUUID();
  const server=app.listen(0);
  await new Promise<void>(resolve=>server.once("listening",resolve));
  const address=server.address() as {port:number};
  const endpoint=`http://127.0.0.1:${address.port}/api/payments/webhooks/mock`;
  await pool.query("INSERT INTO users(id,email,password_hash) VALUES($1,$2,'not-a-login')", [userId, `${userId}@example.invalid`]);
  try {
    const success = await startPayment(userId,"day","http://localhost");
    assert.equal((await confirmPayment(success.reference,userId)).status,"pending");
    await assert.rejects(confirmPayment(success.reference,"another-user"));
    await assert.rejects(confirmPayment("nonexistent",userId));
    await assert.rejects(startPayment(userId,"free","http://localhost"));
    await pool.query("UPDATE payments SET mock_status='success' WHERE reference=$1",[success.reference]);
    const body = Buffer.from(JSON.stringify({type:"payment.succeeded",reference:success.reference}));
    assert.equal(validMockSignature(body,mockSignature(body)),true);
    assert.equal(validMockSignature(Buffer.from("tampered"),mockSignature(body)),false);
    assert.equal(validMockSignature(body,"0".repeat(128)),false);
    assert.equal((await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json","x-mock-signature":"0".repeat(128)},body})).status,401);
    for(let i=0;i<2;i++) assert.equal((await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json","x-mock-signature":mockSignature(body)},body})).status,200);
    await Promise.all(Array.from({length:6},()=>confirmPayment(success.reference,userId)));
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM passes WHERE user_id=$1",[userId])).rows[0].n,1);
    const next = await startPayment(userId,"week","http://localhost");
    await pool.query("UPDATE payments SET mock_status='success' WHERE reference=$1",[next.reference]);
    await confirmPayment(next.reference,userId);
    const passes=(await pool.query("SELECT * FROM passes WHERE user_id=$1 ORDER BY starts_at",[userId])).rows;
    assert.equal(+passes[0].expires_at-+passes[0].starts_at,86400000);
    assert.equal(+passes[1].starts_at,+passes[0].expires_at);
    assert.equal(+passes[1].expires_at-+passes[1].starts_at,7*86400000);
    for(const status of ["failed","abandoned"]) {
      const p=await startPayment(userId,"month","http://localhost");
      await pool.query("UPDATE payments SET mock_status=$2 WHERE reference=$1",[p.reference,status]);
      assert.equal((await confirmPayment(p.reference,userId)).status,status);
    }
    const closed=await startPayment(userId,"month","http://localhost");
    assert.equal((await confirmPayment(closed.reference,userId)).status,"pending");
    const provider=await getProvider();
    const original=provider.confirmPayment;
    for(const wrong of [{amount:1},{currency:"NGN"},{reference:"another-reference"}]) {
      const spy=mock.method(provider,"confirmPayment",async (ref: string,payment: any)=>({
        ...await original(ref,payment),status:"success",...wrong,
      }));
      await assert.rejects(confirmPayment(closed.reference,userId));
      spy.mock.restore();
    }
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM passes WHERE user_id=$1",[userId])).rows[0].n,2);
    process.env.NODE_ENV="production";
    assert.throws(()=>providerName());
    process.env.PAYMENT_PROVIDER="whop"; assert.throws(()=>providerName());
    process.env.NODE_ENV="development";
    process.env.PAYMENT_PROVIDER="disabled"; assert.throws(()=>providerName());
    console.log("Passed: pending/closed tab, success, decline, abandonment, foreign/missing reference, invalid plan, signed/tampered webhook, concurrent duplicates, queued UTC durations, production/disabled guards.");
  } finally {
    await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
    await pool.query("DELETE FROM payments WHERE user_id=$1",[userId]);
    await pool.query("DELETE FROM passes WHERE user_id=$1",[userId]);
    await pool.query("DELETE FROM users WHERE id=$1",[userId]);
    await pool.end();
  }
});
