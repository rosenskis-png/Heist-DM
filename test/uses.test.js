// The engine counts ability uses, and rest refills them (D128). Recorded DM outputs, no AI calls.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { load, apply, checkScene, checkResolve, checkChanges, handoff, rest, usesLeft, usesText } from "../src/engine/index.js";
import { adjudicateInput } from "../src/context.js";
import { adjudicateSchema } from "../schemas/index.js";
import { validate } from "../src/validate.js";
import { sceneSchema } from "../schemas/index.js";
import { classes } from "../content/classes.js";
import { companions } from "../content/companions/index.js";

const packet = JSON.parse(readFileSync(new URL("../content/encounters/cells.json", import.meta.url), "utf8"));
const all = Object.values(companions);
// A companion with a limited ability, whoever she is (D8), and another to make up the party.
const limited = all.find((c) => [c.abilities.combat, c.abilities.noncombat].some((a) => a.declared.uses?.encounter));
const other = all.find((c) => c !== limited && !c.tie?.required);
const ability = [limited.abilities.noncombat, limited.abilities.combat].find((a) => a.declared.uses?.encounter);
const { encounter: perEncounter, rest: perRest } = ability.declared.uses;
const party = [{ id: "player", name: "Rogue", ...classes.rogue }, limited, other];
const start = (over = {}) => load({ packet, party, seed: 3, ...over });
const use = { used: [{ who: limited.id, ability: ability.id }] };
const scene = (s, changes) => ({ reply: "x", ticks: 0, changes });

test("a limited ability can't be used past its uses this encounter", () => {
  let s = start();
  assert.deepEqual(usesLeft(s, limited.id, ability.id).encounter, { left: perEncounter, of: perEncounter });
  assert.deepEqual(validate(sceneSchema, scene(s, use)), []);
  for (let i = 0; i < perEncounter; i++) {
    assert.deepEqual(checkScene(s, scene(s, use)), []);
    s = apply(s, { type: "scene", out: scene(s, use) });
  }
  assert.equal(usesLeft(s, limited.id, ability.id).encounter.left, 0);
  assert.match(checkScene(s, scene(s, use)).join("\n"), new RegExp(`no ${ability.name} left`));
  assert.ok(s.log.some((l) => l.used === `${limited.id} ${ability.id}`));
});

test("one output can't spend more than what's left, and a check counts its costlier outcome", () => {
  const s = start();
  const twice = { used: Array(perEncounter + 1).fill(use.used[0]) };
  assert.ok(checkScene(s, scene(s, twice)).length);
  const check = { who: limited.id, band: "medium", reason: "r", success: { text: "a", changes: twice }, failure: { text: "b", changes: {} } };
  assert.ok(checkScene(s, { ...scene(s, {}), checks: [check] }).length);
  const card = { steps: [{ n: 1, summary: "x", who: [limited.id], at: 0 }, { n: 2, summary: "y", who: [limited.id], at: 0 }], ends_at: 1, rulings: [] };
  const out = { steps: [1, 2].map((n) => ({ n, happened: "yes", what: "z", changes: use })), ends_at: 1, after: {}, narration: { text: "x", texture: [] } };
  if (perEncounter === 1) assert.match(checkResolve(s, card, [], out).join("\n"), /left/);
});

test("only the party's own abilities can be used", () => {
  const s = start();
  assert.ok(checkChanges(s, { used: [{ who: "snag", ability: ability.id }] }).length);
  assert.ok(checkChanges(s, { used: [{ who: limited.id, ability: "flight" }] }).length);
  assert.deepEqual(checkChanges(s, use), []);
});

test("per-encounter uses refill with the next encounter; per-rest uses wait for a campfire, and so do conditions", () => {
  let carry = { conditions: [], spent: {} };
  for (let n = 0; n < perRest; n++) {
    let s = start({ conditions: carry.conditions, spent: carry.spent });
    assert.ok(usesLeft(s, limited.id, ability.id).rest.left > 0, `encounter ${n + 1}`);
    s = apply(s, { type: "scene", out: scene(s, { ...use, conditions: [{ id: `bruised_${n}`, who: "player", text: "Bruised ribs" }] }) });
    s = apply(s, { type: "end", outcome: "left" });
    carry = handoff(s);
  }
  const s = start({ conditions: carry.conditions, spent: carry.spent });
  assert.equal(usesLeft(s, limited.id, ability.id).rest.left, 0);
  assert.equal(usesLeft(s, limited.id, ability.id).encounter.left, perEncounter);
  assert.ok(checkScene(s, scene(s, use)).length);
  assert.equal(s.conditions.length, perRest);
  const { conditions, spent } = rest(carry);
  const rested = start({ conditions, spent });
  assert.equal(usesLeft(rested, limited.id, ability.id).rest.left, perRest);
  assert.deepEqual(rested.conditions, []);
  assert.deepEqual(checkScene(rested, scene(rested, use)), []);
});

test("every DM call shows what's left of a limited ability, and nothing for one at will", () => {
  let s = start();
  s = apply(s, { type: "scene", out: scene(s, use) });
  const env = { packet: s.packet, party: s.party, state: s, act: 1, companions: s.party.slice(1), prompts: { style: "", adjudicate: "" } };
  const input = adjudicateInput(env, { plan: "p", now: "", timeline: "" }, adjudicateSchema);
  assert.ok(input.includes(`"left":"${usesText(s, limited.id, ability.id)}"`));
  assert.equal(usesText(s, "player", classes.rogue.abilities.noncombat.id), null);
});
