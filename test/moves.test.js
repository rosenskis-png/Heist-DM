// Moves (D176) and what the party carries (D178): stakes before a roll, trouble that moves on failure and never on
// the clock, and what goes with the party from room to room.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { newSession } from "../src/game/session.js";
import { talk, roll, backOut, stakes, makeCard } from "../src/game/turns.js";
import { load, apply } from "../src/engine/index.js";
import { roomSheet, sheetText, encounterText } from "../src/context.js";
import { roomEnded, newCampaign } from "../src/campaign/run.js";

const file = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const cells = JSON.parse(file("content/encounters/cells.json"));
const prompts = Object.fromEntries(readdirSync(new URL("../prompts/", import.meta.url)).map((f) => [f.replace(".md", ""), file(`prompts/${f}`)]));
const worse = (id, at_tick, text) => ({ id, known: false, at_tick, do: [{ then: [{ add_canon: { kind: "ruling", text } }] }] });
// The Cells with no drawn map and two things that get worse.
const scene = () => {
  const p = structuredClone(cells);
  for (const z of p.map.zones) delete z.rects;
  p.clock.events = [worse("second", 9, "The second thing happens."), worse("first", 3, "The first thing happens.")];
  return p;
};
const check = (who) => ({ who, band: "medium", reason: "It could go either way.", success: { text: "It works.", changes: {} }, failure: { text: "It doesn't budge.", changes: {} } });
const io = (out) => ({ sample: { json: async () => out } });
const start = (packet) => newSession({ packet, player: { name: "Kael", class: "rogue" }, companions: ["fern", "nadia"] });

test("in a room with no map, trouble moves a step on a failed roll or a wait, in order, and never on the clock", () => {
  let s = load({ packet: scene(), party: start(cells).state.party });
  s = apply(s, { type: "ticks", n: 20 });
  assert.deepEqual(s.fired, [], "time alone moves nothing");
  s = apply(s, { type: "scene", out: { reply: "x", ticks: 0, checks: [check("player")] }, rolls: [1] });
  assert.deepEqual(s.fired, [], "a roll that's made moves nothing");
  s = apply(s, { type: "scene", out: { reply: "x", ticks: 0, checks: [check("player")] }, rolls: [100] });
  assert.deepEqual(s.fired, ["first"]);
  s = apply(s, { type: "scene", out: { reply: "x", ticks: 0, waited: true } });
  assert.deepEqual(s.fired, ["first", "second"]);
  const dm = encounterText(s.packet, s);
  assert.match(dm, /Getting worse, in this order/);
  assert.ok(!/at tick 3/.test(dm));
});

test("a drawn room keeps its clock", () => {
  const p = structuredClone(cells);
  p.clock.events = [worse("first", 3, "x")];
  let s = load({ packet: p, party: start(cells).state.party });
  s = apply(s, { type: "ticks", n: 4 });
  assert.deepEqual(s.fired, ["first"]);
});

test("a try with a check waits with its stakes shown; backing out changes nothing, rolling plays it (D176)", async () => {
  const session = start(scene());
  const out = { reply: "You set your shoulder to it.", ticks: 0, checks: [check("player")] };
  await talk(session, io(out), prompts, { to: "do", text: "I force the bench.", ask: true });
  assert.deepEqual(stakes(session), [{ who: "Kael", band: "medium", reason: "It could go either way.", fails: "It doesn't budge." }]);
  const before = JSON.stringify({ ...session.state, packet: null, party: null });
  await assert.rejects(makeCard(session, io({}), prompts), /Roll for it or back out/);
  backOut(session);
  assert.equal(session.pending, null);
  assert.equal(JSON.stringify({ ...session.state, packet: null, party: null }), before, "nothing in the world moved");
  await talk(session, io(out), prompts, { to: "do", text: "I force the bench.", ask: true });
  roll(session, { rolls: [100] });
  const told = session.feeds.table.map((e) => e.text);
  assert.ok(told.includes("It doesn't budge.") && told.includes("The first thing happens."), "the failure and what got worse are both told");
});

test("what the party has with it goes from taking stock to the campaign, the next room and the sheet (D178, D192)", () => {
  const carried = [{ kind: "item", what: "unarmed: their weapons were left behind" }, { kind: "follower", name: "Ama", pronouns: "she/her", looks: "a freed villager", what: "weak and frightened", goal: "the mill at Harrow Ford", motive: "her son is there" }];
  let camp = newCampaign({ seed: 3 });
  camp = roomEnded(camp, { handoff: { conditions: [], spent: {}, gold: 0, relics: [] }, verdict: { rating: 6, why: "x", reactions: [] }, carried, exits: [{ id: "e", zone: "z", leads_to: "encounter" }] }).camp;
  assert.deepEqual(camp.carried, carried);
  // A room ended without taking stock keeps what they had.
  camp = roomEnded(camp, { handoff: { conditions: [], spent: {}, gold: 0, relics: [] }, verdict: { rating: 6, why: "x", reactions: [] }, exits: [{ id: "e", zone: "z", leads_to: "encounter" }] }).camp;
  assert.deepEqual(camp.carried, carried);
  const s = load({ packet: cells, party: start(cells).state.party, carried: camp.carried });
  const sheet = sheetText(roomSheet(s));
  assert.ok(sheet.includes("weak and frightened") && sheet.includes("the mill at Harrow Ford"));
  assert.ok(!sheet.includes("her son"), "why a follower really wants it never reaches the sheet");
});

test("an encounter's seed draws one place and one motif, and nothing about how its danger stands (D179, D196)", async () => {
  const { seedFor, BUSY } = await import("../src/campaign/seed.js");
  const { worldOf } = await import("../src/campaign/world.js");
  const places = ["the kitchens", "the stables", "a guardroom", "the laundry", "a wine cellar", "the armoury"];
  let camp = { ...newCampaign({ seed: 5 }), plan: { places }, way: { ...newCampaign({ seed: 5 }).way, here: "encounter" } };
  const seen = [];
  for (let i = 0; i < 6; i++) {
    const { seed, camp: next } = seedFor(camp, worldOf(), "encounter", ["encounter"]);
    assert.ok(places.includes(seed.place) && !seen.includes(seed.place));
    assert.equal(seed.motifs.length, 1);
    assert.equal(seed.danger, undefined);
    seen.push(seed.place);
    camp = next;
  }
  assert.equal(seedFor(camp, worldOf(), "quiet", ["encounter"]).seed.place, undefined);
  assert.ok(!BUSY.some((b) => /game|contest/.test(b)));
});
