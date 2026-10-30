// Phase 2 bench cases fit the contracts, so a bad case can't pass for a bad prompt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validate } from "../src/validate.js";
import { stepSchema, pricingSchema } from "../schemas/index.js";

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url)));
const cases = read("fixtures/bench/cases.json");
const packet = read("fixtures/cells/packet.json");

const ids = new Set([
  ...packet.map.zones.map((z) => z.id),
  ...packet.map.connections.map((c) => c.id),
  ...packet.map.things.map((t) => t.id),
  ...packet.people.map((p) => p.id),
  ...cases.party,
]);

test("bench step calls are valid", () => {
  for (const c of cases.pricing) assert.deepEqual(validate(stepSchema, c.step_call), [], c.id);
});

test("bench facts name real ids and cover every step", () => {
  for (const c of cases.pricing) {
    assert.deepEqual(c.facts.map((f) => f.n), c.step_call.steps.map((s) => s.n), c.id);
    for (const f of c.facts)
      for (const id of [...f.route, ...f.observers, ...f.barriers, ...f.hazards]) assert.ok(ids.has(id), `${c.id}: ${id}`);
    assert.equal(c.expect.bands.length, c.facts.length, c.id);
  }
});

test("bench expected bands are real bands", () => {
  const bands = [...pricingSchema.$defs.difficulty.enum, "automatic"];
  for (const c of cases.pricing) for (const b of c.expect.bands) assert.ok(bands.includes(b), `${c.id}: ${b}`);
});
