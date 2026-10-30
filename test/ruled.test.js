// Ruled mode (D75): the DM rules, the engine keeps the books. Recorded DM outputs, no AI calls.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { load, apply, replay, checkCard, checkResolve, checkScene, checkChanges } from "../src/engine/index.js";
import { validate } from "../src/validate.js";
import { adjudicateSchema, resolveSchema, sceneSchema } from "../schemas/index.js";
import { classes } from "../content/classes.js";
import fern from "../content/companions/fern.js";
import lyra from "../content/companions/lyra.js";

const packet = JSON.parse(readFileSync(new URL("../content/encounters/cells.json", import.meta.url), "utf8"));
const party = [{ id: "player", name: "Rogue", ...classes.rogue }, fern, lyra];
const start = { packet, party, ruled: true, seed: 5 };

// The rat plan as a DM would rule it: four steps, two rolls, small things cost no time.
export const ratCard = {
  steps: [
    { n: 1, summary: "While Snag drinks, Fern becomes a rat and slips down the grate.", who: ["fern"], at: 0, takes: 1 },
    { n: 2, summary: "Brannoc pays the rats in crusts; when Snag sits, they lift the ring off the peg behind him.", who: ["fern", "brannoc"], at: 2, takes: 0, roll: { band: "medium", reason: "The peg is a few feet behind a bored jailer.", fails: "The ring clinks; Snag turns and clips it to his belt.", stops: true } },
    { n: 3, summary: "On his next drink the rats bring the ring to Lyra, and Fern gnaws the drumhead.", who: ["fern", "lyra"], at: 3, takes: 1, roll: { band: "easy", reason: "His back is turned and he's humming.", fails: "The ring scrapes and Snag looks round before the drum is done.", stops: false } },
    { n: 4, summary: "Lyra unlocks every door and everyone goes up the stair, Brannoc too.", who: ["lyra", "player", "brannoc", "fern"], at: 4, takes: 1 },
  ],
  rulings: [{ id: "rats_carry_ring", text: "A pack of gutter rats can carry the key ring if they're paid in bread.", about: ["keyring", "gutter_rats"] }],
};
const everyoneUp = ["player", "lyra", "fern", "brannoc"].map((who) => ({ who, to: "stair_top" }));
export const ratPlayed = {
  steps: [
    { n: 1, happened: "yes", what: "Fern is a rat in the gutter.", changes: { flags: [{ on: "fern", key: "form", value: "animal" }], moves: [{ who: "fern", to: "gutter" }] } },
    { n: 2, happened: "yes", what: "The rats have the ring.", changes: { holds: [{ item: "crusts", by: "gutter_rats" }, { item: "keyring", by: "fern" }], moves: [{ who: "fern", to: "guardroom" }] } },
    { n: 3, happened: "yes", what: "Lyra has the ring; the drum is ruined.", changes: { holds: [{ item: "keyring", by: "lyra" }], flags: [{ on: "drum", key: "gnawed", value: true }] } },
    { n: 4, happened: "yes", what: "Everyone is up the stair.", changes: { flags: ["bars_near", "bars_middle", "bars_far", "bars_brannoc"].map((on) => ({ on, key: "locked", value: false })), moves: everyoneUp } },
  ],
  ends_at: 5,
};

test("the recorded outputs fit their contracts", () => {
  assert.deepEqual(validate(adjudicateSchema, ratCard), []);
  assert.deepEqual(validate(resolveSchema, ratPlayed), []);
});

test("the rat plan, ruled: rolls first, then the DM's account lands step by step, and the party is out", () => {
  const s = load(start);
  assert.deepEqual(checkCard(s, ratCard), []);
  const rolled = apply(s, { type: "roll", card: ratCard, rolls: [40, 30] });
  assert.deepEqual(rolled.dice.map((d) => d.success), [true, true]);
  assert.deepEqual(checkResolve(rolled, ratCard, rolled.dice, ratPlayed), []);
  const after = apply(rolled, { type: "resolve", card: ratCard, dice: rolled.dice, out: ratPlayed });
  assert.equal(after.ended?.outcome, "escaped");
  assert.equal(after.tick, 4);
  assert.ok(after.facts.some((f) => f.id === "rats_carry_ring"));
  assert.equal(after.flags.drum.gnawed, true);
  // The engine didn't decide anything: no trigger started a fight when the doors opened.
  assert.equal(after.combat, null);
  assert.ok(!after.log.some((l) => l.trigger));
});

test("the DM's account must fit the dice and the card", () => {
  const s = load(start);
  const failed = [{ n: 2, odds: 65, roll: 90, success: false }, { n: 3, odds: 80, roll: 10, success: true }];
  assert.ok(checkResolve(s, ratCard, failed, ratPlayed).some((e) => e.includes("step 2's roll failed")));
  const stopped = { ...ratPlayed, stopped: { at: 2, why: "Snag has the keys." } };
  assert.ok(checkResolve(s, ratCard, failed, stopped).some((e) => e.includes("nothing after it")));
  const short = { steps: ratPlayed.steps.slice(0, 2), ends_at: 2 };
  assert.ok(checkResolve(s, ratCard, failed, short).some((e) => e.includes("all 4 steps")));
  const ghost = { steps: [{ n: 1, happened: "yes", what: "x", changes: { moves: [{ who: "goblin", to: "attic" }] } }], stopped: { at: 1, why: "x" }, ends_at: 0 };
  assert.equal(checkResolve(s, ratCard, failed, ghost).filter((e) => e.includes("isn't in this encounter")).length, 2);
});

test("the card can't name what the party hasn't found, or start in the past", () => {
  const s = apply(load(start), { type: "scene", out: { reply: "x", ticks: 2 } });
  const leaky = { steps: [{ n: 1, summary: "Fern checks the crawl behind the cask.", who: ["fern"], at: 1, takes: 1 }], rulings: [] };
  const errors = checkCard(s, leaky);
  assert.ok(errors.some((e) => e.includes('"crawl"')));
  assert.ok(errors.some((e) => e.includes("before now")));
});

test("a scene rolls its checks, and its time passes with the routines", () => {
  const out = {
    reply: "Snag squints at you.",
    checks: [{ who: "player", band: "hard", reason: "He fears blame more than he wants coin.", success: { text: "He comes over.", changes: { moves: [{ who: "snag", to: "corridor" }], moods: [{ npc: "snag", value: "tempted" }] } }, failure: { text: "He spits.", changes: {} } }],
    ticks: 2,
  };
  assert.deepEqual(validate(sceneSchema, out), []);
  const s = load(start);
  assert.deepEqual(checkScene(s, out), []);
  const won = apply(s, { type: "scene", out, rolls: [20] });
  assert.equal(won.scene.checks[0].success, true);
  assert.equal(won.tick, 2);
  // Moved by the DM, so off his routine: the clock doesn't drag him back to his beat.
  assert.equal(won.at.snag, "corridor");
  assert.deepEqual(won.offRoutine, ["snag"]);
  const back = apply(won, { type: "scene", out: { reply: "He goes back.", changes: { routine: [{ npc: "snag", follows: true }] }, ticks: 1 } });
  assert.notEqual(back.at.snag, "corridor");
  const lost = apply(s, { type: "scene", out, rolls: [99] });
  assert.equal(lost.at.snag, "guardroom");
});

test("placed events still run: Uzga arrives at 21 and takes Fern if she's in her cell", () => {
  const s = apply(load(start), { type: "scene", out: { reply: "You wait.", ticks: 12 } });
  const end = apply(s, { type: "scene", out: { reply: "You wait.", ticks: 12 } });
  assert.equal(end.ended?.outcome, "fern_taken");
  assert.equal(end.tick, 21);
});

test("rulings name real things, and anything can be a fact", () => {
  const s = load(start);
  assert.deepEqual(checkChanges(s, { facts: [{ id: "snag_drunk", text: "Snag is drunk.", about: ["snag"] }], flags: [{ on: "snag", key: "drunk", value: true }] }), []);
  assert.ok(checkChanges(s, { retire: ["nothing"] }).length);
  assert.ok(checkChanges(s, { routine: [{ npc: "brannoc", follows: false }] }).length);
});

test("a ruled game replays exactly", () => {
  let s = load(start);
  const actions = [{ type: "roll", card: ratCard }];
  s = apply(s, actions[0]);
  actions.push({ type: "resolve", card: ratCard, dice: s.dice, out: { ...ratPlayed, steps: ratPlayed.steps.map((st) => (s.dice.find((d) => d.n === st.n && !d.success) ? { ...st, happened: "no", changes: {} } : st)) } });
  s = apply(s, actions[1]);
  assert.deepEqual(replay({ start, actions }), s);
});
