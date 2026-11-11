// Lookups over the packet and live state that every module shares.

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

// The engine's binding (engine.md §8): @self is the companion an ability's effects are about.
export const bind = (v, ctx = {}) => (v === "@self" ? ctx.self : v);

export const clone = (x) => structuredClone(x);

// A readable name for engine-written text: "the key ring", "Snag".
// Whether text names a hidden term (D36, D185): a hidden place's, way's or thing's name or id, as whole words. A
// hidden fact's id is only a label nobody says ("breath", "view"), so it never counts.
export const hiddenWords = (x) => [x.name, x.text === undefined ? x.id?.replaceAll("_", " ") : null, x.text === undefined ? x.id : null].filter(Boolean).map((t) => t.toLowerCase());
export const names = (text, term) => new RegExp(`(^|[^a-z0-9_])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9_])`, "i").test(text);

export function nameOf(s, id) {
  const n = person(s, id)?.name?.split(",")[0] ?? sheet(s, id)?.name ?? thing(s, id)?.name ?? zone(s, id)?.name ?? conn(s, id)?.name ?? id;
  if (person(s, id) || sheet(s, id)) return n;
  // A place already called "The ledge" is "the ledge", never "the the ledge".
  const low = `${n[0].toLowerCase()}${n.slice(1)}`;
  return /^(the|a|an) /.test(low) ? low : `the ${low}`;
}
