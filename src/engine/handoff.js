// The hand-off written when an encounter ends (docs/spec/state.md, D21), and the slack it moves (D41, D43).
import { partyIds, zoneOf, nameOf, person } from "./world.js";

// Slack moves by 1 per encounter with a deadline, between −10 and +10 (D43).
export function slackAfter(s) {
  const deadline = s.packet.clock.events.find((e) => e.deadline);
  if (!deadline) return { spare: null, slack: s.slack };
  const due = s.due[deadline.id];
  const spare = Math.max(0, due - s.tick);
  const failForward = s.ended?.outcome === s.packet.intent.fail_forward?.id;
  const by = failForward || spare <= 0.15 * due ? 1 : spare >= 0.5 * due ? -1 : 0;
  return { spare, slack: Math.max(-10, Math.min(10, s.slack + by)) };
}

export function handoff(s) {
  const party = partyIds(s);
  const { spare, slack } = slackAfter(s);
  const gear = Object.keys(s.holder).filter((item) => party.includes(s.holder[item]));
  const exit = [...new Set(party.map((id) => zoneOf(s, id)))];
  const fates = Object.fromEntries(
    s.packet.people.map((p) => [p.id, { disposition: s.disposition[p.id], zone: s.at[p.id] ?? null, ...(s.flags[p.id] ? { flags: s.flags[p.id] } : {}) }]),
  );
  const outcome = s.ended?.outcome ?? null;
  const label = [s.packet.intent.objective, ...(s.packet.intent.alternates ?? []), s.packet.intent.fail_forward].find((o) => o?.id === outcome)?.label;
  return {
    packet: s.packet.id,
    outcome,
    exit,
    gear,
    hp: { ...s.hp },
    conditions: Object.fromEntries(party.filter((id) => s.flags[id]).map((id) => [id, s.flags[id]])),
    fates,
    companions: party.filter((id) => id !== "player"),
    combat: s.combat ? s.combat.enemies : null,
    tick: s.tick,
    spare,
    slack,
    log: `${s.packet.id}: ${label ?? outcome} at tick ${s.tick}; ${party.map((id) => nameOf(s, id)).join(", ")} in ${exit.map((z) => nameOf(s, z)).join(", ")}${s.combat ? `, fighting ${s.combat.enemies.map((e) => person(s, e)?.name.split(",")[0] ?? e).join(", ")}` : ""}.`,
  };
}
