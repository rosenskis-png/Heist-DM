// Loading a packet: the consistency checks (docs/spec/packet.md, Validation) and the starting state.
import { validate } from "../validate.js";
import { packetSchema } from "../../schemas/index.js";
import { geometryProblems } from "./map.js";
import { beginTick } from "./clock.js";
import { run } from "./ops.js";

// Every id-valued field in the packet, with where it was found.
const REF_KEYS = new Set(["entity", "to", "item", "npc", "holder", "zone", "actor", "drop_beat", "key", "position", "beat"]);
function refs(node, path, out) {
  if (Array.isArray(node)) node.forEach((n, i) => refs(n, `${path}[${i}]`, out));
  else if (node && typeof node === "object")
    for (const [k, v] of Object.entries(node)) {
      const at = `${path}.${k}`;
      if (["in_zone", "holds", "flag", "hp_below"].includes(k) && Array.isArray(v)) out.push([v[0], at], ...(k === "in_zone" || k === "holds" ? [[v[1], at]] : []));
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
  for (const id of ["party", "@self", "@step_zone"]) ids.add(id);
  const skip = /\.(start\.positions|key)$/; // flag keys and position maps aren't references
  for (const [id, at] of refs({ people, map, clock, intent: packet.intent, start: packet.start }, "$", []))
    if (typeof id === "string" && !ids.has(id) && !at.endsWith(".key") && !skip.test(at)) problems.push(`${at}: unknown id ${id}`);
  for (const id of Object.keys(packet.start.positions)) if (!ids.has(id)) problems.push(`start.positions: unknown id ${id}`);
  for (const c of map.connections) if (c.key && !ids.has(c.key)) problems.push(`connection ${c.id}: unknown key ${c.key}`);
  problems.push(...geometryProblems(packet));
  // No visible text names a hidden thing.
  const all = [...map.zones, ...map.connections, ...map.things, ...map.facts];
  const terms = all.filter((x) => x.hidden).flatMap((x) => [x.id, ...(x.name ? [x.name] : [])]).map((t) => t.toLowerCase());
  const visible = [...all.filter((x) => !x.hidden).map((x) => JSON.stringify(x)), packet.opening].map((t) => t.toLowerCase());
  for (const text of visible) for (const t of terms) if (text.includes(t)) problems.push(`visible text names hidden "${t}"`);
  return problems;
}

// Quality checks only warn (docs/spec/packet.md); the size check is the one the engine runs now (D26).
export function packetWarnings(packet, reference) {
  const size = JSON.stringify(packet).length;
  return reference && size > 2 * JSON.stringify(reference).length ? [`packet is ${size} bytes, over twice the reference`] : [];
}

// A deadline moves by 2% of its tick per point of slack, rounded once (D41, D43).
export const deadlineTick = (tick, slack) => Math.round(tick * (1 + 0.02 * slack));

// A packet places the party's companions by slot, in party order, so it never names one (D8): the slots are
// replaced by the companions' ids wherever the packet names them.
export const SLOTS = ["companion_a", "companion_b"];
export function bindParty(packet, party) {
  const ids = Object.fromEntries(party.slice(1).map((p, i) => [SLOTS[i], p.id]));
  const bind = (x) => (Array.isArray(x) ? x.map(bind) : x && typeof x === "object" ? Object.fromEntries(Object.entries(x).map(([k, v]) => [ids[k] ?? k, bind(v)])) : (ids[x] ?? x));
  return bind(packet);
}

// The starting state for an encounter. `party` is the party's sheets (player first); `slack` is the campaign's.
export function load({ packet: unbound, party, slack = 0, seed = 1 }) {
  const packet = bindParty(unbound, party);
  const problems = checkPacket(packet, party);
  if (problems.length) throw new Error(`packet ${packet.id} rejected:\n${problems.join("\n")}`);
  const { map, people, clock, start } = packet;
  const s = {
    packet,
    party,
    rng: seed >>> 0,
    tick: start.tick,
    pending: 0,
    at: {},
    holder: {},
    flags: {},
    disposition: Object.fromEntries(people.map((p) => [p.id, p.disposition])),
    hp: Object.fromEntries(party.map((p) => [p.id, p.abilities?.hp ?? 4])),
    uses: {},
    sched: {},
    untils: [],
    known: { revealed: [] },
    due: Object.fromEntries(
      clock.events.filter((e) => e.at_tick !== undefined).map((e) => [e.id, e.deadline ? deadlineTick(e.at_tick, slack) : e.at_tick]),
    ),
    slack,
    fired: [],
    consumed: [],
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
  return s;
}
