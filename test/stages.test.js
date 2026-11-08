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
import { actProblems, tidyAct } from "../src/calls/act.js";
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
  goal: "Cross the Warrens.", question: "Can they cross the Warrens before the Court learns they're loose?", aim: "Learn the way down, and who holds it.",
  state: "The forges have doubled their shifts since the escape.", holders: ["undead"],
  busy: [{ kind: "a feast or celebration", line: "the dead court's endless banquet" }, { kind: "hard labour", line: "thralls at the forges" }, { kind: "a rite or worship", line: "mourning bells for the Queen" }, { kind: "trade or a market", line: "the ash market" }],
  locals: ["a ghoul barber who gossips while he shaves the dead", "a lost dwarven tour-guide ghost", "a rat king with a tiny crown", "twin lamplighters who never agree", "a mimic that thinks it's a door"],
  settings: { quiet: ["a flooded chapel where candles burn underwater", "a library of whispering bones"], oddity: ["a ballroom where the dancers are coats on strings", "a well that answers in your mother's voice"], campfire: ["a warm bread oven big enough to sleep in", "a crypt of sleeping knights who snore"] },
  news: ["word that the goblins blame the Court for the escape"], mysteries: ["court_of_debts"], returning: [],
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
  assert.match(input, /"question":"Can they cross the Warrens/);
  assert.doesNotMatch(input, /doubled their shifts|banquet hall/, "no picture of the region, no state, no peak in an ordinary room");
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
  assert.deepEqual(actProblems(plan, world, 3), []);
  assert.deepEqual(tidyAct({ ...plan, mysteries: ["nonsense"] }, world, 3).mysteries, world.mysteries.map((m) => m.id), "unknown mysteries fall back to all");
  assert.deepEqual(tidyAct({ ...plan, returning: ["Snick", "Nobody"] }, world, 3, [{ name: "Snick, a goblin runt" }]).returning, ["Snick"]);
  // Code tidies what it can instead of failing the act (D166): kinds worded loosely match the list; unknown holders go.
  const loose = { ...plan, holders: ["pirates", "undead"], busy: [{ kind: "Hard labor", line: "a" }, { kind: "a funeral", line: "b" }, { kind: "feasting", line: "c" }, { kind: "knitting", line: "d" }, { kind: "hard labour", line: "e" }] };
  const tidy = tidyAct(loose, world, 3);
  assert.deepEqual(tidy.busy.map((b) => b.kind), ["hard labour", "a burial or mourning", "a feast or celebration"]);
  assert.deepEqual(tidy.holders, ["undead"]);
  assert.deepEqual(tidyAct({ ...plan, holders: ["pirates"] }, world, 3).holders, world.regions[2].holders);
  assert.ok(actProblems({ ...plan, busy: [{ kind: "knitting", line: "x" }, { kind: "sewing", line: "y" }, { kind: "baking", line: "z" }, { kind: "pottery", line: "w" }] }, world, 3).length, "nothing usable goes back");
  const io = { sample: { json: async () => loose } };
  const next = await beginAct(io, env, { camp, world });
  assert.equal(next.plan.peak.who, "Lord Chamberlain Vesk");
  assert.deepEqual(next.plan.holders, ["undead"]);
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
  assert.doesNotMatch(pitchInput(env, c, pitchSchema), /Worked example: Gravenhold/, "no example unless asked (D166)");
  assert.match(pitchInput(env, { ...c, withExample: true }, pitchSchema), /Worked example: Gravenhold/);
  assert.match(prompts.pitch, /never a person's name/);
  assert.match(prompts.pitch, /never something that depends on timing, counting or balance/);
  assert.match(prompts.pitch, /Never one that states a mystery's truth/);
  const { SECRETS } = await import("../content/pitch.js");
  assert.ok(!SECRETS.some((k) => /blood or birth|heart wants/.test(k)), "no chosen-one secret kinds");
  assert.doesNotMatch(prompts.pitch, /mechanics|roomKinds|room kinds|openAct|its records|alarm|how the heart was sealed|what a faction is bound by/i);
  assert.match(prompts.pitch, /Never about the rings or the player's secrets/);
  assert.ok(!("acts" in world) && !("roomKinds" in world) && !("openAct" in world));
  assert.ok(Object.values(world.factions).every((f) => f.ladder.length === 3 && !/alarm/i.test(f.rules)));
});

test("the act deals out one local, setting and piece of news at a time; clues come from its live mysteries; her story once an act; tone darkens late (D167)", () => {
  let camp = { ...newCampaign({ seed: 9, act: 2 }), plan };
  const locals = [], settings = [], news = [];
  for (let i = 0; i < 12; i++) {
    const kind = ["encounter", "quiet", "oddity", "campfire"][i % 4];
    const { seed, camp: next } = seedFor(camp, world, kind, ["encounter"]);
    assert.deepEqual(seed.motifs, [], "a local replaces the motif when the act has locals");
    if (seed.local) { assert.ok(!locals.includes(seed.local)); locals.push(seed.local); }
    if (seed.setting) { assert.ok(plan.settings[kind].includes(seed.setting)); settings.push(seed.setting); }
    if (seed.news) news.push(seed.news);
    if (seed.clue) assert.equal(seed.clue.mystery, "court_of_debts");
    assert.equal(kind === "campfire" ? seed.local : undefined, undefined, "no local at a campfire");
    camp = next;
  }
  assert.ok(locals.length && settings.length);
  assert.ok(news.length <= 1, "each piece of news once");
  const quiet = settings.filter((x) => plan.settings.quiet.includes(x));
  const firsts = quiet.slice(0, plan.settings.quiet.length);
  assert.equal(new Set(firsts).size, firsts.length, "a quiet setting differs from those used earlier in the act until the pool runs out");
  // Her story's feature once an act.
  let c2 = { ...newCampaign({ seed: 4, act: 2 }), plan };
  const shown = [];
  for (let i = 0; i < 20; i++) {
    const { seed, camp: next } = seedFor(c2, world, "encounter", ["encounter"]);
    if (seed.herStory) shown.push(seed.spotlight);
    c2 = { ...next, spotlight: null };
  }
  assert.ok(shown.length <= 2 && new Set(shown).size === shown.length);
  const story = (herStory) => sketchInput(env, { seed: { ...seedFor({ ...newCampaign(), plan }, world, "encounter", []).seed, spotlight: "companion_b", herStory }, world, party, plan }, sketchSchema);
  assert.match(story(true), /her_story_needs/);
  assert.doesNotMatch(story(false), /her_story_needs/);
});

test("no local face in a room when that face is the act's peak (D167)", () => {
  const peakIsFace = { ...plan, holders: ["goblins"], peak: { ...plan.peak, who: "Snagtooth the Keymaster" } };
  const { seed } = seedFor({ ...newCampaign({ act: 1 }), plan: peakIsFace }, world, "encounter", ["encounter"]);
  assert.deepEqual(seed.factions, ["goblins"]);
  assert.doesNotMatch(sketchInput(env, { seed, world, party, plan: peakIsFace }, sketchSchema), /local_face/);
  assert.match(sketchInput(env, { seed, world, party, plan }, sketchSchema), /local_face/);
});
