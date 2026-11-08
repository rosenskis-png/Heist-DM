// Photo prompts (docs/spec/calls/photo.md, D170): every companion has a picture identity in every party she can
// join, the prompt assembles from it in Gravenhold's skeleton, and the call's input names no one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { companions as authored } from "../content/companions/index.js";
import { pairs } from "../content/pairs.js";
import { photo as P } from "../content/photo.js";
import { pairings, resolveParty } from "../src/campaign/roster.js";
import * as Rel from "../src/campaign/relationship.js";
import { addOutfit, equip } from "../src/campaign/wardrobe.js";
import { photoOf, photoPrompt, SLOTS } from "../src/campaign/photo.js";
import { photoInput } from "../src/context.js";
import { photoProblems } from "../src/calls/photo.js";
import { photoSchema } from "../schemas/index.js";
import { validate } from "../src/validate.js";

const file = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const env = { prompts: { photo: file("prompts/photo.md") } };
const slots = { setting: "a forest clearing at night", light: "dark beyond the firelight", position: "By the fire", action: "sitting on a log, sharpening a knife", face_extra: "a smear of soot", garments: "A plain grey cloak over a linen shift", grit: false, surroundings: "pines and packs", light_source: "the campfire", expression: "calm, half a smile" };

test("every companion, in every party she can join, has a picture identity with a numeric age", () => {
  for (const [a, b] of pairings(authored)) {
    const members = resolveParty([authored[a], authored[b]]);
    const rom = Rel.newRomance(members, pairs);
    for (const c of members) {
      const id = photoOf(c, rom);
      assert.ok(Number.isInteger(id.age) && id.age >= 18, `${c.id} with ${a}|${b}: age ${id.age}`);
      for (const k of ["role", "face", "identity", "garments", "expression"]) assert.ok(id[k], `${c.id} with ${a}|${b}: ${k}`);
    }
  }
});

test("a tie's photo replaces her picture identity for that partner only", () => {
  const tied = Object.values(authored).find((c) => Object.values(c.tie?.by ?? {}).some((e) => e.photo));
  if (!tied) return;
  const [partnerId, entry] = Object.entries(tied.tie.by).find(([id, e]) => e.photo && authored[id]);
  const [me] = resolveParty([tied, authored[partnerId]]);
  for (const [k, v] of Object.entries(entry.photo)) assert.equal(me.photo[k], v);
  for (const k of Object.keys(tied.photo ?? {}).filter((k) => !(k in entry.photo))) assert.equal(me.photo[k], tied.photo[k]);
});

test("her garments line follows what she has on", () => {
  const c = Object.values(authored).find((x) => x.photo && !x.tie);
  const rom = Rel.newRomance([c], pairs);
  assert.equal(photoOf(c, rom).garments, c.photo.garments);
  const changed = equip(addOutfit(rom, c.id, "gown", { name: "Gown", text: "A long green velvet gown." }), c.id, "gown");
  assert.equal(photoOf(c, changed).garments, "A long green velvet gown.");
});

test("the prompt keeps Gravenhold's skeleton, with defaults for empty slots", () => {
  const id = { age: 25, role: "woman", face: "Naturally pretty face", identity: "brown eyes, short hair.", garments: "A plain dress", bold: false, expression: "calm", beside: "Beside her is a spirit." };
  const p = photoPrompt(id, slots);
  assert.equal(
    p,
    `${P.opener} Scene of a forest clearing at night, dark beyond the firelight. By the fire is a 25yo woman sitting on a log, sharpening a knife. Naturally pretty face, a smear of soot. brown eyes, short hair. A plain grey cloak over a linen shift. ${P.clean} Surrounded by pines and packs. only source of light is the campfire. Expression is calm, half a smile`,
  );
  const bare = photoPrompt(id, {});
  assert.ok(bare.includes(`Scene of ${P.defaults.setting}, ${P.defaults.light}.`));
  assert.ok(bare.includes("A plain dress.") && bare.includes(P.grit) && bare.endsWith("Expression is calm"));
  assert.ok(photoPrompt(id, { action: ", mid-laugh" }).includes("25yo woman, mid-laugh."));
  assert.ok(!bare.includes(id.beside) && photoPrompt(id, {}, { beside: true }).includes(id.beside));
});

test("the call's input names no one and carries no story; its output fits the schema", () => {
  for (const [a, b] of pairings(authored)) {
    const input = photoInput(env, { moment: "Bathing in a stream at dawn.", beside: true }, authored[a], [authored[b]], photoSchema);
    // Her look and outfit are the game's prose and may name a sister; the fixed picture words never do.
    const her = JSON.parse(input.split("## She is")[1].match(/```json\n(.+)\n```/)[1]);
    const fixed = JSON.stringify([her.role, her.face, her.identity, her.usual_expression, her.wearing === her.garments_line ? "" : her.garments_line]);
    for (const c of [authored[a], authored[b]]) assert.ok(!new RegExp(`\\b${c.name}\\b`).test(fixed), `${a}|${b} names ${c.name}`);
    assert.ok(!("name" in her));
    for (const k of ['"pursuit"', '"hidden"', '"voice"', '"color"']) assert.ok(!input.includes(k), `${a}|${b}: ${k}`);
    assert.ok(input.includes("Bathing in a stream at dawn."));
  }
  assert.deepEqual(validate(photoSchema, slots), []);
  assert.deepEqual(Object.keys(photoSchema.properties), SLOTS);
  assert.deepEqual(photoProblems({ ...slots, action: "Wren laughs" }, ["Wren"]).length, 1);
});
