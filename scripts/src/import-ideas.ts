import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "@workspace/db";
import { parseIdeasCsv } from "./ideas-csv";
import { replaceIdeas } from "./replace-ideas";

try {
  const file = process.argv[2];
  if (!file || process.argv.length !== 3) {
    throw new Error("Usage: pnpm import:ideas <file.csv>");
  }
  // Workspace-root paths work even though pnpm runs this package in scripts/.
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const path = resolve(process.env.INIT_CWD ?? root, file);
  const { ideas, skipped } = parseIdeasCsv(await readFile(path, "utf8"));
  await replaceIdeas(ideas);
  console.log(`Imported: ${ideas.length}. Skipped: ${skipped}. Matching ideas updated; missing ideas archived. Tips, prices and reports preserved.`);
} catch (error) {
  console.error("Import failed. No ideas were changed.", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
} finally {
  await pool.end();
}
