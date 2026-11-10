// The room sheet (D174): one account of what the party knows of the room. The page shows it to the player and the
// companions' calls are sent it as text, so no voice at the table knows more of the room than the player can read.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { newSession, envFor } from "../src/game/session.js";
import { roomSheet, sheetText, partyInput, companionInput, briefProfile, standingOf } from "../src/context.js";
import { partySchema, companionSchema } from "../schemas/index.js";

const file = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const packet = JSON.parse(file("content/encounters/cells.json"));
const prompts = Object.fromEntries(readdirSync(new URL("../prompts/", import.meta.url)).map((f) => [f.replace(".md", ""), file(`prompts/${f}`)]));
const start = () => newSession({ packet, player: { name: "Kael", class: "rogue" }, companions: ["fern", "nadia"] });

test("the sheet holds the opening, what's in sight and what anyone can tell, and nothing hidden until it's found", () => {
  const s = start().state;
  const sheet = roomSheet(s);
  const text = sheetText(sheet);
  assert.equal(sheet.opening, packet.opening);
  for (const f of packet.map.facts.filter((x) => !x.hidden)) assert.ok(sheet.facts.includes(f.text), f.id);
  const hidden = ["zones", "connections", "things", "facts"].flatMap((k) => packet.map[k]).filter((x) => x.hidden);
  assert.ok(hidden.length, "the Cells hides something");
  for (const x of hidden) {
    assert.ok(![...sheet.places, ...sheet.ways, ...sheet.things].some((y) => y.id === x.id), x.id);
    if (x.text) assert.ok(!text.includes(x.text), x.id);
  }
  // Found, it joins the sheet.
  s.known.revealed.push(hidden[0].id);
  const after = roomSheet(s);
  assert.ok([...after.places, ...after.ways, ...after.things].some((y) => y.id === hidden[0].id) || after.facts.includes(hidden[0].text));
  // Everyone the sheet places is somewhere the party can see or hear.
  for (const p of sheet.people) assert.match(p.where, /^(in|heard from) /);
});

test("the companions' calls are sent the sheet the player reads, once, and none of the DM's notes", () => {
  const session = start();
  const s = session.state;
  const env = envFor(session, prompts);
  const text = sheetText(roomSheet(s));
  const c = { channel: "huddle", recent: [packet.opening, "Later, the jailer coughs."], draft: null };
  const inputs = [partyInput(env, c, s.party.slice(1), [], partySchema), companionInput(env, c, s.party[1], [s.party[2]], [], companionSchema)];
  const long = (x) => typeof x === "string" && x.length > 30;
  for (const input of inputs) {
    assert.ok(input.includes(text), "the sheet is in the call, word for word");
    assert.equal(input.split(packet.opening.slice(0, 40)).length - 1, 1, "the opening is sent once");
    assert.ok(input.includes("Later, the jailer coughs."));
    for (const p of packet.people) for (const k of ["wants", "fears", "knows", "will_never", "under_pressure"]) if (long(p[k])) assert.ok(!input.includes(p[k]), `${p.id}.${k}`);
    for (const n of packet.notes ?? []) if (long(n)) assert.ok(!input.includes(n), "a DM note");
    assert.ok(!input.includes(packet.intent.purpose), "what the room is for");
  }
});

test("in a room a companion's brief leaves her pursuit at the campfire (D175)", () => {
  const session = start();
  const env = envFor(session, prompts);
  for (const c of session.state.party.slice(1)) {
    const brief = briefProfile(c, standingOf(env, c.id), session.state);
    assert.ok(!("pursuit" in brief) && "voice" in brief && "planning" in brief);
  }
});
