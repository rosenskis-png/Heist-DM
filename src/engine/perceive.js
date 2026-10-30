// Who perceives what (docs/spec/engine.md §2, D39).
import { NOISE, zone, partyIds, zoneOf, sheet, isParty, isNpc } from "./world.js";
import { sensesOf, beatOf } from "./clock.js";
import { shareWall, other } from "./map.js";

const louder = (noise, level) => NOISE.indexOf(noise) >= NOISE.indexOf(level);

// Does this NPC see or hear something happening in these zones at this noise level? Being in one counts.
export function npcPerceives(s, npc, zones, noise) {
  const here = s.at[npc];
  if (here == null) return false;
  if (zones.includes(here)) return true;
  const { sees, hears } = sensesOf(s, npc);
  if (zones.some((z) => sees.includes(z))) return true;
  return louder(noise, hears.level) && zones.some((z) => hears.zones.includes(z));
}

// A member's traits, from their abilities' declared blocks (Lyra: sees_in_dark, hears_through_walls).
const traits = (s, id) => {
  const a = sheet(s, id)?.abilities ?? {};
  return [a.combat, a.noncombat].flatMap((x) => x?.declared?.traits ?? []);
};

const visible = (s, z, member) => zone(s, z)?.light !== "dark" || traits(s, member).includes("sees_in_dark");
const open = (s, c) => c.see_through || s.flags[c.id]?.open === true;
const known = (s, x) => !x.hidden || s.known.revealed.includes(x.id);

// What one member perceives from a zone: their own by default, or any other for "could she see that from
// there?" (D39). `seen` and `heard` are zone ids; `heard` is where speech or louder carries (a cue's loudness).
export function memberPerceives(s, id, here = zoneOf(s, id)) {
  const seen = [];
  const heard = [];
  if (!here) return { seen, heard };
  const look = [here];
  for (const c of s.packet.map.connections)
    if (c.between.includes(here) && open(s, c) && known(s, c)) look.push(other(c, here));
  look.push(...(zone(s, here)?.sees ?? []));
  for (const z of new Set(look)) if (visible(s, z, id)) seen.push(z);
  heard.push(here);
  for (const c of s.packet.map.connections) if (c.between.includes(here) && known(s, c)) heard.push(other(c, here));
  if (traits(s, id).includes("hears_through_walls"))
    for (const z of s.packet.map.zones) if (z.id !== here && shareWall(s, here, z.id)) heard.push(z.id);
  return { seen, heard: [...new Set(heard)] };
}

// What the party can perceive right now, pooled (the whisper rings make sharing free): zone → who.
export function partyPerceives(s) {
  const seen = new Map();
  const heard = new Map();
  const add = (m, z, who) => (m.get(z) ?? m.set(z, []).get(z)).push(who);
  for (const id of partyIds(s)) {
    const p = memberPerceives(s, id);
    p.seen.forEach((z) => add(seen, z, id));
    p.heard.forEach((z) => add(heard, z, id));
  }
  return { seen, heard };
}

// Who in the party can perceive each thing a condition is about, or null if no one can (D39).
// An NPC is perceived by seeing it or hearing its cue; a member always knows about themselves.
export function whoPerceives(s, ids) {
  const { seen, heard } = partyPerceives(s);
  const who = new Set();
  for (const id of ids) {
    if (id === "party" || isParty(s, id)) continue;
    const z = zoneOf(s, id) ?? (s.packet.map.zones.some((x) => x.id === id) ? id : null);
    if (!z) return null;
    const by = [...(seen.get(z) ?? []), ...(isNpc(s, id) && beatOf(s, id)?.cue ? heard.get(z) ?? [] : [])];
    if (!by.length) return null;
    by.forEach((m) => who.add(m));
  }
  return [...who];
}
