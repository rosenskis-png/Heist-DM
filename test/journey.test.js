// The campaign runner (D171): a whole act on scripted call outputs, from the Cells through generated rooms, a campfire,
// the climax and the sanctuary, into Act 2; and a save taken between rooms that resumes where it stopped.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { newSession, serialize, restore } from "../src/game/session.js";
import { campaignOf, leaveBy, judgeRoom, nextRoom, enterRoom, endTheAct, startAdventure } from "../src/game/journey.js";
import { worldOf } from "../src/campaign/world.js";

const file = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const prompts = Object.fromEntries(readdirSync(new URL("../prompts/", import.meta.url)).map((f) => [f.replace(".md", ""), file(`prompts/${f}`)]));
const encoded = JSON.parse(file("fixtures/generator/encoded.json"));
const cells = JSON.parse(file("content/encounters/cells.json"));
const env = { prompts, examples: { encoded } };
const world = worldOf();

const plan = {
  goal: "Cross the Warrens.", question: "Can they cross before the Court learns they're loose?", aim: "Learn the way down.",
  setting: "The old dwarven working levels.", state: "The forges run double shifts.", holders: ["undead"],
  threads: [], settings: { quiet: ["a flooded chapel", "a bone library"], oddity: ["a well that answers", "a coat ballroom"], campfire: ["a warm bread oven", "a crypt of snoring knights"] },
  news: [], mysteries: ["court_of_debts"], returning: [],
  peak: { who: "Lord Chamberlain Vesk", why: "his court holds the stair", wants: "a perfect banquet", turns: "courtesy, then knights", where: "the banquet hall" },
  hints: ["black invitations nailed to doors", "a herald calling names"],
};
const sketch = { premise: "A laundry at its busiest.", shape: "A long floor.", things: ["vats"], cut: "nothing", pressure: "none", outcomes: ["through"], notes: "x", opening: "Steam." };

// Encode exactly what the seed fixed: the mode, the act, one exit per kind drawn, and only the seed's prize.
function encode(input) {
  const block = input.split("Fixed by the seed")[1];
  const fixed = JSON.parse(block.slice(block.indexOf("{"), block.indexOf("}") + 1));
  const out = structuredClone(encoded);
  out.id = `room_${Math.random().toString(36).slice(2, 8)}`;
  Object.assign(out, { mode: fixed.mode, act: fixed.act });
  for (const t of out.map.things) delete t.reward;
  const prize = { gold: { gold: 5 }, "a relic": { relic: { name: "A brass token", text: "Warm to the touch." } }, "a journal page": { clue: fixed.the_clue_id } }[fixed.the_only_prize];
  if (prize) out.map.things[0].reward = prize;
  if (fixed.kind === "merchant") out.map.things[0].price = 3;
  const exits = fixed.exits.map((k, i) => ({ id: `way_${i}`, zone: ["back_stair", "servants_passage"][i % 2], leads_to: k, stub: `The way to a ${k}.` }));
  out.intent = fixed.mode === "room" ? { purpose: "A breath.", exits } : { ...out.intent, alternates: [], optional: [], exits };
  return out;
}

const calls = [];
const io = {
  sample: {
    json: async (turns) => {
      const input = typeof turns === "string" ? turns : turns[0].content;
      const call = ["Act call", "Sketch call", "Verdict call"].find((c) => input.includes(`# ${c}`))?.split(" ")[0].toLowerCase() ?? "encode";
      calls.push(call);
      if (call === "act") return structuredClone(plan);
      if (call === "sketch") return sketch;
      if (call === "verdict") return { rating: 7, why: "Clean.", reactions: [], people: [] };
      return encode(input);
    },
  },
};

test("the runner plays a whole act: the Cells, generated rooms, a campfire, the climax, the sanctuary, then Act 2", async () => {
  const session = newSession({ packet: cells, player: { name: "P", class: "rogue" }, companions: ["fern", "nadia"], seed: 9, world });
  campaignOf(session);
  const kinds = [];
  let saved = null;
  for (let i = 0; i < 30 && session.camp.act === 1; i++) {
    const exits = session.state.packet.intent.exits ?? [];
    leaveBy(session, exits[0]?.id ?? null);
    const b = await judgeRoom(session, io, prompts);
    assert.equal(b.verdict.rating, 7);
    if (b.actOver) {
      assert.ok(!b.last);
      endTheAct(session, session.camp.relics.slice(0, session.camp.keep ?? 0).map((r) => r.id));
    }
    await nextRoom(session, io, env);
    if (i === 3) saved = serialize(session);
    enterRoom(session);
    kinds.push(session.camp.way.here);
    assert.equal(session.state.tick, 0);
    assert.equal(session.feeds.table.length, 1, "the table starts fresh with the opening");
  }
  assert.equal(session.camp.act, 2, `reached Act 2 through ${kinds.join(", ")}`);
  for (const k of ["campfire", "climax", "sanctuary"]) assert.ok(kinds.includes(k), `passed a ${k}`);
  assert.equal(calls.filter((c) => c === "act").length, 2, "one act call per act");
  assert.equal(session.past.length, kinds.length);
  // A save between rooms resumes there, with the next room waiting.
  const back = restore(saved, cells);
  assert.ok(back.between.packet && back.camp);
  enterRoom(back);
  assert.equal(back.state.packet.id, back.packet.id);
  assert.equal(restore(serialize(back), cells).state.packet.id, back.packet.id, "a generated room travels in the save");
});

test("a generated world starts with its act call and a generated first room", async () => {
  calls.length = 0;
  const session = await startAdventure(io, env, { player: { name: "P", class: "rogue" }, companions: ["fern", "nadia"], world, seed: 4 });
  assert.deepEqual(calls, ["act", "sketch", "encode"]);
  assert.equal(session.state.packet.mode, "encounter");
  assert.equal(session.camp.plan.peak.who, "Lord Chamberlain Vesk");
  assert.equal(session.feeds.table[0].text, session.packet.opening);
});
