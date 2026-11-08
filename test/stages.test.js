// The three stages of generation (D164): the world once, the act when it begins, the room when it's entered; and what
// the campaign remembers between them (clues found, people worth meeting again, each act's history).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { seedFor, BUSY, CARRIERS } from "../src/campaign/seed.js";
import { newCampaign, roomEnded, endAct, actBegun } from "../src/campaign/run.js";
import { worldOf, clueTexts } from "../src/campaign/world.js";
import { partyFor } from "../src/game/session.js";
import { edgesFor, beginAct } from "../src/game/generate.js";
import { actProblems } from "../src/calls/act.js";
import { sketchInput, actInput } from "../src/context.js";
import { sketchSchema, actSchema, verdictSchema } from "../schemas/index.js";
import { validate } from "../src/validate.js";
import { handoff } from "../src/engine/handoff.js";
import { load } from "../src/engine/index.js";
import { layout } from "../src/engine/layout.js";

const file = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const prompts = Object.fromEntries(readdirSync(new URL("../prompts/", import.meta.url)).map((f) => [f.replace(".md", ""), file(`prompts/${f}`)]));
const env = { prompts, examples: { encoded: JSON.parse(file("fixtures/generator/encoded.json")) } };
const world = worldOf();
const party = partyFor({ name: "P", class: "rogue" }, ["fern", "nadia"], world);
const plan = {
  goal: "Cross the Warrens.", region: "The forges roar day and night.", holders: ["undead"],
  busy: [{ kind: "a feast or celebration", line: "the dead court's endless banquet" }, { kind: "hard labour", line: "thralls at the forges" }, { kind: "a rite or worship", line: "mourning bells for the Queen" }, { kind: "trade or a market", line: "the ash market" }],
  peak: { who: "Lord Chamberlain Vesk", why: "his court holds the only stair down", wants: "a perfect banquet", turns: "courtesy, then knights, then the bells", where: "the banquet hall" },
  hints: ["black invitations nailed to doors", "a skeletal herald calling names", "candles lit for guests who never come"],
};

test("the act's plan reaches its rooms: busy lines in its words, owners from its holders, never repeating (D164)", () => {
  let camp = { ...newCampaign({ seed: 5, act: 2 }), plan };
  const kinds = [];
  for (let i = 0; i < 4; i++) {
    const { seed, camp: next } = seedFor(camp, world, "encounter", ["encounter"]);
    assert.deepEqual(seed.factions, ["undead"]);
    assert.ok(plan.busy.some((b) => b.kind === seed.busy && b.line === seed.busyLine));
    kinds.push(seed.busy);
    camp = next;
  }
  assert.equal(new Set(kinds).size, 4);
  const bare = seedFor(newCampaign({ seed: 5 }), world, "encounter", []).seed;
  assert.ok(BUSY.includes(bare.busy) && !bare.busyLine);
  assert.ok(world.regions[0].holders.includes(bare.factions[0]));
});

test("a clue is a prize, placed once in a campaign, with a carrier code drew; at most one extra a room, never two rooms running (D164)", () => {
  let camp = { ...newCampaign({ seed: 3, act: 2 }), plan, memory: [{ name: "Sir Hollin", fate: "spared at the gate", feels: "owes them" }] };
  const placed = [];
  let last = false;
  for (let i = 0; i < 40; i++) {
    const kind = ["encounter", "oddity", "quiet", "merchant"][i % 4];
    const { seed, camp: next } = seedFor(camp, world, kind, ["encounter"]);
    if (seed.clue) {
      assert.equal(seed.prize, "a clue");
      assert.ok(CARRIERS.includes(seed.clue.carrier));
      assert.ok(!placed.includes(seed.clue.id), "a clue is placed once");
      placed.push(seed.clue.id);
    }
    if (seed.callback) assert.ok(["encounter", "oddity"].includes(kind), "someone from before turns up only in an encounter or an oddity");
    if (seed.hint) assert.ok(kind !== "merchant");
    const extra = Boolean(seed.callback || seed.hint);
    assert.ok(!(seed.callback && seed.hint), "one extra at most");
    assert.ok(!(extra && last), "never two rooms running");
    last = extra;
    camp = next;
  }
  assert.ok(placed.length > 0);
  assert.equal(camp.calledBack.filter((n) => n === "Sir Hollin").length <= 1, true, "the same person once an act");
});

test("an edge reaches only the packets it applies in, as a hidden fact, and never the sketch (D164)", () => {
  assert.deepEqual(edgesFor(world, { kind: "climax", act: 4, factions: ["goblins"] }).map((e) => e.id), ["edge_seal_of_fire"]);
  assert.deepEqual(edgesFor(world, { kind: "climax", act: 3, factions: ["goblins"] }), []);
  assert.deepEqual(edgesFor(world, { kind: "encounter", act: 3, factions: ["undead"] }).map((e) => e.id), ["edge_court_of_debts"]);
  assert.deepEqual(edgesFor(world, { kind: "encounter", act: 1, factions: ["undead"] }), []);
  assert.ok(edgesFor(world, { kind: "climax", act: 4 }).every((e) => e.hidden));
  const { seed } = seedFor({ ...newCampaign({ act: 4 }), plan }, world, "climax", ["sanctuary"]);
  const input = sketchInput(env, { seed, world, party, plan }, sketchSchema);
  assert.doesNotMatch(input, /more likely to work|seal_of_fire|turn fire/);
});

test("the room never sees abilities, sees the heart only at a climax, and a climax stands its act's peak at the centre (D164)", () => {
  const enc = seedFor({ ...newCampaign({ act: 2 }), plan }, world, "encounter", ["encounter"]).seed;
  const input = sketchInput(env, { seed: enc, world, party, plan }, sketchSchema);
  assert.doesNotMatch(input, /"abilities"/);
  assert.doesNotMatch(input, /"the_heart"|Every faction in the fortress wants it/);
  assert.match(input, /the_region_now[\s\S]*forges roar/);
  const climax = seedFor({ ...newCampaign({ act: 2 }), plan }, world, "climax", ["sanctuary"]).seed;
  const ci = sketchInput(env, { seed: climax, world, party, plan, earlier: ["x"] }, sketchSchema);
  assert.match(ci, /## The climax\n\n```json[\s\S]*Lord Chamberlain Vesk[\s\S]*Hollow King/);
});

test("the act call: its input holds the job, the history and the used peaks; its check holds holders to the world (D164)", async () => {
  const camp = { ...newCampaign({ act: 3 }), history: [{ act: 1, peak: "Snagtooth the Keymaster", rooms: ["a goblin kennel"], log: ["cells: escaped"] }], peaks: ["Snagtooth the Keymaster"] };
  const input = actInput(env, { world, act: 3, earlier: camp.history, peaks: camp.peaks }, actSchema);
  assert.match(input, /# Act call/);
  assert.match(input, /why the place exists/);
  assert.match(input, /Peaks already used[\s\S]*Snagtooth/);
  assert.deepEqual(validate(actSchema, plan), []);
  assert.deepEqual(actProblems(plan, world), []);
  assert.ok(actProblems({ ...plan, holders: ["pirates"] }, world).length);
  const io = { sample: { json: async () => plan } };
  const next = await beginAct(io, env, { camp, world });
  assert.equal(next.plan.peak.who, "Lord Chamberlain Vesk");
  assert.deepEqual(next.peaks, ["Snagtooth the Keymaster", "Lord Chamberlain Vesk"]);
});

test("what the campaign remembers: clues found, people worth meeting again, and each act's history (D164)", () => {
  const packet = structuredClone(env.examples.encoded);
  packet.map.things.push({ id: "page", name: "a torn page", properties: "paper", location: { zone: packet.start.positions.player }, reward: { clue: "forge_runes" } });
  packet.map.things.push({ id: "mural", name: "a mural", properties: "paint", location: { zone: packet.map.zones[0].id }, reward: { clue: "burned_warden", fixed: true } });
  const s = load({ packet: layout(packet).packet, party });
  s.holder.page = "player";
  const h = handoff(s);
  assert.deepEqual(h.clues.sort(), ["burned_warden", "forge_runes"]);
  const people = [{ name: "Snick, a goblin runt", fate: "freed from the cage", feels: "owes them" }];
  assert.deepEqual(validate(verdictSchema, { rating: 6, why: "x", reactions: [], people }), []);
  assert.ok(validate(verdictSchema, { rating: 6, why: "x", reactions: [], people: [...people, ...people, ...people] }).length, "two at most");
  let camp = actBegun({ ...newCampaign({ act: 1 }), premises: ["a kennel"] }, plan);
  camp = roomEnded(camp, { handoff: { ...h, conditions: [], spent: {} }, verdict: { rating: 6, why: "x", reactions: [], people }, exits: [{ id: "e", zone: "z", leads_to: "encounter" }] }).camp;
  assert.deepEqual(camp.memory.map((p) => p.name), ["Snick, a goblin runt"]);
  assert.equal(camp.clues.length, 2);
  assert.equal(clueTexts(world, camp.clues).length, 2);
  const ended = endAct({ ...camp, way: { ...camp.way, here: "sanctuary" } }, [], 2);
  assert.equal(ended.act, 2);
  assert.deepEqual(ended.history[0].peak, "Lord Chamberlain Vesk");
  assert.deepEqual(ended.history[0].rooms, ["a kennel"]);
  assert.equal(ended.plan, null);
  assert.deepEqual(ended.premises, []);
  assert.equal(ended.memory.length, 1, "memory and clues outlast the act");
  assert.equal(ended.clues.length, 2);
});

test("the pitch asks for regions, ladders and mysteries, and can run without the example; no old holdovers remain (D164)", async () => {
  const { pitchInput } = await import("../src/context.js");
  const { pitchSchema } = await import("../schemas/calls/pitch.js");
  const c = { companions: [], vibe: "x", rejected: [] };
  assert.match(pitchInput(env, c, pitchSchema), /Worked example: Gravenhold/);
  assert.doesNotMatch(pitchInput(env, { ...c, noExample: true }, pitchSchema), /Worked example: Gravenhold/);
  assert.doesNotMatch(prompts.pitch, /mechanics|roomKinds|room kinds|openAct|its records|alarm/i);
  assert.ok(!("acts" in world) && !("roomKinds" in world) && !("openAct" in world));
  assert.ok(Object.values(world.factions).every((f) => f.ladder.length === 3 && !/alarm/i.test(f.rules)));
});
