// Phase 5: the roster is open (D8), and the relationship model behaves like Gravenhold's
// (docs/spec/companions.md §3–6). Nothing here may depend on which companions are in the roster today, except
// the tests of a specific companion's declared data, which are skipped if she's removed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { companions } from "../content/companions/index.js";
import { pairs } from "../content/pairs.js";
import { classes } from "../content/classes.js";
import { companionFileSchema, companionSchema, campfireSchema } from "../schemas/index.js";
import { validate } from "../src/validate.js";
import { partyProblems, pairings, resolveParty } from "../src/campaign/roster.js";
import * as Rel from "../src/campaign/relationship.js";
import * as A from "../src/context.js";

const file = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const all = Object.values(companions);
const packet = JSON.parse(file("fixtures/cells/packet.json"));
const PROMPTS = ["style", "companion", "campfire"];
const env = (extra = {}) => ({
  packet,
  act: 1,
  party: [{ id: "player", name: classes.rogue.name, ...classes.rogue }],
  prompts: Object.fromEntries(PROMPTS.map((n) => [n, file(`prompts/${n}.md`)])),
  ...extra,
});
// The first companion in the roster with a given declaration, for the tests of that mechanism.
const having = (key) => all.find((c) => c[key]);
// A companion who isn't in the roster: a copy of the first one under a new id and name.
const newcomer = (over = {}) => {
  const base = structuredClone(all[0]);
  delete base.tie;
  return { ...base, id: "wren", name: "Wren", ...over };
};
const huddle = (self, other, e = env()) => A.companionInput(e, { draft: null }, self, [other], [], companionSchema);
const camp = (self, other, withIds, e = env()) => A.campfireInput(e, { with: withIds, scene: [] }, self, [other], campfireSchema);
const rel = (over = {}) => ({ ...Rel.newRel(), ...over });
const romance = (members, rels = {}, over = {}) => {
  const r = Rel.newRomance(members, pairs);
  for (const [id, x] of Object.entries(rels)) r.rel[id] = rel(x);
  return { ...r, ...over };
};
// Two companions with no declared special cases.
const plain = () => {
  const p = all.filter((c) => !c.tie && !c.secondVoice && !c.extraBeats && !c.notes);
  return p.length >= 2 ? p.slice(0, 2) : [newcomer(), newcomer({ id: "ash", name: "Ash" })];
};

// ---------- the roster is open ----------

test("every companion file matches the companion schema, under its own id", () => {
  for (const [key, c] of Object.entries(companions)) {
    assert.equal(key, c.id);
    assert.deepEqual(validate(companionFileSchema, c), [], c.id);
  }
});

test("engine code, schemas and prompts never name a companion", () => {
  const words = all.flatMap((c) => [c.id, c.name, c.secondVoice?.name].filter(Boolean));
  const re = new RegExp(`\\b(${words.join("|")})\\b`, "i");
  const walk = (dir) => readdirSync(new URL(`../${dir}`, import.meta.url), { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(`${dir}/${d.name}`) : [`${dir}/${d.name}`]));
  for (const path of ["src", "schemas", "prompts"].flatMap(walk)) assert.ok(!re.test(file(path)), `${path} names ${file(path).match(re)?.[0]}`);
});

test("a companion who isn't in the roster joins a party with no code change", () => {
  const wren = newcomer();
  const other = plain()[1];
  assert.deepEqual(partyProblems([wren, other]), []);
  assert.equal(Rel.newRomance([wren, other], pairs).pair.value, 0); // no pair entry: starts at 0
  for (const input of [huddle(wren, other), camp(wren, other, ["wren"]), camp(wren, other, ["wren", other.id])]) assert.ok(input.includes('"name":"Wren"'));
  assert.ok(!huddle(wren, other).includes(`"name":"${all[0].name}"`)); // the file she was copied from is nowhere
  // Every pairing the setup screen offers includes her when she's added to the roster.
  assert.ok(pairings({ ...companions, wren }).some((p) => p.includes("wren")));
});

test("removing a companion leaves every other pairing working", () => {
  for (const gone of all) {
    const { [gone.id]: _, ...roster } = companions;
    for (const [a, b] of pairings(roster)) {
      assert.ok(!(a === gone.id || b === gone.id));
      assert.deepEqual(partyProblems([roster[a], roster[b]]), []);
    }
  }
});

test("every pairing builds a huddle and both campfire scenes, under the input limit, with no engine or UI data", () => {
  const banned = ['"color"', '"rate"', '"leanFromHeat"', '"image"', '"imgRole"', '"by":', '"declared"', '"beatTurns"', '"gain"'];
  for (const [a, b] of pairings(companions)) {
    const [x, y] = [companions[a], companions[b]];
    for (const input of [huddle(x, y), huddle(y, x), camp(x, y, [a]), camp(x, y, [a, b])]) {
      assert.ok(input.length < 256 * 1024, `${a}|${b}`);
      for (const k of banned) assert.ok(!input.includes(k), `${a}|${b}: ${k}`);
    }
  }
});

// ---------- ties (D8; docs/spec/companions.md §6) ----------

const tied = having("tie");
test("a tie resolves for the companion it names, and blocks a party without one", { skip: !tied }, () => {
  const [partnerId] = Object.keys(tied.tie.by);
  const partner = companions[partnerId];
  if (!partner) return;
  assert.deepEqual(partyProblems([tied, partner]), []);
  assert.equal(partyProblems([tied, newcomer()]).length, tied.tie.required ? 1 : 0);
  const [me, them] = resolveParty([tied, partner]);
  const entry = tied.tie.by[partnerId];
  for (const [k, v] of Object.entries({ ...tied.tie.set, ...entry.set })) assert.equal(me[k], v.replaceAll("{partner}", partner.name));
  for (const [k, v] of Object.entries(entry.append ?? {})) assert.ok(me[k].endsWith(v.replaceAll("{partner}", partner.name)));
  assert.equal(them, partner);
  // She hears about the tie from her side; the other companion hears it from hers.
  const mine = huddle(tied, partner);
  const theirs = huddle(partner, tied);
  if (entry.bond) assert.ok(mine.includes(JSON.stringify(entry.bond)) && theirs.includes(JSON.stringify(entry.bond)));
  if (tied.tie.toPartner) assert.ok(theirs.includes('"tie_to_you"') && !mine.includes('"tie_to_you"'));
  if (entry.partnerReacts) assert.ok(!mine.includes(JSON.stringify(entry.partnerReacts)));
});

test("a tie's triangle overrides the configuration and can rule out sharing", { skip: !tied?.tie.triangle }, () => {
  const partner = companions[Object.keys(tied.tie.by).find((id) => companions[id])];
  const members = resolveParty([tied, partner]);
  const [me, them] = members;
  const both = { [me.id]: { payoff: true, payoffTurn: 5 }, [them.id]: { payoff: true, payoffTurn: 1 } };
  const t = tied.tie.triangle;
  if (t.bothInvolved) {
    assert.equal(Rel.config(romance(members, both), me, members), t.bothInvolved.self.secret);
    assert.equal(Rel.config(romance(members, both, { knows: true }), me, members), t.bothInvolved.self.known);
    assert.equal(Rel.config(romance(members, both), them, members), t.bothInvolved.partner);
  }
  if (t.shared === false) assert.ok(!Rel.allowedBeats(romance(members, both), me, members).includes("shared"));
});

// ---------- the relationship model (docs/spec/companions.md §4–5) ----------

const [P, Q] = plain();
const members = [P, Q];

test("scoring: tagged reactions move the mapped tracks, clamped per turn", () => {
  let s = romance(members);
  s = Rel.applyReactions(s, P, [
    { field: "heatActs", item: "x", sign: 1, intensity: 2, reason: "r" },
    { field: "heatActs", item: "y", sign: 1, intensity: 2, reason: "r" },
    { field: "admires", item: "z", sign: 1, intensity: 1, reason: "r" },
  ]);
  assert.equal(s.rel[P.id].heat, 2); // +4 clamped to +2 a turn
  assert.equal(s.rel[P.id].intimacy, 1);
  assert.equal(s.rel[P.id].regard, 1);
  s = Rel.applyReactions(s, P, [{ field: "darkTriggers", item: "x", sign: 1, intensity: 2, reason: "r" }]);
  assert.equal(s.rel[P.id].lean, 2);
  assert.equal(s.rel[Q.id].heat, 0); // only hers
});

test("caps: heat and intimacy gains stop at +4 an encounter, and reset when it ends", () => {
  let s = romance(members);
  for (let i = 0; i < 4; i++) s = Rel.applyDelta(s, P, { heat: 2, intimacy: 2 });
  assert.equal(s.rel[P.id].heat, 4);
  assert.equal(s.rel[P.id].intimacy, 4);
  s = Rel.endEncounter(s);
  s = Rel.applyDelta(s, P, { heat: 2 });
  assert.equal(s.rel[P.id].heat, 6);
  // Losses aren't capped.
  s = Rel.applyDelta(s, P, { heat: -2 });
  assert.equal(s.rel[P.id].heat, 4);
});

test("hurt: regard at −5, or intimacy dropping 3 at once; nothing is ready while hurt; repair heals", () => {
  let s = romance(members, { [P.id]: { regard: -3, intimacy: 6 } });
  assert.ok(Rel.ready(s, P).includes("vulnerability"));
  s = Rel.applyDelta(s, P, { regard: -2 });
  assert.ok(s.rel[P.id].hurt);
  assert.deepEqual(Rel.ready(s, P), []);
  assert.ok(Rel.allowedBeats(s, P, members).includes("repair"));
  s = Rel.applyBeats(s, P, members, ["repair"]).state;
  assert.equal(s.rel[P.id].hurt, false);
  assert.equal(s.rel[P.id].regard, 1);
  const t = Rel.applyDelta(romance(members, { [P.id]: { intimacy: 5 } }), P, { intimacy: -3 });
  assert.ok(t.rel[P.id].hurt);
});

test("after the payoff, heat feeds the dark branch only for a companion who declares it", () => {
  for (const leanFromHeat of [true, false]) {
    const c = { ...P, leanFromHeat };
    const s = Rel.applyDelta(romance([c, Q], { [c.id]: { payoff: true, heat: c.payoff.at } }), c, { heat: 2 });
    assert.equal(s.rel[c.id].heat, c.payoff.at);
    assert.equal(s.rel[c.id].lean, leanFromHeat ? 1.2 : 0);
  }
});

test("READY: the payoff needs her heat, turns and act; vulnerability, then deep or bond", () => {
  const at = P.payoff.at;
  assert.deepEqual(Rel.ready(romance(members, { [P.id]: { heat: at } }, { turn: P.payoff.minTurns - 1 }), P), P.payoff.minTurns ? [] : ["payoff"]);
  assert.deepEqual(Rel.ready(romance(members, { [P.id]: { heat: at } }, { turn: P.payoff.minTurns, act: P.payoff.minAct }), P), ["payoff"]);
  assert.deepEqual(Rel.ready(romance(members, { [P.id]: { intimacy: 9, vuln: true, payoff: true } }), P), ["deep"]);
  assert.deepEqual(Rel.ready(romance(members, { [P.id]: { intimacy: 9, vuln: true } }), P), ["bond"]);
});

test("beats apply in order and only when allowed", () => {
  const s = romance(members, { [P.id]: { heat: P.payoff.at, intimacy: 6 } }, { turn: 99, act: 9 });
  const { state, rejected } = Rel.applyBeats(s, P, members, ["deep", "payoff", "vulnerability", "shared"]);
  assert.deepEqual(rejected, ["deep", "shared"]);
  assert.ok(state.rel[P.id].payoff && state.rel[P.id].vuln);
  assert.equal(state.rel[P.id].payoffTurn, 99);
  const out = { segments: [{ speaker: "self", text: "x" }], changes: [], memories: [], secrets: [], commitments: [], beats: ["deep"] };
  assert.deepEqual(Rel.campfireProblems(s, P, members, out), ["beat deep isn't allowed now"]);
});

test("configurations follow Gravenhold's configOf", () => {
  const cfg = (rels, over) => Rel.config(romance(members, rels, over), P, members);
  assert.equal(cfg({}), "open");
  assert.equal(cfg({ [P.id]: { payoff: true } }), "chosen");
  assert.equal(cfg({ [Q.id]: { payoff: true } }), "thirdwheel");
  assert.equal(cfg({ [Q.id]: { payoff: true }, [P.id]: { heat: Math.ceil(P.payoff.at * 0.6) } }), "secondfiddle");
  const both = { [P.id]: { payoff: true, payoffTurn: 1 }, [Q.id]: { payoff: true, payoffTurn: 5 } };
  assert.equal(cfg(both), "cheatedOn");
  assert.equal(Rel.config(romance(members, both), Q, members), "affair");
  assert.equal(cfg(both, { knows: true }), "rivals");
  assert.equal(cfg(both, { shared: true, knows: true }), "shared");
  assert.equal(cfg({}, { turn: 40 }), "ignored");
});

test("discovered and shared, and the pair value moves at most 1 a scene", () => {
  const both = { [P.id]: { payoff: true }, [Q.id]: { payoff: true } };
  let s = romance(members, both);
  assert.ok(Rel.allowedBeats(s, P, members).includes("discovered"));
  s = Rel.applyBeats(s, P, members, ["shared"]).state;
  assert.ok(s.shared && s.knows);
  const start = s.pair.value;
  const out = { segments: [{ speaker: "self", text: "x" }], changes: [{ track: "pair", by: 3, reason: "r" }], memories: ["m"], secrets: ["hidden"], commitments: [], beats: [] };
  s = Rel.applyCampfire(s, P, members, out);
  assert.equal(s.pair.value, start + 1);
  assert.deepEqual(s.rel[P.id].memories, ["m"]);
  assert.deepEqual(s.rel[P.id].revealed, ["hidden"]);
});

test("stage labels and progress", () => {
  assert.equal(Rel.stage(rel(), P), "Strangers");
  assert.equal(Rel.stage(rel({ intimacy: 3 }), P), "Friends");
  assert.equal(Rel.stage(rel({ heat: 2 }), { ...P, payoff: { ...P.payoff, at: 9 } }), "Drawn");
  assert.equal(Rel.stage(rel({ heat: P.payoff.at - 1 }), P), "Burning");
  assert.equal(Rel.stage(rel({ payoff: true, vuln: true }), P), "Lovers, opening up");
  assert.equal(Rel.stage(rel({ deep: true, lean: 6 }), P), "Consumed");
  assert.equal(Rel.stage(rel({ hurt: true, payoff: true }), P), "Hurt");
  assert.equal(Rel.stage(rel({ heat: 2 }), { ...P, payoff: { ...P.payoff, at: 9 }, stageLabels: { drawn: "The chase" } }), "The chase");
  assert.equal(Rel.progress(rel(), P), 0);
  assert.equal(Rel.progress(rel({ payoff: true, intimacy: 9, vuln: true, deep: true }), P), 7);
});

// ---------- gating (docs/spec/companions.md §3) ----------

test("gated fields appear only when their gate opens", () => {
  const has = (s, text) => huddle(P, Q, env({ romance: s })).includes(JSON.stringify(text));
  assert.ok(!has(romance(members), P.hidden));
  assert.ok(has(romance(members, { [P.id]: { intimacy: 2 } }), P.hidden));
  assert.ok(!has(romance(members), P.deep));
  assert.ok(has(romance(members, { [P.id]: { lean: 3 } }), P.deep));
  assert.ok(has(romance(members, {}, { turn: 0 }), P.first));
  assert.ok(!has(romance(members, {}, { turn: 8 }), P.first));
  assert.ok(has(romance(members, { [P.id]: { heat: P.payoff.at - 2 } }), P.payoff.scene));
  assert.ok(!has(romance(members, { [P.id]: { heat: P.payoff.at - 2, payoff: true } }), P.payoff.scene));
  for (const c of all) for (const k of ["sees", "misses"]) assert.ok(!huddle(c, c === P ? Q : P).includes(JSON.stringify(c.planning[k])), `${c.id} ${k}`);
});

// ---------- declared special cases (docs/spec/companions.md §6) ----------

const noted = having("notes");
test("a note is sent only while its gate holds", { skip: !noted }, () => {
  const o = all.find((c) => c !== noted && !partyProblems([noted, c]).length);
  const n = noted.notes[0];
  const text = JSON.stringify(n.text);
  const open = romance([noted, o]);
  const shut = Object.keys(n.when[0]).find((k) => Array.isArray(n.when[0][k]));
  const inputWith = (s) => huddle(noted, o, env({ romance: s }));
  if (Rel.holds(Rel.view(open, noted), n.when)) assert.ok(inputWith(open).includes(text));
  if (shut) {
    const [op, v] = n.when[0][shut];
    const closed = romance([noted, o], { [noted.id]: { [shut]: op.startsWith("<") ? v : v - 1 } });
    assert.ok(!inputWith(closed).includes(text));
  }
});

const voiced = having("secondVoice");
test("a second voice is relayed in company, speaks in private, and takes her own body only in person once due", { skip: !voiced }, () => {
  const o = all.find((c) => c !== voiced && !partyProblems([voiced, c]).length);
  const m = [voiced, o];
  const sv = voiced.secondVoice;
  const due = { [voiced.id]: { [sv.manifestsAfter]: true } };
  const e = (s) => env({ romance: s });
  const group = huddle(voiced, o, e(romance(m, due)));
  assert.ok(group.includes(JSON.stringify(sv.relayed)) && !group.includes(JSON.stringify(sv.voice)));
  const rings = A.companionInput(e(romance(m, due)), { channel: "private" }, voiced, [o], [], companionSchema);
  assert.ok(rings.includes(JSON.stringify(sv.voice)) && !rings.includes(JSON.stringify(sv.look)));
  assert.ok(!camp(voiced, o, [voiced.id], e(romance(m))).includes(JSON.stringify(sv.look)));
  assert.ok(camp(voiced, o, [voiced.id], e(romance(m, due))).includes(JSON.stringify(sv.look)));
  assert.ok(!camp(voiced, o, [voiced.id, o.id], e(romance(m, due))).includes(JSON.stringify(sv.voice)));
  // The beat lands once, in private and in person.
  const alone = { private: true, inPerson: true };
  assert.ok(Rel.allowedBeats(romance(m, due), voiced, m, alone).includes(sv.beat));
  assert.ok(!Rel.allowedBeats(romance(m, due), voiced, m, {}).includes(sv.beat));
  // A payoff and the manifestation in the same scene.
  const ready = romance(m, { [voiced.id]: { heat: voiced.payoff.at } }, { turn: 99, act: 9 });
  const { state, rejected } = Rel.applyBeats(ready, voiced, m, [sv.manifestsAfter === "payoff" ? "payoff" : sv.manifestsAfter, sv.beat], alone);
  if (sv.manifestsAfter === "payoff") {
    assert.deepEqual(rejected, []);
    assert.ok(state.rel[voiced.id].manifest);
  }
  const lines = { segments: [{ speaker: "second_voice", text: "x" }], changes: [], memories: [], secrets: [], commitments: [], beats: [] };
  assert.deepEqual(Rel.campfireProblems(romance(m), voiced, m, lines, {}), ["no second voice speaks in this scene"]);
  assert.deepEqual(Rel.campfireProblems(romance(m), voiced, m, lines, alone), []);
});

const storming = having("extraBeats");
test("an extra beat has a cooldown in campaign turns", { skip: !storming }, () => {
  const o = all.find((c) => c !== storming && !partyProblems([storming, c]).length);
  const m = [storming, o];
  const b = storming.extraBeats[0];
  let s = romance(m, {}, { turn: 10 });
  assert.ok(Rel.allowedBeats(s, storming, m).includes(b.id));
  s = Rel.applyBeats(s, storming, m, [b.id]).state;
  assert.ok(!Rel.allowedBeats(s, storming, m).includes(b.id));
  if (b.cooling) assert.ok(camp(storming, o, [storming.id], env({ romance: s })).includes(JSON.stringify(b.cooling)));
  for (let i = 0; i < b.cooldown; i++) s = Rel.nextTurn(s);
  assert.ok(Rel.allowedBeats(s, storming, m).includes(b.id));
  assert.ok(camp(storming, o, [storming.id], env({ romance: s })).includes(JSON.stringify(b.text)));
});

// ---------- the wardrobe (docs/spec/companions.md §7, D71) ----------

test("she owns her usual outfit, can be given more, and her profile describes what she has on", async () => {
  const W = await import("../src/campaign/wardrobe.js");
  const silk = { name: "Silk dress", text: "A long dress of green silk." };
  let s = romance(members);
  assert.equal(W.wearing(s, P), P.outfit);
  assert.throws(() => W.equip(s, P.id, "silk"));
  s = W.equip(W.addOutfit(s, P.id, "silk", silk), P.id, "silk");
  const input = huddle(P, Q, env({ romance: s }));
  assert.ok(input.includes(JSON.stringify(silk.text)) && !input.includes(JSON.stringify(P.outfit)));
  assert.equal(s.wardrobe[Q.id].equipped, "usual"); // only hers
  // At camp she can change on the page, into something she owns.
  const out = { segments: [{ speaker: "self", text: "x" }], changes: [], memories: [], secrets: [], commitments: [], beats: [], advances: null };
  const back = Rel.applyCampfire(s, P, members, { ...out, outfit: "usual" });
  assert.equal(W.wearing(back, P), P.outfit);
  assert.deepEqual(Rel.campfireProblems(s, P, members, { ...out, outfit: "ballgown" }), ["she doesn't own an outfit called ballgown"]);
  assert.ok(camp(P, Q, [P.id], env({ romance: s })).includes('"could_change_into":[{"id":"usual"'));
});

test("a tie's outfit is her usual one in that party", { skip: !tied }, () => {
  const partner = companions[Object.keys(tied.tie.by).find((id) => companions[id])];
  const m = resolveParty([tied, partner]);
  const set = tied.tie.by[partner.id].set?.outfit;
  if (set) assert.equal(Rel.newRomance(m).wardrobe[tied.id].owned.usual.text, set);
});

// ---------- campfire with both (D70) ----------

test("with both at the fire, the first speaker alternates, and one of the two must move something", () => {
  assert.deepEqual(Rel.speakingOrder(romance(members, {}, { turn: 4 }), [P.id, Q.id]), [P.id, Q.id]);
  assert.deepEqual(Rel.speakingOrder(romance(members, {}, { turn: 5 }), [P.id, Q.id]), [Q.id, P.id]);
  const out = { segments: [{ speaker: "self", text: "x" }], changes: [], memories: [], secrets: [], commitments: [], beats: [], advances: null };
  const s = romance(members);
  assert.equal(Rel.campfireProblems(s, P, members, out, { mustAdvance: true }).length, 1);
  assert.deepEqual(Rel.campfireProblems(s, P, members, { ...out, advances: "asks him to stay" }, { mustAdvance: true }), []);
  assert.deepEqual(Rel.campfireProblems(s, P, members, out, {}), []);
  const second = A.campfireInput(env(), { with: [P.id, Q.id], scene: [], mustAdvance: true }, P, [Q], campfireSchema);
  assert.ok(second.includes(`${Q.name} didn't move anything`));
});

// ---------- what her call knows about herself ----------

test("her call knows a form an ability put her in", () => {
  const e = env({ state: { flags: { [P.id]: { form: "animal" } } } });
  assert.ok(huddle(P, Q, e).includes('## You, right now\n\n```json\n{"form":"animal"}'));
  assert.ok(!huddle(P, Q).includes("You, right now"));
});

test("a second voice's own tastes reach her call in company and in private", { skip: !voiced?.secondVoice.admires }, () => {
  const o = all.find((c) => c !== voiced && !partyProblems([voiced, c]).length);
  const sv = voiced.secondVoice;
  const rings = A.companionInput(env(), { channel: "private" }, voiced, [o], [], companionSchema);
  for (const input of [huddle(voiced, o), rings]) assert.ok(input.includes(JSON.stringify(sv.admires)) && input.includes(JSON.stringify(sv.despises)));
});
