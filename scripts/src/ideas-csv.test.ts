import test from "node:test";
import assert from "node:assert/strict";
import { CSV_COLUMNS, parseIdeasCsv } from "./ideas-csv";

const header = CSV_COLUMNS.join(",");
const verified = 'Lagos,Coffee,[Name],[Area],[Price],"[Blurb, with comma]",[Source],[DATE],Verified,[Checker]';

test("only Verified rows import; Example and all other statuses count as skipped", () => {
  const result = parseIdeasCsv([header, verified,
    verified.replace("Verified", "Example"), verified.replace("Verified", "Draft")].join("\n"));
  assert.equal(result.ideas.length, 1);
  assert.equal(result.skipped, 2);
  assert.equal(result.ideas[0]!.blurb, "[Blurb, with comma]");
  assert.equal(result.ideas[0]!.seller, null);
});
test("UTF-8 BOM, CRLF and quoted multiline fields work", () => {
  const result = parseIdeasCsv("\uFEFF" + header + "\r\n" + verified.replace("[Blurb, with comma]", "[Blurb\nsecond line]"));
  assert.equal(result.ideas[0]!.blurb, "[Blurb\nsecond line]");
});
test("IDs remain stable when non-identity content changes", () => {
  const a = parseIdeasCsv(header + "\n" + verified).ideas[0]!;
  const b = parseIdeasCsv(header + "\n" + verified.replace("[Price]", "[New price]")).ideas[0]!;
  assert.equal(a.id, b.id);
  const c = parseIdeasCsv(header + "\n" + verified.replace("[Area]", "[New area]").replace("[Name]", "[NAME]")).ideas[0]!;
  assert.equal(a.id, c.id);
});
test("events retain the Tix button", () => {
  assert.equal(parseIdeasCsv(header + "\n" + verified.replace("Coffee", "Events")).ideas[0]!.seller, "Tix");
});
test("bad headers, malformed CSV, unsupported values and duplicates fail before replacement", () => {
  assert.throws(() => parseIdeasCsv("City,Status\nLagos,Verified"));
  assert.throws(() => parseIdeasCsv(header + '\n"broken'));
  assert.throws(() => parseIdeasCsv(header + "\n" + verified.replace("Lagos", "Unknown")));
  assert.throws(() => parseIdeasCsv(header + "\n" + verified.replace("[Name]", "")));
  assert.throws(() => parseIdeasCsv([header, verified, verified].join("\n")));
});
test("all-skipped and header-only files produce an empty active catalogue", () => {
  assert.deepEqual(parseIdeasCsv(header + "\n" + verified.replace("Verified", "Example")), { ideas: [], skipped: 1 });
  assert.deepEqual(parseIdeasCsv(header), { ideas: [], skipped: 0 });
  assert.throws(() => parseIdeasCsv(""));
});
