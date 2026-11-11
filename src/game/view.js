// What the player sees, derived from state: the card (docs/spec/ui.md), the map (D9, D71) and the clock.
// Pure functions; the page draws them. Nothing here shows what the party doesn't know.
import { nameOf, zoneOf, person } from "../engine/world.js";
import { beatOf, ladder } from "../engine/clock.js";
import { partyPerceives } from "../engine/perceive.js";
import { usesText } from "../engine/ledger.js";

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

// The outline of a place (D182): the loops of grid points round its squares, clockwise, a square at a step, so the
// map can draw built corners, natural rock or a round room from the same footprint the engine uses.
export function outline(rects) {
  const cells = new Set(rects.flatMap(([x, y, w, h]) => Array.from({ length: w * h }, (_, i) => `${x + (i % w)},${y + Math.floor(i / w)}`)));
  const next = new Map();
  const add = (a, b) => (next.get(a.join(",")) ?? next.set(a.join(","), []).get(a.join(","))).push(b);
  for (const key of cells) {
    const [x, y] = key.split(",").map(Number);
    if (!cells.has(`${x},${y - 1}`)) add([x, y], [x + 1, y]);
    if (!cells.has(`${x + 1},${y}`)) add([x + 1, y], [x + 1, y + 1]);
    if (!cells.has(`${x},${y + 1}`)) add([x + 1, y + 1], [x, y + 1]);
    if (!cells.has(`${x - 1},${y}`)) add([x, y + 1], [x, y]);
  }
  const loops = [];
  for (const [start, outs] of next) {
    while (outs.length) {
      const loop = [start.split(",").map(Number)];
      let at = outs.pop();
      while (at.join(",") !== start) {
        loop.push(at);
        at = next.get(at.join(",")).pop();
      }
      loops.push(loop);
    }
  }
  return loops;
}

// A crowd or a squad is one entry (D130); the map draws it as a cluster.
const GROUP = /^(about |some |a (dozen|few|pair of) |two |three |four |five |six |seven |eight |nine |ten |twenty |thirty |forty |\d+ )/i;

// Who and what is on the map (D181), from state alone, so a token is where the ledger says its owner is: the party;
// each person in a place the party can see right now; each person now out of sight, as a ghost where the party
// last had eyes on them; and placed things in places the party knows.
function tokensFor(s, zoneIds, seen) {
  const { map } = s.packet;
  const held = (id) => Object.keys(s.holder).filter((i) => s.holder[i] === id).map((i) => map.things.find((t) => t.id === i)?.name ?? i);
  const tokens = [];
  for (const p of s.party) tokens.push({ id: p.id, name: p.id === "player" ? "You" : p.name, label: p.id === "player" ? "You" : p.name.split(/[ ,]/)[0], party: true, zone: zoneOf(s, p.id), rat: s.flags[p.id]?.size === "tiny" || s.flags[p.id]?.form === "animal", down: s.flags[p.id]?.down === true });
  for (const p of s.packet.people) {
    const z = s.at[p.id];
    if (z == null) continue;
    const base = { id: p.id, name: p.name, label: short(s, p.id).split(",")[0], group: GROUP.test(p.name), down: s.flags[p.id]?.down === true };
    if (seen.has(z) && zoneIds.has(z)) tokens.push({ ...base, zone: z });
    else if (s.known.last?.[p.id] && zoneIds.has(s.known.last[p.id])) tokens.push({ ...base, zone: s.known.last[p.id], ghost: true });
  }
  for (const t of tokens) t.holds = t.ghost ? [] : held(t.id);
  // Each token's mark on the map: a letter, made different from any other's by a number where two would match.
  const marks = new Map();
  for (const t of tokens) {
    const letter = (t.party ? t.label : t.label.replace(/^((about|some|a|an|the|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|\d+) )+/i, ""))[0].toUpperCase();
    const n = (marks.get(letter) ?? 0) + 1;
    marks.set(letter, n);
    t.mark = n > 1 ? `${letter}${n}` : letter;
  }
  return { tokens: tokens.filter((t) => t.zone && zoneIds.has(t.zone)), held };
}

export function mapView(s) {
  const { map } = s.packet;
  if (!map.zones.every((z) => z.rects?.length)) return null;
  // A site's map shows only the places found so far (D180).
  const zones = map.zones.filter((z) => known(s, z) && (!s.packet.site || (s.known.places ?? []).includes(z.id)));
  const zoneIds = new Set(zones.map((z) => z.id));
  const { seen } = partyPerceives(s);
  const levelOf = (id) => map.zones.find((z) => z.id === id)?.level ?? 0;
  const nameOfZone = (id) => map.zones.find((z) => z.id === id)?.name ?? id;
  const levels = [...new Set(zones.map((z) => z.level ?? 0))].sort((a, b) => b - a);
  // Connections the party knows. One into a place it hasn't found is a gap marked as unexplored; one between
  // levels says where it goes.
  const conns = map.connections
    .filter((c) => known(s, c) && c.between.some((z) => zoneIds.has(z)))
    .map((c) => ({
      id: c.id,
      kind: c.kind,
      name: c.name ?? cap(c.kind),
      wall: c.wall ?? null,
      square: c.square ?? null,
      between: c.between,
      levels: c.between.map(levelOf),
      to: Object.fromEntries(c.between.map((z, i) => [z, zoneIds.has(c.between[1 - i]) ? nameOfZone(c.between[1 - i]) : null])),
      locked: s.flags[c.id]?.locked === true,
      open: s.flags[c.id]?.open === true || c.see_through === true,
      gap: c.between.some((z) => !zoneIds.has(z)),
    }));
  const { tokens, held } = tokensFor(s, zoneIds, seen);
  // Placed things still where they were put, in places the party knows; dimmed when out of sight.
  const things = map.things
    .filter((t) => known(s, t) && t.location.at && s.at[t.id] === t.location.zone && zoneIds.has(s.at[t.id]) && (seen.has(s.at[t.id]) || s.packet.site))
    .map((t) => ({ id: t.id, name: t.name, at: t.location.at, zone: s.at[t.id], holds: held(t.id), seen: seen.has(s.at[t.id]) }));
  // Every level is drawn on the same frame, so what's above sits over what it's above.
  const all = zones.flatMap((z) => z.rects);
  const x0 = Math.min(...all.map(([x]) => x));
  const y0 = Math.min(...all.map(([, y]) => y));
  const width = Math.max(...all.map(([x, , w]) => x + w)) - x0;
  const height = Math.max(...all.map(([, y, , h]) => y + h)) - y0;
  return {
    x0,
    y0,
    width,
    height,
    levels: levels.map((level) => {
      const zs = zones.filter((z) => (z.level ?? 0) === level);
      const here = new Set(zs.map((z) => z.id));
      // A way between levels is drawn on each level it touches that the party knows.
      const cs = conns.filter((c) => (c.wall ? c.levels[0] === level : c.between.some((z) => here.has(z))));
      const walls = edges(zs).filter((e) => !cs.some((c) => c.wall && onSegment(e.seg, c.wall)));
      return {
        level,
        zones: zs.map((z) => ({ id: z.id, name: z.name, rects: z.rects, loops: outline(z.rects), shape: z.shape ?? "built",
          // Where a way meets this place's wall, the line is drawn true, so the way sits on it.
          fixed: cs.filter((c) => c.wall && c.between.includes(z.id)).flatMap((c) => { const [[x1, y1], [x2, y2]] = c.wall; const out = []; for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) out.push(`${x},${y}`); return out; }),
          light: z.light ?? "dim", ground: z.ground ?? "floor",
          // A place the party can leave by (D183).
          exit: (s.packet.intent.exits ?? []).some((e) => e.zone === z.id), seen: seen.has(z.id) || s.party.some((p) => zoneOf(s, p.id) === z.id) })),
        walls,
        connections: cs.map((c) => (c.wall ? c : { ...c, dir: Math.sign(c.levels[c.between.findIndex((z) => !here.has(z))] - level), leads: c.to[c.between.find((z) => here.has(z))] })),
        tokens: tokens.filter((t) => here.has(t.zone)),
        things: things.filter((t) => here.has(t.zone)),
      };
    }),
  };
}

// A room with no drawn map still gets a picture (D181): its places as boxes, in columns by how far each is from
// where the party stands, joined by the ways between them. It claims no sizes or directions.
export function sketchView(s) {
  const { map } = s.packet;
  const zones = map.zones.filter((z) => known(s, z) && (!s.packet.site || (s.known.places ?? []).includes(z.id)));
  const zoneIds = new Set(zones.map((z) => z.id));
  const { seen } = partyPerceives(s);
  const links = map.connections.filter((c) => known(s, c) && c.between.every((z) => zoneIds.has(z))).map((c) => ({ id: c.id, a: c.between[0], b: c.between[1], name: c.name ?? c.kind, locked: s.flags[c.id]?.locked === true }));
  const start = zoneOf(s, s.party[0].id) ?? zones[0]?.id;
  const depth = new Map([[start, 0]]);
  for (const z of depth.keys()) for (const l of links) if (l.a === z || l.b === z) { const o = l.a === z ? l.b : l.a; if (!depth.has(o)) depth.set(o, depth.get(z) + 1); }
  const far = Math.max(0, ...depth.values()) + 1;
  const rows = new Map();
  const { tokens } = tokensFor(s, zoneIds, seen);
  return {
    nodes: zones.map((z) => {
      const col = depth.get(z.id) ?? far;
      const row = rows.get(col) ?? 0;
      rows.set(col, row + 1);
      return { id: z.id, name: z.name, light: z.light ?? "dim", col, row, tokens: tokens.filter((t) => t.zone === z.id) };
    }),
    links,
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
  // Where trouble moves on a failed roll rather than the clock (D176), only the next step shows, and with no count.
  const rungs = ladder(s);
  const coming = rungs
    ? rungs.filter((e) => (e.known || s.known.revealed.includes(e.id)) && !s.fired.includes(e.id)).slice(0, 1).map((e) => ({ what: `Next if things go wrong: ${e.id.replace(/_/g, " ")}`, at: null, in: null }))
    : s.packet.clock.events
        .filter((e) => (e.known || s.known.revealed.includes(e.id)) && !s.fired.includes(e.id) && s.due[e.id] !== undefined)
        .map((e) => ({ what: cap(e.id.replace(/_/g, " ")), at: s.due[e.id], in: s.due[e.id] - s.tick }));
  // What anyone fighting the party is visibly about to do (D130).
  const threats = s.threats.map((t) => ({ who: short(s, t.who), does: t.does }));
  return { tick: s.tick, pending: s.pending, beats, coming, threats };
}

// The party for the header: each member's conditions, form, and whether they're down (D130).
export const partyView = (s) =>
  s.party.map((p) => ({ id: p.id, name: p.name, conditions: s.conditions.filter((c) => c.who === p.id).map((c) => c.text), form: s.flags[p.id]?.form ?? null, down: s.flags[p.id]?.down === true }));

// The party's sheet (D128): each member's abilities with what's left of the limited ones, and their conditions.
export const sheetView = (s) =>
  s.party.map((p) => ({
    id: p.id,
    name: p.name,
    abilities: [p.abilities?.combat, p.abilities?.noncombat].filter(Boolean).map((a) => ({ id: a.id, name: a.name, effect: a.effect, left: usesText(s, p.id, a.id) ?? a.uses ?? "at will" })),
    conditions: s.conditions.filter((c) => c.who === p.id).map((c) => c.text),
    // What they're carrying (D184): each thing, what it is, and what the party has learned of it.
    carrying: s.packet.map.things.filter((t) => s.holder[t.id] === p.id).map((t) => ({ id: t.id, name: t.name, what: [t.properties, ...(t.notes ?? []), ...s.facts.filter((f) => f.known && (f.about ?? []).includes(t.id)).map((f) => f.text)].join(" "), worth: t.reward?.gold ? `worth ${t.reward.gold} gold` : t.reward?.relic ? "a relic" : t.reward?.outfit ? "an outfit" : t.reward?.clue ? "a page to read at camp" : null })),
  }));
