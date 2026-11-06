// Every ruled call stays under its input budget with the ledger full to its limits (D76): the most facts it holds,
// the longest facts, the texture and log calls get. If a change makes a call grow past its budget, this fails.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { newSession, envFor } from "../src/game/session.js";
import { ledgerText, aheadText, adjudicateInput, resolveInput, sceneInput, companionInput, partyInput, questionInput, verdictInput } from "../src/context.js";
import { narrated } from "../src/game/turns.js";
import { LEDGER } from "../src/engine/index.js";
import { CONDITIONS, THREATS } from "../content/rules.js";
import { BUDGET } from "../src/ask.js";
import { setting } from "../content/setting.js";
import { adjudicateSchema, resolveSchema, sceneSchema, companionSchema, partySchema, questionSchema, verdictSchema } from "../schemas/index.js";

const file = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const packet = JSON.parse(file("content/encounters/cells.json"));
const prompts = Object.fromEntries(readdirSync(new URL("../prompts/", import.meta.url)).map((f) => [f.replace(".md", ""), file(`prompts/${f}`)]));
const line = (n) => `${"Snag is sick from the fouled ale and keeps glancing at the cask, swallowing hard, one hand on his belly. ".repeat(3).slice(0, n)}`;

// A late game: the ledger at its limits, a long log and plenty of texture, mid-fight.
function lateGame() {
  const session = newSession({ packet, player: { name: "Sneako", class: "rogue" }, companions: ["fern", "nadia"] });
  const s = session.state;
  s.facts = Array.from({ length: LEDGER.facts }, (_, i) => ({ id: `fact_${i}`, text: line(160), about: ["snag", "cask"], known: true, since: i }));
  s.canon = Array.from({ length: 40 }, () => ({ kind: "texture", text: line(140) }));
  s.log = Array.from({ length: 80 }, (_, i) => ({ tick: i, step: 1, did: line(160) }));
  // A fight at its limits too: the party carrying every condition it can, and a threat from everyone (D130).
  s.conditions = Array.from({ length: CONDITIONS.max }, (_, i) => ({ id: `hurt_${i}`, who: s.party[i % 3].id, text: line(CONDITIONS.length) }));
  s.threats = s.packet.people.slice(0, THREATS.max).map((p) => ({ who: p.id, does: line(THREATS.length) }));
  // Gold, and relics at their limit (D147).
  s.gold = 999;
  s.relics = Array.from({ length: setting.relics.max }, (_, i) => ({ id: `relic_${i}`, name: `Relic ${i}`, text: line(160) }));
  for (let i = 0; i < 6; i++) session.feeds.table.push({ at: 100 + i, ch: "narration", who: "dm", text: line(300).repeat(4) });
  return session;
}

test("every DM and companion call stays under its budget at the ledger's limits", () => {
  const session = lateGame();
  const s = session.state;
  const env = envFor(session, prompts);
  const plan = line(300);
  const sizes = {
    adjudicate: adjudicateInput(env, { plan, now: ledgerText(s), timeline: aheadText(s, { party: true }), recent: [] }, adjudicateSchema),
    resolve: resolveInput(env, { plan, card: { steps: [{ n: 1, summary: line(120), who: ["player"], at: 0 }], ends_at: 2, rulings: [] }, dice: [], now: ledgerText(s), timeline: aheadText(s, { ticks: 8 }) }, resolveSchema),
    scene: sceneInput(env, { to: "dm", now: ledgerText(s), timeline: aheadText(s, { ticks: 8 }), conversation: [{ from: "player", text: plan }] }, sceneSchema),
    companion: companionInput(env, { channel: "huddle", now: ledgerText(s, { party: true, history: false }), recent: narrated(session, 2), draft: { plan, stances: [] } }, s.party[1], [s.party[2]], [{ from: "player", text: plan }], companionSchema),
    question: questionInput(env, { now: ledgerText(s, { log: false }), recent: Array.from({ length: 6 }, () => ({ from: "dm", text: line(300) })), question: plan }, questionSchema),
    verdict: verdictInput(env, { now: ledgerText(s), handoff: { outcome: "escaped", ending: "objective", optional: { met: [], missed: ["gear"] }, way_on: null, gear: [], conditions: s.conditions } }, verdictSchema),
    party: partyInput(env, { channel: "huddle", now: ledgerText(s, { party: true, history: false }), recent: narrated(session, 2), draft: { plan, stances: [] } }, s.party.slice(1), [{ from: "player", text: plan }], partySchema),
  };
  const over = [];
  for (const [call, input] of Object.entries(sizes)) {
    const size = new TextEncoder().encode(input).length;
    console.log(`${call}: ${size} bytes (budget ${BUDGET[call]})`);
    if (size > BUDGET[call]) over.push(`${call}: ${size} bytes, over its budget of ${BUDGET[call]}`);
  }
  assert.deepEqual(over, []);
});
