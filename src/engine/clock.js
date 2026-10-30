// Ticks, schedules, events, meters and reaction triggers (docs/spec/engine.md §3–5).
// `s.belief` marks a projection of what the party expects: routines and events it doesn't know don't run (D36, D47).
import { person } from "./world.js";
import { test } from "./cond.js";
import { runRules, settle } from "./ops.js";

const scheduled = (s) => s.packet.people.filter((p) => p.schedule);
const knows = (s, sch) => sch.known || s.known.revealed.includes(sch.id);

// The beats still in the cycle, minus any a ladder has dropped (at Suspicion 2: Pace, Sit).
export function beatOf(s, npc, t = s.tick) {
  const sch = person(s, npc)?.schedule;
  if (!sch || s.at[npc] == null) return null;
  if (s.belief && !knows(s, sch)) return null;
  const dropped = s.sched[npc]?.dropped ?? [];
  if (!dropped.length) return sch.beats[(t + sch.phase) % sch.period];
  // With a beat dropped, the cycle is the beats that are left: at Suspicion 2, Pace, Sit.
  const beats = sch.beats.filter((b) => !dropped.includes(b.id));
  return beats.length ? beats[(t + sch.phase) % beats.length] : null;
}

// An NPC's senses right now: its beat's or its sheet's, edited by meters (at Suspicion 1, Snag sees the far corner).
export function sensesOf(s, npc) {
  const beat = beatOf(s, npc);
  const base = beat?.senses ?? person(s, npc)?.senses ?? { sees: [], hears: { zones: [], level: "loud" } };
  let sees = [...base.sees];
  let hears = base.hears;
  for (const e of s.senseEdits)
    if (e.npc === npc && (!e.beat || e.beat === beat?.id)) {
      sees = [...sees.filter((z) => !(e.change.sees_remove ?? []).includes(z)), ...(e.change.sees_add ?? [])];
      if (e.change.hears) hears = e.change.hears;
    }
  return { sees, hears };
}

// Begin the current tick: positions from schedules, each beat's on_start rules, events, triggers.
export function beginTick(s) {
  s.noticed = [];
  for (const p of scheduled(s)) {
    if (s.at[p.id] == null || (s.belief && !knows(s, p.schedule))) continue;
    const o = s.sched[p.id]?.override;
    if (o && s.tick > o.to) s.sched[p.id].override = null;
    const active = o && s.tick >= o.from && s.tick <= o.to;
    s.at[p.id] = active ? o.position : beatOf(s, p.id).position;
  }
  for (const p of scheduled(s)) {
    if (s.at[p.id] == null || (s.belief && !knows(s, p.schedule))) continue;
    runRules(s, beatOf(s, p.id).on_start);
  }
  events(s);
  triggers(s);
  objectives(s);
}

// One-time events fire at their tick or when their condition first holds. A warned arrival lands at the end
// of its tick instead, after the party's first step (engine.md §6).
export function events(s, { deferred = false } = {}) {
  for (const e of s.packet.clock.events) {
    if (s.fired.includes(e.id)) continue;
    if (s.belief && !(e.known || s.known.revealed.includes(e.id))) continue;
    const due = e.at_tick !== undefined ? s.tick >= s.due[e.id] : test(s, e.when);
    if (!due) continue;
    if (!deferred && s.warned?.event === e.id && s.warned.tick === s.tick) continue;
    s.fired.push(e.id);
    log(s, { event: e.id });
    runRules(s, e.do);
  }
}

// Reaction triggers fire when their condition becomes true (engine.md §5); `once` ones only ever once.
export function triggers(s, ctx = {}) {
  for (let pass = 0; pass < 10; pass++) {
    let changed = false;
    for (const t of s.packet.clock.triggers) {
      const on = test(s, t.when, ctx);
      const was = s.on.includes(t.id);
      if (on && !was) s.on.push(t.id);
      if (!on && was) s.on = s.on.filter((x) => x !== t.id);
      if (!on || was || (t.once && s.fired.includes(t.id))) continue;
      if (t.once) s.fired.push(t.id);
      s.firedNow.push(t.id);
      log(s, { trigger: t.id });
      runRules(s, t.do, ctx);
      changed = true;
    }
    if (!changed) break;
  }
  settle(s);
}

// The objective, alternates and fail-forward ending, checked after every step and tick (engine.md §7).
export function objectives(s) {
  if (s.ended || s.belief) return;
  const { objective, alternates = [], fail_forward } = s.packet.intent;
  for (const o of [objective, ...alternates, fail_forward].filter(Boolean))
    if (o.condition && test(s, o.condition)) {
      s.ended = { outcome: o.id, tick: s.tick };
      log(s, { ended: o.id });
      return;
    }
}

// Meter decay: `by` after `after_ticks` quiet ticks in a row, never while `blocked_by` holds (engine.md §4).
function decay(s) {
  for (const m of s.packet.clock.meters) {
    if (!m.decay) continue;
    const d = m.decay;
    if (d.blocked_by && test(s, d.blocked_by)) {
      s.quiet[m.id] = 0;
      continue;
    }
    s.quiet[m.id] = test(s, d.quiet_if) && s.meters[m.id] > 0 ? (s.quiet[m.id] ?? 0) + 1 : 0;
    if (s.quiet[m.id] >= d.after_ticks) {
      s.meters[m.id] = Math.max(0, s.meters[m.id] - d.by);
      s.quiet[m.id] = 0;
      settle(s);
    }
  }
}

// End the current tick and begin the next.
export function nextTick(s) {
  if (s.warned?.tick === s.tick) {
    events(s, { deferred: true });
    s.warned = null;
  }
  decay(s);
  s.tick += 1;
  beginTick(s);
}

export function log(s, entry) {
  if (!s.belief) s.log.push({ tick: s.tick, ...entry });
}
