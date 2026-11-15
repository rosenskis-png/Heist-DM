// Taking stock when a room ends (D192): the pack to keep, one follower or none, and where a follower is going.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { newCampaign, roomEnded } from "../src/campaign/run.js";
import { openStock, applyStock, settleStock, packOf } from "../src/campaign/stock.js";
import { seedFor } from "../src/campaign/seed.js";
import { worldOf } from "../src/campaign/world.js";
import { setting } from "../content/setting.js";
import { stockProblems } from "../src/calls/stock.js";
import { newSession, envFor } from "../src/game/session.js";
import { leaveBy, takeStock, settle, judgeRoom, moveOn } from "../src/game/journey.js";
import { questionInput, adjudicateInput, ledgerText } from "../src/context.js";
import { questionSchema, adjudicateSchema, stockSchema } from "../schemas/index.js";
import { validate } from "../src/validate.js";

const file = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const prompts = Object.fromEntries(readdirSync(new URL("../prompts/", import.meta.url)).map((f) => [f.replace(".md", ""), file(`prompts/${f}`)]));
const cells = JSON.parse(file("content/encounters/cells.json"));
const world = worldOf();
const frank = { name: "Frank", pronouns: "he/him", looks: "a tall man in a wet coat", what: "limping", goal: "the White Lodge, a hunting lodge in the pines", motive: "he means to burn it with his brother inside" };
const thing = (i) => ({ id: `t${i}`, name: `Thing ${i}`, properties: "x", holder: "player", notes: [] });
const answer = (over = {}) => ({ reply: "Here's what you've got.", found: [], followers: [frank], notes: [], ...over });

test("the pack keeps no more than its limit, and the DM can grant what the game missed", () => {
  const camp = newCampaign({ seed: 1 });
  let stock = openStock(camp, { items: Array.from({ length: setting.items.max }, (_, i) => thing(i)) });
  stock = applyStock(stock, answer({ found: [{ name: "The wine bottle", properties: "half full, good red", holder: "player", why: "you took it off the table" }] }), camp, { said: "I took the wine bottle" });
  assert.equal(packOf(stock).length, setting.items.max + 1);
  assert.deepEqual(stock.talk.map((t) => t.who), ["player", "dm"]);
  const all = packOf(stock).map((i) => i.id);
  assert.throws(() => settleStock(stock, { keep: all }, camp), /can carry/);
  const keep = [...all.slice(1, setting.items.max), stock.found[0].id];
  const { items } = settleStock(stock, { keep }, camp);
  assert.ok(items.some((i) => i.name === "The wine bottle" && i.holder === "player"));
  assert.ok(!items.some((i) => i.id === "t0"), "what the player leaves stays behind");
});

test("one follower goes on, or none, and keeps how long they've travelled", () => {
  const camp = { ...newCampaign({ seed: 1 }), roomNo: 4, carried: [{ kind: "follower", ...frank, since: 2 }] };
  const stock = applyStock(openStock(camp, { items: [] }), answer({ followers: [{ ...frank, what: "rested" }, { ...frank, name: "Ama", goal: "the mill" }] }), camp);
  assert.throws(() => settleStock(stock, { follower: "Bob" }, camp), /isn't someone/);
  assert.deepEqual(settleStock(stock, { follower: null }, camp).carried, []);
  assert.equal(settleStock(stock, { follower: "Frank" }, camp).carried[0].since, 2);
  const ama = settleStock(stock, { follower: "Ama" }, camp).carried;
  assert.equal(ama.length, 1);
  assert.equal(ama[0].since, 4);
});

test("a follower who reached what they were after parts ways, and isn't offered again", () => {
  const carried = [{ kind: "follower", ...frank, since: 1 }];
  const camp = { ...newCampaign({ seed: 1 }), roomNo: 5, carried, destination: { name: "Frank", room: 5 } };
  const stock = applyStock(openStock(camp, { items: [] }), answer(), camp);
  assert.equal(stock.arrived, "Frank");
  assert.deepEqual(stock.followers, []);
  // Even without a stock-taking, the room's end lets them go.
  const after = roomEnded(camp, { handoff: { conditions: [], spent: {}, gold: 0, relics: [] }, verdict: { rating: 6, why: "x", reactions: [] }, carried, exits: [{ id: "e", zone: "z", leads_to: "encounter" }] }).camp;
  assert.deepEqual(after.carried, []);
  assert.equal(after.destination, null);
});

test("a follower's destination: never the next room, sometimes after, always by the fifth, and the room's only extra", () => {
  const base = (roomNo, since) => ({ ...newCampaign({ seed: 7 }), roomNo, carried: [{ kind: "follower", ...frank, since }], memory: [{ name: "Old Pell", fate: "x", feels: "x" }] });
  for (let s = 1; s < 40; s++) {
    const camp = { ...base(3, 3), seedRng: s };
    assert.equal(seedFor(camp, world, "encounter", []).seed.destination, undefined, "not the room right after they join");
    assert.equal(seedFor({ ...base(3, 0), seedRng: s }, world, "campfire", []).seed.destination, undefined, "never a campfire");
    const { seed, camp: next } = seedFor({ ...base(8, 2), seedRng: s }, world, "encounter", []);
    assert.equal(seed.destination?.goal, frank.goal, "always from the fifth room");
    assert.ok(!seed.callback && !seed.hint && !seed.news, "the destination is the room's only extra");
    assert.deepEqual(next.destination, { name: "Frank", room: 9 });
  }
  const drawn = Array.from({ length: 60 }, (_, s) => seedFor({ ...base(4, 2), seedRng: s + 1 }, world, "oddity", []).seed.destination).filter(Boolean).length;
  assert.ok(drawn > 5 && drawn < 40, `about one in three on the second room: ${drawn}/60`);
});

test("why a follower really wants it reaches the DM's calls, never the answer to a question", () => {
  const session = newSession({ packet: cells, player: { name: "P", class: "rogue" }, companions: ["fern", "nadia"], world });
  session.state.carried = [{ kind: "follower", ...frank, since: 0 }];
  const env = envFor(session, prompts);
  const now = ledgerText(session.state);
  assert.ok(adjudicateInput(env, { plan: "x", now, timeline: "x", recent: [] }, adjudicateSchema).includes(frank.motive));
  const q = questionInput(env, { now, recent: [], question: "Who's Frank?" }, questionSchema);
  assert.ok(q.includes(frank.goal) && !q.includes(frank.motive));
});

test("the stock call's holders are the party's, and nobody comes along twice", () => {
  assert.deepEqual(validate(stockSchema, answer()), []);
  const bad = stockProblems(answer({ found: [{ name: "x", properties: "x", holder: "guard", why: "x" }], followers: [frank, frank] }), ["player", "fern"]);
  assert.equal(bad.length, 2);
});

test("taking stock reaches the campaign: what was kept, and who came along", async () => {
  const session = newSession({ packet: cells, player: { name: "P", class: "rogue" }, companions: ["fern", "nadia"], seed: 3, world });
  leaveBy(session, null);
  session.ended.items = [thing(1), thing(2)];
  const inputs = [];
  const io = {
    sample: {
      json: async (turns) => {
        const input = typeof turns === "string" ? turns : turns[0].content;
        inputs.push(input);
        if (input.includes("# Stock call")) return answer({ notes: [{ kind: "thread", what: "the warden owes them" }] });
        return { rating: 6, why: "Fine.", reactions: [], people: [] };
      },
    },
  };
  await judgeRoom(session, io, prompts);
  await takeStock(session, io, prompts);
  await takeStock(session, io, prompts, "Frank saw the warden's face");
  assert.equal(session.stock.talk.length, 3);
  assert.ok(inputs[2].includes("Frank saw the warden's face") && inputs[2].includes("The lists as they stand"));
  settle(session, { keep: ["t2"], follower: "Frank" });
  moveOn(session);
  assert.deepEqual(session.camp.items.map((i) => i.id), ["t2"]);
  assert.deepEqual(session.camp.carried.map((x) => x.name ?? x.what), ["Frank", "the warden owes them"]);
});
