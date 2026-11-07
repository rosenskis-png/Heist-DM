// The generator (docs/spec/generation.md, D153): the seed, the layout, the encode checks, and the whole pipeline on
// scripted call outputs, ending in a packet the engine loads. No AI is called.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { seedFor, XFACTORS, SHAPES, CORES, PRIZES } from "../src/campaign/seed.js";
import { newCampaign, roomEnded } from "../src/campaign/run.js";
import { layout } from "../src/engine/layout.js";
import { geometryProblems } from "../src/engine/map.js";
import { load, checkPacket } from "../src/engine/index.js";
import { encodeProblems } from "../src/calls/encode.js";
import { generateRoom, designRoom } from "../src/game/generate.js";
import { sketchInput, encodeInput } from "../src/context.js";
import { sketchSchema, encodeSchema } from "../schemas/index.js";
import { worldOf } from "../src/campaign/world.js";
import { partyFor } from "../src/game/session.js";
import { motifs } from "../content/motifs.js";
import { validate } from "../src/validate.js";

const file = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const encoded = JSON.parse(file("fixtures/generator/encoded.json"));
const prompts = Object.fromEntries(readdirSync(new URL("../prompts/", import.meta.url)).map((f) => [f.replace(".md", ""), file(`prompts/${f}`)]));
const sketches = JSON.parse(file("fixtures/generator/sketches.json"));
const env = { prompts, examples: { encoded, sketches } };
const world = worldOf();
const party = partyFor({ name: "P", class: "rogue" }, ["fern", "nadia"], world);
const SLOTS = [{ id: "player" }, { id: "companion_a" }, { id: "companion_b" }];

test("the seed asks a different question each time, suits the kind, and avoids the act's used motifs", () => {
  let camp = newCampaign({ seed: 7 });
  const seen = new Set();
  for (let i = 0; i < 6; i++) {
    const { seed, camp: next } = seedFor(camp, world, "encounter", ["encounter", "quiet"]);
    assert.ok(XFACTORS.includes(seed.xFactor) && SHAPES.includes(seed.shape) && CORES.includes(seed.core) && PRIZES.includes(seed.prize) && seed.tone && seed.factions.length);
    assert.ok(seed.motifs.length >= 1 && seed.motifs.length <= 2 && seed.motifs.every((m) => m.kinds.includes("encounter")));
    for (const m of seed.motifs) seen.add(m.id);
    camp = next;
  }
  assert.ok(seen.size >= 5, "motifs vary across an act");
  const calm = seedFor(newCampaign(), world, "campfire", ["encounter"]).seed;
  assert.equal(calm.xFactor, undefined);
  assert.equal(calm.motifs.length, 1);
  assert.deepEqual(seedFor(newCampaign({ seed: 3 }), world, "encounter", []).seed, seedFor(newCampaign({ seed: 3 }), world, "encounter", []).seed);
  assert.ok(motifs.every((m) => !/\b(route|path to|solution)\b/i.test(m.pattern)), "a motif never describes a route");
});

test("the layout puts every zone on the grid with every connection on a shared wall, or ships without a map", () => {
  const { packet, mapped } = layout(encoded);
  assert.equal(mapped, true);
  assert.deepEqual(geometryProblems(packet), []);
  assert.ok(packet.map.zones.every((z) => z.rects && !z.size));
  // A ring of six big zones whose loop can't close on the grid ships without a map, and still passes the engine.
  const ring = structuredClone(encoded);
  ring.map.zones = Array.from({ length: 6 }, (_, i) => ({ id: `z${i}`, name: `Z${i}`, purpose: "x", light: "dim", size: [1, 12] }));
  ring.map.connections = ring.map.zones.map((z, i) => ({ id: `c${i}`, kind: "opening", between: [z.id, `z${(i + 1) % 6}`], fits: "medium", operated_from: "both" }));
  ring.map.connections.push({ id: "c_x", kind: "opening", between: ["z0", "z3"], fits: "medium", operated_from: "both" });
  ring.map.things = [];
  ring.people = [];
  ring.notes = [];
  ring.clock.events = [];
  ring.intent = { purpose: "x", objective: { id: "o", condition: { party_all_in: "z3" } }, exits: [] };
  ring.start.positions = { player: "z0", companion_a: "z0", companion_b: "z0" };
  ring.opening = "A ring of halls.";
  const out = layout(ring);
  if (!out.mapped) assert.ok(out.packet.map.zones.every((z) => !z.rects) && out.packet.map.connections.every((c) => !c.wall && !c.square));
  assert.deepEqual(checkPacket(out.packet, SLOTS), []);
});

test("an encoded room is checked against what the seed fixed", () => {
  const seed = { kind: "encounter", act: 2, exits: ["encounter", "quiet"] };
  assert.deepEqual(encodeProblems(encoded, seed), []);
  assert.ok(encodeProblems(encoded, { ...seed, exits: ["campfire"] }).some((p) => p.includes("exits must lead to exactly")));
  assert.ok(encodeProblems(encoded, { ...seed, kind: "quiet" }).some((p) => p.includes('mode "room"')));
  assert.ok(encodeProblems(encoded, { ...seed, kind: "merchant" }).some((p) => p.includes("price")));
  const bad = structuredClone(encoded);
  bad.map.connections[0].between = ["laundry_floor", "nowhere"];
  assert.ok(encodeProblems(bad, seed).some((p) => p.includes("nowhere")));
});

test("the pipeline: exits drawn, seed, sketch, encode, layout, and a packet the engine loads", async () => {
  let camp = newCampaign({ seed: 11 });
  // Enter an encounter so the room being written is one, as after a room's end.
  camp = roomEnded(camp, { handoff: { conditions: [], spent: {}, gold: 0, relics: [] }, verdict: { rating: 6, why: "x", reactions: [] }, exits: [{ id: "e", zone: "z", leads_to: "encounter" }] }).camp;
  const calls = [];
  const sketch = { premise: "Washers boil the garrison's linen in a steam-fogged laundry, and the overseer knows every face.", shape: "A long hall.", things: ["The vats."], cut: "nothing", pressure: "The inspection.", outcomes: ["clean", "pressed"], notes: "x", opening: "Steam." };
  const io = {
    sample: {
      json: async (input) => {
        const call = input.includes("# Sketch call") ? "sketch" : "encode";
        calls.push(call);
        if (call === "encode") {
          // Encode what the seed fixed: its exits.
          const block = input.split("Fixed by the seed")[1];
          const kinds = JSON.parse(block.slice(block.indexOf("{"), block.indexOf("}") + 1)).exits;
          const out = structuredClone(encoded);
          out.intent.exits = kinds.map((k, i) => ({ ...encoded.intent.exits[i % 2], id: `exit_${i}`, zone: ["back_stair", "servants_passage"][i % 2], leads_to: k }));
          out.act = 1;
          return out;
        }
        return sketch;
      },
    },
  };
  const stages = [];
  io.onStage = (name) => stages.push(name);
  const room = await generateRoom(io, env, { camp, world, party, handoff: { stub: "Out of the cells.", conditions: [] }, log: ["cells: escaped at tick 9"] });
  assert.deepEqual(calls, ["sketch", "encode"]);
  assert.deepEqual(stages, ["sketch", "encoded", "laid out"]);
  assert.equal(room.mapped, true);
  assert.equal(room.packet.intent.exits.length, room.seed.exits.length);
  const s = load({ packet: room.packet, party });
  assert.equal(s.tick, 0);
  assert.ok(room.camp.used.length > 0);
});

test("the designer's brief reaches the sketch only when given, and never encode (D154)", () => {
  const { seed } = seedFor(newCampaign(), world, "quiet", ["encounter"]);
  const c = { seed, world, party, brief: "A drowned chapel with a choir still singing." };
  assert.match(sketchInput(env, c, sketchSchema), /designer's brief[\s\S]*drowned chapel/);
  assert.doesNotMatch(sketchInput(env, { ...c, brief: "" }, sketchSchema), /designer's brief/);
  const sketch = { premise: "x", shape: "x", things: ["x"], cut: "nothing", pressure: "x", outcomes: ["x"], notes: "x", opening: "x" };
  assert.doesNotMatch(encodeInput(env, { ...c, sketch }, encodeSchema), /drowned chapel/);
});

test("the generator's inputs stay small enough", () => {
  const { seed } = seedFor(newCampaign(), world, "encounter", ["encounter", "quiet"]);
  const c = { seed, world, party, handoff: { stub: "x", conditions: [] }, log: [] };
  const sketch = { premise: "x", shape: "x", things: ["x".repeat(600)], cut: "nothing", pressure: "x", outcomes: ["x"], notes: "x".repeat(3000), opening: "x".repeat(2400) };
  const sizes = {
    sketch: sketchInput(env, c, sketchSchema),
    encode: encodeInput(env, { ...c, sketch }, encodeSchema),
  };
  for (const [call, input] of Object.entries(sizes)) {
    const n = new TextEncoder().encode(input).length;
    console.log(`${call}: ${n} bytes`);
    assert.ok(n < 40000, `${call} is ${n} bytes`);
    assert.ok(!/\{(place|master|builders)\}/.test(input));
  }
});

test("a room resumes from its sketch with only the encode call, and a dropped connection is tried once more (D156)", async () => {
  const { seed } = seedFor(newCampaign(), world, "quiet", ["encounter"]);
  const calls = [];
  let dropped = 0;
  const io = {
    sample: {
      json: async (input) => {
        calls.push(input.includes("# Sketch call") ? "sketch" : "encode");
        if (!dropped++) throw { code: "upstream_error", message: "the connection was lost" };
        const out = structuredClone(encoded);
        Object.assign(out, { mode: "room", act: 1 });
        out.intent = { purpose: out.intent.purpose, exits: [{ ...encoded.intent.exits[0], leads_to: "encounter" }] };
        return out;
      },
    },
  };
  const sketch = { premise: "x", shape: "x", things: ["x"], cut: "nothing", pressure: "x", outcomes: ["x"], notes: "x", opening: "x" };
  const { packet } = await designRoom(io, env, { seed, world, party, sketch });
  assert.deepEqual(calls, ["encode", "encode"]);
  assert.equal(packet.mode, "room");
  const twice = { sample: { json: async () => { throw { code: "upstream_error", message: "x" }; } } };
  await assert.rejects(designRoom(twice, env, { seed, world, party, sketch }), (e) => e.code === "upstream_error");
});

test("whose room it is: one companion or no one, never the same one twice running, both at the climax (D158)", () => {
  let camp = newCampaign({ seed: 11 });
  const seen = [];
  for (let i = 0; i < 60; i++) {
    const { seed, camp: next } = seedFor({ ...camp, used: [] }, world, "encounter", ["encounter"]);
    if (seed.spotlight && seed.spotlight === seen.at(-1)) assert.fail(`${seed.spotlight} twice in a row`);
    if (!seed.spotlight) assert.ok(seed.motifs.every((m) => m.id !== "valued_thing"), "a companion's thing needs a companion");
    seen.push(seed.spotlight);
    camp = next;
  }
  const none = seen.filter((s) => !s).length;
  assert.ok(none > 15 && seen.includes("companion_a") && seen.includes("companion_b"), `a mix: ${none} of 60 no one's`);
  assert.equal(seedFor(newCampaign(), world, "climax", ["sanctuary"]).seed.spotlight, "both");
  // Only her story goes to the sketch: the features it needs, for the companion whose room it is.
  const base = seedFor(newCampaign(), world, "quiet", ["encounter"]).seed;
  const count = (spotlight) => (sketchInput(env, { seed: { ...base, spotlight }, world, party }, sketchSchema).match(/her_story_needs/g) ?? []).length;
  assert.deepEqual([count(null), count("companion_a"), count("both")], [0, 1, 2]);
});

test("a reply with no JSON is tried once more, and what it said is kept (D159)", async () => {
  const { ask } = await import("../src/ask.js");
  let n = 0;
  const records = [];
  const io = { sample: { json: async () => (n++ ? { premise: "x", shape: "x", things: ["x"], cut: "nothing", pressure: "x", outcomes: ["x"], notes: "x", opening: "x" } : Promise.reject({ code: "invalid_json", message: "no JSON", text: "I'd rather not." })) }, onCall: (r) => records.push(r) };
  const out = await ask(io, { call: "sketch", schema: sketchSchema, input: "x" });
  assert.equal(out.premise, "x");
  assert.equal(records[0].noJson, "I'd rather not.");
});

test("the example rooms are prep notes the sketch schema accepts, and reach the sketch unexplained beside the seed's leanings (D160)", () => {
  for (const ex of sketches) assert.deepEqual(validate(sketchSchema, ex), [], ex.premise);
  const { seed } = seedFor(newCampaign(), world, "encounter", ["encounter", "quiet"]);
  const input = sketchInput(env, { seed, world, party }, sketchSchema);
  assert.match(input, /Example rooms[\s\S]*mind flayer/);
  assert.match(input, /"fixed":[\s\S]*"leanings":/);
  assert.doesNotMatch(input, /Worked example: a finished room/);
});
