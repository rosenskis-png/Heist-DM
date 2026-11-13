// The goblin camp (D180): a hand-built site. One place of several areas with exact footprints, found as the party
// moves about, whose alarm climbs only when a roll fails.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newSession, serialize, restore } from "../src/game/session.js";
import { apply, checkPacket } from "../src/engine/index.js";
import { roomSheet, sheetText, encounterText } from "../src/context.js";
import { mapView } from "../src/game/view.js";

const file = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const camp = JSON.parse(file("fixtures/sites/goblin_camp.json"));
const cells = JSON.parse(file("content/encounters/cells.json"));
const start = () => newSession({ packet: camp, player: { name: "Kael", class: "rogue" }, companions: ["fern", "celeste"] });
const fail = { reply: "x", ticks: 0, checks: [{ who: "player", band: "medium", reason: "r", success: { text: "a", changes: {} }, failure: { text: "b", changes: {} } }] };
const go = (s, to) => apply(s, { type: "ops", source: "test", ops: ["player", "fern", "celeste"].map((entity) => ({ move: { entity, to } })) });

test("the camp is a sound packet: every area has a footprint, every way joins the areas it says, and nothing is hidden", () => {
  const party = start().state.party;
  assert.deepEqual(checkPacket(start().state.packet, party), []);
  assert.ok(camp.map.zones.every((z) => z.rects?.length));
  assert.ok(![...camp.map.zones, ...camp.map.connections, ...camp.map.things, ...camp.map.facts].some((x) => x.hidden));
  // Every area can be reached from the ledge, and there are two ways round to the pens that don't cross the camp floor.
  const next = (z, skip = []) => camp.map.connections.filter((c) => c.between.includes(z)).map((c) => c.between.find((x) => x !== z)).filter((x) => !skip.includes(x));
  const reach = (from, skip) => {
    const seen = new Set([from]);
    for (const z of seen) for (const n of next(z, skip)) seen.add(n);
    return seen;
  };
  assert.equal(reach("tunnel_mouth", []).size, camp.map.zones.length);
  assert.ok(reach("tunnel_mouth", ["camp"]).has("pens") && reach("tunnel_mouth", ["camp", "tower_top", "walk_west", "walk_east"]).has("pens"));
  assert.ok(reach("tunnel_mouth", ["camp"]).has("outflow"), "one way out never touches the camp floor");
});

test("the party's sheet and map show only the areas found so far, and no one's name before it's heard", () => {
  let s = start().state;
  const first = roomSheet(s);
  assert.deepEqual(first.places.map((p) => p.id), ["tunnel_mouth", "camp", "tower_top", "walk_west", "walk_east", "pens"]);
  const text = sheetText(first);
  assert.ok(text.includes("somewhere not yet seen (by The crack at the foot of the ledge)"));
  for (const hid of ["The flooded drift", "The outflow", "The deep tunnels", "tally slate", "ore cart"]) assert.ok(!text.includes(hid), hid);
  for (const name of ["Gruk", "Dorna", "Skrit"]) assert.ok(!text.includes(name) && !camp.opening.includes(name), name);
  assert.ok(!mapView(s).levels.some((l) => l.zones.some((z) => z.id === "flooded_drift")));
  s = go(s, "flooded_drift");
  assert.ok(roomSheet(s).places.some((p) => p.id === "flooded_drift"));
  assert.ok(mapView(s).levels.some((l) => l.zones.some((z) => z.id === "flooded_drift")));
  // What was found stays found.
  s = go(s, "tunnel_mouth");
  assert.ok(roomSheet(s).places.some((p) => p.id === "flooded_drift"));
  // The DM is told every area, with its size in feet.
  assert.match(encounterText(s.packet, s), /camp \(The camp; 70×50 ft/);
});

test("the camp's alarm climbs a step for each failed roll, never for time or waiting, and moves the people it says", () => {
  let s = start().state;
  s = apply(s, { type: "ticks", n: 30 });
  s = apply(s, { type: "scene", out: { reply: "x", ticks: 0, waited: true } });
  assert.deepEqual(s.fired, []);
  s = apply(s, { type: "scene", out: fail, rolls: [100] });
  assert.deepEqual(s.fired, ["uneasy"]);
  assert.equal(s.at.keeper, "pens");
  s = apply(s, { type: "scene", out: fail, rolls: [100] });
  assert.equal(s.at.keeper, "camp", "the keeper leaves the pens to search");
  s = apply(s, { type: "scene", out: fail, rolls: [100] });
  s = apply(s, { type: "scene", out: fail, rolls: [100] });
  assert.equal(s.flags.sergeant.awake, true);
  assert.equal(s.ended, null, "the sergeant awake is not the end");
  s = go(s, "outflow");
  assert.equal(s.ended.outcome, "by_water");
});

test("a save of the camp carries the place whole and loads without it", () => {
  const session = start();
  session.packet = camp;
  const back = restore(serialize(session), cells);
  assert.equal(back.state.packet.id, "goblin_camp");
  assert.deepEqual(back.state.known.places, session.state.known.places);
});

test("the map draws from state: gaps for ways not yet explored, ghosts where someone was last seen, and one mark each (D181)", () => {
  let s = start().state;
  let m = mapView(s);
  // Every level shares one frame across, so the tower top sits over its square of the camp.
  assert.ok(m.width >= 21 && m.levels.length === 2);
  const ground = m.levels.find((l) => l.level === 0);
  assert.ok(ground.connections.find((c) => c.id === "drift_mouth").gap, "the mine drift's mouth is a gap until it's found");
  const crack = ground.connections.find((c) => c.id === "cold_crack");
  assert.equal(crack.leads, null);
  assert.equal(ground.connections.find((c) => c.id === "ledge_ladder").leads, "The west walkway");
  const tokens = m.levels.flatMap((l) => l.tokens);
  assert.equal(new Set(tokens.map((t) => t.mark)).size, tokens.length, "no two tokens share a mark");
  assert.ok(tokens.find((t) => t.id === "goblins").group && !tokens.find((t) => t.id === "sergeant").group);
  assert.equal(tokens.find((t) => t.id === "keeper").zone, "pens");
  // Down in the dark the camp is out of sight: its people stay on the map as ghosts where they were last seen.
  s = go(s, "flooded_drift");
  m = mapView(s);
  const keeper = m.levels.flatMap((l) => l.tokens).find((t) => t.id === "keeper");
  assert.ok(keeper.ghost && keeper.zone === "pens");
  assert.ok(m.levels.find((l) => l.level === -1).zones.some((z) => z.id === "flooded_drift" && z.ground === "water"));
  // The alarm moves the keeper while nobody is looking: the ghost stays where he was last seen, not where he is.
  s = apply(s, { type: "scene", out: fail, rolls: [100] });
  s = apply(s, { type: "scene", out: fail, rolls: [100] });
  assert.equal(s.at.keeper, "camp");
  assert.equal(mapView(s).levels.flatMap((l) => l.tokens).find((t) => t.id === "keeper").zone, "pens");
  // Back in sight, the token is where he is.
  s = go(s, "tunnel_mouth");
  const seenAgain = mapView(s).levels.flatMap((l) => l.tokens).find((t) => t.id === "keeper");
  assert.ok(!seenAgain.ghost && seenAgain.zone === "camp");
});

test("a room with no drawn map still gets a sketch of its places and ways (D181)", async () => {
  const { sketchView } = await import("../src/game/view.js");
  const bare = structuredClone(camp);
  delete bare.site;
  for (const z of bare.map.zones) delete z.rects;
  for (const c of bare.map.connections) { delete c.wall; delete c.square; }
  for (const t of bare.map.things) delete t.location.at;
  const s = newSession({ packet: bare, player: { name: "Kael", class: "rogue" }, companions: ["fern", "celeste"] }).state;
  assert.equal(mapView(s), null);
  const k = sketchView(s);
  assert.equal(k.nodes.length, bare.map.zones.length);
  assert.equal(k.nodes.find((n) => n.id === "tunnel_mouth").col, 0);
  assert.ok(k.nodes.find((n) => n.id === "outflow").col >= 2);
  assert.ok(k.nodes.find((n) => n.id === "tunnel_mouth").tokens.some((t) => t.party));
});
