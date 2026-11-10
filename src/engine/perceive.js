// What the party perceives, for the map and who they can talk to (docs/spec/engine.md §5).
import { zone, partyIds, zoneOf, sheet, person, thing, conn, isNpc, isParty } from "./world.js";
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
  // A room with no drawn map (D153) is one scene (D174): sight lines aren't modelled, so every place in it that
  // isn't hidden or dark is in view and in earshot, and the DM rules on what can be made out from where.
  if (!s.packet.map.zones.some((z) => z.rects?.length)) {
    const all = s.packet.map.zones.filter((z) => known(s, z)).map((z) => z.id);
    return { seen: all.filter((z) => z === here || visible(s, z, id)), heard: all };
  }
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

// What the party can make out where they stand, which the opening must name (D136): every person in a zone they
// see; every thing in their own zones or one they see, followed up to the fixture it hangs on; and every barrier
// out of their own zones. Their own zone counts even in the dark, since they're in it. Hidden things stay out, and
// so does what a person carries, which a look or a question finds. Plain openings, where one area runs into the
// next, aren't features.
export function inSight(s) {
  const own = new Set(partyIds(s).map((id) => zoneOf(s, id)));
  const zones = new Set([...own, ...partyPerceives(s).seen.keys()]);
  const carried = (id, n = 0) => {
    const h = s.holder[id];
    if (!h) return false;
    return isNpc(s, h) || isParty(s, h) || (n < 8 && carried(h, n + 1));
  };
  return {
    people: s.packet.people.filter((p) => known(s, p) && zones.has(zoneOf(s, p.id))).map((p) => p.id),
    things: s.packet.map.things.filter((t) => known(s, t) && !carried(t.id) && zones.has(zoneOf(s, t.id))).map((t) => t.id),
    ways: s.packet.map.connections.filter((c) => c.kind !== "opening" && known(s, c) && c.between.some((z) => own.has(z))).map((c) => c.id),
  };
}

// What's in sight that the opening never names (D136). A crude word match, so a miss is certain and a pass is
// likely: a person by any word of their name ("the miner" names "Brannoc, human miner"), a thing by its name's
// last word ("War drum" by "drum"), a way by its kind ("bars").
const words = (t) => new Set((t.toLowerCase().match(/[a-z]+/g) ?? []).map((w) => (w.length > 3 ? w.replace(/s$/, "") : w)));
export function openingMisses(s, opening = s.packet.opening) {
  const said = words(opening);
  const has = (w) => [...words(w)].some((x) => x.length > 2 && said.has(x));
  const { people, things, ways } = inSight(s);
  return [
    ...people.filter((id) => !has(person(s, id).name)),
    ...things.filter((id) => !has(thing(s, id).name.split(/\s+/).at(-1))),
    ...ways.filter((id) => !has(conn(s, id).kind)),
  ];
}
