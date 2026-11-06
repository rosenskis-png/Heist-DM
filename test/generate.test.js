// The generator (docs/spec/generation.md, D153): the seed, the layout, the encode checks, and the whole pipeline on
// scripted call outputs, ending in a packet the engine loads. No AI is called.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { seedFor, XFACTORS } from "../src/campaign/seed.js";
import { newCampaign, roomEnded } from "../src/campaign/run.js";
import { layout } from "../src/engine/layout.js";
import { geometryProblems } from "../src/engine/map.js";
import { load, checkPacket } from "../src/engine/index.js";
import { encodeProblems } from "../src/calls/encode.js";
import { generateRoom } from "../src/game/generate.js";
import { sketchInput, encodeInput, critiqueInput } from "../src/context.js";
import { sketchSchema, encodeSchema, critiqueSchema } from "../schemas/index.js";
import { worldOf } from "../src/campaign/world.js";
import { partyFor } from "../src/game/session.js";
import { motifs } from "../content/motifs.js";

const file = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const encoded = JSON.parse(file("fixtures/generator/encoded.json"));
const prompts = Object.fromEntries(readdirSync(new URL("../prompts/", import.meta.url)).map((f) => [f.replace(".md", ""), file(`prompts/${f}`)]));
const env = { prompts, examples: { encoded } };
const world = worldOf();
const party = partyFor({ name: "P", class: "rogue" }, ["fern", "nadia"], world);
const SLOTS = [{ id: "player" }, { id: "companion_a" }, { id: "companion_b" }];

test("the seed asks a different question each time, suits the kind, and avoids the act's used motifs", () => {
  let camp = newCampaign({ seed: 7 });
  const seen = new Set();
  for (let i = 0; i < 6; i++) {
    const { seed, camp: next } = seedFor(camp, world, "encounter", ["encounter", "quiet"]);
    assert.ok(XFACTORS.includes(seed.xFactor) && seed.shape && seed.meat && seed.tone && seed.factions.length);
    assert.ok(seed.motifs.length >= 2 && seed.motifs.every((m) => m.kinds.includes("encounter")));
    for (const m of seed.motifs) seen.add(m.id);
    camp = next;
  }
  assert.ok(seen.size >= 6, "motifs vary across an act");
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

test("the pipeline: exits drawn, seed, sketch, critique, revision, encode, layout, and a packet the engine loads", async () => {
  let camp = newCampaign({ seed: 11 });
  // Enter an encounter so the room being written is one, as after a room's end.
  camp = roomEnded(camp, { handoff: { conditions: [], spent: {}, gold: 0, relics: [] }, verdict: { rating: 6, why: "x", reactions: [] }, exits: [{ id: "e", zone: "z", leads_to: "encounter" }] }).camp;
  const calls = [];
  const sketch = { design: { start: "Steam.", goal: "Get through.", challenge: "The players must cross the floor by passing as washers, and that's hard because the overseer knows every face.", outcomes: ["clean", "pressed"], x_factor: "get through", pressure: "The inspection." }, sketch: "Blockout: ..." };
  const critique = { runs: ["force", "guile", "odd", "plain"].map((approach) => ({ approach, clean: "x", messy: "y" })), problems: [{ problem: "The loft touches nothing.", element: "drying loft", fix: "connect" }] };
  const io = {
    sample: {
      json: async (input) => {
        const call = input.includes("# Sketch call") ? "sketch" : input.includes("# Critique call") ? "critique" : "encode";
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
        return call === "sketch" ? sketch : critique;
      },
    },
  };
  const stages = [];
  io.onStage = (name) => stages.push(name);
  const room = await generateRoom(io, env, { camp, world, party, handoff: { stub: "Out of the cells.", conditions: [] }, log: ["cells: escaped at tick 9"] });
  assert.deepEqual(calls, ["sketch", "critique", "sketch", "encode"]);
  assert.deepEqual(stages, ["sketch", "critique", "revision", "encoded", "laid out"]);
  assert.equal(room.mapped, true);
  assert.equal(room.packet.intent.exits.length, room.seed.exits.length);
  const s = load({ packet: room.packet, party });
  assert.equal(s.tick, 0);
  assert.ok(room.camp.used.length > 0);
});

test("the designer's brief reaches the sketch only when given, and never the critique or encode (D154)", () => {
  const { seed } = seedFor(newCampaign(), world, "quiet", ["encounter"]);
  const c = { seed, world, party, brief: "A drowned chapel with a choir still singing." };
  assert.match(sketchInput(env, c, sketchSchema), /designer's brief[\s\S]*drowned chapel/);
  assert.doesNotMatch(sketchInput(env, { ...c, brief: "" }, sketchSchema), /designer's brief/);
  const sketch = { design: {}, sketch: "x" };
  assert.doesNotMatch(critiqueInput(env, { ...c, sketch }, critiqueSchema), /drowned chapel/);
  assert.doesNotMatch(encodeInput(env, { ...c, sketch }, encodeSchema), /drowned chapel/);
});

test("the generator's inputs stay small enough", () => {
  const { seed } = seedFor(newCampaign(), world, "encounter", ["encounter", "quiet"]);
  const c = { seed, world, party, handoff: { stub: "x", conditions: [] }, log: [] };
  const sketch = { design: { start: "x", goal: "x", challenge: "x", outcomes: ["x"], x_factor: "x", pressure: "x" }, sketch: "x".repeat(6000) };
  const sizes = {
    sketch: sketchInput(env, { ...c, previous: sketch, critique: { problems: [] } }, sketchSchema),
    critique: critiqueInput(env, { ...c, sketch }, critiqueSchema),
    encode: encodeInput(env, { ...c, sketch }, encodeSchema),
  };
  for (const [call, input] of Object.entries(sizes)) {
    const n = new TextEncoder().encode(input).length;
    console.log(`${call}: ${n} bytes`);
    assert.ok(n < 40000, `${call} is ${n} bytes`);
    assert.ok(!/\{(place|master|builders)\}/.test(input));
  }
});
