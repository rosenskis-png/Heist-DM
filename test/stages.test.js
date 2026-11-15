// The three stages of generation (D164): the world once, the act when it begins, the room when it's entered; and what
// the campaign remembers between them (clues found, people worth meeting again, each act's history).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { seedFor } from "../src/campaign/seed.js";
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
  setting: "The old dwarven working levels, run by four powers who hate each other.",
  state: "The forges have doubled their shifts since the escape.", intro: "Below the cells the mountain opens into the Warrens.",
  threads: [{ slot: "companion_b", beat: "the dead court keeps a record of her people's hearth" }],
  places: ["the kitchens", "the stables", "a guardroom", "the laundry", "a wine cellar", "the armoury", "a servants' stair", "the chapel"], settings: { quiet: ["a flooded chapel where candles burn underwater", "a library of whispering bones"], oddity: ["a ballroom where the dancers are coats on strings", "a well that answers in your mother's voice"], campfire: ["a warm bread oven big enough to sleep in", "a crypt of sleeping knights who snore"] },
  news: ["word that the goblins blame the Court for the escape"], mysteries: ["court_of_debts"], returning: [],
  antagonists: [{ who: "Lord Chamberlain Vesk", why: "his court holds the only stair down" }, { who: "Warchief Grizzak", why: "his warband holds the gate" }],
};

test("a room with danger in it is set in one of the act's places, never repeating; the room before a campfire leads only there (D164, D169, D186, D196)", async () => {
  let camp = { ...newCampaign({ seed: 5, act: 2 }), plan };
  const kinds = [];
  for (let i = 0; i < 4; i++) {
    const { seed, camp: next } = seedFor(camp, world, "encounter", ["encounter"]);
    assert.equal(seed.factions, undefined, "no room is drawn a faction (D197)");
    assert.ok(plan.places.includes(seed.place) && !seed.busy && !seed.shape && !seed.tone);
    kinds.push(seed.place);
    camp = next;
  }
  assert.equal(new Set(kinds).size, 4);
  const { seedRoom } = await import("../src/game/generate.js");
  let c = newCampaign({ seed: 2 });
  c = { ...c, way: { ...c.way, left: 0, here: "encounter" } };
  assert.deepEqual([...new Set(seedRoom(c, world).seed.exits)], ["campfire"], "its ways on all lead to the campfire (D186)");
});

test("a journal page is a prize, placed once in a campaign, by its writer, never its words; at most one extra a room, never two rooms running (D164, D168)", () => {
  let camp = { ...newCampaign({ seed: 3, act: 2 }), plan, memory: [{ name: "Sir Hollin", fate: "spared at the gate", feels: "owes them" }] };
  const placed = [];
  let last = false;
  for (let i = 0; i < 40; i++) {
    const kind = ["encounter", "oddity", "quiet", "merchant"][i % 4];
    const { seed, camp: next } = seedFor(camp, world, kind, ["encounter"]);
    if (seed.clue) {
      assert.equal(seed.prize, "a journal page");
      assert.ok(seed.clue.author && !seed.clue.text && !seed.clue.says, "the writer, never the words");
      assert.ok(!placed.includes(seed.clue.id), "a clue is placed once");
      placed.push(seed.clue.id);
    }
    if (seed.callback) assert.ok(["encounter", "oddity"].includes(kind), "someone from before turns up only in an encounter or an oddity");
    assert.equal(seed.hint, undefined, "no signs of a peak nobody has chosen (D197)");
    const extra = Boolean(seed.callback || seed.news);
    assert.ok(!(seed.callback && seed.news), "one extra at most");
    assert.ok(!(extra && last), "never two rooms running");
    last = extra;
    camp = next;
  }
  assert.ok(placed.length > 0);
  assert.equal(camp.calledBack.filter((n) => n === "Sir Hollin").length <= 1, true, "the same person once an act");
});

test("an edge reaches only the packets it applies in, as a hidden fact, and never the sketch (D164)", () => {
  assert.deepEqual(edgesFor(world, { kind: "climax", act: 4 }).map((e) => e.id), ["edge_seal_of_fire", "edge_court_of_debts"]);
  assert.deepEqual(edgesFor(world, { kind: "climax", act: 3 }).map((e) => e.id), ["edge_court_of_debts"], "a climax edge reaches only its own act's climax");
  assert.deepEqual(edgesFor(world, { kind: "encounter", act: 3 }).map((e) => e.id), ["edge_court_of_debts"], "an edge works in every room from its act on (D197)");
  assert.deepEqual(edgesFor(world, { kind: "encounter", act: 1 }), []);
  assert.ok(edgesFor(world, { kind: "climax", act: 4 }).every((e) => e.hidden));
  const { seed } = seedFor({ ...newCampaign({ act: 4 }), plan }, world, "climax", ["sanctuary"]);
  const input = sketchInput(env, { seed, world, party, plan }, sketchSchema);
  assert.doesNotMatch(input, /more likely to work|seal_of_fire|turn fire/);
});

test("the room never sees abilities, sees the act's setting but not its state, and a climax stands its act's peak at the centre (D164, D169)", () => {
  const enc = seedFor({ ...newCampaign({ act: 2 }), plan }, world, "encounter", ["encounter"]).seed;
  const input = sketchInput(env, { seed: enc, world, party, plan }, sketchSchema);
  assert.doesNotMatch(input, /"abilities"/);
  assert.match(input, /"setting":"The old dwarven working levels[\s\S]*"question":"Can they cross the Warrens/);
  assert.doesNotMatch(input, /doubled their shifts|Vesk|Grizzak|Snagtooth|Morvaine/, "no state, and no leader or antagonist, in an ordinary room (D197)");
  assert.match(input, /the_powers_here/);
  assert.match(input, /worn_out_never_use/);
  const climax = seedFor({ ...newCampaign({ act: 2 }), plan }, world, "climax", ["sanctuary"]).seed;
  const ci = sketchInput(env, { seed: climax, world, party, plan, earlier: ["x"] }, sketchSchema);
  assert.match(ci, /## The climax\n\n```json[\s\S]*"scale"[\s\S]*who_could_stand_at_its_centre[\s\S]*Lord Chamberlain Vesk[\s\S]*Warchief Grizzak[\s\S]*Hollow King/);
});

test("the act call: its input holds the job, the history and who has already stood at a climax; the climax's choice becomes the act's peak (D164, D197)", async () => {
  const camp = { ...newCampaign({ act: 3 }), history: [{ act: 1, peak: "Snagtooth the Keymaster", rooms: ["a goblin kennel"], log: ["cells: escaped"] }], peaks: ["Snagtooth the Keymaster"] };
  const input = actInput(env, { world, act: 3, earlier: camp.history, peaks: camp.peaks }, actSchema);
  assert.match(input, /# Act call/);
  assert.match(input, /why the place exists/);
  assert.match(input, /already stood at a climax[\s\S]*Snagtooth/);
  assert.deepEqual(validate(actSchema, plan), []);
  assert.deepEqual(actProblems(plan, world, 3), []);
  assert.match(actInput(env, { world, act: 3, earlier: [], peaks: [], party }, actSchema), /## The companions[\s\S]*Worn out/);
  assert.deepEqual(tidyAct({ ...plan, mysteries: ["nonsense"] }, world, 3).mysteries, world.mysteries.map((m) => m.id), "unknown mysteries fall back to all");
  assert.deepEqual(tidyAct({ ...plan, returning: ["Snick", "Nobody"] }, world, 3, [{ name: "Snick, a goblin runt" }]).returning, ["Snick"]);
  assert.ok(actProblems({ ...plan, intro: "A bell tolls over the Warrens." }).length, "a worn-out prop sends the act back (D197)");
  const io = { sample: { json: async () => plan } };
  const next = await beginAct(io, env, { camp, world });
  assert.equal(next.plan.antagonists.length, 2);
  assert.deepEqual(next.peaks, ["Snagtooth the Keymaster"], "nobody is the peak until the climax chooses");
  const { climaxChosen } = await import("../src/campaign/run.js");
  const chosen = climaxChosen(next, "Lord Chamberlain Vesk");
  assert.equal(chosen.peak, "Lord Chamberlain Vesk");
  assert.deepEqual(chosen.peaks, ["Snagtooth the Keymaster", "Lord Chamberlain Vesk"]);
});

test("what the campaign remembers: clues found, people worth meeting again, and each act's history (D164)", () => {
  const packet = structuredClone(env.examples.encoded);
  packet.map.things.push({ id: "page", name: "a torn page", properties: "paper", location: { zone: packet.start.positions.player }, reward: { clue: "seal_of_fire_1" } });
  packet.map.things.push({ id: "page2", name: "another torn page", properties: "paper", location: { zone: packet.map.zones[0].id }, reward: { clue: "seal_of_fire_2" } });
  const s = load({ packet: layout(packet).packet, party });
  s.holder.page = "player";
  s.holder.page2 = "player";
  const h = handoff(s);
  assert.deepEqual(h.clues.sort(), ["seal_of_fire_1", "seal_of_fire_2"]);
  const people = [{ name: "Snick, a goblin runt", fate: "freed from the cage", feels: "owes them" }];
  assert.deepEqual(validate(verdictSchema, { rating: 6, why: "x", reactions: [], people, memories: [] }), []);
  assert.ok(validate(verdictSchema, { rating: 6, why: "x", reactions: [], people: [...people, ...people, ...people] }).length, "two at most");
  let camp = actBegun({ ...newCampaign({ act: 1 }), premises: ["a kennel"] }, plan);
  camp = roomEnded(camp, { handoff: { ...h, conditions: [], spent: {} }, verdict: { rating: 6, why: "x", reactions: [], people }, exits: [{ id: "e", zone: "z", leads_to: "encounter" }] }).camp;
  assert.deepEqual(camp.memory.map((p) => p.name), ["Snick, a goblin runt"]);
  assert.equal(camp.clues.length, 2);
  const read = clueTexts(world, camp.clues);
  assert.equal(read.length, 2);
  assert.ok(read.every((p) => p.from.startsWith("Brannoc") && p.page), "each page read at camp with its writer");
  const ended = endAct({ ...camp, peak: "Lord Chamberlain Vesk", way: { ...camp.way, here: "sanctuary" } }, [], 2);
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
  assert.match(prompts.pitch, /never depends on timing, counting or balance/);
  assert.match(prompts.pitch, /Never one that states a mystery's truth/);
  const { SECRETS } = await import("../content/pitch.js");
  assert.ok(!SECRETS.some((k) => /blood or birth|heart wants/.test(k)), "no chosen-one secret kinds");
  assert.doesNotMatch(prompts.pitch, /mechanics|roomKinds|room kinds|openAct|its records|alarm|how the heart was sealed|what a faction is bound by/i);
  assert.match(prompts.pitch, /Never about the rings or the player's secrets/);
  assert.ok(!("acts" in world) && !("roomKinds" in world) && !("openAct" in world));
  assert.ok(Object.values(world.factions).every((f) => f.ladder.length === 3 && !/alarm/i.test(f.rules)));
});

test("the act deals out one setting and piece of news at a time; pages come from its live mysteries; a motif, never a local; her story once an act (D167, D168)", () => {
  let camp = { ...newCampaign({ seed: 9, act: 2 }), plan };
  const settings = [], news = [];
  for (let i = 0; i < 12; i++) {
    const kind = ["encounter", "quiet", "oddity", "campfire"][i % 4];
    const { seed, camp: next } = seedFor(camp, world, kind, ["encounter"]);
    assert.equal(seed.local, undefined, "no locals");
    assert.ok(seed.motifs.length <= 2);
    if (seed.setting) { assert.ok(plan.settings[kind].includes(seed.setting)); settings.push(seed.setting); }
    if (seed.news) news.push(seed.news);
    if (seed.clue) assert.equal(seed.clue.mystery, "court_of_debts");
    camp = next;
  }
  assert.ok(settings.length);
  assert.ok(news.length <= 1, "each piece of news once");
  const quiet = settings.filter((x) => plan.settings.quiet.includes(x));
  const firsts = quiet.slice(0, plan.settings.quiet.length);
  assert.equal(new Set(firsts).size, firsts.length, "a quiet setting differs from those used earlier in the act until the pool runs out");
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
  // A page reaches the sketch as its writer, never its words.
  const paged = { ...seedFor({ ...newCampaign(), plan }, world, "encounter", []).seed, prize: "a journal page", clue: { id: "court_of_debts_2", mystery: "court_of_debts", author: world.mysteries[1].journal.author } };
  const pi = sketchInput(env, { seed: paged, world, party, plan }, sketchSchema);
  assert.match(pi, /a_journal_page[\s\S]*Hesta/);
  assert.doesNotMatch(pi, /put down his knife/);
});

test("no leader of any power reaches a room before the climax (D167, D197)", () => {
  const { seed } = seedFor({ ...newCampaign({ act: 1 }), plan }, world, "encounter", ["encounter"]);
  const input = sketchInput(env, { seed, world, party, plan }, sketchSchema);
  for (const f of Object.values(world.factions)) for (const l of f.ladder) assert.ok(!input.includes(l.name), l.name);
  assert.match(input, /The Red Maw/);
});


test("motifs are situations without examples; the act has no locals or busy lines; worn-out props are refused (D168, D169)", async () => {
  const { motifs } = await import("../content/motifs.js");
  const { sketchProblems } = await import("../src/calls/sketch.js");
  assert.ok(motifs.every((m) => !/\(|: [a-z]+, [a-z]/.test(m.pattern)), "no example lists in a motif");
  assert.ok(!("locals" in actSchema.properties) && !("busy" in actSchema.properties));
  assert.doesNotMatch(prompts.sketch, /One strange thing/);
  assert.match(prompts.pitch, /tear it into three to five `pages`/);
  const note = { premise: "x", shape: "x", things: ["x"], pressure: "x", notes: "x", opening: "x" };
  assert.deepEqual(sketchProblems(note), []);
  assert.ok(sketchProblems({ ...note, things: ["A hanging cage over the pit."] }).length);
  assert.ok(sketchProblems({ ...note, notes: "The clerk keeps a ledger." }).length);
  assert.ok(sketchProblems({ ...note, pressure: "A hand-bell rings for the next course." }).length, "bells are worn out (D197)");
  assert.deepEqual(sketchProblems({ ...note, things: ["The Count at his organ, counting the hours", "a cage of bones on the floor", "the bellows"] }), [], "a count is also a title; not every cage");
});
