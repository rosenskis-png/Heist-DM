// The plan pipeline (docs/spec/engine.md §6): check the step call's output, project each step, check the
// pricing call's output, strip what the card doesn't show, and execute.
import { clone, conn, person, thing, isParty, isNpc, nameOf, zoneOf, carried } from "./world.js";
import { test, subjects, beatsNamed } from "./cond.js";
import { run, abilityOf } from "./ops.js";
import { nextTick, beatOf, triggers, objectives, log } from "./clock.js";
import { crossings, route, blocked, unlocksInPassing, cantWork } from "./map.js";
import { npcPerceives, whoPerceives, partyPerceives } from "./perceive.js";
import { d100, ODDS } from "./rng.js";

export const MAX_WAIT = 6;

const opOf = (op) => Object.entries(op)[0];

// ---- 1. Checking the step call ----

// Flag keys the engine knows: the packet's and the sheets' own (D52).
export function flagKeys(s) {
  const keys = new Set();
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    if (node.set_flag?.key) keys.add(node.set_flag.key);
    if (Array.isArray(node.flag)) keys.add(node.flag[1]);
    if (node.flags && typeof node.flags === "object" && !Array.isArray(node.flags)) Object.keys(node.flags).forEach((k) => keys.add(k));
    Object.values(node).forEach(walk);
  };
  walk([s.packet, s.party.map((p) => p.abilities)]);
  return keys;
}

const ID_KEYS = ["entity", "to", "item", "npc", "holder", "actor", "zone"];
function idsIn(node, out = []) {
  if (Array.isArray(node)) node.forEach((n) => idsIn(n, out));
  else if (node && typeof node === "object")
    for (const [k, v] of Object.entries(node)) {
      if (ID_KEYS.includes(k) && typeof v === "string") out.push(v);
      else if (k === "actors" && Array.isArray(v)) out.push(...v);
      else idsIn(v, out);
    }
  return out;
}

const allIds = (s) =>
  new Set([
    ...["zones", "connections", "things", "facts"].flatMap((k) => s.packet.map[k].map((x) => x.id)),
    ...s.packet.people.map((p) => p.id),
    ...s.packet.clock.meters.map((m) => m.id),
    ...s.party.map((p) => p.id),
  ]);

// A routine named in a plan's `when` or `if` must be one the party knows (D35).
const knownBeat = (s, [npc]) => {
  const sch = person(s, npc)?.schedule;
  return !sch || sch.known || s.known.revealed.includes(sch.id);
};

// Checks the step call's output against state. `errors` go back to the step call for its one retry (D13);
// `fits` are named routes that fail only on size, which go to the ruling call instead (D55).
export function checkSteps(s, out) {
  const errors = [];
  const fits = [];
  const ids = allIds(s);
  const keys = flagKeys(s);
  const sim = clone(s);
  sim.belief = true;
  for (const step of out.steps) {
    const at = `step ${step.n}`;
    for (const id of idsIn(step)) if (!ids.has(id) && !id.startsWith("@")) errors.push(`${at}: unknown id ${id}`);
    for (const c of [step.when?.until, step.if].filter(Boolean)) {
      for (const b of beatsNamed(c)) if (!knownBeat(s, b)) errors.push(`${at}: the party doesn't know ${b[0]}'s routine`);
      for (const id of subjects(c)) if (!ids.has(id) && id !== "party") errors.push(`${at}: unknown id ${id}`);
    }
    for (const op of step.effects) {
      const [k, v] = opOf(op);
      if (k === "set_flag" && !keys.has(v.key)) errors.push(`${at}: flag "${v.key}" isn't one the packet uses; write new facts as canon`);
      if (k === "use_ability" && !abilityOf(sim, v.actor, v.ability)) errors.push(`${at}: ${v.actor} has no ability ${v.ability}`);
      if (k === "move" || k === "give") {
        const p = movePlan(sim, op);
        if (p.error) errors.push(`${at}: ${p.error}`);
        for (const f of p.blocks)
          if (v.path) fits.push({ step: step.n, who: f.who, connection: f.connection, by: k === "give" ? step.actors[0] : v.entity });
          else errors.push(`${at}: no way for ${f.who} to reach ${v.to} that fits`);
      }
      if (ids.has(idsIn(op)[0]) || k === "use_ability") run(sim, [op], { self: step.actors[0], stepZone: step.zone });
    }
  }
  return { errors, fits };
}

// The connections a move or give crosses, and anything moving that doesn't fit (D51, D54, D55).
function movePlan(s, op) {
  const [k, v] = opOf(op);
  const id = k === "move" ? v.entity : v.item;
  const from = zoneOf(s, id);
  const to = k === "move" ? v.to : zoneOf(s, v.to) ?? v.to;
  const movers = [id, ...carried(s, id)];
  if (!from || from === to) return { conns: [], blocks: [] };
  let conns;
  if (v.path) {
    const c = crossings(s, from, v.path);
    if (c.error) return { error: `no way from ${c.at} into ${c.error}`, blocks: [] };
    if (c.end !== to) return { error: `the path ends in ${c.end}, not ${to}`, blocks: [] };
    conns = c.conns;
  } else {
    conns = route(s, from, to, movers);
    if (!conns) {
      // Name the first thing that can't get through, for the interruption.
      const any = route({ ...s, exceptions: [...s.exceptions, ...ignoreFit(s, movers)] }, from, to, movers) ?? [];
      const blocks = [];
      let here = from;
      for (const cid of any) {
        for (const m of movers) {
          const why = blocked(s, conn(s, cid), m, movers, here);
          if (why) blocks.push({ who: m, connection: cid, why });
        }
        here = conn(s, cid).between.find((z) => z !== here);
      }
      return { conns: any, blocks: blocks.length ? blocks : [{ who: id, connection: null, why: "too_big" }] };
    }
  }
  const blocks = [];
  let here = from;
  for (const cid of conns) {
    for (const m of movers) {
      const why = blocked(s, conn(s, cid), m, movers, here);
      if (why) blocks.push({ who: m, connection: cid, why });
    }
    here = conn(s, cid).between.find((z) => z !== here);
  }
  return { conns, blocks };
}
const ignoreFit = (s, movers) => s.packet.map.connections.flatMap((c) => movers.map((m) => `${m}|${c.id}`));

// A move longer than two crossings is split into consecutive steps, each inheriting the step's actors, noise
// and timing (D56). Steps are renumbered; the step call's own numbering is kept in `from`.
export function splitLongMoves(s, steps) {
  const sim = clone(s);
  sim.belief = true;
  const out = [];
  for (const step of steps) {
    const legs = [];
    for (const op of step.effects) {
      const [k, v] = opOf(op);
      if (k !== "move" || v.path) continue;
      const conns = route(sim, zoneOf(sim, v.entity), v.to, [v.entity, ...carried(sim, v.entity)]) ?? [];
      if (conns.length > 2) legs.push({ op, zones: walk(sim, zoneOf(sim, v.entity), conns) });
    }
    const parts = Math.max(1, ...legs.map((l) => Math.ceil(l.zones.length / 2)));
    for (let i = 0; i < parts; i++) {
      const effects =
        parts === 1
          ? step.effects
          : step.effects.flatMap((op) => {
              const leg = legs.find((l) => l.op === op);
              if (!leg) return i === 0 ? [op] : [];
              const zs = leg.zones.slice(i * 2, i * 2 + 2);
              return zs.length ? [{ move: { entity: opOf(op)[1].entity, to: zs[zs.length - 1], path: zs } }] : [];
            });
      const part = { ...step, n: out.length + 1, from: step.n, effects };
      if (i > 0) delete part.when, delete part.if, delete part.otherwise;
      out.push(part);
    }
    run(sim, step.effects, { self: step.actors[0], stepZone: step.zone });
  }
  return out;
}
const walk = (s, from, conns) => {
  const zs = [];
  let here = from;
  for (const cid of conns) zs.push((here = conn(s, cid).between.find((z) => z !== here)));
  return zs;
};

// ---- 2. Projection ----

// What a step needs to find where the plan left it: the item a `give` or `consume` takes. The plan assumes
// things stay where the party last saw them unless its own steps move them (D42, D47).
function needs(op) {
  const [k, v] = opOf(op);
  return k === "give" || k === "consume" ? v.item : null;
}
const locOf = (s, id) => (s.holder[id] !== undefined ? { holder: s.holder[id] } : s.at[id] != null ? { zone: s.at[id] } : null);
const sameLoc = (a, b) => (a?.holder ?? null) === (b?.holder ?? null) && (a?.zone ?? null) === (b?.zone ?? null);
const after = (s, op) => {
  const [k, v] = opOf(op);
  return k === "give" ? { holder: v.to } : k === "place" ? { zone: v.zone } : k === "consume" ? null : undefined;
};
const cap = (t) => t[0].toUpperCase() + t.slice(1);
function where(s, loc) {
  if (!loc) return "gone";
  if (loc.zone) return `in ${nameOf(s, loc.zone)}`;
  return thing(s, loc.holder) ? `on ${nameOf(s, loc.holder)}` : `with ${nameOf(s, loc.holder)}`;
}

// The NPCs who would perceive a step: anyone not taking part in the plan who is on its route, sees one of its
// zones, or hears it (engine.md §2). NPCs acting in the plan are with the party, not watching it (D61).
function observers(s, route, noise, plan) {
  const acting = new Set(plan.flatMap((st) => st.actors));
  return s.packet.people.filter((p) => !acting.has(p.id) && npcPerceives(s, p.id, route, noise)).map((p) => p.id);
}

const enter = (t, z) => z && !t.route.includes(z) && t.route.push(z);

// Projects every step as if the earlier steps went as planned (D36): its tick, beats, route, the observers,
// barriers and hazards the party foresees, `as_if`, and the interrupts where reality differs. Reality and the
// party's expectation are two copies of state run side by side; the expectation runs only known routines and events.
export function project(s, steps, internalChecks = []) {
  const real = clone(s);
  const seen = clone(s);
  seen.belief = true;
  const expect = {};
  const facts = [];
  let fight = !!real.combat;
  let ended = !!real.ended;
  steps.forEach((step, i) => {
    if (i > 0) nextTick(real), nextTick(seen);
    const f = { n: step.n, tick: real.tick };
    const interrupts = [];
    const watchers = new Set();
    let waited = 0;
    if (step.when) {
      const max = step.when.max_wait ?? MAX_WAIT;
      while (!test(real, step.when.until) && waited < max) {
        for (const id of observers(real, step.actors.map((a) => zoneOf(real, a)), "silent", steps)) watchers.add(id);
        nextTick(real), nextTick(seen), waited++;
      }
      f.tick = real.tick;
      if (waited) f.waited = waited;
      if (!test(real, step.when.until)) interrupts.push({ code: "wait_expired", detail: `The wait runs out after ${waited} ticks.` });
      else if (!whoPerceives(real, subjects(step.when.until))) interrupts.push({ code: "cant_perceive", detail: "No one in the party can see or hear what the wait is for." });
    }
    f.beats = Object.fromEntries(real.packet.people.map((p) => [p.id, beatOf(real, p.id)?.id]).filter(([, b]) => b));
    if ((real.combat && !fight) || (real.ended && !ended))
      interrupts.push({ code: "trigger_fires", id: real.combat?.enemies[0] ?? real.ended.outcome, detail: real.combat ? "A fight starts before the step." : `The encounter ends (${real.ended.outcome}).` });
    if (step.requires && !test(real, step.requires)) interrupts.push({ code: "requires_failed", detail: "What the step needs doesn't hold at its tick." });
    if (step.if && !whoPerceives(real, subjects(step.if))) interrupts.push({ code: "cant_perceive", detail: "No one in the party can see or hear what the condition is about." });
    const t = { route: [] };
    step.actors.forEach((a) => enter(t, zoneOf(real, a)));
    const before = clone(real);
    const asIf = [];
    const barriers = [];
    step.effects.forEach((op, e) => {
      const [k, v] = opOf(op);
      const item = needs(op);
      if (item) {
        const want = item in expect ? expect[item] : locOf(s, item);
        if (!sameLoc(locOf(real, item), want)) {
          asIf.push(`${cap(nameOf(real, item))} is ${where(real, want)}.`);
          interrupts.push({ code: "not_there", effect: e, id: item, detail: `${cap(nameOf(real, item))} is ${where(real, locOf(real, item))}, not ${where(real, want)}.` });
        }
      }
      if (k === "use_ability") {
        const a = abilityOf(real, v.actor, v.ability);
        const max = a?.declared?.uses?.encounter;
        if (max && (real.uses[v.actor]?.[v.ability] ?? 0) >= max) interrupts.push({ code: "ability_spent", effect: e, id: v.actor, detail: `${a.name} is spent for this encounter.` });
      }
      if (k === "set_flag" && v.key === "locked" && v.value === false && conn(real, v.entity) && real.flags[v.entity]?.locked) barriers.push(v.entity);
      const work = workProblem(real, op, step.actors, e);
      if (work) interrupts.push(work);
      if (k === "move" || k === "give") {
        const p = movePlan(real, op);
        const id = k === "move" ? v.entity : v.item;
        let here = zoneOf(real, id);
        enter(t, here);
        for (const cid of p.conns ?? []) {
          if (unlocksInPassing(real, conn(real, cid), [id, ...carried(real, id)], here) && !barriers.includes(cid)) barriers.push(cid);
          enter(t, (here = conn(real, cid).between.find((z) => z !== here)));
        }
        for (const b of p.blocks) interrupts.push({ code: b.why, effect: e, id: b.who, detail: `${cap(nameOf(real, b.who))} can't get through ${b.connection ? nameOf(real, b.connection) : "on any route"}.` });
      }
      if (item) expect[item] = after(real, op);
      run(real, [op], { self: step.actors[0], stepZone: step.zone });
      run(seen, [op], { self: step.actors[0], stepZone: step.zone });
    });
    for (const id of observers(before, t.route, step.noise, steps)) watchers.add(id);
    const foreseen = new Set([...observersSeen(seen, before, t.route, step, steps)]);
    f.route = t.route;
    f.observers = [...watchers].filter((id) => foreseen.has(id));
    f.barriers = barriers;
    f.hazards = [];
    f.as_if = asIf;
    for (const id of [...watchers].filter((id) => !foreseen.has(id)))
      interrupts.unshift({ code: "arrival", id, detail: `${cap(nameOf(real, id))} would see or hear the step, and the party doesn't expect it.` });
    for (const c of internalChecks.filter((x) => x.step === step.n)) interrupts.push({ code: "hidden_fact", id: c.fact, detail: "A hidden fact defeats the step." });
    f.interrupts = interrupts;
    fight = !!real.combat;
    ended = !!real.ended;
    triggers(real, { step, stepZone: step.zone });
    triggers(seen, { step, stepZone: step.zone });
    facts.push(f);
  });
  return facts;
}

// The observers the party expects: the same test run on the expectation, at the moment the step begins.
function observersSeen(seen, real, route, step, steps) {
  const b = clone(seen);
  b.tick = real.tick;
  return observers(b, route, step.noise, steps).filter((id) => b.at[id] != null);
}


// ---- 3. Checking the pricing call ----

// Words the party doesn't know: hidden things' names and ids, and NPCs it doesn't expect (D36).
function unknownTerms(s, facts) {
  const { map } = s.packet;
  const hidden = [...map.zones, ...map.connections, ...map.things, ...map.facts].filter((x) => x.hidden && !s.known.revealed.includes(x.id));
  const arrivals = facts.flatMap((f) => f.interrupts.filter((x) => x.code === "arrival").map((x) => x.id));
  return [...hidden.flatMap((x) => [x.id, x.name]), ...arrivals.flatMap((id) => [id, person(s, id)?.name?.split(",")[0]])].filter(Boolean).map((t) => t.toLowerCase());
}

export function checkPricing(s, steps, facts, out) {
  const errors = [];
  const byN = new Map(out.steps.map((p) => [p.n, p]));
  const terms = unknownTerms(s, facts);
  for (const f of facts) {
    const p = byN.get(f.n);
    if (!p) {
      errors.push(`step ${f.n} isn't priced`);
      continue;
    }
    const listed = new Set([...f.observers, ...f.barriers, ...f.hazards]);
    const covered = new Set([...p.risks.flatMap((r) => r.covers), ...p.mitigations.map((m) => m.covers)]);
    for (const id of listed) if (!covered.has(id)) errors.push(`step ${f.n}: ${id} is foreseen but neither priced nor mitigated`);
    for (const id of covered) if (!listed.has(id)) errors.push(`step ${f.n}: ${id} isn't foreseen for this step, so it can't be priced`);
    const step = steps.find((x) => x.n === f.n);
    for (const r of p.risks)
      for (const c of r.on_fail.cancels ?? []) if (c >= step.effects.length) errors.push(`step ${f.n}, ${r.id}: cancels effect ${c}, which doesn't exist`);
    const shown = [...p.risks.flatMap((r) => [r.reason, r.on_fail.summary]), ...p.mitigations.map((m) => m.note)].join(" \n ").toLowerCase();
    for (const term of terms) if (shown.includes(term)) errors.push(`step ${f.n}: a shown reason names "${term}", which the party doesn't know`);
    for (const a of f.interrupts.filter((x) => x.code === "arrival"))
      if (!(out.warnings ?? []).some((w) => w.n === f.n && w.covers === a.id)) errors.push(`step ${f.n}: no warning band for ${a.id}'s arrival`);
  }
  const keys = flagKeys(s);
  for (const p of out.steps) for (const r of p.risks) for (const op of r.on_fail.ops) if (op.set_flag && !keys.has(op.set_flag.key)) errors.push(`step ${p.n}, ${r.id}: flag "${op.set_flag.key}" isn't one the packet uses`);
  return errors;
}

// ---- 4. What the card shows ----

// Strips the internal fields before the card is shown: as_if, interrupts, internal checks and warnings.
export function shownCard(card) {
  const { internal_checks, ...step_call } = card.step_call;
  const { warnings, ...pricing_call } = card.pricing_call;
  return { ...card, step_call, pricing_call, facts: card.facts.map(({ as_if, interrupts, ...f }) => f) };
}

// ---- 5. Execution ----

// Runs a committed card on `s` (a working copy owned by `apply`) and returns the results (schemas/results.js).
export function execute(s, card) {
  const steps = card.step_call.steps;
  const facts = card.facts;
  const priced = new Map(card.pricing_call.steps.map((p) => [p.n, p]));
  const warnings = card.pricing_call.warnings ?? [];
  const internalChecks = card.step_call.internal_checks ?? [];
  const kept = (card.stances ?? []).filter((st) => st.trigger && st.decision !== "resolved");
  // Where each step expects the items it takes, and whether a remaining step puts them there.
  const plan = needsOf(s, steps);
  const results = [];
  let fight = !!s.combat;
  s.firedNow = [];
  const done = (r) => {
    if (s.firedNow.length) r.triggers = [...s.firedNow];
    s.firedNow = [];
    results.push(r);
    return r;
  };
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const r = { n: step.n, tick: s.tick, outcome: "done", rolls: [] };
    // Waiting for `when`, checking each tick that someone can perceive it (D39).
    if (step.when) {
      const max = step.when.max_wait ?? MAX_WAIT;
      let waited = 0;
      let stop = null;
      for (;;) {
        if (!whoPerceives(s, subjects(step.when.until))) stop = "cant_perceive";
        else if (test(s, step.when.until)) break;
        else if (waited >= max) stop = "wait_expired";
        if (stop) break;
        advance(s, steps, i, facts, warnings, r);
        if (r.interrupt) break;
        waited++;
      }
      r.tick = s.tick;
      if (waited) r.waited = waited;
      if (r.interrupt) return finish(done({ ...r, outcome: "interrupted" }));
      if (stop) return finish(done({ ...r, outcome: "interrupted", interrupt: { code: stop, detail: stop === "wait_expired" ? `They waited ${waited} ticks and it never happened.` : "No one in the party can see or hear what they're waiting for." } }));
    }
    // Before the step begins: anything the party can already tell has gone wrong (D46, D47).
    const before = recognize(s, steps, i, facts, plan) ?? startedOrEnded(s, fight) ?? hiddenFact(s, step, internalChecks);
    if (before) return finish(done({ ...r, outcome: "interrupted", interrupt: before }));
    if (step.requires && !test(s, step.requires)) return finish(done({ ...r, outcome: "interrupted", interrupt: { code: "requires_failed", detail: "What the step needs doesn't hold." } }));
    let action = step;
    if (step.if) {
      if (!whoPerceives(s, subjects(step.if))) return finish(done({ ...r, outcome: "interrupted", interrupt: { code: "cant_perceive", detail: "No one in the party can see or hear what the condition is about." } }));
      if (!test(s, step.if)) {
        if (step.otherwise === "skip") {
          done({ ...r, outcome: "skipped" });
          continue;
        }
        if (step.otherwise === "stop") return finish(done({ ...r, outcome: "stopped" }));
        action = { ...step, ...step.otherwise };
        r.outcome = "alternative";
      }
    }
    const ctx = { self: action.actors[0], stepZone: action.zone, step: action };
    // A companion's kept stance trips before a step she won't take part in.
    const tripped = kept.find((st) => test(s, st.trigger, ctx));
    if (tripped) {
      log(s, { stance: tripped.companion, decision: tripped.decision, step: step.n });
      if (tripped.decision === "keep") return finish(done({ ...r, outcome: "stopped", stance: { companion: tripped.companion, decision: "keep" } }));
      r.stance = { companion: tripped.companion, decision: tripped.decision };
    }
    // Risks: skip any whose conditions no longer hold, roll the rest.
    const route = routeNow(s, action);
    const cancels = new Set();
    let stops = false;
    for (const risk of r.outcome === "alternative" ? [] : priced.get(step.n)?.risks ?? []) {
      const live = risk.covers.some((id) => (isNpc(s, id) ? npcPerceives(s, id, route, action.noise) : conn(s, id) ? s.flags[id]?.locked === true : true));
      if (!live) continue;
      const odds = ODDS[risk.difficulty];
      const roll = d100(s);
      const success = roll <= odds;
      r.rolls.push({ risk: risk.id, odds, roll, success });
      if (success) continue;
      for (const id of risk.covers) if (isNpc(s, id) && !s.noticed.includes(id)) s.noticed.push(id);
      run(s, risk.on_fail.ops, ctx);
      (risk.on_fail.cancels ?? []).forEach((c) => cancels.add(c));
      stops ||= risk.on_fail.stops_plan;
    }
    if (action.noise === "loud")
      for (const p of s.packet.people) if (npcPerceives(s, p.id, route, "loud") && !s.noticed.includes(p.id)) s.noticed.push(p.id);
    // Effects in order. An effect that can't happen interrupts there; the earlier ones stand.
    for (let e = 0; e < action.effects.length; e++) {
      if (cancels.has(e)) continue;
      const seen = e > 0 && i + 1 < steps.length ? recognize(s, steps, i + 1, facts, plan) : null;
      const stopHere = seen ? { ...seen, effect: e } : effectProblem(s, action.effects[e], e, plan[i]?.[e], action.actors);
      if (stopHere) {
        triggers(s, ctx);
        nextTick(s);
        return finish(done({ ...r, outcome: "interrupted", interrupt: stopHere }));
      }
      run(s, [action.effects[e]], ctx);
    }
    triggers(s, ctx);
    objectives(s);
    if (stops) r.outcome = "stopped";
    done(r);
    fight = !!s.combat;
    // A player checkpoint pauses the plan after its step (D68).
    const pause = !stops && (card.checkpoints ?? []).includes(step.n);
    if (pause) r.checkpoint = true;
    const last = i === steps.length - 1 || stops || s.ended || s.combat || pause;
    if (last) {
      nextTick(s);
      return finish();
    }
    advance(s, steps, i + 1, facts, warnings, results.at(-1), true);
    if (results.at(-1).pendingArrival) {
      const a = results.at(-1).pendingArrival;
      delete results.at(-1).pendingArrival;
      return finish(done({ n: steps[i + 1].n, tick: s.tick, outcome: "interrupted", rolls: [], interrupt: a }));
    }
  }
  return finish();

  function finish() {
    s.firedNow = [];
    log(s, { card: results.map((r) => `${r.n}:${r.outcome}`).join(" ") });
    return results;
  }
}

// Moves to the next tick, first checking whether it brings an NPC the card didn't foresee onto the next step.
// That's an arrival: the plan stops before the tick, and a warning roll decides whether the party hears it
// coming, in which case it lands at the end of the tick instead of the start (engine.md §6).
function advance(s, steps, i, facts, warnings, r, between = false) {
  const peek = clone(s);
  nextTick(peek);
  const step = steps[i];
  const fact = facts.find((f) => f.n === step.n);
  const foreseen = new Set(fact?.observers ?? []);
  const projected = new Set((fact?.interrupts ?? []).filter((x) => x.code === "arrival").map((x) => x.id));
  const zones = [...new Set([step.zone, ...step.actors.map((a) => zoneOf(peek, a))])];
  const acting = new Set(steps.flatMap((x) => x.actors));
  const before = new Set(s.packet.people.filter((p) => !acting.has(p.id) && npcPerceives(s, p.id, zones, step.noise)).map((p) => p.id));
  const arriving = peek.packet.people.find((p) => !acting.has(p.id) && !foreseen.has(p.id) && !before.has(p.id) && npcPerceives(peek, p.id, zones, step.noise));
  if (!arriving) return nextTick(s);
  const w = warnings.find((x) => x.n === step.n && x.covers === arriving.id);
  // An arrival the card never projected (the world changed mid-plan) rolls at Medium.
  const odds = ODDS[projected.has(arriving.id) && w ? w.difficulty : "medium"];
  const roll = d100(s);
  const success = roll <= odds;
  const event = peek.log.filter((l) => l.tick === s.tick + 1 && l.event).map((l) => l.event)[0];
  if (success && event) s.warned = { event, tick: s.tick + 1 };
  nextTick(s);
  const interrupt = { code: "arrival", id: arriving.id, detail: `${cap(nameOf(s, arriving.id))} ${success ? "can be heard coming" : "arrives"}.`, warning: { odds, roll, success } };
  if (between) r.pendingArrival = interrupt;
  else r.interrupt = interrupt;
}

// For each step, each effect that takes an item: where the plan expects it, and which step put it there.
function needsOf(s, steps) {
  const expect = {};
  return steps.map((step, i) =>
    step.effects.map((op) => {
      const item = needs(op);
      const need = item ? { item, loc: item in expect ? expect[item].loc : locOf(s, item), by: item in expect ? expect[item].by : -1 } : null;
      if (item) expect[item] = { loc: after(s, op), by: i };
      return need;
    }),
  );
}

// D46/D47: the plan stops at the first moment the party can perceive that a remaining step won't work, using
// what it sees now plus what it knows. A precondition counts only when the party can see where the thing
// should be, sees it isn't, and the routines it knows don't put it back before that step's tick.
function recognize(s, steps, from, facts, plan) {
  const offset = s.tick - (facts.find((f) => f.n === steps[from].n)?.tick ?? s.tick);
  const { seen } = partyPerceives(s);
  for (let j = from; j < steps.length; j++)
    for (const need of plan[j]) {
      if (!need || need.by >= from || sameLoc(locOf(s, need.item), need.loc)) continue;
      const spot = need.loc?.zone ?? zoneOf(s, need.loc?.holder);
      if (!spot || !seen.has(spot) || (need.loc?.holder && isParty(s, need.loc.holder))) continue;
      const at = (facts.find((f) => f.n === steps[j].n)?.tick ?? s.tick) + offset;
      const b = clone(s);
      b.belief = true;
      while (b.tick < at) nextTick(b);
      if (!sameLoc(locOf(b, need.item), need.loc))
        return { code: "not_there", id: need.item, detail: `${cap(nameOf(s, need.item))} is ${where(s, locOf(s, need.item))}, not ${where(s, need.loc)}, and everyone can see it.` };
    }
  return null;
}

// A fight or the encounter's end that began since the last step stops the plan before the next.
function startedOrEnded(s, fight) {
  if (s.ended) return { code: "trigger_fires", id: s.ended.outcome, detail: `The encounter ends (${s.ended.outcome}).` };
  if (s.combat && !fight) return { code: "trigger_fires", id: s.combat.enemies[0], detail: `${cap(nameOf(s, s.combat.enemies[0]))} starts a fight.` };
  return null;
}

// A hidden fact that defeats the step: the engine reveals it and stops there.
function hiddenFact(s, step, checks) {
  const c = checks.find((x) => x.step === step.n);
  if (!c) return null;
  run(s, [{ reveal: { id: c.fact } }]);
  return { code: "hidden_fact", id: c.fact, detail: "Something they didn't know about stops the step." };
}

// Why an effect can't happen right now, if it can't: the item isn't where the plan left it, something
// doesn't fit, a door is locked, an ability is spent.
function effectProblem(s, op, e, need, actors) {
  const [k, v] = opOf(op);
  const work = workProblem(s, op, actors, e);
  if (work) return work;
  if (need && !sameLoc(locOf(s, need.item), need.loc))
    return { code: "not_there", effect: e, id: need.item, detail: `${cap(nameOf(s, need.item))} is ${where(s, locOf(s, need.item))}, not ${where(s, need.loc)}.` };
  if (k === "use_ability") {
    const a = abilityOf(s, v.actor, v.ability);
    const max = a?.declared?.uses?.encounter;
    if (max && (s.uses[v.actor]?.[v.ability] ?? 0) >= max) return { code: "ability_spent", effect: e, id: v.actor, detail: `${a.name} is spent.` };
  }
  if (k === "move" || k === "give") {
    const p = movePlan(s, op);
    if (p.error) return { code: "too_big", effect: e, id: k === "move" ? v.entity : v.item, detail: p.error };
    const b = p.blocks[0];
    if (b) return { code: b.why, effect: e, id: b.who, detail: `${cap(nameOf(s, b.who))} can't get through ${b.connection ? nameOf(s, b.connection) : "any way there"}.` };
  }
  return null;
}

// Setting a flag on a connection is working it: someone among the step's actors needs hands and to be on a
// side it's worked from (D64). A rat can't turn a key.
function workProblem(s, op, actors, e) {
  const [k, v] = opOf(op);
  const c = k === "set_flag" ? conn(s, v.entity) : null;
  const why = c && cantWork(s, c, actors);
  if (!why) return null;
  const detail = why === "no_hands" ? `No one doing this has hands to work ${nameOf(s, c.id)}.` : `No one doing this is on a side ${nameOf(s, c.id)} can be worked from.`;
  return { code: "cant_work", effect: e, id: c.id, detail };
}

// The zones a step will occupy, from where everyone is now: for checking which risks still hold.
function routeNow(s, step) {
  const t = { route: [] };
  step.actors.forEach((a) => enter(t, zoneOf(s, a)));
  for (const op of step.effects) {
    const [k, v] = opOf(op);
    if (k !== "move" && k !== "give") continue;
    const id = k === "move" ? v.entity : v.item;
    let here = zoneOf(s, id);
    enter(t, here);
    for (const cid of movePlan(s, op).conns ?? []) enter(t, (here = conn(s, cid).between.find((z) => z !== here)));
  }
  return t.route;
}

