// The game loop and the call layer, played with recorded AI outputs (no AI calls).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { newSession, serialize, restore, post } from "../src/game/session.js";
import { makeCard, commit, talk, shown } from "../src/game/turns.js";
import { mapView, clockView } from "../src/game/view.js";
import { ask, tierFor, CallFailed } from "../src/ask.js";
import { adjudicateSchema } from "../schemas/index.js";

const file = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const packet = JSON.parse(file("content/encounters/cells.json"));
const prompts = Object.fromEntries(readdirSync(new URL("../prompts/", import.meta.url)).map((f) => [f.replace(".md", ""), file(`prompts/${f}`)]));
const { card: ratCard, played: ratPlayed } = JSON.parse(file("fixtures/cells/ruled.json"));
// The two companions the player chose (D8): the packet places them by slot.
const PARTY = ["fern", "nadia"];
const RAT_PLAN = "Fern turns into a rat while he's at the cask and goes down the gutter. When he sits back down, she and the rats lift the ring off the peg behind him. On his next drink they carry it to Nadia, and Fern chews through the drumhead. Nadia lets us all out, Brannoc too, and we go up the stair.";

test("a call gets one retry with its errors listed, then fails loudly", async () => {
  const bad = { steps: [] };
  const script = (outs) => ({ json: async () => structuredClone(outs.shift()) });
  const out = await ask({ sample: script([bad, ratCard]) }, { call: "adjudicate", input: "# Adjudicate call", schema: adjudicateSchema });
  assert.equal(out.steps.length, ratCard.steps.length);
  const records = [];
  await assert.rejects(ask({ sample: script([bad, bad]), onCall: (r) => records.push(r) }, { call: "adjudicate", input: "# Adjudicate call", schema: adjudicateSchema }), CallFailed);
  assert.equal(records.length, 1);
  assert.ok(records[0].firstErrors.length && records[0].errors.length);
  assert.deepEqual(["faster", "balanced", "smarter"].map((sp) => tierFor("adjudicate", sp)), ["quick", "default", "complex"]);
  assert.deepEqual(["faster", "smarter"].map((sp) => tierFor("companion", sp)), ["quick", "default"]);
});

test("the player's two companions fill the packet's slots", () => {
  const session = newSession({ packet, player: { name: "", class: "rogue" }, companions: ["vesper", "ruby"] });
  const s = session.state;
  assert.deepEqual([s.at.vesper, s.at.ruby], ["cell_middle", "cell_near"]);
  assert.ok(!JSON.stringify(s.packet).includes("companion_a"));
  assert.deepEqual(s.packet.intent.fail_forward.condition.all[1], { in_zone: ["vesper", "cell_middle"] });
});

test("a save restores to the same state, without the packet or the sheets in it", () => {
  const session = newSession({ packet, player: { name: "Kael", class: "rogue" }, companions: PARTY, seed: 3 });
  post(session, "huddle", { who: "player", text: "Hello." });
  const json = serialize(session);
  assert.ok(!json.includes('"rects"'));
  const back = restore(json, packet);
  assert.deepEqual(back.state, session.state);
  assert.deepEqual(back.feeds, session.feeds);
});

test("a save from before fights were plans restores with toughness, and no conditions or threats", () => {
  const session = newSession({ packet, player: { name: "Kael", class: "rogue" }, companions: PARTY, seed: 3 });
  const old = JSON.parse(serialize(session));
  for (const k of ["toughness", "conditions", "threats"]) delete old.state[k];
  old.state.hp = { player: 4 };
  const back = restore(old, packet);
  assert.equal(back.state.hp, undefined);
  assert.deepEqual(back.state, session.state);
});

test("the map draws known zones only, and the clock shows known routines and events", () => {
  const session = newSession({ packet, player: { name: "", class: "rogue" }, companions: PARTY });
  const m = mapView(session.state);
  const zones = m.levels.flatMap((l) => l.zones.map((z) => z.id));
  assert.ok(!zones.includes("cistern"));
  assert.ok(!m.levels.flatMap((l) => l.connections.map((c) => c.id)).includes("crawl"));
  assert.deepEqual(m.levels.map((l) => l.level), [1, 0, -1]);
  const tokens = m.levels.flatMap((l) => l.tokens.map((t) => t.id));
  assert.ok(["player", ...PARTY, "snag", "brannoc"].every((id) => tokens.includes(id)));
  const c = clockView(session.state);
  assert.equal(c.beats[0].beat, "Drink");
  assert.deepEqual(c.coming.map((e) => e.at), [32]);
});

const RULED = { "# Adjudicate call": "adjudicate", "# Resolve call": "resolve", "# Scene call": "scene" };
function ruledSample(script) {
  const seen = [];
  return {
    seen,
    json: async (input, opts) => {
      const text = typeof input === "string" ? input : input[0].content;
      const call = Object.entries(RULED).find(([h]) => text.includes(h))?.[1] ?? "companion";
      seen.push({ call, opts, input: text });
      const next = script[call]?.shift();
      if (next === undefined) throw new Error(`no recorded ${call} output`);
      return structuredClone(next);
    },
  };
}

test("the rat plan is one card, and the party is out at exchange 1", async () => {
  const sample = ruledSample({ adjudicate: [ratCard], resolve: [ratPlayed] });
  const io = { sample };
  const session = newSession({ packet, player: { name: "Kael", class: "rogue" }, seed: 7, companions: PARTY });
  session.draft.plan = RAT_PLAN;
  await makeCard(session, io, prompts);
  const view = shown(session);
  assert.deepEqual(view.steps.map((st) => st.risks.map((r) => r.band)), [[], ["Medium"], ["Easy"], []]);
  assert.ok(view.steps[1].on.includes("Snag: Sit"));
  await commit(session, io, prompts, { rolls: [10, 10] });
  assert.equal(session.state.ended?.outcome, "escaped");
  assert.equal(session.counts.out, 1);
  // The card is priced from the routines the party knows; the DM plays it out seeing everything.
  const card = sample.seen.find((x) => x.call === "adjudicate").input;
  const played = sample.seen.find((x) => x.call === "resolve").input;
  assert.ok(played.includes('"result":"succeeded"') && !played.includes('"roll":10'));
  assert.ok(card.includes("What the party expects next") && played.includes("What is really happening"));
});

test("a failed resolve keeps its dice, so trying again can't reroll them", async () => {
  const bad = { steps: [], ends_at: 0 };
  const sample = ruledSample({ adjudicate: [ratCard], resolve: [bad, bad, ratPlayed] });
  const io = { sample };
  const session = newSession({ packet, player: { name: "", class: "rogue" }, companions: PARTY });
  session.draft.plan = "The rat plan.";
  await makeCard(session, io, prompts);
  await assert.rejects(commit(session, io, prompts, { rolls: [10, 10] }));
  const dice = session.card.dice;
  await commit(session, io, prompts, { rolls: [99, 99] });
  assert.deepEqual(session.state.resolved.rolls, dice);
  assert.equal(session.counts.exchanges, 1);
});

test("a scene rolls its checks, records the ruling and lets time pass", async () => {
  const out = {
    reply: "You lean on the bars and call him a coward.",
    checks: [{ who: "player", band: "medium", reason: "He hates being mocked by prisoners.", success: { text: "He storms over to your bars.", changes: { moves: [{ who: "snag", to: "corridor" }] } }, failure: { text: "He ignores you.", changes: {} } }],
    changes: { facts: [{ id: "snag_mocked", text: "Jim has been mocking Snag through the bars.", about: ["snag", "player"] }] },
    ticks: 1,
  };
  const sample = ruledSample({ scene: [out] });
  const session = newSession({ packet, player: { name: "Jim", class: "rogue" }, companions: PARTY });
  await talk(session, { sample }, prompts, { to: "snag", text: "Oi, coward!", rolls: [5] });
  assert.equal(session.state.at.snag, "corridor");
  assert.equal(session.state.tick, 1);
  assert.ok(session.state.facts.some((f) => f.id === "snag_mocked"));
  assert.deepEqual(session.feeds.moment.map((e) => e.kind ?? "player"), ["player", "reply", "check", "time"]);
  const back = restore(serialize(session), packet);
  assert.deepEqual(back.state, session.state);
});
