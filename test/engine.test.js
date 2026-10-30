// The engine's acceptance test: fixtures/cells/acceptance.md, item by item, plus replay (D60).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { load, apply, replay, checkPacket, checkSteps, splitLongMoves, project, checkPricing, shownCard, layoutFacts, partyPerceives, whoPerceives } from "../src/engine/index.js";
import { test as holds } from "../src/engine/cond.js";
import { beatOf, sensesOf } from "../src/engine/clock.js";
import * as A from "../src/context.js";
import { classes } from "../content/classes.js";
import { pairs } from "../content/pairs.js";
import fern from "../content/companions/fern.js";
import lyra from "../content/companions/lyra.js";
import { stepSchema, pricingSchema, worldSchema, narrationSchema, companionSchema, resultsSchema } from "../schemas/index.js";
import { validate } from "../src/validate.js";

const file = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const read = (name) => JSON.parse(file(`fixtures/cells/${name}`));
const packet = JSON.parse(file("content/encounters/cells.json"));
const party = [{ id: "player", name: classes.rogue.name, ...classes.rogue }, fern, lyra];
const start = (over = {}) => load({ packet, party, ...over });
const variant = (edit) => {
  const p = structuredClone(packet);
  edit(p);
  return p;
};
const snag = (p) => p.people.find((x) => x.id === "snag");
const noDetail = (x) => JSON.parse(JSON.stringify(x, (k, v) => (k === "detail" ? undefined : v)));
const expectAll = (s, cond) => cond.all.forEach((c) => assert.ok(holds(s, c), JSON.stringify(c)));
// The engine's results fit the contract the narration call reads (schemas/results.js).
const fits = (s) => assert.deepEqual(validate(resultsSchema, { card: "run", rolls: [], steps: s.results, expect: { tick: [">=", 0] } }), []);

// A card for a hand-written plan: the engine's projection, and no risks priced.
function card(s, steps, { stances = [], warnings, internal = [] } = {}) {
  steps = steps.map((st, i) => ({ n: i + 1, noise: "quiet", tags: [], ...st }));
  return {
    packet: "cells",
    tick: s.tick,
    plan: "A test plan.",
    stances,
    step_call: { steps, rulings: [], internal_checks: internal },
    facts: project(s, steps, internal),
    pricing_call: { steps: steps.map((st) => ({ n: st.n, risks: [], mitigations: [] })), rulings: [], ...(warnings ? { warnings } : {}) },
  };
}
const move = (entity, to, path) => ({ move: { entity, to, ...(path ? { path } : {}) } });
const ops = (s, list) => apply(s, { type: "ops", ops: list });
const ticks = (s, n) => apply(s, { type: "ticks", n });
const fixtureCard = (name) => {
  const c = read(`${name}.json`);
  return { ...c, facts: project(start(), c.step_call.steps, c.step_call.internal_checks) };
};

// 1. Load and validate.
test("1. the Cells packet loads; a route field or a misplaced door is rejected", () => {
  assert.deepEqual(checkPacket(packet, party), []);
  const routed = variant((p) => (p.intent.routes = ["rat gets keys"]));
  assert.ok(checkPacket(routed, party).length);
  assert.throws(() => load({ packet: routed, party }));
  const misplaced = variant((p) => (p.map.connections.find((c) => c.id === "bars_far").wall = [[0, 0], [2, 0]]));
  assert.ok(checkPacket(misplaced, party).some((e) => e.includes("bars_far")));
});

// 2. Card 1: projection, pricing and execution.
test("2. card 1 projects as the fixture says, its pricing passes, and it's interrupted when the peg goes empty", () => {
  const s = start();
  const c = read("card1.json");
  assert.equal(beatOf(s, "snag").id, "drink");
  assert.deepEqual(checkSteps(s, c.step_call), { errors: [], fits: [] });
  const facts = project(s, c.step_call.steps);
  assert.deepEqual(noDetail(facts), noDetail(c.facts));
  assert.deepEqual(facts[0].observers, []); // step 1 has no observer, so it's automatic
  assert.deepEqual(facts[1].as_if, ["The key ring is on the key peg."]);
  assert.deepEqual(checkPricing(s, c.step_call.steps, facts, c.pricing_call), []);
  const shown = shownCard({ ...c, facts });
  assert.ok(shown.facts.every((f) => !("as_if" in f) && !("interrupts" in f)));
  assert.ok(!("internal_checks" in shown.step_call));
  const [want] = read("card1.results.json");
  const after = apply(s, { type: "execute", card: { ...c, facts }, rolls: want.rolls });
  assert.deepEqual(noDetail(after.results), noDetail(want.steps));
  expectAll(after, want.expect);
});

test("2. pricing that leaves a foreseen observer uncovered, or prices one the party doesn't foresee, goes back", () => {
  const s = start();
  const c = read("card1.json");
  const facts = project(s, c.step_call.steps);
  const p = structuredClone(c.pricing_call);
  p.steps[1].risks = [];
  p.steps[3].mitigations.push({ covers: "uzga", by: "fact", ref: "iron", note: "She isn't here." });
  const errors = checkPricing(s, c.step_call.steps, facts, p);
  assert.ok(errors.some((e) => e.startsWith("step 2: snag")));
  assert.ok(errors.some((e) => e.startsWith("step 4: uzga")));
  p.steps[1] = c.pricing_call.steps[1];
  p.steps[3] = { ...c.pricing_call.steps[3] };
  p.steps[4].risks[0].reason = "He'd hear you from the cistern.";
  assert.ok(checkPricing(s, c.step_call.steps, facts, p).some((e) => e.includes('"cistern"')));
});

// 3. Observers per step for card 2.
test("3. card 2's observers match the walkthrough", () => {
  const c = fixtureCard("card2");
  assert.deepEqual(c.facts.map((f) => f.observers), [[], [], ["snag"], ["snag"], ["snag"]]);
  assert.deepEqual(noDetail(c.facts), noDetail(read("card2.json").facts));
  const step5 = c.pricing_call.steps[4];
  assert.deepEqual(step5.mitigations.find((m) => m.covers === "snag").ref, 4); // covered by step 4: the drum is gnawed
  assert.deepEqual(checkPricing(start(), c.step_call.steps, c.facts, c.pricing_call), []);
});

// 4 and 7. Card 2's three runs; Snag bargains only when the drum is gnawed.
test("4, 7. card 2's three runs end as the fixture says", () => {
  const c = fixtureCard("card2");
  for (const want of read("card2.results.json")) {
    const s = apply(start(), { type: "execute", card: c, rolls: want.rolls });
    assert.deepEqual(noDetail(s.results), noDetail(want.steps), want.card);
    expectAll(s, want.expect);
    fits(s);
  }
});

// 5. The suspicion ladder.
test("5. suspicion: the far corner at 1, no Drink at 2, decay after a still cycle, blocked by an empty peg", () => {
  let s = ticks(start(), 2);
  assert.equal(beatOf(s, "snag").id, "sit");
  assert.ok(!sensesOf(s, "snag").sees.includes("cell_far_back"));
  s = ops(s, [{ meter_add: { meter: "suspicion", by: 1 } }]);
  assert.ok(sensesOf(s, "snag").sees.includes("cell_far_back"));
  s = ops(s, [{ meter_add: { meter: "suspicion", by: 1 } }]);
  const beats = [];
  for (let i = 0; i < 2; i++) (s = ticks(s, 1)), beats.push(beatOf(s, "snag").id);
  assert.deepEqual(beats.sort(), ["pace", "sit"]);

  let quiet = ops(start(), [{ meter_add: { meter: "suspicion", by: 1 } }]);
  quiet = ticks(quiet, 2);
  assert.equal(quiet.meters.suspicion, 1);
  quiet = ticks(quiet, 1);
  assert.equal(quiet.meters.suspicion, 0);
  assert.ok(!sensesOf(ticks(quiet, 2), "snag").sees.includes("cell_far_back")); // the level lapses with the meter

  let empty = ops(start(), [{ meter_add: { meter: "suspicion", by: 1 } }, { give: { item: "keyring", to: "fern" } }]);
  empty = ticks(empty, 9);
  assert.equal(empty.flags.snag.keys_missing, true);
  assert.equal(empty.meters.suspicion, 1);
});

// 6. Uzga, timing, perception, recognition and slack.
test("6. Uzga arrives at tick 21, and the fail-forward ending fires with Fern still in her cell", () => {
  let s = ticks(start(), 20);
  assert.equal(s.at.uzga, null);
  s = ticks(s, 1);
  assert.equal(s.at.uzga, "guardroom");
  assert.equal(s.ended.outcome, "fern_taken");
  assert.equal(s.handoff.outcome, "fern_taken");
});

test("6. an arrival the party doesn't know about interrupts the plan, and the warning roll decides who acts first", () => {
  const p = variant((x) => (x.clock.events[0].known = false));
  const setup = () => {
    let s = load({ packet: p, party });
    s = ops(s, [move("player", "corridor"), move("fern", "corridor"), move("lyra", "corridor")]);
    return ticks(s, 20);
  };
  const s = setup();
  const steps = [
    { actors: ["player"], zone: "corridor", summary: "The rogue listens at the doorway.", effects: [] },
    { actors: ["player"], zone: "guardroom", summary: "The rogue slips into the guardroom.", effects: [move("player", "guardroom", ["doorway"])] },
  ];
  const c = card(s, steps, { warnings: [{ n: 2, covers: "uzga", difficulty: "medium", reason: "Boots on the stair." }] });
  assert.equal(c.facts[1].tick, 21);
  assert.deepEqual(c.facts[1].interrupts.map((i) => [i.code, i.id]), [["arrival", "uzga"]]);
  assert.ok(!c.facts[1].observers.includes("uzga"));

  const heard = apply(s, { type: "execute", card: c, rolls: [10] });
  const r = heard.results.at(-1);
  assert.equal(r.outcome, "interrupted");
  assert.deepEqual([r.n, r.interrupt.code, r.interrupt.warning.success], [2, "arrival", true]);
  fits(heard);
  assert.equal(heard.tick, 21);
  assert.equal(heard.at.uzga, null); // she hasn't landed: the party's next plan acts first
  const next = apply(heard, { type: "execute", card: card(heard, [steps[0]]) });
  assert.equal(next.at.uzga, "guardroom");
  assert.ok(next.log.findIndex((l) => l.event === "uzga_arrives") > next.log.findIndex((l) => l.card && l.tick === 21));

  const missed = apply(setup(), { type: "execute", card: c, rolls: [90] });
  assert.equal(missed.results.at(-1).interrupt.warning.success, false);
  assert.equal(missed.at.uzga, "guardroom");
});

test("6. a wait that never comes is interrupted; a routine the party doesn't know can't be named", () => {
  const s = start();
  const c = card(s, [{ actors: ["lyra"], zone: "cell_near", summary: "Lyra waits for Snag to go upstairs.", when: { until: { in_zone: ["snag", "stair"] }, max_wait: 2 }, effects: [] }]);
  assert.equal(c.facts[0].interrupts[0].code, "wait_expired");
  const after = apply(s, { type: "execute", card: c });
  assert.deepEqual([after.results[0].outcome, after.results[0].interrupt.code, after.results[0].waited], ["interrupted", "wait_expired", 2]);

  const unknown = load({ packet: variant((p) => (snag(p).schedule.known = false)), party });
  const timed = { steps: [{ n: 1, summary: "When he sits.", actors: ["fern"], zone: "cell_middle", noise: "silent", when: { until: { beat: ["snag", "sit"] } }, effects: [], tags: [] }], rulings: [], internal_checks: [] };
  assert.ok(checkSteps(unknown, timed).errors.some((e) => e.includes("routine")));
  assert.deepEqual(checkSteps(start(), timed).errors, []);
});

test("6. a condition is checked through whoever can perceive it: Lyra hears him through the wall", () => {
  let s = ops(ticks(start(), 1), [move("player", "cell_far_back"), move("fern", "cell_far_back")]);
  assert.ok(partyPerceives(s).heard.get("guardroom").includes("lyra"));
  assert.ok(!partyPerceives(s).seen.has("guardroom") || !partyPerceives(s).seen.get("guardroom").includes("player"));
  const whenSits = [{ actors: ["fern"], zone: "cell_far_back", summary: "When he sits, Fern changes.", when: { until: { beat: ["snag", "sit"] } }, effects: [{ use_ability: { actor: "fern", ability: "wildshape" } }] }];
  const heard = apply(s, { type: "execute", card: card(s, whenSits) });
  assert.deepEqual(heard.results[0].outcome, "done");
  assert.deepEqual(whoPerceives(ticks(s, 1), ["snag"]), ["lyra"]);

  s = ops(s, [move("lyra", "cell_far_back")]);
  assert.equal(whoPerceives(s, ["snag"]), null);
  const deaf = apply(s, { type: "execute", card: card(s, whenSits) });
  assert.deepEqual([deaf.results[0].outcome, deaf.results[0].interrupt.code], ["interrupted", "cant_perceive"]);
});

test("6. recognition: card 2 isn't stopped by the empty peg it expects; a party that doesn't know the routine is", () => {
  const c = fixtureCard("card2");
  const known = apply(start(), { type: "execute", card: c, rolls: [34, 52] });
  assert.ok(known.results.every((r) => r.outcome === "done"));
  const p = variant((x) => (snag(x).schedule.known = false));
  const s = load({ packet: p, party });
  const blind = apply(s, { type: "execute", card: { ...c, facts: project(s, c.step_call.steps) }, rolls: [34, 52] });
  assert.deepEqual(noDetail(blind.results.at(-1)), { n: 2, tick: 1, outcome: "interrupted", rolls: [], interrupt: { code: "not_there", id: "keyring" } });
});

test("6. slack moves the deadline, rounded once; the ending tests the flag; an early finish lowers slack", () => {
  assert.deepEqual([-10, 10, 3, -3, 1].map((slack) => start({ slack }).due.uzga_arrives), [17, 25, 22, 20, 21]);
  const early = ticks(start({ slack: -10 }), 17);
  assert.equal(early.ended.outcome, "fern_taken");
  const fast = apply(ticks(start(), 8), { type: "end", outcome: "escaped" });
  assert.deepEqual([fast.handoff.spare, fast.handoff.slack], [13, -1]);
  assert.equal(early.handoff.slack, -9); // the fail-forward ending raises slack by 1
});

// 8. Wild Shape ends on the stair, and the objective is checked.
test("8. Fern's Wild Shape ends on the stair; the party escapes; a long move is split", () => {
  const s = apply(start(), { type: "execute", card: fixtureCard("card2"), rolls: [34, 52] });
  const out = [{ n: 1, summary: "Everyone up the stair.", actors: ["player", "fern", "lyra"], zone: "stair_top", noise: "quiet", tags: [], effects: ["player", "fern", "lyra"].map((id) => move(id, "stair_top")) }];
  const steps = splitLongMoves(s, out);
  assert.equal(steps.length, 2);
  assert.ok(steps.flatMap((st) => st.effects).every((e) => (e.move.path ?? []).length <= 2));
  assert.deepEqual(checkSteps(s, { steps, rulings: [], internal_checks: [] }).errors, []);
  const end = apply(s, { type: "execute", card: card(s, steps) });
  assert.equal(end.flags.fern.form, "self");
  assert.equal(end.flags.fern.size, "medium");
  assert.equal(end.ended.outcome, "escaped");
});

// 9. A kept stance trips on a lethal step.
test("9. Fern's kept stance stops the plan before a lethal step; an overridden one is logged", () => {
  const s = start();
  const stance = { companion: "fern", kind: "conditional", text: "I won't help kill anyone who doesn't need killing.", trigger: { step_tagged: "lethal" } };
  const steps = [{ actors: ["player"], zone: "cell_far", summary: "The rogue strangles Snag through the bars.", tags: ["lethal"], effects: [] }];
  const kept = apply(s, { type: "execute", card: card(s, steps, { stances: [{ ...stance, decision: "keep" }] }) });
  assert.deepEqual([kept.results[0].outcome, kept.results[0].stance.companion], ["stopped", "fern"]);
  fits(kept);
  const over = apply(s, { type: "execute", card: card(s, steps, { stances: [{ ...stance, decision: "override" }] }) });
  assert.equal(over.results[0].outcome, "done");
  assert.ok(over.log.some((l) => l.stance === "fern" && l.decision === "override"));
  const quiet = apply(s, { type: "execute", card: card(s, [{ ...steps[0], tags: [] }], { stances: [{ ...stance, decision: "keep" }] }) });
  assert.equal(quiet.results[0].outcome, "done");
});

// 10–11. Context assembly: act gates, and layout facts with no coordinates.
const PROMPTS = ["style", "step", "pricing", "world", "narration", "companion", "ruling"];
function env(act) {
  const connections = new Map(packet.map.connections.map((c) => [c.id, c]));
  return {
    packet,
    act,
    party,
    connections,
    prompts: Object.fromEntries(PROMPTS.map((n) => [n, file(`prompts/${n}.md`)])),
    beatAt: (t) => ({ snag: beatOf(ticks(start(), t), "snag").id }),
    pairFor: (a, others) => others.map((b) => pairs[`${a}|${b}`] ?? pairs[`${b}|${a}`]).find(Boolean) ?? null,
  };
}
function inputs(act) {
  const e = env(act);
  const c = read("card2.json");
  const s = apply(start(), { type: "execute", card: fixtureCard("card2"), rolls: [34, 52] });
  return [
    A.stepInput(e, c, stepSchema),
    A.pricingInput(e, c, pricingSchema),
    A.worldInput(e, { results: s.results, state: { tick: s.tick }, table: {} }, worldSchema),
    A.narrationInput(e, { plan: c.plan, steps: c.step_call.steps, results: s.results, world: [], state: { tick: s.tick } }, narrationSchema),
    A.companionInput(e, { draft: c.plan }, fern, [lyra], [], companionSchema),
    A.rulingInput(e, { who: "keyring", connection: "grate_far", by: "fern" }),
  ];
}

test("10. the heartbeat invariant is in no Act 1–3 context, and walkthrough §5 in no prompt", () => {
  const section5 = file("fixtures/cells/walkthrough.md").split("## 5.")[1].split("\n## ")[0];
  const lines = section5.split("\n").filter((l) => l.trim().length > 40);
  for (const act of [1, 2, 3])
    for (const input of inputs(act)) {
      assert.ok(!/heartbeat/i.test(input), `act ${act}`);
      for (const l of lines) assert.ok(!input.includes(l.trim()), l);
    }
  assert.ok(inputs(4)[0].includes("heartbeat"));
  assert.equal(A.promptFor("a<!-- example act:4 -->secret<!-- /example -->b", 3), "ab");
});

test("11. the AIs get layout facts, never coordinates", () => {
  const facts = layoutFacts(packet);
  assert.ok(facts.includes("Corridor: 30 by 10 ft."));
  assert.ok(facts.includes("Key peg and Ale cask: about 5 ft apart."));
  assert.ok(facts.includes("Key peg and Snag's stool: about 10 ft apart."));
  assert.ok(facts.includes("In Gutter: the grate to Far cell and Guardroom drain, about 30 ft apart."));
  assert.ok(!layoutFacts(packet, { knownOnly: true }).some((f) => f.includes("Cistern")));
  for (const input of inputs(1)) {
    for (const key of ['"rects"', '"wall"', '"square"', '"at":[']) assert.ok(!input.includes(key), key);
  }
  assert.ok(inputs(1)[0].includes("Corridor: 30 by 10 ft."));
});

// 12. The hand-off.
test("12. the hand-off records alert, gear, fates, companions and the exit", () => {
  let s = apply(start(), { type: "execute", card: fixtureCard("card2"), rolls: [34, 52] });
  s = ops(s, [{ give: { item: "gear_sack", to: "lyra" } }]);
  const out = [{ n: 1, summary: "Up and out.", actors: ["player", "fern", "lyra"], zone: "stair_top", noise: "quiet", tags: [], effects: ["player", "fern", "lyra"].map((id) => move(id, "stair_top")) }];
  const h = apply(s, { type: "execute", card: card(s, splitLongMoves(s, out)) }).handoff;
  assert.equal(h.outcome, "escaped");
  assert.deepEqual(h.exit, ["stair_top"]);
  assert.ok(h.gear.includes("gear_sack") && h.gear.includes("keyring"));
  assert.deepEqual(h.companions, ["fern", "lyra"]);
  assert.equal(h.fates.snag.disposition, "bargaining");
  assert.equal(h.fates.brannoc.zone, "cell_brannoc");
  assert.ok(h.spare > 0 && typeof h.log === "string");
});

// D60: a replay reproduces state exactly.
test("replaying a recorded log reproduces state exactly", () => {
  const begin = { packet, party, seed: 7 };
  const steps = [{ n: 1, summary: "Up and out.", actors: ["player", "fern", "lyra"], zone: "stair_top", noise: "quiet", tags: [], effects: ["player", "fern", "lyra"].map((id) => move(id, "stair_top")) }];
  const actions = [];
  let s = load(begin);
  const act = (a) => (actions.push(a), (s = apply(s, a)));
  act({ type: "execute", card: fixtureCard("card2") }); // seeded rolls
  act({ type: "ops", ops: [{ add_canon: { kind: "texture", text: "The drumhead hangs in tatters." } }] });
  act({ type: "ticks", n: 1 });
  act({ type: "execute", card: card(s, splitLongMoves(s, steps)) });
  const again = replay({ start: begin, actions: JSON.parse(JSON.stringify(actions)) });
  assert.deepEqual(again, s);
  const other = replay({ start: { ...begin, seed: 8 }, actions });
  assert.equal(typeof other.rng, "number");
});

// D64: working a door takes hands, from a side it's worked from.
test("a rat can't unlock a door, even holding the key; nor can anyone on the wrong side", () => {
  let s = ops(start(), [{ use_ability: { actor: "fern", ability: "wildshape" } }, { give: { item: "keyring", to: "fern" } }]);
  const unlock = (who, door) => [{ actors: [who], zone: "cell_middle", summary: "Unlock the door.", effects: [{ set_flag: { entity: door, key: "locked", value: false } }] }];
  const c = card(s, unlock("fern", "bars_middle"));
  assert.deepEqual(c.facts[0].interrupts.map((i) => [i.code, i.id]), [["cant_work", "bars_middle"]]);
  const paws = apply(s, { type: "execute", card: c });
  assert.deepEqual([paws.results[0].outcome, paws.results[0].interrupt.code], ["interrupted", "cant_work"]);
  assert.equal(paws.flags.bars_middle.locked, true);

  // The rogue with the key walks out, unlocking in passing; without hands, the way is shut.
  const handed = ops(start(), [{ give: { item: "keyring", to: "player" } }, move("player", "corridor")]);
  assert.deepEqual([handed.at.player, handed.flags.bars_far.locked], ["corridor", false]);
  const handless = ops(start(), [{ give: { item: "keyring", to: "player" } }, { set_flag: { entity: "player", key: "hands", value: false } }]);
  assert.ok(checkSteps(handless, { steps: [{ n: 1, summary: "Out.", actors: ["player"], zone: "corridor", noise: "quiet", tags: [], effects: [move("player", "corridor")] }], rulings: [], internal_checks: [] }).errors.length);

  const inside = load({ packet: variant((p) => (p.map.connections.find((x) => x.id === "bars_far").reachable_from_other_side = false)), party });
  const held = ops(inside, [{ give: { item: "keyring", to: "player" } }]);
  const wrong = card(held, [{ actors: ["player"], zone: "cell_far", summary: "Unlock it from inside.", effects: [{ set_flag: { entity: "bars_far", key: "locked", value: false } }] }]);
  assert.match(wrong.facts[0].interrupts[0].detail, /side/);
});
