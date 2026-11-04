// The game loop and the call layer, played with recorded AI outputs (no AI calls).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { newSession, serialize, restore, post, recordCall, act, CALL_RECORDS, SAVE_ROOM } from "../src/game/session.js";
import { makeCard, commit, talk, shown, question, rings, talkOver, cardStale } from "../src/game/turns.js";
import { addItem, editItem, moveItem, removeItem, clearDraft, planText } from "../src/game/draft.js";
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
  post(session, "table", { ch: "rings", who: "player", to: "party", text: "Hello." });
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

const RULED = { "# Adjudicate call": "adjudicate", "# Resolve call": "resolve", "# Scene call": "scene", "# Question call": "question", "# Party call": "party" };
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
  addItem(session.draft, RAT_PLAN);
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
  addItem(session.draft, "The rat plan.");
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
  const sample = ruledSample({ scene: [out], party: [quiet] });
  const session = newSession({ packet, player: { name: "Jim", class: "rogue" }, companions: PARTY });
  await talk(session, { sample }, prompts, { to: "snag", text: "Oi, coward!", rolls: [5] });
  assert.equal(session.state.at.snag, "corridor");
  assert.equal(session.state.tick, 1);
  assert.ok(session.state.facts.some((f) => f.id === "snag_mocked"));
  assert.deepEqual(session.feeds.table.filter((e) => e.ch === "scene").map((e) => e.kind ?? "player"), ["player", "reply", "check", "time"]);
  const back = restore(serialize(session), packet);
  assert.deepEqual(back.state, session.state);
});

// ---- The table (D127) ----

// The companions let it go: three exchanges with no lines.
const quiet = { exchanges: [{ lines: [] }, { lines: [] }, { lines: [] }], reactions: [] };
const said = (lines) => ({ exchanges: [0, 1, 2].map(() => ({ lines })), reactions: [] });
const calls = (sample) => sample.seen.map((x) => x.call);

test("a question to the DM is one cheap call, and what it settles is fact when the card is made", async () => {
  const answer = { reply: "The gutter runs under every cell; a rat fits easily.", rulings: [{ id: "gutter_fits_rat", text: "A rat fits along the gutter under every cell.", about: ["gutter"] }] };
  const sample = ruledSample({ question: [answer], adjudicate: [ratCard] });
  const session = newSession({ packet, player: { name: "Kael", class: "rogue" }, companions: PARTY });
  const tick = session.state.tick;
  await question(session, { sample }, prompts, { text: "Could a rat get along the gutter?" });
  assert.deepEqual(calls(sample), ["question"]);
  assert.equal(sample.seen[0].opts.modelTier, "quick");
  assert.equal(session.state.tick, tick);
  assert.ok(session.state.facts.some((f) => f.id === "gutter_fits_rat" && f.known));
  addItem(session.draft, RAT_PLAN);
  await makeCard(session, { sample }, prompts);
  assert.ok(sample.seen[1].input.includes("gutter_fits_rat: A rat fits along the gutter under every cell."));
});

test("doing something is the scene call, then one party call; a line's stance goes on the draft", async () => {
  const out = { reply: "You rattle the door. It holds.", ticks: 0 };
  const stance = { kind: "insist", text: "Not so loud", traced_to: { field: "rules", item: "x" } };
  const sample = ruledSample({ scene: [out], party: [said([{ from: PARTY[0], message: "Quieter!", stance }, { from: PARTY[1], message: "She's right." }])] });
  const session = newSession({ packet, player: { name: "Kael", class: "rogue" }, companions: PARTY });
  await talk(session, { sample }, prompts, { to: "do", text: "I rattle the cell door." });
  assert.deepEqual(calls(sample), ["scene", "party"]);
  assert.ok(sample.seen[1].input.includes("You rattle the door. It holds."));
  assert.deepEqual(session.feeds.table.filter((e) => e.ch === "rings").map((e) => e.who), PARTY);
  assert.deepEqual(session.draft.stances.map((st) => [st.companion, st.decision]), [[PARTY[0], null]]);
});

test("party talk is the party call alone; a private word is her call alone, and the other never hears it", async () => {
  const sample = ruledSample({ party: [quiet, quiet], companion: [{ candidates: [0, 1, 2].map(() => ({ message: "Just us." })), reactions: [] }] });
  const session = newSession({ packet, player: { name: "Kael", class: "rogue" }, companions: PARTY });
  await rings(session, { sample }, prompts, { to: PARTY[0], text: "Do you trust her?" });
  await rings(session, { sample }, prompts, { to: "party", text: "Ideas?" });
  assert.deepEqual(calls(sample), ["companion", "party"]);
  assert.ok(!sample.seen[1].input.includes("Do you trust her?") && !sample.seen[1].input.includes("Just us."));
  assert.deepEqual(session.feeds.table.filter((e) => e.ch === "private").map((e) => [e.who, e.with]), [["player", PARTY[0]], [PARTY[0], PARTY[0]]]);
});

test("the draft is a list: add, edit, reorder, remove, and it stays as written after the plan runs", async () => {
  const session = newSession({ packet, player: { name: "Kael", class: "rogue" }, seed: 7, companions: PARTY });
  const d = session.draft;
  addItem(d, "Fern turns into a rat");
  addItem(d, "1. She goes down the gutter\n2. She brings the keys");
  assert.deepEqual(d.items.map((x) => x.text), ["Fern turns into a rat", "She goes down the gutter", "She brings the keys"]);
  moveItem(d, d.items[2].id, -1);
  editItem(d, d.items[0].id, "Fern turns into a rat at the cask");
  removeItem(d, d.items[1].id);
  assert.equal(planText(d), "1. Fern turns into a rat at the cask\n2. She goes down the gutter");
  clearDraft(d);
  addItem(d, RAT_PLAN);
  const sample = ruledSample({ adjudicate: [ratCard], resolve: [ratPlayed], party: [quiet] });
  await talkOver(session, { sample }, prompts);
  assert.ok(sample.seen[0].input.includes(RAT_PLAN));
  await makeCard(session, { sample }, prompts);
  editItem(d, d.items[0].id, `${RAT_PLAN} Quietly.`);
  assert.ok(cardStale(session));
  await assert.rejects(commit(session, { sample }, prompts, { rolls: [10, 10] }), /changed/);
  editItem(d, d.items[0].id, RAT_PLAN);
  await commit(session, { sample }, prompts, { rolls: [10, 10] });
  assert.deepEqual(d.items.map((x) => x.text), [RAT_PLAN]);
  const ran = session.feeds.plans.at(-1);
  assert.deepEqual(ran.outcome.steps.map((st) => st.roll?.success ?? null), [null, true, true, null]);
  assert.ok(session.feeds.table.at(-1).ch === "narration");
});

test("a save from before the table merges its feeds in order, and its plan text becomes actions", () => {
  const session = newSession({ packet, player: { name: "Kael", class: "rogue" }, companions: PARTY, seed: 3 });
  const old = JSON.parse(serialize(session));
  old.v = 2;
  old.feeds = {
    plan: [{ at: 1, who: "dm", kind: "narration", text: "The cells." }, { at: 5, who: "player", kind: "card", text: "Go.", card: {} }],
    moment: [{ at: 3, who: "player", to: "dm", text: "How far?" }, { at: 4, who: "dm", to: "dm", kind: "reply", text: "Ten feet." }],
    huddle: [{ at: 2, who: "player", text: "Ideas?" }],
    private: { [PARTY[0]]: [{ at: 6, who: "player", text: "Psst." }], [PARTY[1]]: [] },
  };
  old.draft = { plan: "1. First\n2. Second", stances: [] };
  const back = restore(old, packet);
  assert.deepEqual(back.feeds.table.map((e) => [e.at, e.ch]), [[1, "narration"], [2, "rings"], [3, "scene"], [4, "scene"], [6, "private"]]);
  assert.deepEqual(back.feeds.plans.map((e) => e.at), [5]);
  assert.deepEqual(back.draft.items.map((x) => x.text), ["First", "Second"]);
});

test("a save keeps the replay log and the last call outputs, never their inputs (D135)", () => {
  const session = newSession({ packet, player: { name: "Kael", class: "rogue" }, companions: PARTY, seed: 3 });
  act(session, { type: "answer", out: { reply: "Yes.", rulings: [], learned: [] } });
  for (let i = 0; i < CALL_RECORDS + 5; i++) recordCall(session, { call: "scene", tier: "default", at: i, input: "SECRET INPUT", size: 12, out: { n: i }, first: { n: i }, errors: [], ms: 5 });
  const json = serialize(session);
  assert.ok(!json.includes("SECRET INPUT"));
  const back = restore(json, packet);
  assert.equal(back.calls.length, CALL_RECORDS);
  assert.deepEqual(back.calls.at(-1).out, { n: CALL_RECORDS + 4 });
  assert.equal(back.calls.at(-1).first, undefined);
  assert.deepEqual(back.actions, session.actions);
});

test("a save too big for its slot drops the oldest call outputs first (D135)", () => {
  const session = newSession({ packet, player: { name: "Kael", class: "rogue" }, companions: PARTY, seed: 3 });
  for (let i = 0; i < CALL_RECORDS; i++) recordCall(session, { call: "scene", at: i, out: { text: "x".repeat(8000), n: i } });
  const json = serialize(session);
  assert.ok(json.length <= SAVE_ROOM);
  const kept = JSON.parse(json).calls;
  assert.ok(kept.length > 0 && kept.length < CALL_RECORDS);
  assert.equal(kept.at(-1).out.n, CALL_RECORDS - 1);
});
