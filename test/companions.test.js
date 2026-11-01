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
// A payoff in a test means they're lovers now, unless the test says otherwise.
const rel = (over = {}) => ({ ...Rel.newRel(), ...(over.payoff ? { involved: true } : {}), ...over });
const romance = (members, rels = {}, over = {}) => {
  const r = Rel.newRomance(members, pairs);
  for (const [id, x] of Object.entries(rels)) r.rel[id] = rel(x);
  return { ...r, ...over };
};
// A campfire output that does nothing.
const blank = () => ({ segments: [{ speaker: "self", text: "x", aside: "no" }], changes: [], memories: [], secrets: [], commitments: [], beats: [], advances: null, outfit: null, believes: null, storm: null, risk: null, form: null, inner: "x", agenda: null });
// Two companions with no declared special cases.
const plain = () => {
  const p = all.filter((c) => !c.tie && !c.secondVoice && !c.extraBeats && !c.notes && !c.limits && !c.escalation && !c.shapeshift && !c.fixed && !c.reveal);
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
  assert.deepEqual(Rel.newRomance([wren, other], pairs).rel.wren.toward, Rel.axes(0)); // no pair entry: starts at 0
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

test("a tie's triangle can rule out sharing", { skip: !tied?.tie.triangle }, () => {
  const partner = companions[Object.keys(tied.tie.by).find((id) => companions[id])];
  const members = resolveParty([tied, partner]);
  const [me, them] = members;
  const both = { [me.id]: { payoff: true, payoffTurn: 5 }, [them.id]: { payoff: true, payoffTurn: 1 } };
  const t = tied.tie.triangle;
  assert.equal(Rel.config(romance(members, both), them, members), "chosen"); // in the dark
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

test("after the payoff, heat stays fluid, and also feeds the dark branch only for a companion who declares it (D78)", () => {
  for (const leanFromHeat of [true, false]) {
    const c = { ...P, leanFromHeat };
    const s = Rel.applyDelta(romance([c, Q], { [c.id]: { payoff: true, heat: c.payoff.at } }), c, { heat: 2 });
    assert.equal(s.rel[c.id].heat, c.payoff.at + 2);
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

test("configurations come from her own involvement and what she believes, never the truth (D81)", () => {
  const cfg = (rels, over, who = P) => Rel.config(romance(members, rels, over), who, members);
  const believes = { past: true, current: true };
  assert.equal(cfg({}), "open");
  assert.equal(cfg({ [P.id]: { payoff: true } }), "chosen");
  assert.equal(cfg({ [P.id]: { payoff: true, involved: false } }), "former");
  // He's with Q, but P doesn't know: nothing is settled for her.
  assert.equal(cfg({ [Q.id]: { payoff: true } }), "open");
  assert.equal(cfg({ [Q.id]: { payoff: true }, [P.id]: { believes } }), "thirdwheel");
  assert.equal(cfg({ [Q.id]: { payoff: true }, [P.id]: { believes, heat: Math.ceil(P.payoff.at * 0.6) } }), "secondfiddle");
  // Both involved and both in the dark: each thinks she's chosen.
  const both = { [P.id]: { payoff: true, payoffTurn: 1 }, [Q.id]: { payoff: true, payoffTurn: 5 } };
  assert.equal(cfg(both), "chosen");
  assert.equal(cfg(both, {}, Q), "chosen");
  // Either side can find out, whoever was first.
  const knowing = (id) => ({ ...both, [id]: { ...both[id], believes } });
  assert.equal(cfg(knowing(P.id)), "cheatedOn");
  assert.equal(cfg(knowing(Q.id), {}, Q), "affair");
  assert.equal(cfg(knowing(Q.id), {}, P), "chosen");
  assert.equal(cfg(knowing(P.id), { open: true }), "rivals");
  assert.equal(cfg(knowing(P.id), { open: true, shared: true }), "shared");
  // A wrong belief counts the same.
  assert.equal(cfg({ [P.id]: { payoff: true, believes } }), "cheatedOn");
  assert.equal(cfg({}, { turn: 40 }), "ignored");
});

test("breakup, rekindle, in the open and shared; beliefs only from her own output", () => {
  const both = { [P.id]: { payoff: true }, [Q.id]: { payoff: true } };
  let s = romance(members, both);
  assert.ok(!Rel.allowedBeats(s, P, members, { private: true }).includes("in_the_open"));
  assert.ok(Rel.allowedBeats(s, P, members).includes("in_the_open"));
  s = Rel.applyBeats(s, P, members, ["in_the_open"]).state;
  assert.ok(s.open && s.rel[P.id].believes.current && s.rel[Q.id].believes.current);
  s = Rel.applyBeats(s, Q, members, ["breakup"]).state;
  assert.ok(!s.rel[Q.id].involved && !s.rel[P.id].believes.current); // in the open, P knows it's over
  assert.equal(Rel.config(s, Q, members), "former");
  assert.ok(Rel.allowedBeats(s, Q, members).includes("rekindle"));
  s = Rel.applyBeats(s, Q, members, ["rekindle", "shared"]).state;
  assert.ok(s.rel[Q.id].involved && s.shared);
  const out = { ...blank(), believes: { past: false, current: false } };
  s = Rel.applyCampfire(s, P, members, out, { private: true });
  assert.deepEqual(s.rel[P.id].believes, { past: false, current: false });
});

test("each companion's view of the other moves on three axes, at most 2 an answer, hers only (D77)", () => {
  let s = romance(members);
  const out = { ...blank(), changes: [{ track: "affection", by: 3, reason: "r" }, { track: "trust", by: -2, reason: "r" }, { track: "read_respect", by: 1, reason: "r" }], memories: ["m"], secrets: ["hidden"] };
  const before = structuredClone(s.rel);
  s = Rel.applyCampfire(s, P, members, out);
  assert.equal(s.rel[P.id].toward.affection, before[P.id].toward.affection + 2);
  assert.equal(s.rel[P.id].toward.trust, before[P.id].toward.trust - 2);
  assert.equal(s.rel[P.id].read.respect, before[P.id].read.respect + 1);
  assert.deepEqual(s.rel[Q.id].toward, before[Q.id].toward); // hers only
  assert.deepEqual(s.rel[P.id].memories, ["m"]);
  assert.deepEqual(s.rel[P.id].revealed, ["hidden"]);
  // One number in a pair's start is affection; the three axes can be given.
  const fresh = Rel.newRomance(members, { [`${P.id}|${Q.id}`]: { start: -3, dynamic: "x" } });
  assert.deepEqual(fresh.rel[P.id].toward, { affection: -3, respect: 0, trust: 0 });
  // At camp with both, her views reach her call as words.
  const input = camp(P, Q, [P.id, Q.id], env({ romance: s }));
  assert.ok(input.includes("you_feel_about_her") && input.includes(`(affection ${s.rel[P.id].toward.affection})`));
});

test("with no change to heat, intimacy or regard, a value below +2 rises toward it, and never falls to it (D78)", () => {
  let s = romance(members, { [P.id]: { regard: -10, heat: 0, intimacy: 5 } });
  s = Rel.applyCampfire(s, P, members, blank());
  assert.deepEqual([s.rel[P.id].regard, s.rel[P.id].heat, s.rel[P.id].intimacy], [-9, 1, 5]);
  s = Rel.applyCampfire(s, P, members, { ...blank(), changes: [{ track: "regard", by: -1, reason: "r" }] });
  assert.equal(s.rel[P.id].regard, -10); // a negative answer doesn't recover
  for (let i = 0; i < 20; i++) s = Rel.applyCampfire(s, P, members, blank());
  assert.equal(s.rel[P.id].regard, 2);
});

test("one catch roll an answer, only for a hidden action in company; ring words are never caught (D80, D93)", () => {
  const act = { ...blank(), segments: [{ speaker: "self", text: "said aloud", aside: "no" }, { speaker: "self", text: "a hand on his knee", aside: "action" }], risk: "high" };
  assert.equal(Rel.catchAside({ ...romance(members), forced: [99] }, act).caught, false);
  assert.equal(Rel.catchAside({ ...romance(members), forced: [4] }, act).caught, true);
  assert.equal(Rel.catchAside({ ...romance(members), forced: [1] }, act, { private: true }).caught, false);
  const ring = { ...act, segments: [{ speaker: "self", text: "meet me later", aside: "ring" }] };
  assert.equal(Rel.catchAside({ ...romance(members), forced: [1] }, ring).caught, false);
  // At most one aside of each kind; whispering to the other needs her there.
  const two = { ...act, segments: [...act.segments, { speaker: "self", text: "and another", aside: "action" }] };
  assert.deepEqual(Rel.campfireProblems(romance(members), P, members, two), ["at most one action aside an answer; put it all in one segment"]);
  const tell = { ...blank(), segments: [{ speaker: "self", text: "psst", aside: "to_other" }] };
  assert.deepEqual(Rel.campfireProblems(romance(members), P, members, tell, { private: true }), ["there's no other companion here to whisper to"]);
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

test("a note is sent only while its gate holds, including gates on derived terms", () => {
  const c = newcomer({ notes: [{ when: [{ heat: ["<", 2], payoff: false }], text: "N1" }, { when: [{ toPayoff: ["<=", 1] }], text: "N2" }] });
  const o = plain()[1];
  const input = (rels) => huddle(c, o, env({ romance: romance([c, o], { [c.id]: rels }) }));
  assert.ok(input({}).includes('"N1"') && !input({}).includes('"N2"'));
  assert.ok(!input({ heat: 2 }).includes('"N1"'));
  assert.ok(input({ heat: c.payoff.at - 1 }).includes('"N2"'));
});

test("every declared gate uses only terms the engine knows", () => {
  const known = new Set(Object.keys(Rel.view(romance(members), P)));
  for (const c of all) for (const n of c.notes ?? []) for (const alt of n.when) for (const k of Object.keys(alt)) assert.ok(known.has(k), `${c.id}: ${k}`);
});

const voiced = having("secondVoice");
test("a second voice is relayed in company, speaks in private, and may take her own body only in person", { skip: !voiced }, () => {
  const o = all.find((c) => c !== voiced && !partyProblems([voiced, c]).length);
  const e = (s) => env({ romance: s });
  const alone = { private: true, inPerson: true };
  // Both forms of the mechanism: free to appear in private, and gated on the payoff.
  const { manifestsAfter, ...free } = voiced.secondVoice;
  for (const sv of [free, { ...free, manifestsAfter: "payoff" }]) {
    const c = { ...voiced, secondVoice: sv };
    const m = [c, o];
    const due = sv.manifestsAfter ? { [c.id]: { payoff: true } } : {};
    const group = huddle(c, o, e(romance(m, due)));
    assert.ok(group.includes(JSON.stringify(sv.relayed)) && !group.includes(JSON.stringify(sv.voice)));
    const rings = A.companionInput(e(romance(m, due)), { channel: "private" }, c, [o], [], companionSchema);
    assert.ok(rings.includes(JSON.stringify(sv.voice)) && !rings.includes(JSON.stringify(sv.look))); // over the rings: no body
    assert.ok(camp(c, o, [c.id], e(romance(m, due))).includes(`"may_take_her_own_body":${JSON.stringify(sv.look)}`));
    assert.equal(camp(c, o, [c.id], e(romance(m))).includes(JSON.stringify(sv.look)), !sv.manifestsAfter);
    assert.ok(!camp(c, o, [c.id, o.id], e(romance(m, due))).includes(JSON.stringify(sv.voice)));
    // The beat lands once, in private and in person.
    assert.ok(Rel.allowedBeats(romance(m, due), c, m, alone).includes(sv.beat));
    assert.ok(!Rel.allowedBeats(romance(m, due), c, m, {}).includes(sv.beat));
    assert.ok(!Rel.allowedBeats(romance(m, { [c.id]: { ...due[c.id], manifest: true } }), c, m, alone).includes(sv.beat));
    if (sv.manifestsAfter) {
      // A payoff and the manifestation in the same scene.
      const ready = romance(m, { [c.id]: { heat: c.payoff.at } }, { turn: 99, act: 9 });
      const { state, rejected } = Rel.applyBeats(ready, c, m, ["payoff", sv.beat], alone);
      assert.deepEqual(rejected, []);
      assert.ok(state.rel[c.id].manifest);
    }
  }
  const m = [voiced, o];
  const lines = { segments: [{ speaker: "second_voice", text: "x" }], changes: [], memories: [], secrets: [], commitments: [], beats: [], advances: null, outfit: null };
  assert.deepEqual(Rel.campfireProblems(romance(m), voiced, m, lines, {}), ["no second voice speaks in this scene"]);
  assert.deepEqual(Rel.campfireProblems(romance(m), voiced, m, lines, alone), []);
});

test("an extra beat can have a cooldown in campaign turns, a gate, or happen once", () => {
  const c = { ...P, extraBeats: [{ id: "flare", cooldown: 3, text: "Flare now.", cooling: "Not yet." }, { id: "truce", once: true, when: [{ trust: [">=", 4] }], text: "Truce now." }] };
  const m = [c, Q];
  let s = romance(m, {}, { turn: 10 });
  assert.ok(Rel.allowedBeats(s, c, m).includes("flare") && !Rel.allowedBeats(s, c, m).includes("truce"));
  s = Rel.applyBeats(s, c, m, ["flare"]).state;
  assert.ok(!Rel.allowedBeats(s, c, m).includes("flare"));
  assert.ok(camp(c, Q, [c.id], env({ romance: s })).includes('"Not yet."'));
  for (let i = 0; i < 3; i++) s = Rel.nextTurn(s);
  assert.ok(Rel.allowedBeats(s, c, m).includes("flare"));
  s.rel[c.id].toward.trust = 4;
  assert.ok(Rel.allowedBeats(s, c, m).includes("truce"));
  s = Rel.applyBeats(s, c, m, ["truce"]).state;
  assert.ok(!Rel.allowedBeats(s, c, m).includes("truce"));
});

const storming = having("escalation");
test("an escalation rises as fast as the call says and falls one level an answer at most (D82)", { skip: !storming }, () => {
  const o = all.find((c) => c !== storming && !partyProblems([storming, c]).length);
  const m = resolveParty([storming, o]);
  const top = storming.escalation.tiers.length;
  let s = romance(m);
  s = Rel.applyCampfire(s, m[0], m, { ...blank(), storm: top });
  assert.equal(s.rel[storming.id].storm, top);
  s = Rel.applyCampfire(s, m[0], m, { ...blank(), storm: 0 });
  assert.equal(s.rel[storming.id].storm, top - 1);
  assert.ok(camp(m[0], m[1], [storming.id], env({ romance: s })).includes(JSON.stringify(storming.escalation.tiers[top - 2])));
  assert.deepEqual(Rel.campfireProblems(s, m[0], m, { ...blank(), storm: top + 1 }), [`storm must be 0 to ${top}`]);
  assert.deepEqual(Rel.campfireProblems(s, m[1], m, { ...blank(), storm: 1 }), ["she has no storm level (storm must be null)"]);
});

test("limits: a floor on her view of anyone, and a tie's ceiling and pace until its beat (D77, D84)", () => {
  const floored = { ...P, limits: { affection: [0, 10] } };
  let s = romance([floored, Q], { [floored.id]: { toward: { affection: 1, respect: 0, trust: 0 } } });
  s = Rel.applyCampfire(s, floored, [floored, Q], { ...blank(), changes: [{ track: "affection", by: -2, reason: "r" }, { track: "respect", by: -2, reason: "r" }] });
  assert.deepEqual([s.rel[floored.id].toward.affection, s.rel[floored.id].toward.respect], [0, -2]);
});

const masked = all.find((c) => c.tie?.mask);
test("a tie can start both views and mask hers; her partner's read starts at the mask (D84)", { skip: !masked }, () => {
  const partner = companions[Object.keys(masked.tie.by).find((id) => companions[id])];
  const m = resolveParty([masked, partner]);
  let s = Rel.newRomance(m, pairs);
  assert.deepEqual(s.rel[masked.id].toward, Rel.axes(masked.tie.start));
  assert.deepEqual(s.rel[partner.id].toward, Rel.axes(masked.tie.partnerStart));
  assert.deepEqual(s.rel[partner.id].read, Rel.axes(masked.tie.mask));
  assert.deepEqual(s.rel[masked.id].read, Rel.axes(masked.tie.partnerStart));
  // Her partner's call never sees her secret; hers always does.
  const secret = m[0].tie.secret; // campfireInput resolves the party itself, from the files
  assert.ok(camp(masked, partner, [m[0].id, m[1].id], env({ romance: s })).includes(JSON.stringify(secret)));
  assert.ok(!camp(partner, masked, [m[0].id, m[1].id], env({ romance: s })).includes(JSON.stringify(secret)));
  const l = masked.tie.limits;
  if (l) {
    const up = { ...blank(), changes: [{ track: "affection", by: 2, reason: "r" }] };
    s.rel[masked.id].toward.affection = l.affection[1];
    s = Rel.applyCampfire(s, m[0], m, up);
    assert.equal(s.rel[masked.id].toward.affection, l.affection[1]); // the ceiling holds
    if (l.until) {
      s.rel[masked.id].beatTurns[l.until] = 1;
      s = Rel.applyCampfire(s, m[0], m, up);
      assert.equal(s.rel[masked.id].toward.affection, l.affection[1] + Math.min(2, Rel.limitsFor(s, m[0], m).perScene));
    }
  }
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
  assert.ok(camp(P, Q, [P.id], env({ romance: s })).includes(`"wearing":{"id":"silk","name":"Silk dress"},"could_change_into":[{"id":"usual","name":"Usual outfit","looks":${JSON.stringify(P.outfit)}}]`));
  // Naming the outfit she already has on is fine; null is no change.
  assert.deepEqual(Rel.campfireProblems(s, P, members, { ...out, outfit: "silk" }), []);
  assert.equal(W.wearing(Rel.applyCampfire(s, P, members, { ...out, outfit: null }), P), silk.text);
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

test("a pair can start lopsided; gates read her perception of the other, which only her own scenes move (D76)", () => {
  let s = Rel.newRomance(members, { [`${P.id}|${Q.id}`]: { start: { [P.id]: 2, [Q.id]: { affection: -4, trust: -6 } }, dynamic: "x" } });
  assert.deepEqual([s.rel[P.id].toward.affection, s.rel[Q.id].toward.affection, s.rel[Q.id].toward.trust], [2, -4, -6]);
  assert.deepEqual([s.rel[P.id].read.affection, s.rel[P.id].read.trust, s.rel[Q.id].read.affection], [-4, -6, 2]); // first impressions are right
  assert.equal(Rel.view(s, P).fromOther, undefined); // never the truth
  // Q warms to P in secret; P's read doesn't move with it.
  const out = { ...blank(), changes: [{ track: "affection", by: 2, reason: "r" }] };
  s = Rel.applyCampfire(s, Q, members, out);
  assert.equal(s.rel[Q.id].toward.affection, -2);
  assert.equal(s.rel[P.id].read.affection, -4);
  // P comes to believe she's liked, rightly or not.
  s = Rel.applyCampfire(s, P, members, { ...out, changes: [{ track: "read_affection", by: 5, reason: "r" }] });
  assert.equal(s.rel[P.id].read.affection, -2);
  assert.ok(Rel.holds(Rel.view(s, P), [{ readAffection: [">=", -2] }]));
  for (const p of Object.values(pairs).filter((x) => typeof x.start === "object"))
    for (const v of Object.values(p.start)) for (const n of Object.values(Rel.axes(v))) assert.ok(Number.isInteger(n) && n >= -10 && n <= 10);
});

test("a second voice can join a scene in company once her gate holds (D83)", { skip: !voiced?.secondVoice.inCompany }, () => {
  const o = all.find((c) => c !== voiced && !partyProblems([voiced, c]).length);
  const m = resolveParty([voiced, o]);
  const both = [voiced.id, o.id];
  let s = romance(m, { [voiced.id]: { payoff: true } });
  assert.ok(!camp(m[0], m[1], both, env({ romance: s })).includes('"in_company":true'));
  s.rel[voiced.id] = { ...s.rel[voiced.id], intimacy: 10, toward: Rel.axes({ affection: 10, respect: 10, trust: 10 }), read: Rel.axes({ affection: 10, respect: 10, trust: 10 }) };
  const input = camp(m[0], m[1], both, env({ romance: s }));
  assert.ok(input.includes('"in_company":true') && input.includes(JSON.stringify(voiced.secondVoice.look)));
});

// ---------- fixed tracks, own gates, shapeshifting (D85, D86) ----------

test("fixed tracks never move, and her own gate replaces a default one (D85)", () => {
  const c = { ...P, fixed: { heat: 10, regard: 10 }, reveal: { hidden: [{ deep: true }] } };
  const m = [c, Q];
  let s = Rel.newRomance(m, pairs);
  assert.deepEqual([s.rel[c.id].heat, s.rel[c.id].regard], [10, 10]);
  s = Rel.applyCampfire(s, c, m, { ...blank(), changes: [{ track: "regard", by: -3, reason: "r" }, { track: "heat", by: -2, reason: "r" }, { track: "intimacy", by: 2, reason: "r" }] });
  assert.deepEqual([s.rel[c.id].heat, s.rel[c.id].regard, s.rel[c.id].intimacy], [10, 10, 2]);
  s.rel[c.id].intimacy = 5;
  assert.ok(!camp(c, Q, [c.id], env({ romance: s })).includes(JSON.stringify(c.hidden)));
  s.rel[c.id].deep = true;
  assert.ok(camp(c, Q, [c.id], env({ romance: s })).includes(JSON.stringify(c.hidden)));
});

test("a shapeshifter changes form, may come in the other's place, and is unmasked only in company (D86)", () => {
  const shifter = { ...P, shapeshift: { text: "She can look like anyone.", impersonation: [{ chance: 30, when: [{ affection: ["<", 0] }] }, { chance: 5 }] } };
  const m = [shifter, Q];
  let s = Rel.newRomance(m, pairs);
  assert.ok(!s.rel[Q.id].knowsShifter);
  // Form: hers only, and the other sees it.
  assert.deepEqual(Rel.campfireProblems(s, Q, m, { ...blank(), form: "taller" }), ["she can't change her shape (form must be null)"]);
  s = Rel.applyCampfire(s, shifter, m, { ...blank(), form: "a little taller, with longer hair" });
  assert.equal(s.rel[shifter.id].form, "a little taller, with longer hair");
  assert.ok(camp(Q, shifter, [Q.id, shifter.id], env({ romance: s })).includes("a little taller, with longer hair"));
  // Impersonation: by the first gate that holds.
  s.rel[shifter.id].toward.affection = -5;
  assert.equal(Rel.whoComes({ ...s, forced: [30] }, m, Q.id).actor, shifter.id);
  assert.equal(Rel.whoComes({ ...s, forced: [31] }, m, Q.id).actor, Q.id);
  s.rel[shifter.id].toward.affection = 5;
  assert.equal(Rel.whoComes({ ...s, forced: [6] }, m, Q.id).actor, Q.id);
  assert.equal(Rel.whoComes({ ...s, forced: [99] }, m, shifter.id).actor, shifter.id); // the other can't shift
  // In disguise: her call wears the other's face; the other later knows she wasn't there.
  const input = A.campfireInput(env({ romance: s }), { with: [Q.id], scene: [], disguisedAs: Q.id }, shifter, [Q], campfireSchema);
  assert.ok(input.includes(`You are wearing ${Q.name}'s face`));
  s = Rel.applyCampfire(s, shifter, m, { ...blank(), memories: ["kissed him as her"] }, { private: true, disguisedAs: Q.id });
  assert.deepEqual(s.rel[Q.id].absent, [s.turn]);
  assert.ok(s.rel[shifter.id].memories.includes("kissed him as her"));
  assert.ok(camp(Q, shifter, [Q.id], env({ romance: s })).includes("you weren't there"));
  // Unmasked: only in company, and only until the other knows.
  assert.ok(!Rel.allowedBeats(s, shifter, m, { private: true }).includes("unmasked"));
  s = Rel.applyBeats(s, shifter, m, ["unmasked"]).state;
  assert.ok(s.rel[Q.id].knowsShifter && !Rel.allowedBeats(s, shifter, m).includes("unmasked"));
  assert.ok(camp(Q, shifter, [Q.id], env({ romance: s })).includes(`${shifter.name} can change her shape.`));
});

test("a tie can grant a special case with one partner, and two shapeshifters know each other (D86)", () => {
  const shifter = { ...Q, shapeshift: { text: "She can look like anyone." } };
  const sister = { ...P, id: "sis", name: "Sis", tie: { required: true, by: { [shifter.id]: { bond: "b", grants: { shapeshift: { text: "So can she." } } } } } };
  const m = resolveParty([sister, shifter]);
  assert.equal(m[0].shapeshift.text, "So can she.");
  const s = Rel.newRomance(m, pairs);
  assert.ok(s.rel.sis.knowsShifter && s.rel[shifter.id].knowsShifter);
});

test("every companion declares how she gets what she wants, and her private agenda carries into her next call (D92)", () => {
  for (const c of all) for (const k of ["boundaries", "honesty", "means", "whenRefused"]) assert.ok(typeof c[k] === "string" && c[k].length > 20, `${c.id}: ${k}`);
  let s = romance(members);
  s = Rel.applyCampfire(s, P, members, { ...blank(), agenda: "Get him alone and make her look possessive." });
  assert.equal(s.rel[P.id].agenda, "Get him alone and make her look possessive.");
  s = Rel.applyCampfire(s, P, members, blank()); // null keeps it
  assert.equal(s.rel[P.id].agenda, "Get him alone and make her look possessive.");
  assert.ok(camp(P, Q, [P.id], env({ romance: s })).includes("make her look possessive"));
  assert.ok(!camp(Q, P, [P.id, Q.id], env({ romance: s })).includes("make her look possessive")); // never the other's call
});
