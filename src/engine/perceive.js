// What the party perceives, for the map and who they can talk to (docs/spec/engine.md §5).
import { zone, partyIds, zoneOf, sheet } from "./world.js";
import { shareWall, other } from "./map.js";

// A member's traits, from their abilities' declared blocks (e.g. sees_in_dark, hears_through_walls).
const traits = (s, id) => {
  const a = sheet(s, id)?.abilities ?? {};
  return [a.combat, a.noncombat].flatMap((x) => x?.declared?.traits ?? []);
};

const visible = (s, z, member) => zone(s, z)?.light !== "dark" || traits(s, member).includes("sees_in_dark");
const open = (s, c) => c.see_through || s.flags[c.id]?.open === true;
const known = (s, x) => !x.hidden || s.known.revealed.includes(x.id);

// What one member perceives from a zone: their own by default, or any other for "could she see that from
// there?". `seen` and `heard` are zone ids; `heard` is where speech or louder carries (a cue's loudness).
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
