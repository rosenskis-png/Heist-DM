// The hand-off written when an encounter ends (docs/spec/state.md, D21).
import { partyIds, zoneOf, nameOf } from "./world.js";
import { test } from "./cond.js";
import { CAPTURED } from "./clock.js";

// What kind of ending this was, for how the party feels about it (D131).
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
  const gear = Object.keys(s.holder).filter((item) => party.includes(s.holder[item]));
  // What the party carries out is worth: gold, and relics (D147). Gold is what they had, less what they paid, plus what
  // they carried out; a price is already paid when the thing was taken.
  const rewards = gear.map((id) => s.packet.map.things.find((t) => t.id === id)?.reward).filter(Boolean);
  const gold = (s.gold ?? 0) + rewards.reduce((t, r) => t + (r.gold ?? 0), 0);
  const relics = gear.flatMap((id) => {
    const r = s.packet.map.things.find((t) => t.id === id)?.reward?.relic;
    return r ? [{ id, name: r.name, text: r.text }] : [];
  });
  // The pack (D184): every plain thing the party carries out goes on with whoever holds it, as what it is, with what
  // the party has learned about it. A thing worth gold, a relic, a clue or an outfit is cashed in above and below,
  // and isn't carried as a thing as well.
  const thingOf = (id) => s.packet.map.things.find((t) => t.id === id);
  const items = gear
    .filter((id) => thingOf(id) && !thingOf(id).reward)
    .map((id) => {
      const t = thingOf(id);
      const notes = s.facts.filter((f) => f.known && (f.about ?? []).includes(id)).map((f) => f.text);
      return { id, name: t.name, properties: t.properties, ...(t.size ? { size: t.size } : {}), holder: s.holder[id], notes: [...new Set([...(t.notes ?? []), ...notes])].slice(-3) };
    });
  // Outfits carried out (D184): each with who carried it.
  const outfits = gear.flatMap((id) => (thingOf(id)?.reward?.outfit ? [{ ...thingOf(id).reward.outfit, holder: s.holder[id] }] : []));
  // Clues the party came away with (D164): one they hold, or one that can't be carried and stood in plain sight.
  const clues = s.packet.map.things.filter((t) => t.reward?.clue && (gear.includes(t.id) || (t.reward.fixed && !t.hidden))).map((t) => t.reward.clue);
  const exit = [...new Set(party.map((id) => zoneOf(s, id)))];
  // The way on: the exit whose zone the whole party ended in, if any (docs/spec/campaign.md §3).
  const wayOn = exit.length === 1 ? (s.packet.intent.exits ?? []).find((e) => e.zone === exit[0])?.id ?? null : null;
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
    way_on: wayOn,
    gear,
    gold,
    relics,
    items,
    outfits,
    clues,
    // What the party carries to the campfire: hurts and hindrances, until they rest (D130).
    conditions: s.conditions.map((c) => ({ ...c })),
    // Per-rest ability uses spent so far, this encounter's included; per-encounter uses refill now (D128).
    spent: spentAfter(s),
    fates,
    companions: party.filter((id) => id !== "player"),
    tick: s.tick,
    log: `${s.packet.id}: ${label ?? outcome} at tick ${s.tick}; ${party.map((id) => nameOf(s, id)).join(", ")} in ${exit.map((z) => nameOf(s, z)).join(", ")}.`,
  };
}
