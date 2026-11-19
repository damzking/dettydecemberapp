import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { asc, ne } from "drizzle-orm";
import { db, pool, ideasTable, tipsTable, priceItemsTable } from "@workspace/db";
import { CreateReportBody, CreateReportResponse, ListIdeasResponse, ListTipsResponse, ListPriceItemsResponse } from "@workspace/api-zod";

export const guideRouter: IRouter = Router();

// All data routes live here. A future pass middleware belongs at this boundary.
// No pass check, login or payment enforcement is implemented in stage two.
guideRouter.get("/ideas", async (_req, res) => {
  const rows = await db.select().from(ideasTable)
    .where(ne(ideasTable.status, "Archived")).orderBy(asc(ideasTable.id));
  // Preserve stage-one city/category ordering without adding database columns.
  const cities = ["Lagos", "Abuja"];
  const categories = ["Coffee", "Parties", "Sports", "Events"];
  rows.sort((a, b) => cities.indexOf(a.city) - cities.indexOf(b.city)
    || categories.indexOf(a.category) - categories.indexOf(b.category)
    || a.id.localeCompare(b.id));
  res.json(ListIdeasResponse.parse(rows.map(({ dateChecked, seller, ...idea }) => ({
    ...idea, verified: dateChecked, ...(seller ? { seller } : {}),
  }))));
});

guideRouter.get("/tips", async (_req, res) => {
  const rows = await db.select().from(tipsTable).orderBy(asc(tipsTable.id));
  res.json(ListTipsResponse.parse(rows));
});

guideRouter.get("/prices", async (_req, res) => {
  const rows = await db.select().from(priceItemsTable).orderBy(asc(priceItemsTable.id));
  res.json(ListPriceItemsResponse.parse(rows.map((row) => ({
    id: row.id, item: row.label, price: row.rangeText, lastChecked: row.lastChecked,
  }))));
});

guideRouter.post("/reports", async (req, res) => {
  const body = CreateReportBody.strict().safeParse(req.body);
  if (!body.success || !body.data.note.trim() || !body.data.ideaId.trim()) {
    res.status(400).json({ error: "Provide a valid ideaId and a note of 1–2000 characters." });
    return;
  }
  // INSERT ... SELECT checks existence and writes the report in one statement.
  const result = await pool.query(
    `INSERT INTO reports (id, idea_id, note)
     SELECT $1, id, $3 FROM ideas WHERE id = $2 AND status <> 'Archived'
     RETURNING id, idea_id AS "ideaId", note, created_at AS "createdAt"`,
    [randomUUID(), body.data.ideaId, body.data.note.trim()],
  );
  const row = result.rows[0];
  if (!row) {
    res.status(404).json({ error: "This idea is no longer available." });
    return;
  }
  res.status(201).json(CreateReportResponse.parse({ ...row, createdAt: row.createdAt.toISOString() }));
});
