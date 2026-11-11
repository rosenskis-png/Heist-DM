// Fixes from the second shakedown (D185): a plan finishes before its room ends, slips in a call's output are tidied
// instead of retried, a follower's record doesn't drift, and small things in how places and people are named.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newSession } from "../src/game/session.js";
import { load, apply, checkPacket } from "../src/engine/index.js";
import { nameOf } from "../src/engine/world.js";
import { tidy } from "../src/validate.js";
import { inOrder } from "../src/calls/adjudicate.js";
import { roomEnded, newCampaign } from "../src/campaign/run.js";
import { layout } from "../src/engine/layout.js";
import { leaveBy } from "../src/game/journey.js";
import { resolveSchema, verdictSchema, companionSchema } from "../schemas/index.js";
import { validate } from "../src/validate.js";

const cells = JSON.parse(readFileSync(new URL("../content/encounters/cells.json", import.meta.url), "utf8"));
const party = () => newSession({ packet: cells, player: { name: "Kael", class: "rogue" }, companions: ["fern", "celeste"] }).state.party;

test("a plan's steps after the party reaches the way out still happen: the page taken at the arch is held", () => {
  // The Cells' objective is the whole party at the stair top: step 1 gets them there, step 2 takes the gear sack.
  const s0 = load({ packet: cells, party: party() });
  const card = { plan: "x", steps: [{ n: 1, summary: "up", who: ["player", "fern", "celeste"], at: 1 }, { n: 2, summary: "grab", who: ["player"], at: 2 }], ends_at: 2, rulings: [] };
  const out = {
    steps: [
      { n: 1, happened: "yes", what: "Up the stair.", changes: { moves: ["player", "fern", "celeste"].map((who) => ({ who, to: "stair_top" })) } },
      { n: 2, happened: "yes", what: "The sack, on the way.", changes: { holds: [{ item: "gear_sack", by: "player" }] } },
    ],
    ends_at: 2,
    narration: { text: "x" },
  };
  const s = apply(apply(s0, { type: "roll", card }), { type: "resolve", card, dice: [], out });
  assert.equal(s.ended?.outcome, "escaped");
  assert.equal(s.holder.gear_sack, "player");
  assert.ok(s.handoff.gear.includes("gear_sack"));
});

test("a call's slips are tidied before they're checked, never retried", () => {
  // A resolve step that copies the card's summary; a companion's null stance; a verdict reaction with no strength.
  const step = { n: 1, happened: "yes", what: "x", summary: "copied from the card", who: ["player"], changes: {} };
  assert.deepEqual(validate(resolveSchema, tidy(resolveSchema, { steps: [step], ends_at: 1, narration: { text: "x", texture: [] } })), []);
  assert.deepEqual(validate(companionSchema, tidy(companionSchema, { message: "Hi.", stance: null, reactions: [] })), []);
  // A step a tick in the past, out of order, and a plan that ends before it does, put in order from now.
  const fixed = inOrder({ tick: 8 }, { steps: [{ n: 3, at: 0 }, { n: 1, at: 1 }, { n: 2, at: 12 }], ends_at: 5 });
  assert.deepEqual(fixed.steps.map((s) => [s.n, s.at]), [[1, 8], [2, 8], [3, 12]]);
  assert.equal(fixed.ends_at, 12);
});

test("a follower's name, pronouns and looks stay as they were, whatever a later verdict writes", () => {
  const nib = { kind: "follower", name: "Nib", pronouns: "he/him", looks: "a molting kobold with a red judgement-mark", what: "untied and wary" };
  const room = (carried) => ({ handoff: { conditions: [], spent: {}, gold: 0, relics: [] }, verdict: { rating: 6, why: "x", reactions: [], carried }, exits: [{ id: "e", zone: "z", leads_to: "encounter" }] });
  let camp = roomEnded(newCampaign({ seed: 3 }), room([nib])).camp;
  camp = roomEnded(camp, room([{ kind: "follower", name: "Nib", pronouns: "she/her", looks: "hooded", what: "frightened but safe" }])).camp;
  assert.deepEqual(camp.carried[0], { ...nib, what: "frightened but safe" });
});

test("places aren't 'the the', a blank name isn't the class, and hidden fact labels aren't hidden words", () => {
  const s = load({ packet: cells, party: party() });
  s.packet.map.zones[0].name = "The drain arch";
  assert.equal(nameOf(s, s.packet.map.zones[0].id), "the drain arch");
  const blank = newSession({ packet: cells, player: { name: "  ", class: "rogue" }, companions: ["fern", "celeste"] }).state.party[0];
  assert.equal(blank.name, "Wren");
  const p = structuredClone(cells);
  p.map.facts.push({ id: "breath", text: "The engine breathes once if you wait.", hidden: true });
  p.opening += " Warm breath rises from the grate.";
  assert.deepEqual(checkPacket(p, party()).filter((e) => e.includes("breath")), []);
});

test("the layout drops a way from a place to itself, and draws caves and towers as what they are", () => {
  const zones = [
    { id: "a", name: "The bottom terrace", purpose: "x", light: "dim", size: [4, 3] },
    { id: "b", name: "The crack", purpose: "a crevice in the rock", light: "dark", size: [2, 2] },
    { id: "c", name: "The watchtower top", purpose: "x", light: "dim", size: [2, 2], level: 1 },
  ];
  const connections = [
    { id: "ab", kind: "opening", between: ["a", "b"], fits: "large", operated_from: "both" },
    { id: "ac", kind: "stairs", between: ["a", "c"], fits: "medium", operated_from: "both" },
    { id: "aa", kind: "crawl", between: ["a", "a"], fits: "medium", operated_from: "both" },
  ];
  const { packet, mapped } = layout({ map: { zones, connections, things: [], facts: [] }, start: { positions: { player: "a" } } });
  assert.ok(mapped);
  assert.deepEqual(packet.map.connections.map((c) => c.id), ["ab", "ac"]);
  assert.deepEqual(packet.map.zones.map((z) => z.shape), ["cave", "cave", "round"]);
});

test("leaving by a way on takes the whole party there", () => {
  const p = structuredClone(cells);
  p.mode = "room";
  delete p.intent.objective;
  p.intent.alternates = [];
  delete p.intent.fail_forward;
  p.intent.exits = [{ id: "up", zone: "stair_top", leads_to: "encounter" }];
  const session = newSession({ packet: p, player: { name: "Kael", class: "rogue" }, companions: ["fern", "celeste"] });
  leaveBy(session, "up");
  assert.deepEqual(session.ended.exit, ["stair_top"]);
});
