// A fight is a plan (D130), and the party always moves on (D131). Recorded DM outputs, no AI calls.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { load, apply, checkChanges, checkResolve, checkScene } from "../src/engine/index.js";
import { ledgerText } from "../src/context.js";
import { validate } from "../src/validate.js";
import { resolveSchema, sceneSchema } from "../schemas/index.js";
import * as Rel from "../src/campaign/relationship.js";
import { classes } from "../content/classes.js";
import { pairs } from "../content/pairs.js";
import fern from "../content/companions/fern.js";
import nadia from "../content/companions/nadia.js";

const packet = JSON.parse(readFileSync(new URL("../content/encounters/cells.json", import.meta.url), "utf8"));
const party = [{ id: "player", name: "Rogue", ...classes.rogue }, fern, nadia];
const start = (over = {}) => load({ packet, party, seed: 3, ...over });
const scene = (s, out) => apply(s, { type: "scene", out: { reply: "x", ticks: 0, ...out } });

// A one-step card: the player goes for Snag.
const card = { steps: [{ n: 1, summary: "You jump Snag at the cask.", who: ["player"], at: 0, roll: { band: "medium", reason: "He's half drunk.", fails: "He clubs you: your arm is numb, no heavy lifting.", stops: true } }], ends_at: 1, rulings: [] };
const play = (s, success, out) => {
  const rolled = apply(s, { type: "roll", card, rolls: [success ? 10 : 99] });
  assert.deepEqual(checkResolve(rolled, card, rolled.dice, out), []);
  return apply(rolled, { type: "resolve", card, dice: rolled.dice, out });
};
const narration = { text: "x", texture: [] };

test("toughness comes from the tier: a telling blow puts a guard down, an elite takes two", () => {
  const s = start();
  assert.equal(s.toughness.snag, 1);
  assert.equal(s.toughness.uzga, 2);
  const hit = scene(s, { changes: { wounds: [{ who: "snag" }, { who: "uzga" }] } });
  assert.equal(hit.flags.snag.down, true);
  assert.equal(hit.flags.uzga?.down, undefined);
  assert.equal(scene(hit, { changes: { wounds: [{ who: "uzga" }] } }).flags.uzga.down, true);
  assert.match(ledgerText(s), /Telling blows each can still take: snag 1\/1/);
});

test("harm to the party is a condition or down, never a wound; conditions are for the party", () => {
  const s = start();
  assert.ok(checkChanges(s, { wounds: [{ who: "fern" }] }).some((e) => e.includes("not fern")));
  assert.ok(checkChanges(s, { conditions: [{ id: "x", who: "snag", text: "Sore." }] }).some((e) => e.includes("for the party")));
  assert.ok(checkChanges(s, { recover: ["nothing"] }).length);
  assert.deepEqual(checkChanges(s, { conditions: [{ id: "arm", who: "player", text: "Your arm is numb: no heavy lifting." }], flags: [{ on: "fern", key: "down", value: true }] }), []);
});

test("a failed blow costs what the card said, and the account leaves what Snag is about to do", () => {
  const out = {
    steps: [{ n: 1, happened: "no", what: "Snag gets his club up first.", changes: { conditions: [{ id: "numb_arm", who: "player", text: "Your arm is numb: no heavy lifting." }] } }],
    stopped: { at: 1, why: "Snag is up and swinging." },
    threats: [{ who: "snag", does: "Backs toward the drum, club raised." }],
    ends_at: 1,
    narration,
  };
  assert.deepEqual(validate(resolveSchema, out), []);
  const s = play(start(), false, out);
  assert.deepEqual(s.conditions.map((c) => c.id), ["numb_arm"]);
  assert.deepEqual(s.threats, [{ who: "snag", does: "Backs toward the drum, club raised." }]);
  assert.match(ledgerText(s, { party: true }), /About to happen, as the party sees it:\n- snag: Backs toward the drum/);
  // Mid-fight, the Moment answers and talks; anything the party does goes on the card.
  assert.deepEqual(checkScene(s, { reply: "He's six feet from it.", ticks: 0 }), []);
  assert.ok(checkScene(s, { reply: "x", ticks: 1 }).some((e) => e.includes("goes on the card")));
  const swing = { reply: "x", ticks: 0, checks: [{ who: "fern", band: "easy", reason: "x", success: { text: "y", changes: {} }, failure: { text: "z", changes: {} } }] };
  assert.ok(checkScene(s, swing).some((e) => e.includes("goes on the card")));
  // A scene that says nothing about threats leaves them; an empty list ends the fight.
  assert.equal(scene(s, {}).threats.length, 1);
  assert.equal(scene(s, { threats: [] }).threats.length, 0);
});

test("threats name real people, once each, and nobody down threatens anyone", () => {
  const s = start();
  const two = [{ who: "snag", does: "x" }, { who: "snag", does: "y" }];
  assert.ok(checkScene(s, { reply: "x", ticks: 0, threats: two }).some((e) => e.includes("not two")));
  assert.ok(checkScene(s, { reply: "x", ticks: 0, threats: [{ who: "goblin", does: "x" }] }).some((e) => e.includes("isn't a person")));
  const fight = scene(s, { threats: [{ who: "snag", does: "Swings at you." }] });
  assert.deepEqual(scene(fight, { changes: { wounds: [{ who: "snag" }] } }).threats, []);
});

test("the whole party down is captured: the encounter ends, and the hand-off says so", () => {
  const down = (id) => ({ on: id, key: "down", value: true });
  const s = scene(start(), { changes: { flags: [down("player"), down("fern")] } });
  assert.equal(s.ended, null);
  const taken = scene(s, { changes: { flags: [down("nadia")], conditions: [{ id: "concussed", who: "nadia", text: "Concussed: slow and sick." }] } });
  assert.equal(taken.ended.outcome, "captured");
  assert.equal(taken.handoff.ending, "captured");
  assert.deepEqual(taken.handoff.conditions, [{ id: "concussed", who: "nadia", text: "Concussed: slow and sick." }]);
  assert.deepEqual(taken.threats, []);
  // The conditions travel: the next encounter starts with them (and only the party's).
  const next = load({ packet, party, conditions: [...taken.handoff.conditions, { id: "x", who: "snag", text: "x" }] });
  assert.deepEqual(next.conditions.map((c) => c.id), ["concussed"]);
});

test("the hand-off counts the optional objectives where they stand at the end", () => {
  let s = apply(start(), { type: "ops", ops: [{ give: { item: "gear_sack", to: "nadia" } }] });
  s = apply(s, { type: "end", outcome: "escaped" });
  assert.equal(s.handoff.ending, "objective");
  assert.deepEqual(s.handoff.optional, { met: ["gear"], missed: [] });
  assert.deepEqual(apply(start(), { type: "end", outcome: "escaped" }).handoff.optional, { met: [], missed: ["gear"] });
});

test("a room's verdict moves how they feel at camp: a great room warms them, a brutal one sours them", () => {
  const members = [fern, nadia];
  const base = Rel.newRomance(members, pairs);
  const win = { rating: 10, why: "x", reactions: [] };
  const lost = { rating: 1, why: "x", reactions: [] };
  assert.equal(Rel.moraleOf(win), 2);
  assert.equal(Rel.moraleOf(lost), -2);
  assert.equal(Rel.moraleOf({ rating: 5 }), 0);
  const up = Rel.endEncounter(base, members, win);
  const down = Rel.endEncounter(base, members, lost);
  for (const c of members) {
    assert.equal(up.rel[c.id].regard, base.rel[c.id].regard + 2);
    assert.equal(down.rel[c.id].regard, base.rel[c.id].regard - 2);
    assert.equal(up.rel[c.id].toward.trust, base.rel[c.id].toward.trust + 2);
    assert.equal(down.rel[c.id].toward.affection, base.rel[c.id].toward.affection - 2);
    // Her read of how the other feels is hers to revise at camp (D91).
    assert.deepEqual(down.rel[c.id].read, base.rel[c.id].read);
    assert.equal(up.rel[c.id].toward.respect, base.rel[c.id].toward.respect);
  }
  // Each companion's own reactions apply to her alone, through the usual scoring and caps (D20).
  const admired = { rating: 5, why: "x", reactions: [{ from: fern.id, field: "admires", item: "x", sign: 1, intensity: 2, reason: "x" }] };
  const after = Rel.endEncounter(base, members, admired);
  assert.equal(after.rel[fern.id].regard, base.rel[fern.id].regard + 2);
  assert.equal(after.rel[nadia.id].regard, base.rel[nadia.id].regard);
  // Without a verdict, only the caps reset.
  assert.deepEqual(Rel.endEncounter(base).rel[fern.id].toward, base.rel[fern.id].toward);
});

test("the scene contract carries threats", () => {
  assert.deepEqual(validate(sceneSchema, { reply: "x", ticks: 0, threats: [{ who: "snag", does: "Reaches for the drum." }] }), []);
  assert.ok(validate(sceneSchema, { reply: "x", ticks: 0, changes: { hp: [{ who: "snag", by: -1 }] } }).length);
});
