// The relationship model (docs/spec/companions.md §4–6). Pure: each function takes the party's relationship
// state and returns a new one. Numbers and words come from content/relationship.js; anything one companion
// does differently is declared in her file. Code never names a companion (D8).
import * as R from "../../content/relationship.js";
import { pairEntry } from "./roster.js";
import { newWardrobe, equip } from "./wardrobe.js";

const clamp = (v, [lo, hi]) => Math.max(lo, Math.min(hi, v));
const copy = (x) => structuredClone(x);

export const newRel = () => ({
  heat: 0,
  intimacy: 0,
  regard: 0,
  lean: 0,
  payoff: false,
  payoffTurn: null,
  vuln: false,
  deep: false,
  bond: false,
  hurt: false,
  manifest: false,
  gain: { heat: 0, intimacy: 0 },
  beatTurns: {},
  memories: [],
  commitments: [],
  revealed: [],
});

// The party's relationship state: one entry per companion, plus the pair. `members` are the two companions.
export function newRomance(members, pairs = {}, { turn = 0, act = 1 } = {}) {
  const [a, b] = members.map((c) => c.id);
  return {
    turn,
    act,
    rel: Object.fromEntries(members.map((c) => [c.id, newRel()])),
    pair: { value: b ? pairEntry(pairs, a, b)?.start ?? 0 : 0 },
    knows: false,
    shared: false,
    wardrobe: newWardrobe(members),
  };
}

// Who answers first at the campfire when the player sits with both: it alternates by campaign turn (D70).
export const speakingOrder = (rom, ids) => (rom.turn % 2 ? [...ids].reverse() : [...ids]);

// What gates read: her tracks and flags, plus the campaign's turn and act and two distances.
export function view(rom, c) {
  const rel = rom.rel[c.id];
  return {
    ...rel,
    turn: rom.turn,
    act: rom.act,
    toPayoff: c.payoff.at - rel.heat,
    actsToQuest: (c.questAct ?? 1) - rom.act,
  };
}

// A gate: a list of alternatives, each holding when every term does. A term is [comparison, number] or a value.
const CMP = { "<": (a, b) => a < b, "<=": (a, b) => a <= b, "=": (a, b) => a === b, ">=": (a, b) => a >= b, ">": (a, b) => a > b };
export function holds(v, gate) {
  const alts = Array.isArray(gate) ? gate : [gate];
  return alts.some((alt) => Object.entries(alt).every(([k, t]) => (Array.isArray(t) ? CMP[t[0]](v[k], t[1]) : v[k] === t)));
}

// READY: what code allows to happen next (Gravenhold's computeReady). Nothing is ready while she's hurt.
export function ready(rom, c) {
  const r = rom.rel[c.id];
  if (r.hurt) return [];
  const out = [];
  if (!r.payoff && r.heat >= c.payoff.at && rom.turn >= c.payoff.minTurns && rom.act >= c.payoff.minAct) out.push("payoff");
  if (!r.vuln && r.intimacy >= R.ready.vulnerability) out.push("vulnerability");
  if (r.vuln && r.intimacy >= R.ready.deepOrBond && !r.deep && !r.bond) out.push(r.payoff ? "deep" : "bond");
  return out;
}

// Her second voice is heard only in private, and may take her own body only in person, and, if she declares
// `manifestsAfter`, once that flag is set or about to be. Whether she does is the scene's call.
export function secondVoiceState(rom, c, scene = {}) {
  const sv = c.secondVoice;
  if (!sv) return null;
  if (!scene.private) return { speaks: false };
  const after = sv.manifestsAfter;
  const due = !after || rom.rel[c.id][after] || ready(rom, c).includes(after);
  return { speaks: true, canAppear: !!(scene.inPerson && due) };
}

// Every beat she may report right now, with the reason it's on the list. `members` are both companions as
// resolved for this party (roster.js), `scene` says whether the player is alone with her and in person.
export function allowedBeats(rom, c, members, scene = {}) {
  const r = rom.rel[c.id];
  const o = members.find((m) => m.id !== c.id);
  const ro = o && rom.rel[o.id];
  const out = ready(rom, c);
  out.push("rupture");
  if (r.hurt) out.push("repair");
  if (o && !rom.knows && (r.payoff || ro.payoff)) out.push("discovered");
  if (o && !rom.shared && r.payoff && ro.payoff && members.every((m) => m.tie?.triangle?.shared !== false)) out.push("shared");
  for (const b of c.extraBeats ?? []) if (rom.turn - (r.beatTurns[b.id] ?? -Infinity) >= b.cooldown) out.push(b.id);
  const sv = secondVoiceState(rom, c, scene);
  if (sv?.canAppear && !r.manifest) out.push(c.secondVoice.beat);
  return out;
}

// One turn's changes to her tracks, by track (Gravenhold's applyResult arithmetic): clamped per turn, heat and
// intimacy gains capped per encounter, heat after her payoff feeding her dark branch if she declares it.
export function applyDelta(rom, c, delta) {
  const out = copy(rom);
  const r = out.rel[c.id];
  const d = Object.fromEntries(Object.entries(R.caps.perTurn).map(([k, range]) => [k, clamp(Math.round(delta[k] ?? 0), range)]));
  if (d.heat > 0) {
    if (r.payoff) {
      if (c.leanFromHeat) r.lean = clamp(r.lean + d.heat * R.afterPayoff.heatToLean, R.tracks.lean);
    } else {
      const g = Math.min(d.heat, Math.max(0, R.caps.perEncounter.heat - r.gain.heat));
      r.heat = clamp(r.heat + g, R.tracks.heat);
      r.gain.heat += g;
    }
  } else if (d.heat < 0) r.heat = clamp(r.heat + d.heat, R.tracks.heat);
  if (d.intimacy > 0) {
    const g = Math.min(d.intimacy, Math.max(0, R.caps.perEncounter.intimacy - r.gain.intimacy));
    r.intimacy = clamp(r.intimacy + g, R.tracks.intimacy);
    r.gain.intimacy += g;
    if (r.payoff) r.lean = clamp(r.lean - d.intimacy * R.afterPayoff.intimacyFromLean, R.tracks.lean);
  } else if (d.intimacy < 0) {
    r.intimacy = clamp(r.intimacy + d.intimacy, R.tracks.intimacy);
    if (d.intimacy <= R.hurt.intimacyDrop) r.hurt = true;
  }
  if (d.lean > 0) r.lean = clamp(r.lean + d.lean, R.tracks.lean);
  r.regard = clamp(r.regard + d.regard, R.tracks.regard);
  if (r.regard <= R.hurt.regard) r.hurt = true;
  return out;
}

// Tagged reactions from her own call (D20): each moves the tracks its field maps to, by sign × intensity.
export function reactionDelta(reactions) {
  const d = {};
  for (const x of reactions) for (const [track, w] of Object.entries(R.scoring[x.field] ?? {})) d[track] = (d[track] ?? 0) + w * x.sign * x.intensity;
  return d;
}
export const applyReactions = (rom, c, reactions) => applyDelta(rom, c, reactionDelta(reactions));

// Apply beats in order, each checked against what's allowed at that moment, so a payoff can unlock what follows
// it in the same scene. Returns the new state and any beats that weren't allowed.
export function applyBeats(rom, c, members, beats, scene = {}) {
  let out = copy(rom);
  const rejected = [];
  for (const b of beats) {
    if (!allowedBeats(out, c, members, scene).includes(b)) {
      rejected.push(b);
      continue;
    }
    const r = out.rel[c.id];
    if (b === "payoff") Object.assign(r, { payoff: true, payoffTurn: out.turn });
    else if (b === "vulnerability") r.vuln = true;
    else if (b === "deep" || b === "bond") r[b] = true;
    else if (b === "rupture") Object.assign(r, { hurt: true, regard: clamp(r.regard + R.beatEffects.rupture.regard, R.tracks.regard) });
    else if (b === "repair") Object.assign(r, { hurt: false, regard: Math.max(r.regard, 0) + R.beatEffects.repair.regardFloor });
    else if (b === "discovered") out.knows = true;
    else if (b === "shared") Object.assign(out, { shared: true, knows: true });
    else if (b === c.secondVoice?.beat) r.manifest = true;
    else r.beatTurns[b] = out.turn;
  }
  return { state: out, rejected };
}

// Problems with a campfire output beyond its schema: beats not allowed, lines for a voice she doesn't have here,
// an outfit she doesn't own, and, when she answers second with both companions present and the first moved
// nothing (`scene.mustAdvance`, D70), moving nothing herself. A call with problems gets one retry with them listed (D13).
export function campfireProblems(rom, c, members, out, scene = {}) {
  const problems = [];
  let s = rom;
  for (const b of out.beats) {
    const r = applyBeats(s, c, members, [b], scene);
    if (r.rejected.length) problems.push(`beat ${b} isn't allowed now`);
    s = r.state;
  }
  if (out.segments.some((x) => x.speaker === "second_voice") && !secondVoiceState(rom, c, scene)?.speaks) problems.push("no second voice speaks in this scene");
  if (out.outfit && !rom.wardrobe?.[c.id]?.owned[out.outfit]) problems.push(`she doesn't own an outfit called ${out.outfit}`);
  if (scene.mustAdvance && !out.advances) problems.push("the other companion moved nothing this exchange, so this answer has to (advances)");
  return problems;
}

// A campfire output, once it has no problems: track changes (within the same caps), the pair, beats, memories,
// revealed secrets and commitments. Everything is about her (D45).
export function applyCampfire(rom, c, members, out, scene = {}) {
  const delta = {};
  let pairBy = 0;
  for (const x of out.changes) {
    if (x.track === "pair") pairBy += x.by;
    else delta[x.track] = (delta[x.track] ?? 0) + x.by;
  }
  let s = applyDelta(rom, c, delta);
  s.pair.value = clamp(s.pair.value + clamp(pairBy, [-R.pair.perScene, R.pair.perScene]), R.pair.range);
  s = applyBeats(s, c, members, out.beats, scene).state;
  const r = s.rel[c.id];
  r.memories = [...r.memories, ...out.memories].slice(-R.memoryLimit);
  r.commitments = [...r.commitments, ...out.commitments];
  r.revealed = [...new Set([...r.revealed, ...out.secrets])];
  return out.outfit ? equip(s, c.id, out.outfit) : s;
}

// The love-triangle state for her (Gravenhold's configOf). A tie can declare how the triangle reads when both
// are involved with him (`tie.triangle.bothInvolved`), from either companion's side.
export function config(rom, c, members) {
  const o = members.find((m) => m.id !== c.id);
  const r = rom.rel[c.id];
  const ro = o ? rom.rel[o.id] : null;
  if (r.payoff && ro?.payoff) {
    const mine = c.tie?.triangle?.bothInvolved;
    const theirs = o.tie?.triangle?.bothInvolved;
    if (mine) return rom.knows ? mine.self.known : mine.self.secret;
    if (theirs) return theirs.partner;
    if (rom.shared) return "shared";
    if (rom.knows) return "rivals";
    return (r.payoffTurn ?? 0) <= (ro.payoffTurn ?? 0) ? "cheatedOn" : "affair";
  }
  if (r.payoff) return "chosen";
  if (ro?.payoff) return r.heat >= c.payoff.at * R.secondFiddleAt ? "secondfiddle" : "thirdwheel";
  if (rom.turn >= R.ignored.turn && r.heat < R.ignored.heat && r.intimacy < R.ignored.intimacy) return "ignored";
  return "open";
}

// The UI's stage label (Gravenhold's stageLabel), with her own wording where she declares it.
export function stage(rel, c) {
  const L = { ...R.stageLabels, ...(c.stageLabels ?? {}) };
  const A = R.stageAt;
  if (rel.hurt) return L.hurt;
  if (rel.deep) return rel.lean >= A.consumed ? L.consumed : L.inLove;
  if (rel.bond) return L.bonded;
  if (rel.vuln) return rel.payoff ? L.loversOpening : L.opening;
  if (rel.payoff) return rel.lean >= A.indulging ? L.indulging : L.lovers;
  if (rel.heat >= c.payoff.at - A.burningWithin) return L.burning;
  if (rel.heat >= A.drawn) return L.drawn;
  if (rel.intimacy >= A.friends) return L.friends;
  return L.strangers;
}

// How much of the relationship the sigil fills, 0–7 (Gravenhold's progress).
export function progress(rel, c) {
  const P = R.progressAt;
  let n = rel.payoff ? 3 : Math.min(2, Math.floor((3 * rel.heat) / c.payoff.at));
  if (rel.intimacy >= P.friends) n++;
  if (rel.vuln) n++;
  if (rel.intimacy >= P.close) n++;
  if (rel.deep || rel.bond) n++;
  return Math.min(P.max, n);
}

// An exchange with the player: the campaign turn advances.
export const nextTurn = (rom) => ({ ...copy(rom), turn: rom.turn + 1 });

// When an encounter ends, the per-encounter gain caps reset.
export function endEncounter(rom) {
  const out = copy(rom);
  for (const r of Object.values(out.rel)) r.gain = { heat: 0, intimacy: 0 };
  return out;
}
