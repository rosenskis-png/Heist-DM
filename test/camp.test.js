// Camp in the game (D190): the campfire call at a campfire room, one scene per fire, whispers kept private, outfits
// given, where she stands carried into the rooms ahead, and the road since the last fire remembered.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { newSession, serialize } from "../src/game/session.js";
import { campaignOf } from "../src/game/journey.js";
import { atFire, fireOf, campTalk, speakTo, sitWith, sceneFor, fireView, giveOutfit, roadFor } from "../src/game/camp.js";
import { noteRoom, fireOut, roomEnded } from "../src/campaign/run.js";
import { worldOf } from "../src/campaign/world.js";
import { owned } from "../src/campaign/wardrobe.js";
import { layout } from "../src/engine/layout.js";

const file = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const prompts = Object.fromEntries(readdirSync(new URL("../prompts/", import.meta.url)).map((f) => [f.replace(".md", ""), file(`prompts/${f}`)]));
const encoded = { ...JSON.parse(file("fixtures/generator/encoded.json")), mode: "room", intent: { purpose: "A night by the fire.", exits: [] } };
for (const t of encoded.map.things) delete t.reward;
const room = layout(encoded).packet;

const answer = (over = {}) => ({ segments: [{ speaker: "self", text: "She smiles.", aside: "no" }], changes: [], memories: [], secrets: [], commitments: [], beats: [], advances: "asks him to stay", outfit: null, believes: null, storm: null, risk: null, form: null, inner: "Glad.", agenda: null, ...over });

function atCamp() {
  const session = newSession({ packet: room, player: { name: "P", class: "rogue" }, companions: ["fern", "nadia"], seed: 3, world: worldOf() });
  campaignOf(session);
  session.camp.way.here = "campfire";
  return session;
}
const scripted = (outs) => {
  const inputs = [];
  return { inputs, io: { sample: { json: async (x) => (inputs.push(typeof x === "string" ? x : x[0].content), structuredClone(outs.shift() ?? answer())) } } };
};

test("only a campfire or the sanctuary is a fire", () => {
  const s = atCamp();
  assert.ok(atFire(s));
  s.camp.way.here = "encounter";
  assert.ok(!atFire(s));
});

test("with both at the fire, each answers in turn, and the second sees what the first just did", async () => {
  const s = atCamp();
  const { io, inputs } = scripted([answer({ segments: [{ speaker: "self", text: "First answer.", aside: "no" }] }), answer()]);
  await campTalk(s, io, prompts, { text: "Hello, both." });
  assert.equal(inputs.length, 2);
  assert.ok(inputs[0].includes("# Campfire call"));
  assert.ok(inputs[1].includes("First answer."), "the second call reads the first answer");
  assert.equal(fireOf(s).transcript.length, 3);
  assert.equal(s.camp.romance.turn, 1, "one campaign turn per player message");
});

test("a whisper reaches only her, and an aside to the other is a look to the player", async () => {
  const s = atCamp();
  const [a, b] = ["fern", "nadia"];
  speakTo(s, a);
  const { io } = scripted([answer({ segments: [{ speaker: "self", text: "Psst, to her.", aside: "to_other" }, { speaker: "self", text: "Only for you.", aside: "ring" }] })]);
  await campTalk(s, io, prompts, { text: "Meet me later." });
  assert.ok(sceneFor(s, a).some((x) => x.text === "Meet me later."));
  assert.ok(!sceneFor(s, b).some((x) => x.text === "Meet me later."), "the other never hears a whisper");
  assert.ok(sceneFor(s, b).some((x) => x.text === "Psst, to her."), "words to the other reach her");
  assert.ok(!sceneFor(s, b).some((x) => x.text === "Only for you."), "ring words to him reach no one else");
  const shown = fireView(s).at(-1).segments;
  assert.equal(shown[0].kind, "look");
});

test("a scene alone is never read by the one who wasn't there", async () => {
  const s = atCamp();
  sitWith(s, "fern");
  const actor = fireOf(s).disguise?.actor ?? "fern";
  const { io, inputs } = scripted([answer({ advances: null })]);
  await campTalk(s, io, prompts, { text: "Just us." });
  assert.equal(inputs.length, 1);
  const other = actor === "fern" ? "nadia" : "fern";
  assert.ok(!sceneFor(s, other).some((x) => x.text === "Just us."));
});

test("an outfit waiting in the pack is given at the fire and is hers", async () => {
  const s = atCamp();
  s.camp.gifts = [{ id: "silk_robe", name: "A silk robe", text: "Deep green silk." }];
  const { io, inputs } = scripted([answer(), answer()]);
  await giveOutfit(s, io, prompts, { outfit: "silk_robe", to: "nadia" });
  assert.ok(owned(s.camp.romance, s.state.party.find((p) => p.id === "nadia")).silk_robe);
  assert.equal(s.camp.gifts.length, 0);
  assert.ok(inputs[0].includes("A silk robe"));
});

test("where she stands after camp is what the rooms ahead read", async () => {
  const s = atCamp();
  const { io } = scripted([answer({ standing: { mood: "warm", why: "He listened." }, learned: ["He keeps his word."] }), answer()]);
  await campTalk(s, io, prompts, { text: "I'm here." });
  const first = Object.entries(s.standing).find(([, v]) => v.mood === "warm");
  assert.ok(first);
  assert.deepEqual(first[1].learned, ["He keeps his word."]);
  assert.ok(JSON.parse(serialize(s)).fire.transcript.length, "the scene is in the save");
});

test("the road since the last fire reaches her, her own feelings only, and strong ones outlast the fire", async () => {
  let camp = campaignOf(atCamp());
  camp = noteRoom(camp, { name: "The laundry", handoff: { log: "They hid in the vats." }, verdict: { rating: 6, why: "Messy but clean.", reactions: [{ from: "fern", reason: "he carried her across", sign: 1, intensity: 2 }, { from: "nadia", reason: "he left her behind", sign: -1, intensity: 1 }] } });
  const fern = roadFor(camp, "fern");
  assert.equal(fern.since[0].what_happened, "They hid in the vats.");
  assert.ok(fern.since[0].you_felt[0].includes("carried her across"));
  assert.ok(!JSON.stringify(fern).includes("left her behind"), "the other's reactions are hers");
  const after = fireOut(camp);
  assert.equal(after.since.length, 0);
  assert.equal(after.kept.fern.length, 1);
  assert.equal(after.kept.nadia, undefined, "a mild reaction doesn't stay");
  const s = atCamp();
  s.camp = { ...camp, way: s.camp.way };
  const { io, inputs } = scripted([answer(), answer()]);
  await campTalk(s, io, prompts, { text: "Rough day." });
  assert.ok(inputs.some((x) => x.includes("They hid in the vats.")));
});

test("leaving a campfire spends the leg's moments; leaving any other room adds one", () => {
  const camp = campaignOf(atCamp());
  camp.way.here = "encounter";
  const a = roomEnded(camp, { handoff: { log: "x" }, verdict: { rating: 5, why: "ok", reactions: [], people: [] }, name: "A room" }).camp;
  assert.equal(a.since.length, 1);
  const fire = { ...a, way: { ...a.way, here: "campfire" } };
  assert.equal(roomEnded(fire, { handoff: {}, verdict: { rating: null, reactions: [], people: [] } }).camp.since.length, 0);
});

test("the developer's view shows whispers between them, what she thinks, and how each feels (D191)", async () => {
  const { heartsView } = await import("../src/game/camp.js");
  const s = atCamp();
  const { io } = scripted([answer({ segments: [{ speaker: "self", text: "Psst, to her.", aside: "to_other" }], inner: "She's hiding something." }), answer()]);
  await campTalk(s, io, prompts, { text: "Evening." });
  const hidden = fireView(s).find((t) => t.segments?.some((g) => g.kind === "look"));
  assert.ok(hidden && !hidden.truth, "the player's view hides it");
  const shown = fireView(s, { reveal: true }).find((t) => t.segments?.some((g) => g.text === "Psst, to her."));
  assert.ok(shown.truth.inner.includes("hiding"));
  const hearts = heartsView(s);
  assert.equal(hearts.length, 2);
  assert.ok(hearts[0].toward_you.some((x) => x.k === "heat") && hearts[0].toward_other.length === 3);
});
