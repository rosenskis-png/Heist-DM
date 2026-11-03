// The bench's cases fit the roster and the packet, so a bad case can't pass for a bad prompt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url)));
const cases = read("fixtures/bench/cases.json");

test("the bench's huddle party is the player and two roster companions, and its flaws name them", async () => {
  const { companions } = await import("../content/companions/index.js");
  const [player, ...rest] = cases.party;
  assert.equal(player, "player");
  assert.equal(rest.length, 2);
  assert.ok(rest.every((id) => companions[id]));
  for (const c of cases.huddle) for (const f of c.flaws ?? []) for (const id of [...f.hunch_of, ...f.misses_of]) assert.ok(rest.includes(id), `${c.id}: ${id}`);
});

test("bench campfire cases name a party the roster allows", async () => {
  const { companions } = await import("../content/companions/index.js");
  const { partyProblems } = await import("../src/campaign/roster.js");
  for (const c of cases.campfire) {
    const members = c.party.map((id) => companions[id]);
    assert.ok(members.every(Boolean), `${c.id}: unknown companion`);
    assert.deepEqual(partyProblems(members), [], c.id);
    assert.ok(c.with.length && c.with.every((id) => c.party.includes(id)), c.id);
    assert.ok(Object.keys(c.rel).every((id) => c.party.includes(id)), c.id);
    assert.ok(Object.keys(c.outfits ?? {}).every((id) => c.party.includes(id)), c.id);
  }
});
