import { createHash } from "node:crypto";
import { parse } from "csv-parse/sync";

export const CSV_COLUMNS = [
  "City", "Category", "Name", "Area", "Price level", "One line",
  "Source or link", "Date checked", "Status", "Checked by",
];

export interface ImportedIdea {
  id: string; city: string; category: string; title: string; area: string;
  priceLevel: string; blurb: string; seller: string | null;
  status: string; dateChecked: string; source: string;
}

// Names are case-insensitive; edits to area, prices and copy do not change identity.
export function ideaKey(city: string, category: string, title: string) {
  return JSON.stringify([city, category, title].map((s) => s.normalize("NFKC").trim().toLowerCase()));
}

// Parse and validate the entire file before opening a database transaction.
export function parseIdeasCsv(csv: string): { ideas: ImportedIdea[]; skipped: number } {
  const rows = parse(csv, {
    bom: true, skip_empty_lines: true, trim: true,
    columns: (headers: string[]) => {
      if (headers.length !== CSV_COLUMNS.length || CSV_COLUMNS.some((h) => !headers.includes(h))) {
        throw new Error(`CSV headers must be: ${CSV_COLUMNS.join(", ")}`);
      }
      return headers;
    },
  }) as Record<string, string>[];
  if (rows.length === 0 && !csv.trim()) throw new Error("CSV file is empty.");
  const ideas: ImportedIdea[] = [];
  const ids = new Set<string>();
  let skipped = 0;
  for (const [index, row] of rows.entries()) {
    // Includes Example, Draft, blank and every other non-Verified status.
    if (row.Status !== "Verified") { skipped++; continue; }
    if (!["Lagos", "Abuja"].includes(row.City!) ||
        !["Coffee", "Parties", "Sports", "Events"].includes(row.Category!)) {
      throw new Error(`Row ${index + 2}: unsupported City or Category.`);
    }
    for (const key of ["Name", "Area", "Price level", "One line", "Date checked"]) {
      if (!row[key]?.trim()) throw new Error(`Row ${index + 2}: ${key} is required.`);
    }
    // Stable IDs keep saved picks and report references across repeat imports.
    const identity = ideaKey(row.City!, row.Category!, row.Name!);
    const id = `csv-${createHash("sha256").update(identity).digest("hex").slice(0, 32)}`;
    if (ids.has(id)) throw new Error(`Row ${index + 2}: duplicate idea (same city, category and name).`);
    ids.add(id);
    ideas.push({
      id, city: row.City!, category: row.Category!, title: row.Name!, area: row.Area!,
      priceLevel: row["Price level"]!, blurb: row["One line"]!,
      seller: row.Category === "Events" ? "Tix" : null,
      status: "Verified", dateChecked: row["Date checked"]!, source: row["Source or link"] ?? "",
    });
    // Checked by has no destination in the requested table, so it is ignored.
  }
  return { ideas, skipped };
}
