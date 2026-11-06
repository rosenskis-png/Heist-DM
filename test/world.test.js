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
