// Phase 4: the game loop and the call layer, played with recorded AI outputs (no AI calls).
// The rat plan gets the party out of their cells by exchange 4 (docs/roadmap.md, Phase 4 exit).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { newSession, serialize, restore, post } from "../src/game/session.js";
import { huddle, moment, makeCard, commit, shown } from "../src/game/turns.js";
import { mapView, clockView } from "../src/game/view.js";
import { ask, tierFor, CallFailed } from "../src/ask.js";
import { stepSchema } from "../schemas/index.js";

const file = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const packet = JSON.parse(file("content/encounters/cells.json"));
const prompts = Object.fromEntries(readdirSync(new URL("../prompts/", import.meta.url)).map((f) => [f.replace(".md", ""), file(`prompts/${f}`)]));
const calls = JSON.parse(file("fixtures/cells/calls.json"));
const card2 = JSON.parse(file("fixtures/cells/card2.json"));

// Which call an input is, from its job block.
const CALLS = { "# Step call": "step", "# Pricing call": "pricing", "# World call": "world", "# Narration call": "narration", "# Moment call": "moment", "# Companion call": "companion" };
const callOf = (input) => {
  const text = typeof input === "string" ? input : input[0].content;
  return Object.entries(CALLS).find(([h]) => text.includes(h))?.[1] ?? "ruling";
};
// A JSON block from an assembled input, by its title.
const blockOf = (input, title) => JSON.parse(input.split(`## ${title}\n\n\`\`\`json\n`)[1].split("\n```")[0]);

// Pricing that covers every foreseen thing at Easy, with a warning for every arrival: the pipeline under test,
// not judgment.
function pricing(input) {
  const facts = blockOf(input, "What the party foresees for each step (from the engine)");
  const arrivals = blockOf(input, "Projected arrivals the party doesn't foresee (warnings only, never priced or named)");
  return {
    steps: facts.map((f) => ({
      n: f.n,
      risks: [...f.observers, ...f.barriers, ...f.hazards].map((id) => ({ id: `r_${id}`, covers: [id], difficulty: "easy", reason: "It could go wrong.", on_fail: { summary: "It goes wrong.", ops: [], stops_plan: false } })),
      mitigations: [],
    })),
    rulings: [],
    warnings: arrivals.map((a) => ({ n: a.n, covers: a.id, difficulty: "medium", reason: "Footsteps." })),
  };
}

// Recorded outputs per call, used in order; a function answers from the input.
function fakeSample(script) {
  const seen = [];
  return {
    seen,
    json: async (input, opts) => {
      const call = callOf(input);
      seen.push({ call, opts });
      const next = script[call]?.shift();
      if (next === undefined) throw new Error(`no recorded ${call} output`);
      return typeof next === "function" ? next(input) : structuredClone(next);
    },
  };
}

const walkOut = {
  steps: [
    {
      n: 1,
      summary: "Everyone walks out of the block and up the stair; Brannoc too.",
      actors: ["player", "fern", "lyra", "brannoc"],
      zone: "stair_top",
      noise: "quiet",
      effects: [
        { move: { entity: "player", to: "stair_top" } },
        { move: { entity: "lyra", to: "stair_top" } },
        { move: { entity: "fern", to: "stair_top" } },
        { move: { entity: "brannoc", to: "stair_top" } },
      ],
      tags: [],
    },
  ],
  rulings: [],
  internal_checks: [],
};

const quiet = { actions: [] };
const told = (text) => ({ text, texture: [] });

test("the rat plan gets the party out of their cells by exchange 4", async () => {
  const sample = fakeSample({
    companion: [...calls.companion.slice(0, 1), { candidates: [{ message: "Rats. Give me the rats." }, { message: null }, { message: "Bread first." }], reactions: [] }],
    moment: [calls.moment],
    step: [{ ...card2.step_call }, walkOut],
    pricing: [pricing, pricing],
    world: [calls.world, quiet],
    narration: [told("The doors swing open."), told("You climb into the dark above.")],
  });
  const io = { sample };
  const session = newSession({ packet, player: { name: "Kael", class: "rogue" }, seed: 7 });

  await huddle(session, io, prompts, { text: "Fern, can you get the keys as a rat?" });
  assert.equal(session.feeds.huddle.length, 3);
  for (const st of session.draft.stances) st.decision = "resolved";

  await moment(session, io, prompts, { to: "snag", text: "Snag, how about some ale for us?" });
  assert.ok(session.feeds.moment.some((e) => e.kind === "check"));

  session.draft.plan = card2.plan;
  const card = await makeCard(session, io, prompts);
  assert.ok(card.pricing_call.steps.length >= 5);
  assert.ok(shown(session).steps.every((st) => !("as_if" in st)));
  await commit(session, io, prompts, { rolls: [10, 10, 10, 10, 10, 10, 10, 10] });
  assert.ok(session.state.results.every((r) => r.outcome === "done"), JSON.stringify(session.state.results.map((r) => [r.n, r.outcome, r.interrupt?.code])));

  session.draft.plan = "We all walk out and up the stair, Brannoc too.";
  await makeCard(session, io, prompts);
  await commit(session, io, prompts, { rolls: Array(12).fill(10) });

  assert.ok(session.counts.out !== null && session.counts.out <= 4, `out at exchange ${session.counts.out}`);
  assert.equal(session.state.ended?.outcome, "escaped");
  assert.ok(session.ended.log.includes("escaped") || session.ended.outcome === "escaped");
  assert.equal(session.feeds.plan.filter((e) => e.kind === "narration").length, 3);
  // Replay cache follows the call type (D14); tiers follow the setting (D58, D70).
  const step = sample.seen.find((x) => x.call === "step");
  assert.deepEqual([step.opts.cache, step.opts.modelTier], [true, "default"]);
  assert.deepEqual(sample.seen.find((x) => x.call === "companion").opts, { modelTier: "quick", cache: false, signal: undefined });
});

test("time spent talking catches up before the card is priced (D66), and a conversation costs a tick when it ends (D69)", async () => {
  const sample = fakeSample({
    moment: [{ reply: "Brannoc shrugs." }, { reply: "Nothing to see." }],
    world: [quiet],
    narration: [told("Snag shifts on his stool.")],
    step: [{ ...card2.step_call }],
    pricing: [pricing],
  });
  const io = { sample };
  const session = newSession({ packet, player: { name: "", class: "rogue" } });
  await moment(session, io, prompts, { to: "brannoc", text: "How long have you been here?" });
  assert.equal(session.state.pending, 0);
  await moment(session, io, prompts, { to: "dm", text: "What's in my cell?" });
  assert.equal(session.state.pending, 1);
  session.draft.plan = card2.plan;
  const card = await makeCard(session, io, prompts);
  assert.equal(card.tick, 1);
  assert.equal(session.state.pending, 0);
  assert.equal(session.feeds.plan.at(-1).text, "Snag shifts on his stool.");
});

test("the card waits for every stance to be decided, and remaking it counts as an edit", async () => {
  const session = newSession({ packet, player: { name: "", class: "rogue" } });
  session.draft.plan = "Fern turns into a rat.";
  session.draft.stances.push({ companion: "fern", kind: "refuse", text: "Not that.", decision: null });
  await assert.rejects(makeCard(session, { sample: fakeSample({}) }, prompts), /stance/);
  session.draft.stances[0].decision = "override";
  const sample = fakeSample({ step: [{ ...card2.step_call }, { ...card2.step_call }], pricing: [pricing, pricing] });
  await makeCard(session, { sample }, prompts);
  await makeCard(session, { sample }, prompts);
  assert.equal(session.counts.edits, 1);
});

test("a call gets one retry with its errors listed, then fails loudly", async () => {
  const bad = { steps: [], rulings: [] };
  const sample = fakeSample({ step: [bad, { ...card2.step_call }] });
  const out = await ask({ sample }, { call: "step", input: "# Step call", schema: stepSchema });
  assert.equal(out.steps.length, 5);
  const retry = sample.seen[1];
  assert.equal(retry.call, "step");
  const twice = fakeSample({ step: [bad, bad] });
  const records = [];
  await assert.rejects(ask({ sample: twice, onCall: (r) => records.push(r) }, { call: "step", input: "# Step call", schema: stepSchema }), CallFailed);
  assert.equal(records.length, 1);
  assert.ok(records[0].firstErrors.length && records[0].errors.length);
  assert.deepEqual(["faster", "balanced", "smarter"].map((sp) => tierFor("pricing", sp)), ["quick", "default", "complex"]);
  assert.deepEqual(["faster", "smarter"].map((sp) => tierFor("ruling", sp)), ["quick", "default"]);
});

test("a save restores to the same state, without the packet or the sheets in it", () => {
  const session = newSession({ packet, player: { name: "Kael", class: "rogue" }, seed: 3 });
  post(session, "huddle", { who: "player", text: "Hello." });
  const json = serialize(session);
  assert.ok(!json.includes(packet.opening.slice(0, 40)) || json.indexOf(packet.opening.slice(0, 40)) === json.lastIndexOf(packet.opening.slice(0, 40)));
  assert.ok(!json.includes('"geometry"') && !json.includes('"rects"'));
  const back = restore(json, packet);
  assert.deepEqual(back.state, session.state);
  assert.deepEqual(back.feeds, session.feeds);
});

test("the map draws known zones only, and the clock shows known routines and events", () => {
  const session = newSession({ packet, player: { name: "", class: "rogue" } });
  const m = mapView(session.state);
  const zones = m.levels.flatMap((l) => l.zones.map((z) => z.id));
  assert.ok(!zones.includes("cistern"));
  assert.ok(!m.levels.flatMap((l) => l.connections.map((c) => c.id)).includes("crawl"));
  assert.deepEqual(m.levels.map((l) => l.level), [1, 0, -1]);
  const tokens = m.levels.flatMap((l) => l.tokens.map((t) => t.id));
  assert.ok(["player", "fern", "lyra", "snag", "brannoc"].every((id) => tokens.includes(id)));
  const c = clockView(session.state);
  assert.equal(c.beats[0].beat, "Drink");
  assert.deepEqual(c.coming.map((e) => e.at), [21]);
});
