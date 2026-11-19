import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db, pool, ideasTable, tipsTable, priceItemsTable, reportsTable } from "@workspace/db";
import { eq, ne } from "drizzle-orm";
import { parseIdeasCsv, CSV_COLUMNS, type ImportedIdea } from "./ideas-csv";
import { replaceIdeas } from "./replace-ideas";

after(() => pool.end());
const csv = CSV_COLUMNS.join(",") + "\nLagos,Events,[Test event],[Area],[PRICE],[Blurb],[Source],[DATE],Verified,[Checker]";

test("replacement and repeat imports preserve reports, tips and prices; failures roll back", async () => {
  const rollback = new Error("End test without persisting fixtures");
  try {
    await db.transaction(async (tx) => {
      const oldTips = await tx.select().from(tipsTable);
      const oldPrices = await tx.select().from(priceItemsTable);
      const oldIdea = (await tx.select().from(ideasTable).limit(1))[0]!;
      const report = { id: randomUUID(), ideaId: oldIdea.id, note: "[Database import test]" };
      await tx.insert(reportsTable).values(report);
      const { ideas } = parseIdeasCsv(csv);

      await replaceIdeas(ideas, tx);
      assert.equal((await tx.select().from(ideasTable).where(ne(ideasTable.status, "Archived"))).length, 1);
      const result = (await tx.select().from(ideasTable).where(eq(ideasTable.id, ideas[0]!.id)))[0]!;
      assert.equal(result.title, "[Test event]");
      assert.equal(result.seller, "Tix");
      assert.equal(result.status, "Verified");
      assert.deepEqual(await tx.select().from(tipsTable), oldTips);
      assert.deepEqual(await tx.select().from(priceItemsTable), oldPrices);
      assert.ok((await tx.select().from(reportsTable)).some((r) => r.id === report.id && r.ideaId === oldIdea.id));
      assert.equal((await tx.select().from(ideasTable).where(eq(ideasTable.id, oldIdea.id)))[0]!.status, "Archived");

      await replaceIdeas(ideas, tx);
      assert.equal((await tx.select().from(ideasTable).where(eq(ideasTable.id, result.id)))[0]!.id, result.id);
      await replaceIdeas([{ ...ideas[0]!, area: "[Updated area]", blurb: "[Updated blurb]" }], tx);
      const updated = (await tx.select().from(ideasTable).where(eq(ideasTable.id, result.id)))[0]!;
      assert.equal(updated.area, "[Updated area]");
      assert.equal(updated.blurb, "[Updated blurb]");
      const beforeFailure = await tx.select().from(ideasTable).orderBy(ideasTable.id);
      // Force failure on the second upsert, after the first row has changed.
      const broken = { ...ideas[0]!, id: "broken", title: "[Broken]", priceLevel: null } as unknown as ImportedIdea;
      await assert.rejects(() => replaceIdeas([{ ...ideas[0]!, blurb: "[Changed]" }, broken], tx));
      assert.deepEqual(await tx.select().from(ideasTable).orderBy(ideasTable.id), beforeFailure);
      // Match a stage-one identity and keep its original ID, even after archival.
      await replaceIdeas([{ ...ideas[0]!, city: oldIdea.city, category: oldIdea.category, title: oldIdea.title }], tx);
      assert.equal((await tx.select().from(ideasTable).where(ne(ideasTable.status, "Archived")))[0]!.id, oldIdea.id);
      // The foreign key also rejects deletion of an idea referenced by a report.
      await assert.rejects(() => tx.transaction(async (inner) => { await inner.delete(ideasTable).where(eq(ideasTable.id, oldIdea.id)); }));
      await replaceIdeas([], tx);
      assert.equal((await tx.select().from(ideasTable).where(ne(ideasTable.status, "Archived"))).length, 0);
      assert.ok((await tx.select().from(ideasTable)).length > 0);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
});
