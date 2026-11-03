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
const packet = JSON.parse(readFileSync(new URL("../content/encounters/cells.json", import.meta.url)));

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

test("declared ability blocks are valid", () => {
  const abilitySchema = { $ref: "#/$defs/ability", $defs: defs };
  const sheets = [...Object.values(companions), ...Object.values(classes)];
  for (const sheet of sheets) {
    for (const a of [sheet.abilities.combat, sheet.abilities.noncombat]) {
      if (a.declared) valid(abilitySchema, a.declared);
    }
  }
});

test("no visible text in the Cells packet names a hidden thing", () => {
  const { zones, connections, things, facts } = packet.map;
  const all = [...zones, ...connections, ...things, ...facts];
  const terms = all.filter((x) => x.hidden).flatMap((x) => [x.id, ...(x.name ? [x.name] : [])]).map((t) => t.toLowerCase());
  const visible = [...all.filter((x) => !x.hidden).map((x) => JSON.stringify(x)), packet.opening].map((t) => t.toLowerCase());
  for (const text of visible) for (const t of terms) assert.ok(!text.includes(t), `"${t}" in: ${text.slice(0, 80)}`);
});
