// What the player sees, derived from state: the card (docs/spec/ui.md), the map (D9, D71) and the clock.
// Pure functions; the page draws them. Nothing here shows what the party doesn't know.
import { nameOf, zoneOf, person } from "../engine/world.js";
import { beatOf } from "../engine/clock.js";
import { partyPerceives } from "../engine/perceive.js";

export const BAND = { automatic: "Automatic", easy: "Easy", medium: "Medium", hard: "Hard", very_hard: "Very hard", near_impossible: "Near impossible" };

const cap = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);
const short = (s, id) => nameOf(s, id).replace(/^the /, "");
const knownRoutine = (s, p) => p.schedule && (p.schedule.known || s.known.revealed.includes(p.schedule.id));

// ---- The map (D9, D71): drawn from the packet's geometry, only what the party knows ----

const known = (s, x) => !x.hidden || s.known.revealed.includes(x.id);

// Walls are the unit edges between squares of different zones (or a zone and nothing). A connection on a wall
// replaces the wall along its segment.
function edges(zones) {
  const own = new Map();
  for (const z of zones) for (const [x, y, w, h] of z.rects) for (let i = x; i < x + w; i++) for (let j = y; j < y + h; j++) own.set(`${i},${j}`, z.id);
  const out = [];
  for (const [key, id] of own) {
    const [x, y] = key.split(",").map(Number);
    const sides = [
      [x + 1, y, [x + 1, y, x + 1, y + 1]],
      [x - 1, y, [x, y, x, y + 1]],
      [x, y + 1, [x, y + 1, x + 1, y + 1]],
      [x, y - 1, [x, y, x + 1, y]],
    ];
    for (const [nx, ny, seg] of sides) {
      const other = own.get(`${nx},${ny}`);
      if (other === id) continue;
      // Shared walls are drawn once, from the zone that sorts first.
      if (other && other < id) continue;
      out.push({ seg, a: id, b: other ?? null });
    }
  }
  return out;
}

const onSegment = ([x1, y1, x2, y2], [[ax, ay], [bx, by]]) => {
  const [lx, hx] = [Math.min(ax, bx), Math.max(ax, bx)];
  const [ly, hy] = [Math.min(ay, by), Math.max(ay, by)];
  return x1 >= lx && x2 <= hx && y1 >= ly && y2 <= hy && (ax === bx ? x1 === ax && x2 === ax : y1 === ay && y2 === ay);
};

export function mapView(s) {
  const { map } = s.packet;
  if (!map.zones.every((z) => z.rects?.length)) return null;
  const zones = map.zones.filter((z) => known(s, z));
  const zoneIds = new Set(zones.map((z) => z.id));
  const { seen } = partyPerceives(s);
  const levelOf = (id) => map.zones.find((z) => z.id === id)?.level ?? 0;
  const levels = [...new Set(zones.map((z) => z.level ?? 0))].sort((a, b) => b - a);
  // Connections the party knows; one into a zone it doesn't know is a labelled gap.
  const conns = map.connections
    .filter((c) => known(s, c))
    .map((c) => ({
      id: c.id,
      kind: c.kind,
      name: c.name ?? cap(c.kind),
      wall: c.wall ?? null,
      square: c.square ?? null,
      level: c.wall ? levelOf(c.between[0]) : Math.max(...c.between.map(levelOf)),
      locked: s.flags[c.id]?.locked === true,
      open: s.flags[c.id]?.open === true || c.see_through === true,
      gap: c.between.some((z) => !zoneIds.has(z)) ? c.between.map((z) => (zoneIds.has(z) ? null : "Unknown")).find(Boolean) : null,
    }));
  // Who and what the party can see: themselves, perceived people, and placed things in zones they see.
  const tokens = [];
  for (const p of s.party) tokens.push({ id: p.id, name: p.id === "player" ? "You" : p.name, party: true, zone: zoneOf(s, p.id), rat: s.flags[p.id]?.size === "tiny" || s.flags[p.id]?.form === "animal", down: s.flags[p.id]?.down === true });
  for (const p of s.packet.people) {
    const z = s.at[p.id];
    if (z && seen.has(z)) tokens.push({ id: p.id, name: p.name.split(",")[0], zone: z, down: s.flags[p.id]?.down === true });
  }
  const held = (id) => Object.keys(s.holder).filter((i) => s.holder[i] === id).map((i) => map.things.find((t) => t.id === i)?.name ?? i);
  for (const t of tokens) t.holds = held(t.id);
  const things = map.things
    .filter((t) => known(s, t) && t.location.at && s.at[t.id] === t.location.zone && seen.has(s.at[t.id]))
    .map((t) => ({ id: t.id, name: t.name, at: t.location.at, zone: s.at[t.id], holds: held(t.id) }));
  const all = map.zones.flatMap((z) => z.rects);
  const width = Math.max(...all.map(([x, , w]) => x + w));
  const height = Math.max(...all.map(([, y, , h]) => y + h));
  return {
    width,
    height,
    levels: levels.map((level) => {
      const zs = zones.filter((z) => (z.level ?? 0) === level);
      const cs = conns.filter((c) => c.level === level || (c.square && c.level === level + 1));
      const walls = edges(zs).filter((e) => !cs.some((c) => c.wall && onSegment(e.seg, c.wall)));
      return {
        level,
        zones: zs.map((z) => ({ id: z.id, name: z.name, rects: z.rects, light: z.light ?? "dim", seen: seen.has(z.id) })),
        walls,
        connections: cs.filter((c) => c.wall ? c.level === level : true),
        tokens: tokens.filter((t) => zs.some((z) => z.id === t.zone)),
        things: things.filter((t) => zs.some((z) => z.id === t.zone)),
      };
    }),
  };
}

// The card as the player reviews it (docs/spec/ui.md): each step's tick and the beats the party knows at that
// tick, its roll, when the whole plan is done (D77), the rulings it depends on, and the DM's notes on it.
export function cardView(s, card) {
  const routines = s.packet.people.filter((p) => knownRoutine(s, p) && !s.offRoutine.includes(p.id));
  const steps = card.steps.map((st) => {
    const out = {
      n: st.n,
      summary: st.summary,
      risks: st.roll ? [{ band: BAND[st.roll.band], reason: st.roll.reason, fails: st.roll.fails, stops: st.roll.stops }] : [],
    };
    const beats = routines.map((p) => `${short(s, p.id)}: ${cap(beatOf(s, p.id, st.at)?.id ?? "")}`);
    return { ...out, on: [`Tick ${st.at}`, ...beats], mitigations: [] };
  });
  const done = `Done by tick ${card.ends_at}`;
  return { plan: card.plan, steps, done, rulings: card.rulings.map((r) => r.text), notes: card.notes ?? [], stances: card.stances ?? [] };
}

// The clock (docs/spec/ui.md): the tick, the beat of each routine the party knows, events it knows are coming, and
// what anyone fighting the party is about to do.
export function clockView(s) {
  const beats = s.packet.people
    .filter((p) => knownRoutine(s, p) && s.at[p.id] != null)
    .map((p) => {
      if (s.offRoutine.includes(p.id)) return { who: short(s, p.id), beat: "Off routine", does: "Not following the routine you know", cue: "" };
      const b = beatOf(s, p.id);
      return b && { who: short(s, p.id), beat: cap(b.id), does: b.label, cue: b.cue };
    })
    .filter(Boolean);
  const coming = s.packet.clock.events
    .filter((e) => (e.known || s.known.revealed.includes(e.id)) && !s.fired.includes(e.id) && s.due[e.id] !== undefined)
    .map((e) => ({ what: cap(e.id.replace(/_/g, " ")), at: s.due[e.id], in: s.due[e.id] - s.tick }));
  // What anyone fighting the party is visibly about to do (D130).
  const threats = s.threats.map((t) => ({ who: short(s, t.who), does: t.does }));
  return { tick: s.tick, pending: s.pending, beats, coming, threats };
}

// The party for the header: each member's conditions, form, and whether they're down (D130).
export const partyView = (s) =>
  s.party.map((p) => ({ id: p.id, name: p.name, conditions: s.conditions.filter((c) => c.who === p.id).map((c) => c.text), form: s.flags[p.id]?.form ?? null, down: s.flags[p.id]?.down === true }));
