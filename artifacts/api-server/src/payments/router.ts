import { Router, raw } from "express";
import { pool } from "@workspace/db";
import { readSession, sessionInfo } from "../auth/sessions";
import { startPayment, confirmPayment } from "./service";
import { providerName, validMockSignature } from "./provider";
import { logger } from "../lib/logger";
import { Webhook } from "standardwebhooks";

export const paymentRouter = Router();
paymentRouter.use(async (req, res, next) => {
  if (!await readSession(req)) { res.status(401).json({ error: "Please sign in." }); return; }
  next();
});
paymentRouter.post("/start", async (req, res) => {
  try {
    const session = (await readSession(req))!;
    const origin = process.env.APP_ORIGIN;
    if (!origin || !/^https?:\/\//.test(origin)) throw new Error("Checkout return address is not configured.");
    if (Object.keys(req.body).some(k => k !== "plan")) throw new Error("Only a plan is accepted.");
    res.json(await startPayment(session.user.id, req.body.plan, origin.replace(/\/$/, "")));
  } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Checkout unavailable." }); }
});
paymentRouter.post("/:reference/confirm", async (req, res) => {
  try {
    const session = (await readSession(req))!;
    const result = await confirmPayment(String(req.params.reference), session.user.id);
    res.json({ ...result, session: await sessionInfo(req, res) });
  } catch { res.status(400).json({ error: "Payment could not be confirmed." }); }
});
paymentRouter.post("/:reference/mock", async (req, res) => {
  if (providerName() !== "mock") { res.sendStatus(404); return; }
  const status = req.body.status;
  if (!["success","failed","abandoned"].includes(status)) { res.sendStatus(400); return; }
  const session = (await readSession(req))!;
  const updated = await pool.query(`UPDATE payments SET mock_status=$3
    WHERE reference=$1 AND user_id=$2 AND provider='mock' AND status!='success' RETURNING reference`,
    [req.params.reference, session.user.id, status]);
  if (!updated.rowCount) { res.sendStatus(404); return; }
  res.json({ reference: req.params.reference, status });
});

export const paymentWebhook = Router();
paymentWebhook.post("/whop", raw({ type: "application/json", limit: "64kb" }), (req, res) => {
  try {
    if (providerName() !== "whop" || process.env.WHOP_ENVIRONMENT !== "sandbox"
      || !process.env.WHOP_SANDBOX_WEBHOOK_SECRET || !Buffer.isBuffer(req.body)) { res.sendStatus(403); return; }
    const event = new Webhook(process.env.WHOP_SANDBOX_WEBHOOK_SECRET).verify(req.body.toString("utf8"), {
      "webhook-id": req.get("webhook-id") ?? "",
      "webhook-timestamp": req.get("webhook-timestamp") ?? "",
      "webhook-signature": req.get("webhook-signature") ?? "",
    }) as { type: string; data?: { metadata?: { reference?: string } } };
    res.sendStatus(200);
    if (event.type === "payment.succeeded" && typeof event.data?.metadata?.reference === "string") {
      void confirmPayment(event.data.metadata.reference).catch(() =>
        logger.warn({ event: "payment.rejected", reason: "whop webhook verification" }));
    }
  } catch {
    logger.warn({ event: "payment.rejected", reason: "whop webhook signature" });
    res.sendStatus(401);
  }
});
paymentWebhook.post("/mock", raw({ type: "application/json", limit: "16kb" }), (req, res) => {
  try {
    if (!Buffer.isBuffer(req.body) || !validMockSignature(req.body, req.get("x-mock-signature"))) {
      logger.warn({ event: "payment.rejected", reason: "webhook signature" });
      res.sendStatus(401); return;
    }
    const event = JSON.parse(req.body.toString("utf8"));
    if (typeof event.reference !== "string" || event.type !== "payment.succeeded") { res.sendStatus(400); return; }
    res.sendStatus(200);
    void confirmPayment(event.reference).catch(() => logger.warn({ event: "payment.rejected", reason: "webhook confirmation" }));
  } catch { res.sendStatus(401); }
});
