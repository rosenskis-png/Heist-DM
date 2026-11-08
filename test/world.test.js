// Worlds: companion text names the place through role slots the world fills, so the same hand-written companion works in
// any world, and the default world needs everything every companion's story does (docs/spec/campaign.md §9, D150)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { companions as authored } from "../content/companions/index.js";
import { worlds, defaultWorld } from "../content/worlds/index.js";
import { ROLES, inWorld, rosterIn, worldProblems, worldOf } from "../src/campaign/world.js";
import { resolveParty } from "../src/campaign/roster.js";
import { newSession, envFor } from "../src/game/session.js";
import { partyInput, campfireInput, ledgerText } from "../src/context.js";
import { partySchema, campfireSchema } from "../schemas/index.js";

const SLOT = /\{(?:place|kind|builders|builders_adj|rulers|commander|master|working|depths|sanctum)\}/i;
const text = (x) => JSON.stringify(x);

test("every world fills every role, and every companion is whole in every world", () => {
  for (const world of Object.values(worlds)) {
    for (const r of ROLES) assert.ok(world.roles[r], `${world.id} has no ${r}`);
    for (const c of Object.values(rosterIn(authored, world))) assert.ok(!SLOT.test(text(c)), `${c.id} has an unfilled slot in ${world.id}`);
  }
});

test("the default world holds everything every companion's story needs", () => {
  assert.deepEqual(worldProblems(worldOf(defaultWorld), Object.values(authored)), []);
  const bare = { roles: { ...worldOf().roles, master: undefined }, features: {} };
  const fern = Object.values(authored).find((c) => c.needs?.length);
  const problems = worldProblems(bare, [fern]);
  assert.ok(problems.includes("the world has no master"));
  assert.ok(problems.some((p) => p.startsWith(`${fern.name} needs`)));
});

test("another world changes the role nouns and nothing else, and capitals start sentences", () => {
  const masquerade = { ...worldOf(), roles: { place: "Château Noir", kind: "manor", builders: "the old counts", builders_adj: "comital", rulers: "the household", commander: "the household's steward", master: "the marquise", working: "the servants' halls", depths: "the crypts", sanctum: "the marquise's salon" } };
  const sample = { why: "{Builders} built {place} over a spring; {rulers}' mining of it", quest: "{Master} keeps it in {sanctum}.", plain: "Nothing to fill." };
  assert.deepEqual(inWorld(sample, masquerade), { why: "The old counts built Château Noir over a spring; the household's mining of it", quest: "The marquise keeps it in the marquise's salon.", plain: "Nothing to fill." });
  const [a, b] = Object.values(authored);
  const there = resolveParty([a, b], masquerade);
  const here = resolveParty([a, b]);
  assert.equal(there.length, 2);
  assert.ok(!SLOT.test(text(there)) && !SLOT.test(text(here)));
});

test("no unfilled slot reaches a companion's call", () => {
  const packet = JSON.parse(readFileSync(new URL("../content/encounters/cells.json", import.meta.url)));
  const prompts = Object.fromEntries(readdirSync(new URL("../prompts/", import.meta.url)).map((f) => [f.replace(".md", ""), readFileSync(new URL(`../prompts/${f}`, import.meta.url), "utf8")]));
  const ids = Object.keys(authored);
  for (let i = 0; i < ids.length; i += 2) {
    const pair = [ids[i], ids[(i + 1) % ids.length]];
    const session = newSession({ packet, player: { name: "P", class: "rogue" }, companions: pair });
    const env = envFor(session, prompts);
    const members = session.state.party.slice(1);
    const huddle = partyInput(env, { channel: "huddle", now: ledgerText(session.state, { party: true, history: false }), recent: [] }, members, [], partySchema);
    const camp = campfireInput(env, { with: [members[0].id], scene: [] }, members[0], [members[1]], campfireSchema);
    assert.ok(!SLOT.test(huddle) && !SLOT.test(camp), `${pair}`);
  }
});

// A stand-in for a generated world: Gravenhold's shape with a masquerade's nouns.
const masquerade = () => ({
  ...structuredClone(worldOf()),
  id: "chateau_noir",
  name: "Château Noir",
  roles: { place: "Château Noir", kind: "manor", builders: "the old counts", builders_adj: "comital", rulers: "the household", commander: "the household's steward", master: "the marquise", working: "the servants' halls", depths: "the crypts", sanctum: "the marquise's salon" },
  invariants: [{ id: "masks", text: "Nobody in the manor ever removes their mask." }],
});

test("the pitch's world has Gravenhold's shape, and the check sends back one that lacks a companion's needs", async () => {
  const { validate } = await import("../src/validate.js");
  const { pitchSchema } = await import("../schemas/calls/pitch.js");
  const { pitchCall } = await import("../src/calls/pitch.js");
  assert.deepEqual(validate(pitchSchema, { pitch: "You wake in a cell.", world: worldOf() }), []);
  assert.ok(validate(pitchSchema, { pitch: "x", world: { ...worldOf(), regions: worldOf().regions.slice(0, 4) } }).length > 0, "five regions");
  assert.ok(validate(pitchSchema, { pitch: "x", world: { ...worldOf(), mysteries: worldOf().mysteries.slice(0, 1) } }).length > 0, "at least two mysteries");
  const needy = Object.values(authored).filter((c) => c.needs?.length).slice(0, 2);
  const bare = { ...masquerade(), features: {} };
  const outs = [{ pitch: "x", world: bare }, { pitch: "You wake.", world: masquerade() }];
  const sent = [];
  const io = { sample: { json: async (input) => (sent.push(input), outs.shift()) } };
  const prompts = Object.fromEntries(readdirSync(new URL("../prompts/", import.meta.url)).map((f) => [f.replace(".md", ""), readFileSync(new URL(`../prompts/${f}`, import.meta.url), "utf8")]));
  const out = await pitchCall(io, { prompts }, { companions: needy, vibe: "a gothic masquerade", rejected: [], withExample: true });
  assert.equal(out.world.id, "chateau_noir");
  assert.equal(sent.length, 2, "the world missing a feature went back once");
  assert.ok(sent[0].includes("a gothic masquerade") && sent[0].includes("Worked example: Gravenhold"));
  assert.ok(new TextEncoder().encode(sent[0]).length < (await import("../src/ask.js")).BUDGET.pitch);
});

test("a session in a generated world fills companions from it, reads its world facts, and keeps it through a save", async () => {
  const { serialize, restore } = await import("../src/game/session.js");
  const { companionInput } = await import("../src/context.js");
  const { companionSchema } = await import("../schemas/index.js");
  const packet = JSON.parse(readFileSync(new URL("../content/encounters/cells.json", import.meta.url)));
  const prompts = Object.fromEntries(readdirSync(new URL("../prompts/", import.meta.url)).map((f) => [f.replace(".md", ""), readFileSync(new URL(`../prompts/${f}`, import.meta.url), "utf8")]));
  const vesper = Object.values(authored).find((c) => JSON.stringify(c).includes("{builders_adj}"));
  const other = Object.values(authored).find((c) => c !== vesper && !c.tie?.required);
  const session = newSession({ packet, player: { name: "P", class: "rogue" }, companions: [vesper.id, other.id], world: masquerade() });
  const sheet = session.state.party[1];
  assert.ok(JSON.stringify(sheet).includes("comital") && !JSON.stringify(sheet).includes("dwarven"));
  const env = envFor(session, prompts);
  const input = companionInput(env, { channel: "huddle", now: "", recent: [] }, session.state.party[1], [session.state.party[2]], [], companionSchema);
  assert.ok(input.includes("Nobody in the manor ever removes their mask."));
  const back = restore(serialize(session), packet);
  assert.equal(back.world.id, "chateau_noir");
  assert.ok(JSON.stringify(back.state.party[1]).includes("comital"));
});

test("a pitch's seed names the kind of heart and two different kinds of secret, and reaches the pitch (D157)", async () => {
  const { pitchSeed } = await import("../src/campaign/world.js");
  const { HEARTS, SECRETS } = await import("../content/pitch.js");
  const { pitchInput } = await import("../src/context.js");
  const { pitchSchema } = await import("../schemas/index.js");
  const hearts = new Set();
  for (let n = 1; n < 40; n++) {
    const s = pitchSeed(n * 7919);
    assert.ok(HEARTS.includes(s.heart) && s.secrets.every((x) => SECRETS.includes(x)) && s.secrets[0] !== s.secrets[1]);
    hearts.add(s.heart);
  }
  assert.ok(hearts.size >= 5, "rerolls ask different questions");
  assert.deepEqual(pitchSeed(42), pitchSeed(42));
  const seed = pitchSeed(5);
  const input = pitchInput({ prompts: { pitch: "x" } }, { companions: [], vibe: "", seed }, pitchSchema);
  assert.ok(input.includes(seed.heart) && input.includes(seed.secrets[1]));
  const { worldOf } = await import("../src/campaign/world.js");
  assert.ok(worldOf().playerSecrets.every((t) => !/\b(he|his|him)\b/i.test(t)), "the player is they");
});
