// Phase 4 engine additions: moments, conversations, combat rounds, checkpoints and the table read.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { load, apply, project, checkMoment, checkWorld, tableRead } from "../src/engine/index.js";
import { validate } from "../src/validate.js";
import { momentSchema } from "../schemas/index.js";
import { classes } from "../content/classes.js";
import fern from "../content/companions/fern.js";
import lyra from "../content/companions/lyra.js";

const file = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const packet = JSON.parse(file("content/encounters/cells.json"));
const party = [{ id: "player", name: classes.rogue.name, ...classes.rogue }, fern, lyra];
const start = () => load({ packet, party });
const card2 = () => {
  const c = JSON.parse(file("fixtures/cells/card2.json"));
  return { ...c, facts: project(start(), c.step_call.steps, c.step_call.internal_checks) };
};
const said = (text, ops = []) => ({ text, ops });

test("a check rolls its band, applies the matching outcome and costs a pending tick", () => {
  const out = {
    reply: "Lyra presses her ear to the wall.",
    check: {
      actor: "lyra",
      skill: "Insight",
      difficulty: "easy",
      reason: "She has nothing else to do but listen.",
      on_success: said("A draught from behind the cask.", [{ reveal: { id: "crawl" } }]),
      on_failure: said("Just humming."),
    },
  };
  assert.deepEqual(validate(momentSchema, out), []);
  const s = start();
  assert.deepEqual(checkMoment(s, out), []);
  const won = apply(s, { type: "moment", out, rolls: [12] });
  assert.equal(won.moment.check.success, true);
  assert.ok(won.known.revealed.includes("crawl"));
  assert.equal(won.pending, 1);
  assert.equal(won.tick, s.tick);
  const lost = apply(s, { type: "moment", out, rolls: [99] });
  assert.equal(lost.moment.check.success, false);
  assert.ok(!lost.known.revealed.includes("crawl"));
});

test("what the party learns in talk is marked known, and bad ids or flags go back", () => {
  const s = start();
  const told = apply(s, { type: "moment", out: { reply: "\"Walks, sits, drinks,\" says Brannoc.", reveals: ["crawl"], learned: ["Snag walks, sits and drinks, every time."], texture: ["Brannoc's nails are black with ore."] } });
  assert.ok(told.known.revealed.includes("crawl"));
  assert.ok(told.log.some((l) => l.learned));
  assert.ok(told.canon.some((c) => c.text.startsWith("Brannoc's nails")));
  const bad = { reply: "x", reveals: ["corridor"], check: { actor: "snag", skill: "Might", difficulty: "hard", reason: "x", on_success: said("x", [{ set_flag: { entity: "drum", key: "torn", value: true } }]), on_failure: said("x") } };
  const errors = checkMoment(s, bad);
  assert.ok(errors.some((e) => e.includes("corridor")));
  assert.ok(errors.some((e) => e.includes("snag isn't in the party")));
  assert.ok(errors.some((e) => e.includes('"torn"')));
  assert.ok(checkWorld(s, { actions: [{ npc: "goblin", because: "x", ops: [] }] }).length);
});

test("a conversation costs a tick when it ends", () => {
  const s = apply(start(), { type: "talked", with: "brannoc" });
  assert.equal(s.pending, 1);
  assert.ok(s.log.some((l) => l.talked === "brannoc"));
});

test("combat: a strike that lands deals damage, a miss is hit back, and the fight ends when no enemy is left", () => {
  const s = apply(start(), { type: "ops", ops: [{ start_combat: { enemies: ["snag"] } }] });
  assert.equal(s.combat.hp.snag, 2); // a guard
  const swing = (difficulty, weapon) => ({
    reply: "Snag lunges for the drum.",
    combat: {
      intents: [{ enemy: "snag", intent: "Reach the drum", target: "player" }],
      actions: [{ actor: "player", kind: "strike", target: "snag", difficulty, weapon, reason: "He's turned away.", on_success: said("The bench nail goes in."), on_failure: said("He twists away.") }],
    },
  });
  assert.deepEqual(checkMoment(s, swing("easy", true)), []);
  const missed = apply(s, { type: "moment", out: swing("easy", false), rolls: [95] });
  assert.equal(missed.hp.player, s.hp.player - 1);
  assert.equal(missed.combat.hp.snag, 2);
  const hit = apply(missed, { type: "moment", out: swing("easy", false), rolls: [10] });
  assert.equal(hit.combat.hp.snag, 1);
  assert.equal(hit.pending, 1); // round 2
  const won = apply(s, { type: "moment", out: swing("easy", true), rolls: [10] });
  assert.equal(won.combat, null);
  assert.equal(won.moment.round.over, "won");
  assert.equal(won.flags.snag.down, true);
});

test("combat: an enemy nobody engages hits its target, and one who yields leaves the fight", () => {
  const s = apply(start(), { type: "ops", ops: [{ start_combat: { enemies: ["snag"] } }] });
  const idle = { reply: "x", combat: { intents: [{ enemy: "snag", intent: "Club Lyra", target: "lyra" }], actions: [] } };
  const hit = apply(s, { type: "moment", out: idle });
  assert.equal(hit.hp.lyra, s.hp.lyra - 1);
  const gone = apply(s, { type: "moment", out: { reply: "x", combat: { intents: [{ enemy: "snag", intent: "Back away", yields: true }], actions: [] } } });
  assert.equal(gone.combat, null);
  assert.equal(gone.hp.lyra, s.hp.lyra);
});

test("a checkpoint pauses the plan after its step", () => {
  const c = { ...card2(), checkpoints: [2] };
  const s = apply(start(), { type: "execute", card: c, rolls: [10, 10] });
  assert.equal(s.results.length, 2);
  assert.equal(s.results[1].checkpoint, true);
});

test("the table read counts plans, rolls, streaks and landed consequences", () => {
  const c = card2();
  const s = apply(start(), { type: "execute", card: c, rolls: [90, 90] });
  const t = tableRead(s, ["one", "two", "three", "four"]);
  assert.equal(t.plans_committed, 1);
  assert.equal(t.plans_expected, "1–3");
  assert.deepEqual(t.player_said, ["two", "three", "four"]);
  assert.ok(t.rolls.includes("failure"));
  assert.ok(t.consequences_landed.length >= 1);
});
