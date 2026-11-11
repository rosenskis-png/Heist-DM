// Loading a packet: the consistency checks (docs/spec/packet.md, Validation) and the starting state.
import { validate } from "../validate.js";
import { hiddenWords, names } from "./world.js";
import { packetSchema } from "../../schemas/index.js";
import { geometryProblems } from "./map.js";
import { beginTick } from "./clock.js";
import { noteSeen } from "./perceive.js";
import { run } from "./ops.js";
import { toughnessOf } from "./ledger.js";

// Every id-valued field in the packet, with where it was found.
const REF_KEYS = new Set(["entity", "to", "item", "npc", "holder", "zone", "actor", "key", "position", "beat"]);
function refs(node, path, out) {
  if (Array.isArray(node)) node.forEach((n, i) => refs(n, `${path}[${i}]`, out));
  else if (node && typeof node === "object")
    for (const [k, v] of Object.entries(node)) {
      const at = `${path}.${k}`;
      if (["in_zone", "holds", "flag"].includes(k) && Array.isArray(v)) out.push([v[0], at], ...(k === "in_zone" || k === "holds" ? [[v[1], at]] : []));
      else if (k === "beat" && Array.isArray(v)) out.push([v[0], at]);
      else if (["party_all_in", "revealed"].includes(k)) out.push([v, at]);
      else if (["between", "sees", "zones"].includes(k) && Array.isArray(v)) v.forEach((x) => out.push([x, at]));
      else if (REF_KEYS.has(k) && typeof v === "string") out.push([v, at]);
      else refs(v, at, out);
    }
  return out;
}

// The checks that reject a packet. `party` adds the party's ids, which the packet's start positions name.
export function checkPacket(packet, party = []) {
  const problems = validate(packetSchema, packet).map((e) => `schema: ${e}`);
  if (problems.length) return problems;
  const { map, people, clock } = packet;
  const ids = new Set([
    ...map.zones, ...map.connections, ...map.things, ...map.facts, ...people,
    ...clock.events,
    ...people.flatMap((p) => (p.schedule ? [p.schedule, ...p.schedule.beats] : [])),
    ...party,
  ].map((x) => x.id));
  for (const id of ["party", "@self"]) ids.add(id);
  const skip = /\.(start\.positions|key)$/; // flag keys and position maps aren't references
  for (const [id, at] of refs({ people, map, clock, intent: packet.intent, start: packet.start }, "$", []))
    if (typeof id === "string" && !ids.has(id) && !at.endsWith(".key") && !skip.test(at)) problems.push(`${at}: unknown id ${id}`);
  for (const id of Object.keys(packet.start.positions)) if (!ids.has(id)) problems.push(`start.positions: unknown id ${id}`);
  for (const c of map.connections) if (c.key && !ids.has(c.key)) problems.push(`connection ${c.id}: unknown key ${c.key}`);
  problems.push(...geometryProblems(packet));
  // No visible text names a hidden thing.
  const all = [...map.zones, ...map.connections, ...map.things, ...map.facts];
  const terms = [...new Set(all.filter((x) => x.hidden).flatMap(hiddenWords))];
  const visible = [...all.filter((x) => !x.hidden).map((x) => [x.name, x.purpose, x.properties, x.text].filter(Boolean).join(" ")), packet.opening];
  for (const t of terms) if (visible.some((text) => names(text, t))) problems.push(`visible text names hidden "${t}"`);
  return problems;
}

// Quality checks only warn (docs/spec/packet.md); the size check is the one the engine runs now (D26).
export function packetWarnings(packet, reference) {
  const size = JSON.stringify(packet).length;
  return reference && size > 2 * JSON.stringify(reference).length ? [`packet is ${size} bytes, over twice the reference`] : [];
}

// A packet places the party's companions by slot, in party order, so it never names one (D8): the slots are
// replaced by the companions' ids wherever the packet names them.
export const SLOTS = ["companion_a", "companion_b"];
export function bindParty(packet, party) {
  const ids = Object.fromEntries(party.slice(1).map((p, i) => [SLOTS[i], p.id]));
  const bind = (x) => (Array.isArray(x) ? x.map(bind) : x && typeof x === "object" ? Object.fromEntries(Object.entries(x).map(([k, v]) => [ids[k] ?? k, bind(v)])) : (ids[x] ?? x));
  return bind(packet);
}

// The pack (D184): the things the party carried out of earlier rooms are things in this one, held by whoever held
// them (the player, if that companion isn't here), under an id of their own so they can't clash with the room's.
export function withPack(packet, party, items = []) {
  if (!items.length) return packet;
  const taken = new Set([...packet.map.zones, ...packet.map.connections, ...packet.map.things, ...packet.map.facts, ...packet.people, ...packet.clock.events].map((x) => x.id));
  const things = items.map((it) => {
    let id = it.id;
    while (taken.has(id)) id = `pack_${id}`;
    taken.add(id);
    const holder = party.some((p) => p.id === it.holder) ? it.holder : party[0].id;
    return { id, name: it.name, properties: it.properties, ...(it.size ? { size: it.size } : {}), location: { holder }, carried: true, ...(it.notes?.length ? { notes: it.notes } : {}) };
  });
  return { ...packet, map: { ...packet.map, things: [...packet.map.things, ...things] } };
}

// The starting state for an encounter. `party` is the party's sheets (player first);
// `conditions` are the ones the party carries in from the last hand-off (D130), `spent` the per-rest ability
// uses spent since the last rest (D128), and `gold` what the party has to spend (D147).
export function load({ packet: unbound, party, seed = 1, conditions = [], spent = {}, gold = 0, relics = [], carried = [], items = [] }) {
  const packet = withPack(bindParty(unbound, party), party, items);
  const problems = checkPacket(packet, party);
  if (problems.length) throw new Error(`packet ${packet.id} rejected:\n${problems.join("\n")}`);
  const { map, people, clock, start } = packet;
  const s = {
    packet,
    party,
    rng: seed >>> 0,
    tick: start.tick,
    pending: 0,
    // How far the room's trouble has moved on (D176): one step for each failed roll or deliberate wait.
    pressure: 0,
    at: {},
    holder: {},
    flags: {},
    disposition: Object.fromEntries(people.map((p) => [p.id, p.disposition])),
    // Telling blows each person can still take (D130), the party's conditions, and what anyone fighting the party
    // is about to do.
    toughness: Object.fromEntries(people.map((p) => [p.id, toughnessOf(p)])),
    conditions: conditions.filter((c) => party.some((p) => p.id === c.who)).map(({ id, who, text }) => ({ id, who, text })),
    threats: [],
    // Ability uses this encounter, and per-rest uses spent before it, by who and ability id (D128).
    used: {},
    spent: structuredClone(spent),
    // The party's gold, which a merchant's prices are paid from (D147).
    gold,
    // The relics the party holds, each a passive edge the DM reads as a fact (D147).
    relics: structuredClone(relics),
    // What the party has with it from earlier rooms (D178): things, followers and loose ends.
    carried: structuredClone(carried),
    known: { revealed: [] },
    due: Object.fromEntries(
      clock.events.filter((e) => e.at_tick !== undefined).map((e) => [e.id, e.at_tick]),
    ),
    fired: [],
    canon: [],
    log: [],
    // The DM's facts, and the NPCs it has taken off their routines (D75).
    facts: [],
    offRoutine: [],
    ended: null,
  };
  for (const p of people) s.at[p.id] = p.position;
  Object.assign(s.at, start.positions);
  for (const t of map.things) {
    if (t.location.zone) s.at[t.id] = t.location.zone;
    if (t.location.holder) s.holder[t.id] = t.location.holder;
    if (t.flags) s.flags[t.id] = { ...t.flags };
  }
  for (const c of map.connections) if (c.flags) s.flags[c.id] = { ...c.flags };
  run(s, start.ops);
  beginTick(s);
  noteSeen(s);
  return s;
}
