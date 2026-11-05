// The engine: loading and checking a packet, the clock, the objective, the hand-off and replay
// (docs/spec/engine.md). The DM's side of play is in test/ruled.test.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { load, apply, replay, checkPacket, bindParty } from "../src/engine/index.js";
import { beatOf } from "../src/engine/clock.js";
import { inSight, openingMisses } from "../src/engine/perceive.js";
import * as A from "../src/context.js";
import { classes } from "../content/classes.js";
import fern from "../content/companions/fern.js";
import nadia from "../content/companions/nadia.js";
import { adjudicateSchema, sceneSchema } from "../schemas/index.js";

const file = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const packet = JSON.parse(file("content/encounters/cells.json"));
const prompts = Object.fromEntries(readdirSync(new URL("../prompts/", import.meta.url)).map((f) => [f.replace(".md", ""), file(`prompts/${f}`)]));
const party = [{ id: "player", name: classes.rogue.name, ...classes.rogue }, fern, nadia];
const start = (over = {}) => load({ packet, party, ...over });
const variant = (edit) => {
  const p = structuredClone(packet);
  edit(p);
  return p;
};
const ticks = (s, n) => apply(s, { type: "ticks", n });
const ops = (s, list) => apply(s, { type: "ops", ops: list });

test("the Cells packet loads; a route field or a misplaced door is rejected", () => {
  assert.deepEqual(checkPacket(bindParty(packet, party), party), []);
  const routed = variant((p) => (p.intent.routes = ["rat gets keys"]));
  assert.throws(() => load({ packet: routed, party }));
  const misplaced = variant((p) => (p.map.connections.find((c) => c.id === "bars_far").wall = [[0, 0], [2, 0]]));
  assert.ok(checkPacket(bindParty(misplaced, party), party).some((e) => e.includes("bars_far")));
});

test("a packet names companions by slot, and loading binds each slot to the party's companions in order", () => {
  const s = start();
  assert.deepEqual([s.at.fern, s.at.nadia], ["cell_middle", "cell_near"]);
  const other = load({ packet, party: [party[0], nadia, fern] });
  assert.deepEqual([other.at.nadia, other.at.fern], ["cell_middle", "cell_near"]);
  assert.ok(!JSON.stringify(s.packet).includes("companion_a"));
});

test("the Cells opening names everything the party can make out from where they start (D136)", () => {
  const s = start();
  const seen = inSight(s);
  for (const id of ["bench_far", "bucket_far", "drum", "peg", "keyring", "gear_sack"]) assert.ok(seen.things.includes(id), id);
  assert.ok(seen.ways.includes("grate_far") && seen.ways.includes("bars_far"));
  // Out of sight: the rats in the dark gutter, what Brannoc holds, and the hidden crawl behind the cask.
  for (const id of ["gutter_rats", "crusts"]) assert.ok(!seen.things.includes(id), id);
  assert.ok(!seen.ways.includes("crawl"));
  assert.deepEqual(openingMisses(s), []);
  const thin = openingMisses(s, "Snag hums at the cask. The miner watches you through the bars.");
  for (const id of ["drum", "bench_far", "grate_far"]) assert.ok(thin.includes(id), id);
  assert.ok(!thin.includes("cask") && !thin.includes("snag") && !thin.includes("bars_far"));
});

test("routines move people and things on the beat: the keys go on the belt on Pace, back on the peg on Sit", () => {
  let s = start();
  assert.equal(beatOf(s, "snag").id, "drink");
  assert.equal(s.holder.keyring, "peg");
  s = ticks(s, 1);
  assert.equal(beatOf(s, "snag").id, "pace");
  assert.equal(s.holder.keyring, "snag");
  s = ticks(s, 1);
  assert.equal(beatOf(s, "snag").id, "sit");
  assert.equal(s.holder.keyring, "peg");
});

test("a person the DM takes off their routine stays where the DM put them", () => {
  let s = start();
  s.offRoutine.push("snag");
  s = ops(s, [{ move: { entity: "snag", to: "corridor" } }]);
  s = ticks(s, 3);
  assert.equal(s.at.snag, "corridor");
  assert.equal(beatOf(s, "snag"), null);
});

test("Uzga arrives at tick 32, and the fail-forward ending fires with the middle cell's companion still in it", () => {
  let s = ticks(start(), 31);
  assert.equal(s.at.uzga, null);
  s = ticks(s, 1);
  assert.equal(s.at.uzga, "guardroom");
  assert.equal(s.ended.outcome, "companion_taken");
  assert.equal(s.handoff.outcome, "companion_taken");
});

test("the hand-off records gear, fates, companions and the exit", () => {
  let s = ops(start(), [{ give: { item: "gear_sack", to: "nadia" } }]);
  s = ops(s, ["player", "fern", "nadia"].map((id) => ({ move: { entity: id, to: "stair_top" } })));
  const h = s.handoff;
  assert.equal(h.outcome, "escaped");
  assert.deepEqual(h.exit, ["stair_top"]);
  assert.ok(h.gear.includes("gear_sack"));
  assert.deepEqual(h.companions, ["fern", "nadia"]);
  assert.equal(h.fates.brannoc.zone, "cell_brannoc");
  assert.ok(typeof h.log === "string");
});

test("replaying a recorded log reproduces state exactly", () => {
  const begin = { packet, party, seed: 7 };
  const actions = [
    { type: "scene", out: { reply: "You wait.", checks: [{ who: "player", band: "medium", reason: "x", success: { text: "y", changes: {} }, failure: { text: "z", changes: {} } }], ticks: 2 } },
    { type: "ops", ops: [{ add_canon: { kind: "texture", text: "The drumhead hangs in tatters." } }] },
    { type: "ticks", n: 1 },
  ];
  const s = actions.reduce(apply, load(begin));
  assert.deepEqual(replay({ start: begin, actions: JSON.parse(JSON.stringify(actions)) }), s);
});

// Act gates (docs/spec/context.md §3): the heartbeat is in no Act 1–3 context.
test("the heartbeat invariant is in no Act 1–3 context, and walkthrough §5 in no prompt", () => {
  const section5 = file("fixtures/cells/walkthrough.md").split("## 5.")[1].split("\n## ")[0];
  const lines = section5.split("\n").filter((l) => l.trim().length > 40);
  const inputs = (act) => {
    const s = start();
    const env = { packet: s.packet, party, state: s, act, prompts, companions: party.slice(1), standing: {} };
    return [
      A.adjudicateInput(env, { plan: "x", now: A.ledgerText(s), timeline: A.aheadText(s), recent: [] }, adjudicateSchema),
      A.sceneInput(env, { to: "dm", now: A.ledgerText(s), timeline: A.aheadText(s), conversation: [] }, sceneSchema),
    ];
  };
  for (const act of [1, 2, 3])
    for (const input of inputs(act)) {
      assert.ok(!/heartbeat/i.test(input), `act ${act}`);
      for (const l of lines) assert.ok(!input.includes(l.trim()), l);
      for (const key of ['"rects"', '"wall"', '"square"']) assert.ok(!input.includes(key), key);
    }
  assert.ok(inputs(4)[0].includes("heartbeat"));
  assert.equal(A.promptFor("a<!-- example act:4 -->secret<!-- /example -->b", 3), "ab");
});
