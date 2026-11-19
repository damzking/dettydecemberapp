import { sql } from "drizzle-orm";
import { db, pool, ideasTable, tipsTable, priceItemsTable } from "@workspace/db";
import { sampleIdeas, sampleTips, samplePrices } from "@workspace/db/seed-data";

// Run explicitly on an empty database; never overwrite edited content.
try {
  await db.transaction(async (tx) => {
    if ((await tx.select().from(ideasTable).limit(1)).length === 0) {
      await tx.insert(ideasTable).values(sampleIdeas);
    }
    if ((await tx.select().from(tipsTable).limit(1)).length === 0) {
      await tx.insert(tipsTable).values(sampleTips);
    }
    if ((await tx.select().from(priceItemsTable).limit(1)).length === 0) {
      await tx.insert(priceItemsTable).values(samplePrices);
    }
  });
  const result = await db.execute(sql`SELECT
    (SELECT count(*) FROM ideas)::int AS ideas,
    (SELECT count(*) FROM tips)::int AS tips,
    (SELECT count(*) FROM price_items)::int AS prices`);
  console.log("Seed finished. Existing content was not changed.", result.rows[0]);
} catch (error) {
  console.error("Seed failed. No changes were committed.", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
} finally {
  await pool.end();
}
