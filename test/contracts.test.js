// Phase 1 exit test: the Cells packet, both of its cards and their expected results fit the contracts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validate } from "../src/validate.js";
import * as schemas from "../schemas/index.js";
import { defs } from "../schemas/defs.js";
import { companions } from "../content/companions/index.js";
import { classes } from "../content/classes.js";

const load = (name) => JSON.parse(readFileSync(new URL(`../fixtures/cells/${name}`, import.meta.url)));
const valid = (schema, value) => assert.deepEqual(validate(schema, value), []);
const packet = load("packet.json");

test("every $ref in every schema resolves", () => {
  for (const [name, schema] of Object.entries(schemas)) {
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      if (node.$ref) assert.ok(schema.$defs[node.$ref.replace("#/$defs/", "")], `${name}: ${node.$ref}`);
      Object.values(node).forEach(walk);
    };
    walk(schema);
  }
});

test("the Cells packet is valid", () => valid(schemas.packetSchema, packet));

test("a packet with a route field is rejected", () => {
  const bad = structuredClone(packet);
  bad.intent.routes = ["through the gutter"];
  assert.match(validate(schemas.packetSchema, bad).join("\n"), /intent\.routes: unknown field/);
});

test("both Cells cards are valid", () => {
  valid(schemas.cardSchema, load("card1.json"));
  valid(schemas.cardSchema, load("card2.json"));
});

test("each step is priced, unless it has a problem of its own", () => {
  for (const file of ["card1.json", "card2.json"]) {
    const card = load(file);
    for (const facts of card.facts) {
      const priced = card.pricing_call.steps.find((s) => s.n === facts.n);
      if (facts.problems.length) {
        assert.equal(priced, undefined, `${file} step ${facts.n} has a problem and must not be priced`);
        continue;
      }
      assert.ok(priced, `${file} step ${facts.n} has no pricing`);
      const covered = new Set([...priced.risks.flatMap((r) => r.covers), ...priced.mitigations.map((m) => m.covers)]);
      for (const id of [...facts.observers, ...facts.barriers, ...facts.hazards]) {
        assert.ok(covered.has(id), `${file} step ${facts.n}: ${id} is uncovered`);
      }
    }
  }
});

test("the expected results are valid", () => {
  for (const run of load("card2.results.json")) valid(schemas.resultsSchema, run);
});

test("sample outputs fit their call schemas", () => {
  const calls = load("calls.json");
  for (const c of calls.companion) valid(schemas.companionSchema, c);
  valid(schemas.worldSchema, calls.world);
  valid(schemas.narrationSchema, calls.narration);
  valid(schemas.momentSchema, calls.moment);
});

test("declared ability blocks are valid", () => {
  const abilitySchema = { $ref: "#/$defs/ability", $defs: defs };
  const sheets = [...Object.values(companions), ...Object.values(classes)];
  for (const sheet of sheets) {
    for (const a of [sheet.abilities.combat, sheet.abilities.noncombat]) {
      if (a.declared) valid(abilitySchema, a.declared);
    }
  }
});
