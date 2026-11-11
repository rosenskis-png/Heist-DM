// The pack (D184): what the party carries out of a room goes on with them as what it is, with what they've
// learned of it; gold, relics, clues and outfits are cashed in; and the telling can make a thing real.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newSession, serialize, restore } from "../src/game/session.js";
import { load, apply } from "../src/engine/index.js";
import { roomEnded, newCampaign, endAct } from "../src/campaign/run.js";
import { encounterText, roomSheet, sheetText } from "../src/context.js";
import { sheetView } from "../src/game/view.js";
import { setting } from "../content/setting.js";

const cells = JSON.parse(readFileSync(new URL("../content/encounters/cells.json", import.meta.url), "utf8"));
const party = () => newSession({ packet: cells, player: { name: "Kael", class: "rogue" }, companions: ["fern", "celeste"] }).state.party;
// The Cells with a hand-bell on the jailer's belt, a purse, and a dress in the gear.
const room = () => {
  const p = structuredClone(cells);
  p.map.things.push(
    { id: "hand_bell", name: "a cracked hand-bell", properties: "Iron, fist-sized, with a short handle.", size: "small", location: { holder: "snag" } },
    { id: "purse", name: "a purse", properties: "Leather, heavy.", size: "tiny", location: { holder: "snag" }, reward: { gold: 12 } },
    { id: "silk_dress", name: "a silk dress", properties: "Folded, grey silk.", size: "small", location: { holder: "snag" }, reward: { outfit: { id: "grey_silk", name: "Grey silk", text: "A plain grey silk dress." } } },
  );
  return p;
};
const give = (s, item, to) => apply(s, { type: "ops", source: "test", ops: [{ give: { item, to } }] });
const learn = (s, id, text, about) => apply(s, { type: "scene", out: { reply: "x", ticks: 0, changes: { facts: [{ id, text, about, known: true }] } } });
const leave = (s) => apply(s, { type: "end", outcome: "left" }).handoff;
const end = (camp, handoff) => roomEnded(camp, { handoff, verdict: { rating: 6, why: "x", reactions: [] }, exits: [{ id: "e", zone: "z", leads_to: "encounter" }] }).camp;

test("a stolen thing goes on with whoever holds it, with what was learned of it, room after room", () => {
  let s = load({ packet: room(), party: party() });
  s = give(s, "hand_bell", "player");
  s = learn(s, "bell_stills", "Shaken at a risen corpse, the hand-bell stops it where it stands.", ["hand_bell"]);
  const h = leave(s);
  assert.deepEqual(h.items, [{ id: "hand_bell", name: "a cracked hand-bell", properties: "Iron, fist-sized, with a short handle.", size: "small", holder: "player", notes: ["Shaken at a risen corpse, the hand-bell stops it where it stands."] }]);
  let camp = end(newCampaign({ seed: 3 }), h);
  // The next room: the bell is a thing in it, in the same hands, and every call that reads the room reads what it does.
  let next = load({ packet: cells, party: party(), items: camp.items });
  assert.equal(next.holder.hand_bell, "player");
  assert.match(encounterText(next.packet, next), /a cracked hand-bell, held by player\): Iron, fist-sized.*knows this of it: Shaken at a risen corpse/);
  assert.ok(sheetText(roomSheet(next)).includes("stops it where it stands"));
  assert.ok(sheetView(next).find((p) => p.id === "player").carrying.some((c) => c.name === "a cracked hand-bell" && c.what.includes("stops it")));
  // Handed to a companion and carried out again, it is hers, and still known.
  next = give(next, "hand_bell", "fern");
  camp = end(camp, leave(next));
  assert.deepEqual(camp.items.map((i) => [i.id, i.holder, i.notes.length]), [["hand_bell", "fern", 1]]);
  // Put down and left behind, it is gone.
  let third = load({ packet: cells, party: party(), items: camp.items });
  third = apply(third, { type: "ops", source: "test", ops: [{ place: { item: "hand_bell", zone: "cell_middle" } }] });
  assert.deepEqual(end(camp, leave(third)).items, []);
});

test("gold, a relic and an outfit are cashed in, not carried as things; an id that clashes gets its own", () => {
  let s = load({ packet: room(), party: party() });
  for (const [item, to] of [["purse", "player"], ["silk_dress", "celeste"], ["keyring", "player"]]) s = give(s, item, to);
  const h = leave(s);
  assert.equal(h.gold, 12);
  assert.deepEqual(h.items.map((i) => i.id), ["keyring"]);
  assert.deepEqual(h.outfits, [{ id: "grey_silk", name: "Grey silk", text: "A plain grey silk dress.", holder: "celeste" }]);
  // An outfit the player carried out waits to be given.
  let t = load({ packet: room(), party: party() });
  t = give(t, "silk_dress", "player");
  assert.deepEqual(end(newCampaign({ seed: 3 }), leave(t)).gifts, [{ id: "grey_silk", name: "Grey silk", text: "A plain grey silk dress." }]);
  // The Cells has a key ring of its own: the one carried in keeps apart from it.
  const again = load({ packet: cells, party: party(), items: h.items });
  assert.equal(again.holder.pack_keyring, "player");
  assert.equal(again.holder.keyring, "peg");
  // The pack has a size, and an act's end empties it.
  const many = Array.from({ length: 30 }, (_, i) => ({ id: `t${i}`, name: `T${i}`, properties: "x", holder: "player", notes: [] }));
  assert.equal(end(newCampaign({ seed: 3 }), { ...h, items: many }).items.length, setting.items.max);
});

test("the telling can make a thing real: it is held, it travels, and a save brings it back", () => {
  const session = newSession({ packet: cells, player: { name: "Kael", class: "rogue" }, companions: ["fern", "celeste"] });
  let s = apply(session.state, { type: "scene", out: { reply: "x", ticks: 0, changes: { items: [{ id: "bone_dice", name: "Snag's bone dice", properties: "Three knucklebones, worn smooth.", by: "player" }] } } });
  assert.equal(s.holder.bone_dice, "player");
  assert.ok(encounterText(s.packet, s).includes("Snag's bone dice, held by player"));
  session.state = s;
  const back = restore(serialize(session), cells);
  assert.ok(back.state.packet.map.things.some((t) => t.id === "bone_dice"));
  assert.deepEqual(leave(back.state).items.map((i) => i.name), ["Snag's bone dice"]);
});

test("the DM's record may make a thing, never one that's already here; and a save puts the pack back", async () => {
  const { checkScene } = await import("../src/engine/index.js");
  const session = newSession({ packet: cells, player: { name: "Kael", class: "rogue" }, companions: ["fern", "celeste"] });
  const out = (id) => ({ reply: "x", ticks: 0, changes: { items: [{ id, name: "a thing", properties: "A thing.", by: "player" }] } });
  assert.deepEqual(checkScene(session.state, out("bone_dice")), []);
  assert.match(checkScene(session.state, out("keyring")).join(" "), /already something here/);
  const items = [{ id: "hand_bell", name: "a cracked hand-bell", properties: "Iron.", holder: "celeste", notes: ["It stills the dead."] }];
  session.state = load({ packet: cells, party: session.state.party, items });
  session.pack = items;
  const back = restore(serialize(session), cells);
  assert.equal(back.state.holder.hand_bell, "celeste");
  assert.ok(back.state.packet.map.things.some((t) => t.id === "hand_bell" && t.carried));
});
