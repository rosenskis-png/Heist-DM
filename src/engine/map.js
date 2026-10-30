// Map facts from geometry, routes and fit (docs/spec/engine.md §2, D28, D51, D53, D54, D56).
// Coordinates stay in here; the AIs get only the facts derived from them (D9).
import { SIZES, conn, sizeOf, carried, flag } from "./world.js";

const FT = 5;

export const other = (c, z) => c.between.find((x) => x !== z);

export function between(s, a, b) {
  const found = s.packet.map.connections.filter((c) => c.between.includes(a) && c.between.includes(b));
  return found.length === 1 ? found[0] : null;
}

// A path names each crossing by the zone it enters, or by the connection where two join the same zones (D51).
// Returns the connections crossed, or the first entry that doesn't follow on.
export function crossings(s, from, path) {
  const out = [];
  let here = from;
  for (const p of path) {
    if (p === here) continue; // a connection followed by the zone it leads into names one crossing twice
    const c = conn(s, p) ?? between(s, here, p);
    if (!c || !c.between.includes(here)) return { error: p, at: here, conns: out };
    out.push(c.id);
    here = other(c, here);
  }
  return { conns: out, end: here };
}

// What fits through a connection now: `fits`, or `fits_unlocked` once it's unlocked or someone moving
// carries its key, who unlocks it in passing (D53, D56).
const hasKey = (s, c, movers) => c.key && movers.some((m) => m === c.key || carried(s, m).includes(c.key));
export function fitsNow(s, c, movers) {
  const locked = flag(s, c.id, "locked") === true && !hasKey(s, c, movers);
  return !locked && c.fits_unlocked ? c.fits_unlocked : c.fits;
}

// Why a mover can't cross: null if it can. A ruling's exception lets that thing through that connection (D55).
export function blocked(s, c, mover, movers) {
  if (s.exceptions.includes(`${mover}|${c.id}`)) return null;
  if (SIZES.indexOf(sizeOf(s, mover)) <= SIZES.indexOf(fitsNow(s, c, movers))) return null;
  const opens = c.fits_unlocked && SIZES.indexOf(sizeOf(s, mover)) <= SIZES.indexOf(c.fits_unlocked);
  return opens ? "locked" : "too_big";
}

// Only when someone moving needs it open: a rat carrying the ring slips through the bars without unlocking them.
export const unlocksInPassing = (s, c, movers) =>
  flag(s, c.id, "locked") === true && hasKey(s, c, movers) && movers.some((m) => SIZES.indexOf(sizeOf(s, m)) > SIZES.indexOf(c.fits));

// The shortest way everything moving fits through, as connection ids (D54). Hidden connections count only
// once revealed; the party can't take a way it doesn't know.
export function route(s, from, to, movers) {
  const seen = new Map([[from, []]]);
  const queue = [from];
  while (queue.length) {
    const here = queue.shift();
    if (here === to) return seen.get(here);
    for (const c of s.packet.map.connections) {
      if (!c.between.includes(here) || (c.hidden && !s.known.revealed.includes(c.id))) continue;
      if (movers.some((m) => blocked(s, c, m, movers))) continue;
      const next = other(c, here);
      if (!seen.has(next)) seen.set(next, [...seen.get(here), c.id]), queue.push(next);
    }
  }
  return null;
}

// ---- Geometry ----

const cells = (z) => z.rects.flatMap(([x, y, w, h]) => Array.from({ length: w * h }, (_, i) => [x + (i % w), y + Math.floor(i / w)]));
const box = (z) => {
  const xs = z.rects.flatMap(([x, , w]) => [x, x + w]);
  const ys = z.rects.flatMap(([, y, , h]) => [y, y + h]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};

// Unit edges on a zone's boundary, as "x,y,h|v" keys: the walls.
function edges(z) {
  const inside = new Set(cells(z).map(([x, y]) => `${x},${y}`));
  const out = new Set();
  for (const [x, y] of cells(z)) {
    if (!inside.has(`${x},${y - 1}`)) out.add(`${x},${y},h`);
    if (!inside.has(`${x},${y + 1}`)) out.add(`${x},${y + 1},h`);
    if (!inside.has(`${x - 1},${y}`)) out.add(`${x},${y},v`);
    if (!inside.has(`${x + 1},${y}`)) out.add(`${x + 1},${y},v`);
  }
  return out;
}

const level = (z) => z.level ?? 0;

// Two zones on one level share a wall (for hears_through_walls, engine.md §2).
export function shareWall(s, a, b) {
  const za = s.packet.map.zones.find((z) => z.id === a);
  const zb = s.packet.map.zones.find((z) => z.id === b);
  if (!za || !zb || level(za) !== level(zb)) return false;
  const eb = edges(zb);
  return [...edges(za)].some((e) => eb.has(e));
}

const segEdges = ([[x1, y1], [x2, y2]]) => {
  const out = [];
  if (y1 === y2) for (let x = Math.min(x1, x2); x < Math.max(x1, x2); x++) out.push(`${x},${y1},h`);
  else if (x1 === x2) for (let y = Math.min(y1, y2); y < Math.max(y1, y2); y++) out.push(`${x1},${y},v`);
  return out;
};

// Consistency checks the geometry must pass (docs/spec/packet.md, Validation).
export function geometryProblems(packet) {
  const { zones, connections, things } = packet.map;
  const byId = new Map(zones.map((z) => [z.id, z]));
  const problems = [];
  const owner = new Map();
  for (const z of zones)
    for (const [x, y] of cells(z)) {
      const key = `${level(z)}:${x},${y}`;
      if (owner.has(key)) problems.push(`zones ${owner.get(key)} and ${z.id} overlap at ${x},${y}`);
      else owner.set(key, z.id);
    }
  for (const c of connections) {
    const [a, b] = c.between.map((id) => byId.get(id));
    if (!a || !b) continue;
    if (c.wall) {
      const ea = edges(a);
      const eb = edges(b);
      const seg = segEdges(c.wall);
      if (level(a) !== level(b) || !seg.length || !seg.every((e) => ea.has(e) && eb.has(e)))
        problems.push(`connection ${c.id} isn't on the wall ${a.id} and ${b.id} share`);
    } else if (c.square) {
      const [x, y] = c.square;
      const inside = (z) => cells(z).some(([cx, cy]) => cx === x && cy === y);
      if (level(a) === level(b) || !inside(a) || !inside(b)) problems.push(`connection ${c.id}'s square isn't inside both ${a.id} and ${b.id}`);
    } else problems.push(`connection ${c.id} has no wall or square`);
  }
  for (const t of things) {
    const z = byId.get(t.location?.zone);
    if (z && t.location.at && !cells(z).some(([x, y]) => x === t.location.at[0] && y === t.location.at[1]))
      problems.push(`thing ${t.id} isn't inside ${z.id}`);
  }
  return problems;
}

const connPoint = (c) => (c.square ? [c.square[0] + 0.5, c.square[1] + 0.5] : [(c.wall[0][0] + c.wall[1][0]) / 2, (c.wall[0][1] + c.wall[1][1]) / 2]);
const feet = (n) => Math.round(n * FT / 5) * 5;
const dist = ([ax, ay], [bx, by]) => Math.hypot(ax - bx, ay - by);

// The layout facts the AIs receive instead of coordinates (D9, D28): each zone's size, how far it is
// between the connections across a zone, and how far apart placed things in one zone are.
export function layoutFacts(packet, { knownOnly = false } = {}) {
  const keep = (x) => !(knownOnly && x.hidden);
  const zones = packet.map.zones.filter(keep);
  const conns = packet.map.connections.filter(keep);
  const things = packet.map.things.filter((t) => keep(t) && t.location?.at);
  const out = [];
  for (const z of zones) {
    const b = box(z);
    const area = cells(z).length;
    const shape = area === (b.x1 - b.x0) * (b.y1 - b.y0) ? "" : ", irregular";
    out.push(`${z.name}: ${(b.x1 - b.x0) * FT} by ${(b.y1 - b.y0) * FT} ft${shape}.`);
    // An unnamed connection is named by where it leads from here: "the grate to Far cell".
    const label = (c) => c.name ?? `the ${c.kind} to ${zones.find((x) => x.id === other(c, z.id))?.name ?? other(c, z.id)}`;
    const here = conns.filter((c) => c.between.includes(z.id));
    for (let i = 0; i < here.length; i++)
      for (let j = i + 1; j < here.length; j++) {
        const d = feet(dist(connPoint(here[i]), connPoint(here[j])));
        if (d >= 10) out.push(`In ${z.name}: ${label(here[i])} and ${label(here[j])}, about ${d} ft apart.`);
      }
    const inZone = things.filter((t) => t.location.zone === z.id);
    const at = (t) => [t.location.at[0] + 0.5, t.location.at[1] + 0.5];
    for (let i = 0; i < inZone.length; i++)
      for (let j = i + 1; j < inZone.length; j++)
        out.push(`${inZone[i].name} and ${inZone[j].name}: about ${feet(dist(at(inZone[i]), at(inZone[j])))} ft apart.`);
  }
  return out;
}
