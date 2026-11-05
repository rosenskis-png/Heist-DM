// The decision log: every entry once, listed in the index, and every archived one moved word for word (D145)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (f) => readFileSync(new URL(`../docs/${f}`, import.meta.url), "utf8");
const headings = (text) => [...text.matchAll(/^### D(\d+)\. (.+)$/gm)].map(([, n, t]) => [Number(n), t.trim()]);

test("the log has every entry once, in order, and the index lists each with its status", () => {
  const log = read("decisions.md");
  const entries = headings(log);
  assert.deepEqual(entries.map(([n]) => n), entries.map((_, i) => i + 1));
  const index = Object.fromEntries([...log.matchAll(/^- \*\*D(\d+)\*\* (.+): (current|archived|changed by [D\d, ]+)$/gm)].map(([, n, t, st]) => [n, { t, st }]));
  for (const [n, t] of entries) {
    assert.ok(index[n], `D${n} is missing from the index`);
    assert.equal(index[n].t, t, `D${n}'s title in the index`);
  }
  assert.equal(Object.keys(index).length, entries.length);
});

test("every archived entry leaves a pointer in the log, and is in the archive under the same title", () => {
  const log = read("decisions.md");
  const archive = headings(read("decisions-archive.md"));
  const pointers = [...log.matchAll(/^### D(\d+)\. (.+)\n\*Archived \(/gm)].map(([, n, t]) => [Number(n), t.trim()]);
  assert.deepEqual(pointers, archive);
  for (const [n] of pointers) assert.match(log, new RegExp(`^- \\*\\*D${n}\\*\\* .+: archived$`, "m"));
});
