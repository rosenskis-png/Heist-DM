// The way ahead: code draws each exit's kind and counts the leg and the act (docs/spec/campaign.md §2, D144)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { startAct, exitKinds, enter, wayOn } from "../src/campaign/way.js";
import { setting } from "../content/setting.js";
import { load, apply, checkPacket, bindParty } from "../src/engine/index.js";
import { classes } from "../content/classes.js";
import fern from "../content/companions/fern.js";
import nadia from "../content/companions/nadia.js";

// Walk a whole act: at each room, draw 1–3 exits and take one at random; each room's verdict rating is random. Returns the kinds
// of room in order, split into legs at each campfire.
function walk(act, seed) {
  let way = startAct(act, seed);
  let r = seed * 7919;
  const coin = (n) => (r = (r * 1103515245 + 12345) % 2147483648) % n;
  const legs = [["encounter"]];
  for (let guard = 0; guard < 100; guard++) {
    const drawn = exitKinds(way, 1 + coin(3));
    way = drawn.way;
    if (!drawn.kinds.length) return legs;
    const kind = drawn.kinds[coin(drawn.kinds.length)];
    way = enter(way, kind, { rating: 1 + coin(10) });
    if (kind === "campfire") legs.push([]);
    else legs.at(-1).push(kind);
  }
  throw new Error("the act never ended");
}

test("every path through every act has a campfire per leg, then the climax and the sanctuary", () => {
  const { rooms, addedMax } = setting.way;
  for (let act = 1; act <= setting.acts.length; act++)
    for (let seed = 1; seed <= 200; seed++) {
      const legs = walk(act, seed);
      assert.equal(legs.length, setting.acts[act - 1].legs, `act ${act} seed ${seed}`);
      assert.ok(legs.length >= 2, "at least one campfire before the climax");
      assert.deepEqual(legs.at(-1).slice(-2), ["climax", "sanctuary"]);
      for (const leg of legs) {
        const played = leg.filter((k) => !["climax", "sanctuary"].includes(k));
        assert.ok(played.length >= rooms && played.length <= rooms + addedMax, `a leg of ${played.length} rooms`);
        assert.ok(played.filter((k) => k === "merchant").length <= 1, "one merchant a leg at most");
        const calm = (k) => ["quiet", "oddity", "merchant"].includes(k);
        played.forEach((k, i) => assert.ok(!(calm(k) && calm(played[i - 1])), `two calm rooms in a row: ${played}`));
      }
    }
});

test("rough rooms lengthen the leg by a gradient, good ones ease it, and not once its exits lead to the campfire", () => {
  const { rooms, strain, addedMax } = setting.way;
  const long = { ...startAct(1), left: 10 };
  const once = (rating, from = long) => enter(from, "encounter", { rating });
  assert.equal(once(strain.pivot).left, 9, "an ordinary room adds nothing");
  assert.equal(once(strain.pivot - strain.per).left, 10, "one bad room adds one");
  // Two middling rooms add up to one more room; a good room in between eases the strain.
  assert.equal(once(strain.pivot - 2, once(strain.pivot - 2)).left, 9);
  assert.equal(once(strain.pivot - 2, once(10, once(strain.pivot - 2))).left, 7);
  assert.equal(once(1, once(1, once(1))).extra, addedMax, "never more than the most a leg can add");
  const atCamp = { ...startAct(1), left: 0 };
  assert.deepEqual(exitKinds(atCamp, 2).kinds, ["campfire", "campfire"]);
  const rested = enter(atCamp, "campfire", { rating: 1 });
  assert.equal(rested.left, rooms);
  assert.equal(rested.strain, 0);
});

test("the same seed draws the same way, and a room's exits differ where they can", () => {
  assert.deepEqual(walk(2, 42), walk(2, 42));
  const { kinds } = exitKinds(startAct(1, 9), 3);
  assert.equal(new Set(kinds).size, 3);
  assert.throws(() => enter(startAct(1), "dungeon"));
});

test("the hand-off names the exit the party left by; without one, code picks it and says so", () => {
  const packet = JSON.parse(readFileSync(new URL("../content/encounters/cells.json", import.meta.url)));
  packet.intent.exits = [{ id: "up_the_stairs", zone: "stair_top", leads_to: "encounter", stub: "The stairs climb toward the kitchens." }];
  const party = [{ id: "player", ...classes.rogue }, fern, nadia];
  assert.deepEqual(checkPacket(bindParty(packet, party), party), []);
  assert.ok(checkPacket(bindParty({ ...packet, intent: { ...packet.intent, exits: [{ id: "x", zone: "nowhere", leads_to: "encounter" }] } }, party), party).some((p) => p.includes("nowhere")));
  let s = load({ packet, party });
  s = apply(s, { type: "ops", ops: ["player", "fern", "nadia"].map((id) => ({ move: { entity: id, to: "stair_top" } })) });
  assert.equal(s.handoff.way_on, "up_the_stairs");
  assert.deepEqual(wayOn(startAct(1), packet.intent.exits, s.handoff).forced, false);
  const forced = wayOn(startAct(1), packet.intent.exits, { way_on: null });
  assert.equal(forced.forced, true);
  assert.equal(forced.exit.id, "up_the_stairs");
});
