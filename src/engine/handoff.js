// The hand-off written when an encounter ends (docs/spec/state.md, D21), and the slack it moves (D41, D43).
import { partyIds, zoneOf, nameOf } from "./world.js";
import { test } from "./cond.js";
import { CAPTURED } from "./clock.js";

// Slack moves by 1 per encounter with a deadline, between −10 and +10 (D43).
export function slackAfter(s) {
  const deadline = s.packet.clock.events.find((e) => e.deadline);
  if (!deadline) return { spare: null, slack: s.slack };
  const due = s.due[deadline.id];
  const spare = Math.max(0, due - s.tick);
  const failForward = ["fail_forward", "captured"].includes(endingOf(s));
  const by = failForward || spare <= 0.15 * due ? 1 : spare >= 0.5 * due ? -1 : 0;
  return { spare, slack: Math.max(-10, Math.min(10, s.slack + by)) };
}

// What kind of ending this was, for slack and for how the party feels about it (D131).
export function endingOf(s) {
  const { objective, alternates = [], fail_forward } = s.packet.intent;
  const id = s.ended?.outcome;
  if (!id) return null;
  if (id === objective?.id) return "objective";
  if (alternates.some((o) => o.id === id)) return "alternate";
  if (id === fail_forward?.id) return "fail_forward";
  if (id === CAPTURED.id) return "captured";
  return "other";
}

function spentAfter(s) {
  const out = structuredClone(s.spent ?? {});
  for (const [who, used] of Object.entries(s.used ?? {})) for (const [id, n] of Object.entries(used)) (out[who] ??= {})[id] = (out[who][id] ?? 0) + n;
  return out;
}

// A rest at a campfire (D122): per-rest uses refill and conditions clear (D128, D130). Takes and returns what the
// hand-off carries into the next packet.
export const rest = (carry) => ({ ...carry, conditions: [], spent: {} });

export function handoff(s) {
  const party = partyIds(s);
  const { spare, slack } = slackAfter(s);
  const gear = Object.keys(s.holder).filter((item) => party.includes(s.holder[item]));
  const exit = [...new Set(party.map((id) => zoneOf(s, id)))];
  const fates = Object.fromEntries(
    s.packet.people.map((p) => [p.id, { disposition: s.disposition[p.id], zone: s.at[p.id] ?? null, ...(s.flags[p.id] ? { flags: s.flags[p.id] } : {}) }]),
  );
  const outcome = s.ended?.outcome ?? null;
  const label = [s.packet.intent.objective, ...(s.packet.intent.alternates ?? []), s.packet.intent.fail_forward, CAPTURED].find((o) => o?.id === outcome)?.label;
  // Optional objectives count where they stand when the encounter ends.
  const optional = s.packet.intent.optional ?? [];
  const met = optional.filter((o) => test(s, o.condition)).map((o) => o.id);
  return {
    packet: s.packet.id,
    outcome,
    ending: endingOf(s),
    optional: { met, missed: optional.map((o) => o.id).filter((id) => !met.includes(id)) },
    exit,
    gear,
    // What the party carries to the campfire: hurts and hindrances, until they rest (D130).
    conditions: s.conditions.map((c) => ({ ...c })),
    // Per-rest ability uses spent so far, this encounter's included; per-encounter uses refill now (D128).
    spent: spentAfter(s),
    fates,
    companions: party.filter((id) => id !== "player"),
    tick: s.tick,
    spare,
    slack,
    log: `${s.packet.id}: ${label ?? outcome} at tick ${s.tick}; ${party.map((id) => nameOf(s, id)).join(", ")} in ${exit.map((z) => nameOf(s, z)).join(", ")}.`,
  };
}
