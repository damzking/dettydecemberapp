import { db, ideasTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { ideaKey, type ImportedIdea } from "./ideas-csv";

// One transaction makes replacement all-or-nothing, even if an insert fails.
export async function replaceIdeas(ideas: ImportedIdea[], database: Pick<typeof db, "transaction"> = db) {
  await database.transaction(async (tx) => {
    await tx.execute(sql`LOCK TABLE ideas IN ACCESS EXCLUSIVE MODE`);
    const existing = await tx.select().from(ideasTable);
    const idsByKey = new Map<string, string>();
    for (const row of existing) {
      const key = ideaKey(row.city, row.category, row.title);
      if (idsByKey.has(key)) throw new Error("Existing ideas have duplicate city/category/name identities.");
      idsByKey.set(key, row.id);
    }
    // Hide ideas missing from the new catalogue without deleting report targets.
    await tx.update(ideasTable).set({ status: "Archived" });
    for (const idea of ideas) {
      const key = ideaKey(idea.city, idea.category, idea.title);
      // Preserve IDs created before this import scheme, including stage-one IDs.
      const id = idsByKey.get(key) ?? idea.id;
      const { id: _csvId, ...values } = idea;
      await tx.insert(ideasTable).values({ ...values, id })
        .onConflictDoUpdate({ target: ideasTable.id, set: values });
    }
  });
}
