// Ticks, schedules and events (docs/spec/engine.md). The DM decides how people react (D75); an NPC the DM has
// taken off their routine (`s.offRoutine`) stays where the DM put them.
import { person } from "./world.js";
import { test } from "./cond.js";
import { runRules } from "./ops.js";

const scheduled = (s) => s.packet.people.filter((p) => p.schedule);

// The beat a person on a routine is on at tick t.
export function beatOf(s, npc, t = s.tick) {
  const sch = person(s, npc)?.schedule;
  if (!sch || s.at[npc] == null || s.offRoutine.includes(npc)) return null;
  return sch.beats[(t + sch.phase) % sch.period];
}

// Begin the current tick: positions from schedules, each beat's on_start rules, events, the objective.
export function beginTick(s) {
  for (const p of scheduled(s)) {
    if (s.at[p.id] == null || s.offRoutine.includes(p.id)) continue;
    s.at[p.id] = beatOf(s, p.id).position;
  }
  for (const p of scheduled(s)) {
    if (s.at[p.id] == null || s.offRoutine.includes(p.id)) continue;
    runRules(s, beatOf(s, p.id).on_start);
  }
  events(s);
  objectives(s);
}

// One-time events fire at their tick or when their condition first holds.
export function events(s) {
  for (const e of s.packet.clock.events) {
    if (s.fired.includes(e.id)) continue;
    const due = e.at_tick !== undefined ? s.tick >= s.due[e.id] : test(s, e.when);
    if (!due) continue;
    s.fired.push(e.id);
    log(s, { event: e.id });
    runRules(s, e.do);
  }
}

// The objective, alternates and fail-forward ending, checked after every change and tick.
export function objectives(s) {
  if (s.ended) return;
  const { objective, alternates = [], fail_forward } = s.packet.intent;
  for (const o of [objective, ...alternates, fail_forward].filter(Boolean))
    if (o.condition && test(s, o.condition)) {
      s.ended = { outcome: o.id, tick: s.tick };
      log(s, { ended: o.id });
      return;
    }
}

// End the current tick and begin the next.
export function nextTick(s) {
  s.tick += 1;
  beginTick(s);
}

export function log(s, entry) {
  s.log.push({ tick: s.tick, ...entry });
}
