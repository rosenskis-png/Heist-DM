// Ticks, schedules and events (docs/spec/engine.md). The DM decides how people react (D75); an NPC the DM has
// taken off their routine (`s.offRoutine`) stays where the DM put them.
import { person, partyIds } from "./world.js";
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

// A room with no drawn map is one scene (D174), and its timed events are a ladder (D176): they happen in order,
// one each time a roll fails or the party waits, never because time passed while the party tried things.
export const ladder = (s) => (s.packet.map.zones.some((z) => z.rects?.length) ? null : s.packet.clock.events.filter((e) => e.at_tick !== undefined).sort((a, b) => a.at_tick - b.at_tick));

// The trouble moves on: n steps of the ladder.
export function press(s, n = 1) {
  if (!n || s.ended) return;
  s.pressure = (s.pressure ?? 0) + n;
  events(s);
  objectives(s);
}

// One-time events fire at their tick or when their condition first holds; on a ladder, at their step.
export function events(s) {
  const rungs = ladder(s);
  for (const e of s.packet.clock.events) {
    if (s.fired.includes(e.id)) continue;
    const due = e.at_tick !== undefined ? (rungs ? rungs.indexOf(e) < (s.pressure ?? 0) : s.tick >= s.due[e.id]) : test(s, e.when);
    if (!due) continue;
    s.fired.push(e.id);
    log(s, { event: e.id });
    runRules(s, e.do);
  }
}

// Every encounter's last ending (D131): the whole party is down, so they're taken, and the story moves on.
export const CAPTURED = { id: "captured", label: "The whole party is down: captured and taken on" };

// The objective, alternates and fail-forward ending, checked after every change and tick, and the whole party
// down, which ends any encounter.
export function objectives(s) {
  if (s.ended) return;
  if (partyIds(s).every((id) => s.flags[id]?.down)) {
    s.ended = { outcome: CAPTURED.id, tick: s.tick };
    log(s, { ended: CAPTURED.id });
    return;
  }
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
