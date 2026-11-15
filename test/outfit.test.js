// Outfits found on the journey (D194, D195): the outfit call's checks, where the seed places outfits, the pipeline
// hiding one in a calm room, the climax's reward, and the player's wardrobe toggle. No AI is called.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { seedFor } from "../src/campaign/seed.js";
import { newCampaign, roomEnded } from "../src/campaign/run.js";
import { encodeProblems } from "../src/calls/encode.js";
import { outfitProblems, outfitId } from "../src/calls/outfit.js";
import { generateRoom } from "../src/game/generate.js";
import { outfitInput, sketchInput } from "../src/context.js";
import { outfitSchema } from "../schemas/index.js";
import { worldOf } from "../src/campaign/world.js";
import { partyFor } from "../src/game/session.js";
import { newRomance } from "../src/campaign/relationship.js";
import { addOutfit, wearing } from "../src/campaign/wardrobe.js";
import { wardrobeView, dress } from "../src/game/camp.js";
import { companions } from "../content/companions/index.js";

const file = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const encoded = JSON.parse(file("fixtures/generator/encoded.json"));
const prompts = Object.fromEntries(readdirSync(new URL("../prompts/", import.meta.url)).map((f) => [f.replace(".md", ""), file(`prompts/${f}`)]));
const env = { prompts, examples: { encoded } };
const world = worldOf();
const party = partyFor({ name: "P", class: "rogue" }, ["fern", "nadia"], world);

const good = {
  name: "Last Light sundress",
  text: "a sunset-orange silk slip sundress on two spaghetti straps, plunging to the navel, backless to the top of the buttocks, and cut micro-short; gold sandals laced to the knee",
  from: "a sunflower courtyard at sunset",
};

test("an outfit describes only clothes, in pieces, never slipping off a shoulder", () => {
  assert.deepEqual(outfitProblems(good), []);
  assert.ok(outfitProblems({ ...good, text: good.text.replace("plunging", "showing off her curves, plunging") }).some((p) => /wearer/.test(p)));
  assert.ok(outfitProblems({ ...good, text: good.text.replace("cut micro-short", "cut micro-short and sliding off one shoulder") }).some((p) => /shoulder/.test(p)));
  assert.ok(outfitProblems({ ...good, text: good.text.replace(";", ",") }).some((p) => /pieces/.test(p)));
  assert.ok(outfitProblems({ ...good, text: `sexy ${good.text}` }).length > 0);
  assert.ok(outfitProblems(good, [{ id: "x", name: "last light Sundress" }]).some((p) => /already/.test(p)));
  assert.equal(outfitId("Last Light sundress", [{ id: "last_light_sundress" }]), "last_light_sundress_2");
});

test("the outfit call sees the room and, at a climax, the act's mood; never a companion", () => {
  const sketch = { premise: "Bees bring happy visions in a castle's sunflower garden.", opening: "Gold light over sunflowers." };
  const calm = outfitInput(env, { room: { sketch, world, plan: null, seed: { kind: "quiet", act: 1 } }, found: [{ id: "a", name: "Foxfire set", text: "a corset; robe" }] }, outfitSchema);
  assert.ok(calm.includes(sketch.premise) && calm.includes("Foxfire set: a corset") && !calm.includes("The act's mood"));
  const plan = { setting: "a gothic cathedral district", question: "q", peak: { who: "the poison god's cult" } };
  const peak = outfitInput(env, { room: { sketch, world, plan, seed: { kind: "climax", act: 1 } }, found: [] }, outfitSchema);
  assert.ok(peak.includes("The act's mood") && peak.includes("the poison god's cult"));
  for (const c of Object.values(companions)) assert.ok(!calm.includes(c.name) && !peak.includes(c.name), c.name);
});

test("every climax rewards an outfit; calm rooms hide two or three an act, and an outfit is that room's only prize", () => {
  assert.equal(seedFor(newCampaign({ seed: 4 }), world, "climax", ["sanctuary"]).seed.outfit, "after");
  assert.equal(seedFor(newCampaign({ seed: 4 }), world, "encounter", ["quiet"]).seed.outfit, undefined, "never in an encounter");
  // Short of its target with no calm rooms left after this one, a calm room hides one for sure.
  const short = { ...newCampaign({ seed: 5 }), outfitTarget: 3, way: { ...newCampaign().way, legs: 1, leg: 1, left: 0 } };
  const { seed } = seedFor(short, world, "quiet", ["encounter"]);
  assert.equal(seed.outfit, "hidden");
  assert.equal(seed.prize, undefined);
  assert.ok(sketchInput(env, { seed, world, party }, {}).includes("an_outfit"));
  // At its target, no more.
  const full = { ...short, outfitsFound: [1, 2, 3].map((i) => ({ id: `o${i}`, name: `O ${i}`, text: "a", act: 1 })) };
  assert.equal(seedFor(full, world, "quiet", ["encounter"]).seed.outfit, undefined);
  // The target is two or three, drawn once an act.
  for (let s = 1; s < 30; s++) assert.ok([2, 3].includes(seedFor(newCampaign({ seed: s }), world, "quiet", ["encounter"]).camp.outfitTarget));
});

test("encode must hide the outfit as the room's only reward", () => {
  const base = structuredClone(encoded);
  for (const t of base.map.things) delete t.reward;
  const outfit = { id: "last_light_sundress", ...good };
  const seed = { kind: "encounter", act: 2, exits: base.intent.exits.map((e) => e.leads_to), outfit: "hidden" };
  const with_ = (rewards) => ({ ...structuredClone(base), act: 2, map: { ...structuredClone(base.map), things: base.map.things.map((t, i) => (rewards[i] ? { ...t, reward: rewards[i] } : t)) } });
  assert.ok(encodeProblems(with_([]), seed, outfit).some((p) => /the outfit is a thing/.test(p)));
  assert.deepEqual(encodeProblems(with_([{ outfit }]), seed, outfit).filter((p) => /outfit|reward/.test(p)), []);
  assert.ok(encodeProblems(with_([{ outfit }, { gold: 4 }]), seed, outfit).some((p) => /only prize is the outfit/.test(p)));
});

// A calm room's pipeline on scripted outputs: the sketch, the outfit, then encode hides it.
function scripted(calls, { outfitFails = false } = {}) {
  return {
    sample: {
      json: async (input) => {
        const call = input.includes("# Sketch call") ? "sketch" : input.includes("# Outfit call") ? "outfit" : input.includes("# Read call") ? "read" : "encode";
        calls.push(call);
        if (call === "sketch") return { premise: "A sunflower courtyard where bees bring visions.", shape: "A square garden.", things: ["A loose flagstone by the well."], cut: "nothing", pressure: "none", outcomes: ["rested"], notes: "Under the flagstone, clothes worth keeping.", opening: "Sunflowers in gold light." };
        if (call === "outfit") {
          if (outfitFails) throw { code: "boom", message: "no" };
          return good;
        }
        const block = input.split("Fixed by the seed")[1];
        const fixed = JSON.parse(block.slice(block.indexOf("{"), block.indexOf("}") + 1));
        const out = structuredClone(encoded);
        out.mode = "room";
        out.intent.objective = null;
        out.intent.exits = fixed.exits.map((k, i) => ({ ...encoded.intent.exits[i % 2], id: `exit_${i}`, zone: ["back_stair", "servants_passage"][i % 2], leads_to: k }));
        out.act = 1;
        for (const t of out.map.things) delete t.reward;
        const given = input.match(/"reward":\{"outfit":(\{[^}]*\})\}/);
        // Encode copies the outfit loosely; code puts back the outfit exactly as designed.
        if (given) out.map.things[0].reward = { outfit: { ...JSON.parse(given[1]), text: "a dress; shoes" } };
        return out;
      },
    },
  };
}

test("a calm room's outfit is designed from its sketch, hidden by encode, and counted for the act", async () => {
  let camp = { ...newCampaign({ seed: 11 }), outfitTarget: 9 };
  camp = roomEnded(camp, { handoff: { conditions: [], spent: {}, gold: 0, relics: [] }, verdict: { rating: 6, why: "x", reactions: [] }, exits: [{ id: "e", zone: "z", leads_to: "quiet" }] }).camp;
  const calls = [];
  const room = await generateRoom(scripted(calls), env, { camp, world, party });
  assert.equal(room.seed.outfit, "hidden");
  assert.deepEqual(calls, ["sketch", "outfit", "encode"]);
  const held = room.packet.map.things.find((t) => t.reward?.outfit);
  assert.deepEqual(held.reward.outfit, { id: "last_light_sundress", ...good });
  assert.deepEqual(room.camp.outfitsFound.map((f) => [f.id, f.act]), [["last_light_sundress", 1]]);
  // An outfit call that fails holds nothing up: the room comes without one.
  const none = await generateRoom(scripted([], { outfitFails: true }), env, { camp, world, party });
  assert.ok(!none.packet.map.things.some((t) => t.reward?.outfit));
  assert.deepEqual(none.camp.outfitsFound, []);
});

test("the climax's outfit waits until the climax ends, then waits to be given", () => {
  const fit = { id: "foxfire_boudoir_set", name: "Foxfire boudoir set", text: "a corset; stockings", from: "the fox's den" };
  const camp = { ...newCampaign({ seed: 2 }), climaxOutfit: fit, way: { ...newCampaign().way, here: "climax" } };
  const out = roomEnded(camp, { handoff: { conditions: [], spent: {}, gold: 0, relics: [] }, verdict: { rating: 6, why: "x", reactions: [] }, exits: [] }).camp;
  assert.deepEqual(out.gifts, [fit]);
  assert.equal(out.climaxOutfit, null);
});

test("the player chooses what each companion wears, from what she owns", () => {
  const members = party.slice(1);
  let romance = newRomance(members);
  romance = addOutfit(romance, members[0].id, "sundress", { name: "Last Light sundress", text: good.text, from: good.from });
  const session = { state: { party }, camp: { romance } };
  const view = wardrobeView(session);
  assert.deepEqual(view.map((w) => w.outfits.length), [2, 1]);
  assert.equal(view[0].wearing, "usual");
  dress(session, members[0].id, "sundress");
  assert.equal(wearing(session.camp.romance, members[0]), good.text);
  assert.equal(wardrobeView(session)[0].outfits.find((o) => o.id === "sundress").from, good.from);
  assert.throws(() => dress(session, members[1].id, "sundress"));
});
