// The campaign between rooms, end to end on stand-in rooms: two legs and a climax, gold, relics, a merchant, the
// campfire's reset and the act's end (docs/spec/campaign.md, D140–D148). Every room is the Cells with its exits set to
// what code drew, and every verdict is written here, so nothing calls an AI.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newCampaign, drawExits, roomEnded, endAct, canSeparate } from "../src/campaign/run.js";
import { load, apply } from "../src/engine/index.js";
import { checkChanges, applyChanges } from "../src/engine/ledger.js";
import { newRomance } from "../src/campaign/relationship.js";
import { setting } from "../content/setting.js";
import { pairs } from "../content/pairs.js";
import { classes } from "../content/classes.js";
import fern from "../content/companions/fern.js";
import nadia from "../content/companions/nadia.js";

const cells = JSON.parse(readFileSync(new URL("../content/encounters/cells.json", import.meta.url)));
const party = [{ id: "player", name: classes.rogue.name, ...classes.rogue }, fern, nadia];
const members = [fern, nadia];
// Exits leave from these zones, in order; the party can reach any of them in a stand-in room.
const FROM = ["stair_top", "guardroom", "corridor"];

// A stand-in room: the Cells, with the exits code drew, a purse of gold and a relic in the guardroom.
function room(kinds, n) {
  const packet = structuredClone(cells);
  packet.id = `room_${n}`;
  packet.intent.exits = kinds.map((k, i) => ({ id: `exit_${i}`, zone: FROM[i], leads_to: k }));
  packet.map.things.push(
    { id: "purse", name: "a purse", properties: "leather, heavy with coin", location: { zone: "guardroom" }, reward: { gold: 5 } },
    { id: `charm_${n}`, name: "a charm", properties: "bone, warm to the touch", location: { zone: "guardroom" }, reward: { relic: { name: `Charm ${n}`, text: "Beasts hesitate before attacking whoever wears it." } } },
  );
  return packet;
}

// Play a stand-in room: optionally take the purse and the charm, then leave by exit `by` (or get dragged off, with no
// exit reached, when `by` is null).
function play(camp, packet, { by = 0, loot = true } = {}) {
  let s = load({ packet, party, conditions: camp.carry.conditions, spent: camp.carry.spent, gold: camp.gold, relics: camp.relics });
  if (loot) s = apply(s, { type: "ops", ops: [{ give: { item: "purse", to: "player" } }, { give: { item: packet.map.things.at(-1).id, to: "player" } }] });
  const zone = by === null ? "cell_far" : packet.intent.exits[by].zone;
  s = apply(s, { type: "ops", ops: party.map((p) => ({ move: { entity: p.id, to: zone } })) });
  if (!s.ended) s = apply(s, { type: "end", outcome: "escaped" });
  return s.handoff;
}

test("a whole act on stand-in rooms: campfires between legs, the climax, the sanctuary, relics kept, the next act", () => {
  let camp = newCampaign({ members, romance: newRomance(members, pairs) });
  const seen = [];
  let n = 0;
  while (camp.way.here !== "sanctuary") {
    const drawn = drawExits(camp, 2);
    camp = drawn.camp;
    const packet = room(drawn.kinds, n++);
    const handoff = play(camp, packet, { by: n % 5 === 0 ? null : 0 });
    const before = camp.gold;
    const ended = roomEnded(camp, { handoff, verdict: { rating: n % 3 ? 8 : 3, why: "x", reactions: [] }, exits: packet.intent.exits, members });
    camp = ended.camp;
    assert.equal(camp.gold, before + 5, "the purse's gold is carried out");
    if (n % 5 === 0) assert.equal(ended.forced, true, "no exit reached: code picks the way on");
    seen.push(ended.kind);
    if (ended.kind === "campfire") assert.deepEqual(camp.carry.conditions, []);
    assert.ok(n < 30, "the act ends");
  }
  assert.equal(seen.filter((k) => k === "campfire").length, setting.arc[0].legs - 1);
  assert.deepEqual(seen.slice(-2), ["climax", "sanctuary"]);
  assert.equal(camp.relics.length, setting.relics.max, "relics stop at the act's limit");
  // The climax's verdict decides how many relics carry on.
  assert.equal(camp.keep, setting.relics.keptByRating[(n - 1) % 3 ? 7 : 2]);
  assert.throws(() => endAct(camp, camp.relics.slice(0, camp.keep + 1).map((r) => r.id)));
  const next = endAct(camp, camp.relics.slice(0, camp.keep).map((r) => r.id));
  assert.equal(next.act, 2);
  assert.equal(next.relics.length, camp.keep);
  assert.equal(next.gold, camp.gold, "gold carries into the next act");
  assert.equal(next.way.leg, 1);
});

test("a merchant's price is paid from the party's gold, and the party can't spend what it doesn't have", () => {
  const packet = structuredClone(cells);
  packet.map.things.push({ id: "lantern", name: "a lantern", properties: "brass, shuttered", location: { zone: "guardroom" }, price: 4 });
  const take = { holds: [{ item: "lantern", by: "player" }] };
  const poor = load({ packet, party, gold: 3 });
  assert.ok(checkChanges(poor, take).some((e) => e.includes("costs 4 gold")));
  const rich = load({ packet, party, gold: 10 });
  assert.deepEqual(checkChanges(rich, take), []);
  applyChanges(rich, take);
  assert.equal(rich.gold, 6);
  assert.equal(rich.holder.lantern, "player");
  // Passing it within the party isn't buying it again.
  applyChanges(rich, { holds: [{ item: "lantern", by: "fern" }] });
  assert.equal(rich.gold, 6);
});

test("a party with fewer relics than the climax allows keeps them all, and nothing breaks", () => {
  let camp = newCampaign({ members });
  camp = { ...camp, way: { ...camp.way, here: "climax" }, relics: [{ id: "charm", name: "Charm", text: "x" }] };
  const handoff = { conditions: [], spent: {}, gold: 0, relics: [] };
  const { camp: after } = roomEnded(camp, { handoff, verdict: { rating: 10, why: "x", reactions: [] }, members });
  assert.equal(after.keep, 1);
  assert.equal(endAct(after, ["charm"]).relics.length, 1);
  const none = roomEnded({ ...camp, relics: [] }, { handoff, verdict: { rating: 10, why: "x", reactions: [] }, members }).camp;
  assert.equal(none.keep, 0);
  assert.equal(endAct(none, []).relics.length, 0);
});

test("a separation can start only where it can resolve before the campfire, and everyone is back at the fire", () => {
  let camp = newCampaign({ members });
  assert.equal(canSeparate(camp), true);
  camp = { ...camp, way: { ...camp.way, left: 0 } };
  assert.equal(canSeparate(camp), false, "this room's exits lead to the campfire");
  const handoff = { conditions: [{ id: "hurt", who: "player", text: "Hurt." }], spent: { fern: { wild_shape: 1 } }, companions: [fern.id], gold: 0, relics: [] };
  const { camp: rested, kind } = roomEnded(camp, { handoff, verdict: { rating: 5, why: "x", reactions: [] }, exits: [{ id: "e", zone: "stair_top", leads_to: "campfire" }], members });
  assert.equal(kind, "campfire");
  assert.deepEqual(rested.carry.companions, [fern.id, nadia.id]);
  assert.deepEqual(rested.carry.conditions, []);
  assert.deepEqual(rested.carry.spent, {});
});
