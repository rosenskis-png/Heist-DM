// The relationship model (docs/spec/companions.md §4–6). Pure: each function takes the party's relationship
// state and returns a new one. Numbers and words come from content/relationship.js; anything one companion
// does differently is declared in her file. Code never names a companion (D8).
import * as R from "../../content/relationship.js";
import { pairEntry } from "./roster.js";
import { newWardrobe, equip } from "./wardrobe.js";
import { d100 } from "../engine/rng.js";

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
  // Whether they're lovers now (the payoff starts it, a breakup ends it, D96).
  involved: false,
  // What she believes about him and the other companion: ever involved, and involved now (D96).
  believes: { past: false, current: false },
  // A declared escalation's level, 0 when calm (D97).
  storm: 0,
  // A shapeshifter's current form, in words, or null for her own look (D101).
  form: null,
  // Whether she knows the other companion can change her shape (D101).
  knowsShifter: false,
  // Campaign turns when someone wearing her face was alone with him (D101).
  absent: [],
  // What she privately means to do, in a line, carried from scene to scene (D107).
  agenda: null,
  gain: { heat: 0, intimacy: 0 },
  beatTurns: {},
  memories: [],
  commitments: [],
  revealed: [],
  // How she feels about the other companion, and how she thinks the other feels about her (D91), on each axis (D92).
  toward: axes(0),
  read: axes(0),
});

// A companion's `fixed` tracks never move (D100).
function pin(r, c) {
  for (const [k, v] of Object.entries(c.fixed ?? {})) r[k] = v;
  return r;
}

// A view on the three axes: one number sets affection only.
export function axes(v) {
  const o = typeof v === "number" ? { affection: v } : v ?? {};
  return Object.fromEntries(R.axes.map((k) => [k, o[k] ?? 0]));
}

// The party's relationship state: one entry per companion, plus the pair. `members` are the two companions.
// A pair's `start` is one number for both, or each one's own view keyed by id (D88), and a view is one number
// (affection) or the three axes (D92). A tie's `start` and `partnerStart` give both views for her and her partner.
// Her first read of the other is right (D91), unless the other declares a `mask`: then her read starts at the mask.
export function newRomance(members, pairs = {}, { turn = 0, act = 1, seed = 1 } = {}) {
  const [a, b] = members.map((c) => c.id);
  const start = b ? pairEntry(pairs, a, b)?.start ?? 0 : 0;
  const tied = members.find((c, i) => c.tie && members[1 - i] && (c.tie.start || c.tie.partnerStart));
  const startOf = (c) => {
    if (tied) return axes(c === tied ? tied.tie.start : tied.tie.partnerStart);
    return axes(typeof start === "number" ? start : start[c.id] ?? 0);
  };
  const views = members.map(startOf);
  const shown = members.map((c, i) => (c.mask ?? c.tie?.mask ? axes(c.mask ?? c.tie.mask) : views[i]));
  // Two shapeshifters know each other's secret from the start.
  const bothShift = members.length > 1 && members.every((c) => c.shapeshift);
  return {
    turn,
    act,
    rel: Object.fromEntries(members.map((c, i) => [c.id, pin({ ...newRel(), toward: axes(views[i]), read: axes(shown[1 - i] ?? 0), knowsShifter: bothShift }, c)])),
    open: false,
    shared: false,
    rng: seed >>> 0,
    wardrobe: newWardrobe(members),
  };
}

// The limits on her view of the other: her own `limits`, and her tie's toward her partner until its `until` beat
// has happened (D92). Each is { <axis>: [lo, hi], perScene }.
export function limitsFor(rom, c, members) {
  const out = { perScene: R.pair.perScene, ...Object.fromEntries(R.axes.map((k) => [k, R.pair.range])) };
  const o = members.find((m) => m.id !== c.id);
  const tie = c.tie?.limits && o && (c.tie.withId === o.id || c.tie.by?.[o.id]) ? c.tie.limits : null;
  const lifted = tie?.until && rom.rel[c.id].beatTurns[tie.until] != null;
  for (const l of [c.limits, lifted ? null : tie]) {
    if (!l) continue;
    for (const k of R.axes) if (l[k]) out[k] = [Math.max(out[k][0], l[k][0]), Math.min(out[k][1], l[k][1])];
    if (l.perScene != null) out.perScene = Math.min(out.perScene, l.perScene);
  }
  return out;
}

// Who answers first at the campfire when the player sits with both: it alternates by campaign turn (D85).
export const speakingOrder = (rom, ids) => (rom.turn % 2 ? [...ids].reverse() : [...ids]);

// What gates read: her tracks and flags (including her read of the other, never the other's real feelings, D91),
// the campaign's turn and act, and two distances.
export function view(rom, c) {
  const { toward, read, believes, ...rel } = rom.rel[c.id];
  const cap = (k) => k[0].toUpperCase() + k.slice(1);
  return {
    ...rel,
    ...toward,
    ...Object.fromEntries(Object.entries(read).map(([k, v]) => [`read${cap(k)}`, v])),
    believesPast: believes.past,
    believesCurrent: believes.current,
    open: rom.open,
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
// `manifestsAfter`, once that flag is set or about to be. Whether she does is the scene's call. In company in
// person, she may do both once the gate `inCompany` holds (D98).
export function secondVoiceState(rom, c, scene = {}) {
  const sv = c.secondVoice;
  if (!sv) return null;
  const after = sv.manifestsAfter;
  const due = !after || rom.rel[c.id][after] || ready(rom, c).includes(after);
  if (!scene.private) return scene.inPerson && due && sv.inCompany && holds(view(rom, c), sv.inCompany) ? { speaks: true, canAppear: true, inCompany: true } : { speaks: false };
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
  if (r.involved) out.push("breakup");
  if (r.payoff && !r.involved) out.push("rekindle");
  if (o && !scene.private && !rom.open) out.push("in_the_open");
  if (o && c.shapeshift && !scene.private && !ro.knowsShifter) out.push("unmasked");
  if (o && !rom.shared && r.involved && ro.involved && members.every((m) => m.tie?.triangle?.shared !== false)) out.push("shared");
  const v = view(rom, c);
  for (const b of c.extraBeats ?? []) {
    const last = r.beatTurns[b.id];
    if (b.once && last != null) continue;
    if (b.cooldown != null && rom.turn - (last ?? -Infinity) < b.cooldown) continue;
    if (b.when && !holds(v, b.when)) continue;
    out.push(b.id);
  }
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
    const g = Math.min(d.heat, Math.max(0, R.caps.perEncounter.heat - r.gain.heat));
    r.heat = clamp(r.heat + g, R.tracks.heat);
    r.gain.heat += g;
    if (r.payoff && c.leanFromHeat) r.lean = clamp(r.lean + g * R.afterPayoff.heatToLean, R.tracks.lean);
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
  pin(r, c);
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
    const o = members.find((m) => m.id !== c.id);
    if (b === "payoff") Object.assign(r, { payoff: true, payoffTurn: out.turn, involved: true });
    else if (b === "vulnerability") r.vuln = true;
    else if (b === "deep" || b === "bond") r[b] = true;
    else if (b === "rupture") Object.assign(r, { hurt: true, regard: clamp(r.regard + R.beatEffects.rupture.regard, R.tracks.regard) });
    else if (b === "repair") Object.assign(r, { hurt: false, regard: Math.max(r.regard, 0) + R.beatEffects.repair.regardFloor });
    else if (b === "breakup") {
      r.involved = false;
      if (out.open && o) out.rel[o.id].believes.current = false;
    } else if (b === "unmasked") {
      if (o) out.rel[o.id].knowsShifter = true;
    } else if (b === "rekindle") {
      r.involved = true;
      if (out.open && o) out.rel[o.id].believes = { past: true, current: true };
    } else if (b === "in_the_open" || b === "shared") {
      // Out in the open, each knows the truth about the other.
      out.open = true;
      if (b === "shared") out.shared = true;
      for (const m of members) {
        const t = out.rel[members.find((x) => x.id !== m.id).id];
        out.rel[m.id].believes = { past: !!t.payoff, current: !!t.involved };
      }
      if (b === "in_the_open") r.beatTurns[b] = out.turn;
    }
    else if (b === c.secondVoice?.beat) r.manifest = true;
    else r.beatTurns[b] = out.turn;
  }
  return { state: out, rejected };
}

// A campfire output with its "nothing" parts filled in before it's checked (D110): an absent optional field is null,
// an absent list is empty, and a segment with no aside marked is ordinary scene text. Anything else that's wrong
// still fails the check and goes back for the one retry.
const NULLABLE = ["advances", "outfit", "believes", "storm", "risk", "form", "agenda"];
const LISTS = ["changes", "memories", "secrets", "commitments", "beats"];
export function fillCampfire(out) {
  if (!out || typeof out !== "object" || Array.isArray(out)) return out;
  const o = { ...out };
  for (const k of NULLABLE) if (o[k] === undefined) o[k] = null;
  for (const k of LISTS) if (o[k] === undefined || o[k] === null) o[k] = [];
  if (Array.isArray(o.segments)) o.segments = o.segments.map((g) => (g && typeof g === "object" ? { ...g, aside: g.aside === true ? "action" : g.aside === false || g.aside == null ? "no" : g.aside } : g));
  return o;
}

// Problems with a campfire output beyond its schema: beats not allowed, lines for a voice she doesn't have here,
// an outfit she doesn't own, and, when she answers second with both companions present and the first moved
// nothing (`scene.mustAdvance`, D85), moving nothing herself. A call with problems gets one retry with them listed (D13).
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
  if (out.form && !c.shapeshift) problems.push("she can't change her shape (form must be null)");
  const top = c.escalation?.tiers.length ?? 0;
  if (out.storm != null && !c.escalation) problems.push("she has no storm level (storm must be null)");
  else if (out.storm != null && (out.storm < 0 || out.storm > top)) problems.push(`storm must be 0 to ${top}`);
  return problems;
}

// A campfire output, once it has no problems: track changes (within the same caps), her view of the other
// companion, beats, memories, revealed secrets, commitments and her outfit. Everything is about her (D45).
export function applyCampfire(rom, c, members, out, scene = {}) {
  const delta = {};
  const toward = {};
  const read = {};
  for (const x of out.changes) {
    if (R.axes.includes(x.track)) toward[x.track] = (toward[x.track] ?? 0) + x.by;
    else if (x.track.startsWith("read_")) read[x.track.slice(5)] = (read[x.track.slice(5)] ?? 0) + x.by;
    else delta[x.track] = (delta[x.track] ?? 0) + x.by;
  }
  let s = recover(applyDelta(rom, c, delta), c, delta);
  const own = s.rel[c.id];
  const lim = limitsFor(rom, c, members);
  const step = (v, by, range) => clamp(v + clamp(by ?? 0, [-lim.perScene, lim.perScene]), range);
  for (const k of R.axes) {
    own.toward[k] = step(own.toward[k], toward[k], lim[k]);
    own.read[k] = step(own.read[k], read[k], R.pair.range);
  }
  if (out.believes) own.believes = { past: !!(out.believes.past || out.believes.current), current: !!out.believes.current };
  if (c.escalation && out.storm != null) own.storm = clamp(Math.max(out.storm, own.storm - 1), [0, c.escalation.tiers.length]);
  if (out.agenda) own.agenda = out.agenda;
  if (c.shapeshift && out.form) own.form = out.form;
  // She wore the other's face: the other wasn't there (D101).
  if (scene.disguisedAs && s.rel[scene.disguisedAs]) s.rel[scene.disguisedAs].absent = [...new Set([...s.rel[scene.disguisedAs].absent, s.turn])].slice(-R.absentLimit);
  s = applyBeats(s, c, members, out.beats, scene).state;
  const r = s.rel[c.id];
  r.memories = [...r.memories, ...out.memories].slice(-R.memoryLimit);
  r.commitments = [...r.commitments, ...out.commitments];
  r.revealed = [...new Set([...r.revealed, ...out.secrets])];
  return out.outfit ? equip(s, c.id, out.outfit) : s;
}

// With no change to a baseline track this answer, a value below the baseline rises toward it (D93).
export function recover(rom, c, delta) {
  const out = copy(rom);
  const r = out.rel[c.id];
  for (const k of R.baseline.tracks) if (!delta[k] && r[k] < R.baseline.to) r[k] = Math.min(R.baseline.to, r[k] + R.baseline.by);
  pin(r, c);
  return out;
}

// Who really comes when the player sits with `chosen` alone (D101): a shapeshifting other companion may come in
// her place, by the first of her `impersonation` alternatives whose gate holds. Moves the seeded roll.
export function whoComes(rom, members, chosen) {
  const out = copy(rom);
  const o = members.find((m) => m.id !== chosen);
  const alt = (o?.shapeshift?.impersonation ?? []).find((a) => !a.when || holds(view(out, o), a.when));
  const actor = alt && d100(out) <= alt.chance ? o.id : chosen;
  return { state: out, actor };
}

// Whether an aside is caught, by the speaker's declared risk (D95). Moves the party's seeded roll (D12).
export function rollCatch(rom, risk = "low") {
  return d100(rom) <= (R.asideCatch[risk] ?? R.asideCatch.low);
}

// Whether the other companion catches this answer's hidden action, if it has one (D108): one roll per answer, by the
// speaker's declared risk, and only in company. Words over the rings are silent and never caught.
export function catchAside(rom, out, scene = {}) {
  const state = copy(rom);
  if (scene.private || !out.segments.some((x) => x.aside === "action")) return { state, caught: false };
  return { state, caught: rollCatch(state, out.risk ?? "low") };
}

// The love-triangle state for her (Gravenhold's configOf), from her own involvement and what she believes about
// him and the other, never the truth about them (D96). Both can be in the dark at once.
export function config(rom, c, members) {
  const o = members.find((m) => m.id !== c.id);
  const r = rom.rel[c.id];
  const ro = o ? rom.rel[o.id] : null;
  const thinks = !!(o && r.believes?.current);
  if (r.involved) {
    if (!thinks) return "chosen";
    if (rom.shared) return "shared";
    if (rom.open) return "rivals";
    return (r.payoffTurn ?? 0) <= (ro.payoffTurn ?? Infinity) ? "cheatedOn" : "affair";
  }
  if (r.payoff) return "former";
  if (thinks) return r.heat >= c.payoff.at * R.secondFiddleAt ? "secondfiddle" : "thirdwheel";
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
  if (rel.payoff && rel.involved === false) return L.former;
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

// How a room went, from its verdict's rating (D146), as one number.
export const moraleOf = (verdict) => (verdict ? R.morale.byRating[verdict.rating - 1] ?? 0 : 0);

// When a room ends, its verdict moves how everyone feels (D131, D146): the rating moves each companion's regard for
// him, and her affection and trust toward the other; then each companion's own reactions to how it went apply, within
// the usual caps (D20). Her read of the other's stays hers to revise at camp (D91). Then the per-encounter gain caps
// reset.
export function endEncounter(rom, members = [], verdict = null) {
  let out = copy(rom);
  const m = moraleOf(verdict);
  for (const c of m ? members : []) {
    out = applyDelta(out, c, { regard: m * R.morale.moves.regard });
    if (members.length < 2) continue;
    const r = out.rel[c.id];
    const lim = limitsFor(out, c, members);
    for (const k of ["affection", "trust"]) r.toward[k] = clamp(r.toward[k] + m * R.morale.moves[k], lim[k]);
  }
  for (const c of members) {
    const mine = (verdict?.reactions ?? []).filter((x) => x.from === c.id);
    if (mine.length) out = applyReactions(out, c, mine);
  }
  for (const r of Object.values(out.rel)) r.gain = { heat: 0, intimacy: 0 };
  return out;
}
