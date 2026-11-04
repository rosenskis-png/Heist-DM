// A question to the DM (D127, D133): one cheap call on the read-only slice, and what it settles becomes fact.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { load, apply, checkAnswer } from "../src/engine/index.js";
import { questionInput, adjudicateInput, ledgerText } from "../src/context.js";
import { questionSchema, adjudicateSchema } from "../schemas/index.js";
import { validate } from "../src/validate.js";
import { tierFor } from "../src/ask.js";
import { classes } from "../content/classes.js";
import { companions } from "../content/companions/index.js";

const file = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const packet = JSON.parse(file("content/encounters/cells.json"));
const prompts = Object.fromEntries(readdirSync(new URL("../prompts/", import.meta.url)).map((f) => [f.replace(".md", ""), file(`prompts/${f}`)]));
const [a, b] = Object.values(companions).filter((c) => !c.tie?.required);
const party = [{ id: "player", name: "Rogue", role: "The player", ...classes.rogue }, a, b];
const start = () => load({ packet, party, seed: 3 });
const envOf = (s) => ({ packet: s.packet, party: s.party, state: s, act: 1, companions: s.party.slice(1), prompts });
const answer = { reply: "The grate is a hand's width across; a rat would slip through easily.", rulings: [{ id: "grate_width", text: "The gutter grate's bars are a hand's width apart.", about: ["gutter"] }] };

test("an answer's rulings become facts the party knows, and the card is ruled with them", () => {
  let s = start();
  assert.deepEqual(validate(questionSchema, answer), []);
  assert.deepEqual(checkAnswer(s, answer), []);
  const tick = s.tick;
  s = apply(s, { type: "answer", out: answer });
  assert.equal(s.tick, tick);
  assert.deepEqual(s.facts.map((f) => [f.id, f.known]), [["grate_width", true]]);
  const card = adjudicateInput(envOf(s), { plan: "p", now: ledgerText(s), timeline: "" }, adjudicateSchema);
  assert.ok(card.includes("grate_width: The gutter grate's bars are a hand's width apart."));
});

test("an answer can't name what the party hasn't found, or a thing that isn't there", () => {
  const s = start();
  assert.match(checkAnswer(s, { reply: "There's a cistern below.", rulings: [] }).join("\n"), /cistern/);
  assert.ok(checkAnswer(s, { reply: "x", rulings: [{ id: "f", text: "y", about: ["tower"] }] }).length);
  assert.ok(validate(questionSchema, { reply: "x", rulings: [], changes: { moves: [{ who: "snag", to: "corridor" }] } }).length);
});

test("the slice has no sheets, reaction notes, timeline or companion voices, and runs on the cheapest tier", () => {
  const s = start();
  const input = questionInput(envOf(s), { now: ledgerText(s, { log: false }), question: "How wide is the grate?" }, questionSchema);
  const snag = packet.people.find((p) => p.id === "snag");
  for (const t of [snag.wants, snag.fears, packet.notes[0], a.voice, "What is really happening"]) assert.ok(!input.includes(t), t);
  assert.ok(input.includes("Snag") && input.includes("How wide is the grate?"));
  assert.equal(tierFor("question"), "quick");
});
