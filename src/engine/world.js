// Lookups over the packet and live state that every module shares.

export const SIZES = ["tiny", "small", "medium", "large"];
export const NOISE = ["silent", "quiet", "speech", "loud"];

export const person = (s, id) => s.packet.people.find((p) => p.id === id);
export const thing = (s, id) => s.packet.map.things.find((t) => t.id === id);
export const conn = (s, id) => s.packet.map.connections.find((c) => c.id === id);
export const zone = (s, id) => s.packet.map.zones.find((z) => z.id === id);
export const sheet = (s, id) => s.party.find((p) => p.id === id);

export const partyIds = (s) => s.party.map((p) => p.id);
export const isParty = (s, id) => s.party.some((p) => p.id === id);
export const isNpc = (s, id) => s.packet.people.some((p) => p.id === id);

// Where an actor or item is: its own zone, or its holder's, followed up the chain (the ring on Snag's belt).
export function zoneOf(s, id, seen = 0) {
  if (s.at[id] !== undefined) return s.at[id];
  const h = s.holder[id];
  return h && seen < 8 ? zoneOf(s, h, seen + 1) : null;
}

export const carried = (s, id) => Object.keys(s.holder).filter((item) => s.holder[item] === id);

// People are medium unless a flag says otherwise (someone shapeshifted into a rat is tiny); things have their packet size.
export const sizeOf = (s, id) => s.flags[id]?.size ?? thing(s, id)?.size ?? "medium";

export const flag = (s, id, key) => s.flags[id]?.[key];

// The engine's bindings (engine.md §8).
export const bind = (v, ctx = {}) => (v === "@self" ? ctx.self : v === "@step_zone" ? ctx.stepZone : v);

export const clone = (x) => structuredClone(x);

// A readable name for engine-written text: "the key ring", "Snag".
export function nameOf(s, id) {
  const n = person(s, id)?.name?.split(",")[0] ?? sheet(s, id)?.name ?? thing(s, id)?.name ?? zone(s, id)?.name ?? conn(s, id)?.name ?? id;
  return person(s, id) || sheet(s, id) ? n : `the ${n[0].toLowerCase()}${n.slice(1)}`;
}
