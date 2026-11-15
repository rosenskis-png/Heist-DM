// Her memories of rooms (D193): a leg the verdict keeps and the campfire spends, and a core the verdict fills but never
// replaces, which the player settles.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { pendingMemories, proposedCore, remember, legOver, roadLines } from "../src/campaign/memories.js";
import { newCampaign } from "../src/campaign/run.js";
import { setting } from "../content/setting.js";
import { memoryProblems } from "../src/calls/verdict.js";
import { newSession, envFor } from "../src/game/session.js";
import { leaveBy, judgeRoom, takeStock, settle, moveOn } from "../src/game/journey.js";
import { companionInput, partyInput, ledgerText } from "../src/context.js";
import { companionSchema, partySchema } from "../schemas/index.js";
import { worldOf } from "../src/campaign/world.js";

const file = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const prompts = Object.fromEntries(readdirSync(new URL("../prompts/", import.meta.url)).map((f) => [f.replace(".md", ""), file(`prompts/${f}`)]));
const cells = JSON.parse(file("content/encounters/cells.json"));
const mem = (id, n) => ({ id: `${id}${n}`, room: "A room", short: `short ${id}${n}`, long: `long ${id}${n}` });
const full = (id, kind) => Array.from({ length: setting.memories[kind] }, (_, i) => mem(`${id}_${kind}`, i));

test("the verdict fills her core while there's room, and only suggests a swap once it's full", () => {
  const camp = { ...newCampaign({ seed: 1 }), roomNo: 3, roomMemories: { fern: { leg: [], core: full("fern", "core").slice(0, setting.memories.core - 1) }, nadia: { leg: [], core: full("nadia", "core") } } };
  const verdict = { memories: [
    { from: "fern", short: "a", long: "A.", core: true },
    { from: "fern", short: "b", long: "B.", core: true },
    { from: "nadia", short: "c", long: "C.", core: true, instead_of: "nadia_core0" },
  ] };
  const pending = pendingMemories(camp, verdict, { room: "The laundry", ids: ["fern", "nadia"] });
  const fern = proposedCore(camp, pending, "fern");
  assert.equal(fern.length, setting.memories.core, "one place left, one filled");
  assert.ok(fern.includes(pending.fern.fresh[0].id) && !fern.includes(pending.fern.fresh[1].id));
  assert.deepEqual(proposedCore(camp, pending, "nadia"), camp.roomMemories.nadia.core.map((c) => c.id), "a swap is never made for her");
  assert.equal(pending.nadia.fresh[0].instead_of, "nadia_core0");
  // The player takes the swap.
  const swapped = [pending.nadia.fresh[0].id, ...camp.roomMemories.nadia.core.slice(1).map((c) => c.id)];
  const after = remember(camp, pending, { nadia: swapped });
  assert.equal(after.nadia.core[0].long, "C.", "core keeps the longer form");
  assert.equal(after.fern.core.at(-1).long, "A.");
  assert.throws(() => remember(camp, pending, { fern: [...fern, "x"] }), /core memories|no such memory/);
});

test("the leg keeps the newest up to its limit, lets go what the verdict forgets, and ends at the fire", () => {
  const camp = { ...newCampaign({ seed: 1 }), roomNo: 7, roomMemories: { fern: { leg: full("fern", "leg"), core: [] } } };
  const pending = pendingMemories(camp, { memories: [{ from: "fern", short: "new", long: "New.", core: false }], forget: ["fern_leg2", "not_hers"] }, { ids: ["fern"] });
  assert.deepEqual(pending.fern.forget, ["fern_leg2"]);
  const after = remember(camp, pending, { fern: ["fern_leg4"] });
  assert.equal(after.fern.leg.length, setting.memories.leg);
  assert.ok(!after.fern.leg.some((l) => l.id === "fern_leg2"));
  assert.equal(after.fern.leg.at(-1).short, "new");
  assert.deepEqual(after.fern.core.map((c) => c.id), ["fern_leg4"], "a leg memory can be promoted until the leg ends");
  assert.ok(!roadLines(after, "fern").includes("short fern_leg4"), "the rooms ahead don't read it twice");
  const spent = legOver(after);
  assert.deepEqual(spent.fern.leg, []);
  assert.equal(spent.fern.core.length, 1);
});

test("a verdict's memories are the companions', at most two each", () => {
  const two = (from) => [{ from, short: "x", long: "x", core: false }, { from, short: "y", long: "y", core: false }];
  assert.deepEqual(memoryProblems({ memories: two("fern") }, ["fern", "nadia"]), []);
  assert.equal(memoryProblems({ memories: [...two("fern"), ...two("fern").slice(1), { from: "guard", short: "z", long: "z", core: false }] }, ["fern", "nadia"]).length, 2);
});

test("in a room she reads the road as context and where the party is in the world, never her core", () => {
  const session = newSession({ packet: cells, player: { name: "P", class: "rogue" }, companions: ["fern", "nadia"], world: worldOf() });
  session.camp = { roomMemories: { fern: { leg: [mem("leg", 1)], core: [mem("core", 1)] } } };
  const env = envFor(session, prompts);
  const [fern, nadia] = session.state.party.slice(1);
  const one = companionInput(env, { channel: "huddle", now: ledgerText(session.state, { party: true, history: false }), recent: [] }, fern, [nadia], [], companionSchema);
  assert.ok(one.includes("short leg1") && !one.includes("core1"));
  assert.ok(one.includes("Where you are") && one.includes(worldOf().regions[0].name));
  const both = partyInput(env, { channel: "huddle", now: ledgerText(session.state, { party: true, history: false }), recent: [] }, [fern, nadia], [], partySchema);
  assert.ok(both.includes("short leg1") && !both.includes("long core1"));
});

test("the room's memories reach the stock screen before the campaign moves, and settle as the player chose", async () => {
  const session = newSession({ packet: cells, player: { name: "P", class: "rogue" }, companions: ["fern", "nadia"], seed: 3, world: worldOf() });
  leaveBy(session, null);
  const io = {
    sample: {
      json: async (turns) => {
        const input = typeof turns === "string" ? turns : turns[0].content;
        if (input.includes("# Stock call")) return { reply: "x", found: [], followers: [], notes: [] };
        return { rating: 6, why: "Fine.", reactions: [], people: [], memories: [{ from: "fern", short: "he picked the lock", long: "In the cells, he picked the lock while she watched the stair.", core: false }] };
      },
    },
  };
  await judgeRoom(session, io, prompts);
  await takeStock(session, io, prompts);
  const fresh = session.judged.pending.fern.fresh[0];
  assert.equal(fresh.short, "he picked the lock");
  assert.equal(session.camp.roomMemories, undefined, "nothing moves until the player walks on");
  settle(session, { core: { fern: [fresh.id] } });
  moveOn(session);
  assert.equal(session.camp.roomMemories.fern.core[0].long, fresh.long);
  assert.equal(session.camp.roomMemories.fern.leg[0].short, fresh.short);
});
