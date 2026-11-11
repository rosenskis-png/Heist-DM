// The layout (D28, D153): code puts a generated room on the 5-ft grid from the sketch's rough sizes, so the AIs never
// write coordinates. Each zone arrives with `size: [w, h]` in squares (and maybe a `level`); each connection is placed
// on a wall the two zones share, or, between levels, on a square inside both. Zones are placed outward from where the
// party starts, each against the zone it's reached from. If a connection can't be placed (a loop that won't close),
// a narrow arm is grown from one of the two zones through free squares until they touch (D183), so a room ships
// without a map only when even that can't be done (D9): never a wrong map. Things get a square of their own in their
// zone. Pure.

const cellsOf = ({ x, y, w, h }) => Array.from({ length: w * h }, (_, i) => [x + (i % w), y + Math.floor(i / w)]);
const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// The wall two same-level rectangles share, as one segment a square long in the middle of what they share, or null.
function sharedWall(a, b) {
  const span = (lo1, hi1, lo2, hi2) => [Math.max(lo1, lo2), Math.min(hi1, hi2)];
  if (a.x + a.w === b.x || b.x + b.w === a.x) {
    const x = a.x + a.w === b.x ? b.x : a.x;
    const [y0, y1] = span(a.y, a.y + a.h, b.y, b.y + b.h);
    if (y1 - y0 >= 1) { const y = Math.floor((y0 + y1 - 1) / 2); return [[x, y], [x, y + 1]]; }
  }
  if (a.y + a.h === b.y || b.y + b.h === a.y) {
    const y = a.y + a.h === b.y ? b.y : a.y;
    const [x0, x1] = span(a.x, a.x + a.w, b.x, b.x + b.w);
    if (x1 - x0 >= 1) { const x = Math.floor((x0 + x1 - 1) / 2); return [[x, y], [x + 1, y]]; }
  }
  return null;
}

const key = (x, y) => `${x},${y}`;
// A placed zone: its main rectangle `r`, any arm grown from it, and its level.
const cellsIn = (z) => [...cellsOf(z.r), ...z.arm];
const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// The wall two placed zones on one level share: the middle of where their main rectangles meet, or else the first
// edge between any two of their squares.
function wallBetween(a, b) {
  const main = sharedWall(a.r, b.r);
  if (main) return main;
  const inB = new Set(cellsIn(b).map(([x, y]) => key(x, y)));
  for (const [x, y] of cellsIn(a)) {
    if (inB.has(key(x + 1, y))) return [[x + 1, y], [x + 1, y + 1]];
    if (inB.has(key(x - 1, y))) return [[x, y], [x, y + 1]];
    if (inB.has(key(x, y + 1))) return [[x, y + 1], [x + 1, y + 1]];
    if (inB.has(key(x, y - 1))) return [[x, y], [x + 1, y]];
  }
  return null;
}
const squareBetween = (a, b) => {
  const inB = new Set(cellsIn(b).map(([x, y]) => key(x, y)));
  return cellsIn(a).find(([x, y]) => inB.has(key(x, y))) ?? null;
};
const joined = (a, b) => (a.level === b.level ? wallBetween(a, b) : squareBetween(a, b));

// Where a zone of size w×h could go against the rectangle `p`, nearest the middle of each side first; or over or
// under it on another level, sharing a square.
function spots(p, w, h, level, same) {
  const out = [];
  if (same) {
    for (let d = 0; d < Math.max(p.w, p.h) + Math.max(w, h); d++)
      for (const s of d ? [d, -d] : [0]) {
        const cy = p.y + Math.floor((p.h - h) / 2) + s;
        const cx = p.x + Math.floor((p.w - w) / 2) + s;
        out.push({ x: p.x + p.w, y: cy }, { x: p.x - w, y: cy }, { x: cx, y: p.y + p.h }, { x: cx, y: p.y - h });
      }
    return out.map((t) => ({ ...t, w, h, level })).filter((r) => sharedWall(p, r));
  }
  for (const [cx, cy] of cellsOf(p)) for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < h; dy++) out.push({ x: cx - dx, y: cy - dy, w, h, level });
  return out;
}

// Every square a zone could reach by growing an arm through squares nothing on its level stands on, with the way
// back: its own squares at no distance, then outward.
function reach(z, placed, lo, hi) {
  const taken = new Set(placed.filter((q) => q !== z && q.level === z.level).flatMap((q) => cellsIn(q).map(([x, y]) => key(x, y))));
  const seen = new Map(cellsIn(z).map((c) => [key(...c), { cell: c, dist: 0, from: null }]));
  const queue = [...seen.values()];
  for (const at of queue)
    for (const [dx, dy] of SIDES) {
      const n = [at.cell[0] + dx, at.cell[1] + dy];
      if (n[0] < lo || n[0] > hi || n[1] < lo || n[1] > hi || taken.has(key(...n)) || seen.has(key(...n))) continue;
      const next = { cell: n, dist: at.dist + 1, from: at };
      seen.set(key(...n), next);
      queue.push(next);
    }
  return seen;
}
const grow = (z, step) => { for (let s = step; s && s.dist > 0; s = s.from) z.arm.push(s.cell); };

// Joins two zones that should join and don't, by growing arms a square at a time. On one level, an arm from `a` to a
// square beside one of b's. Between levels, arms from either or both to a square each can stand on, one over the
// other. The shortest way is taken. Returns whether it could be done.
function bridge(a, b, placed) {
  const all = placed.flatMap((z) => cellsIn(z)).flat();
  const [lo, hi] = [Math.min(...all) - 8, Math.max(...all) + 8];
  const fromA = reach(a, placed, lo, hi);
  if (a.level === b.level) {
    const bCells = new Set(cellsIn(b).map(([x, y]) => key(x, y)));
    const ends = [...fromA.values()].filter((s) => SIDES.some(([dx, dy]) => bCells.has(key(s.cell[0] + dx, s.cell[1] + dy))));
    if (!ends.length) return false;
    grow(a, ends.reduce((m, s) => (s.dist < m.dist ? s : m)));
    return true;
  }
  const fromB = reach(b, placed, lo, hi);
  let pick = null;
  for (const [k, sa] of fromA) {
    const sb = fromB.get(k);
    if (sb && (!pick || sa.dist + sb.dist < pick[0].dist + pick[1].dist)) pick = [sa, sb];
  }
  if (!pick) return false;
  grow(a, pick[0]);
  grow(b, pick[1]);
  return true;
}

// A square of its own for each thing in a zone, out toward the walls, since the middle is where people gather, and
// clear of the squares the ways up and down stand on.
function placeThings(packet, at) {
  const used = new Set(packet.map.connections.filter((c) => c.square).map((c) => key(...c.square)));
  for (const z of packet.map.zones) {
    const { r } = at.get(z.id);
    const [mx, my] = [r.x + (r.w - 1) / 2, r.y + (r.h - 1) / 2];
    const cells = cellsOf(r).sort((p, q) => Math.max(Math.abs(q[0] - mx), Math.abs(q[1] - my)) - Math.max(Math.abs(p[0] - mx), Math.abs(p[1] - my)) || p[1] - q[1] || p[0] - q[0]);
    const mine = [];
    for (const t of packet.map.things.filter((x) => x.location?.zone === z.id && !x.location.at)) {
      const far = (c) => mine.every((m) => Math.max(Math.abs(m[0] - c[0]), Math.abs(m[1] - c[1])) >= 2);
      const c = cells.find((c) => !used.has(key(...c)) && far(c)) ?? cells.find((c) => !used.has(key(...c))) ?? cells[0];
      used.add(key(...c));
      mine.push(c);
      t.location.at = c;
    }
  }
}

// The layout tries the tidiest arrangement first. If two zones that should join can't be brought together (one is
// walled in by its neighbours), it lays the room out again with each zone set a little further round its neighbour,
// which leaves gaps for an arm to pass, and takes the first arrangement that works.
export function layout(input) {
  let out;
  for (let attempt = 0; attempt < 24; attempt++) if ((out = arrange(input, attempt)).mapped) return out;
  // Last of all, every zone set apart in a row with room between, joined by arms: plain, but a true map.
  return arrange(input, -1);
}

// How a place is drawn when the encoder didn't say (D185): from what it is.
const CAVE = /\b(cave|cavern|grotto|tunnel|crack|crevice|hollow|burrow|den|pit|shaft|chasm|ledge|shelf|slope|scree|pool|spring|lake|shore|warren|drift|mine|rock|terrace)s?\b/i;
const ROUND = /(tower|turret|stairwell|rotunda|apse|dome|silo|cistern)s?\b|\b(well|round|ring|circle|arena)s?\b/i;
export const shapeFor = (z) => z.shape ?? (ROUND.test(`${z.name} ${z.purpose ?? ""}`) ? "round" : CAVE.test(`${z.name} ${z.purpose ?? ""}`) ? "cave" : "built");

function arrange(input, attempt) {
  const packet = structuredClone(input);
  // A way from a place to itself joins nothing: it's dropped (D185).
  packet.map.connections = packet.map.connections.filter((c) => c.between[0] !== c.between[1]);
  for (const z of packet.map.zones) z.shape = shapeFor(z);
  const { zones, connections } = packet.map;
  const sizeOf = (z) => (z.size ?? [3, 3]).map((n) => Math.max(1, Math.min(20, Math.round(n))));
  const levelOf = (z) => z.level ?? 0;
  const byId = new Map(zones.map((z) => [z.id, z]));
  const startId = packet.start?.positions?.player;
  const order = [byId.get(startId) ?? zones[0]];
  const at = new Map();
  const free = (r) => ![...at.values()].some((q) => q.level === r.level && cellsIn(q).some(([x, y]) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h));
  const neighbours = (id) => connections.filter((c) => c.between.includes(id)).map((c) => c.between.find((x) => x !== id)).filter((x) => at.has(x));
  // Of the places a zone could go, the one that puts it against the most of the placed zones it joins.
  const best = (zone, parent) => {
    const [w, h] = sizeOf(zone);
    const level = levelOf(zone);
    const open = spots(parent.r, w, h, level, level === parent.level).filter(free);
    const turn = open.length ? (attempt * 5) % open.length : 0;
    const tries = [...open.slice(turn), ...open.slice(0, turn)].slice(0, attempt ? 12 : 80);
    let pick = null;
    let most = -1;
    for (const r of tries) {
      const z = { r, arm: [], level };
      const n = neighbours(zone.id).filter((id) => joined(z, at.get(id))).length;
      if (n > most) [pick, most] = [z, n];
    }
    return pick;
  };
  const [w0, h0] = sizeOf(order[0]);
  at.set(order[0].id, { r: { x: 0, y: 0, w: w0, h: h0 }, arm: [], level: levelOf(order[0]) });
  if (attempt < 0) {
    let x = 0;
    for (const z of zones) {
      const [w, h] = sizeOf(z);
      at.set(z.id, { r: { x, y: -Math.floor(h / 2), w, h }, arm: [], level: levelOf(z) });
      x += w + 3;
    }
  }
  for (let i = 0; i < order.length && attempt >= 0; i++) {
    const p = order[i];
    for (const c of connections.filter((c) => c.between.includes(p.id))) {
      const other = byId.get(c.between.find((id) => id !== p.id));
      if (!other || at.has(other.id)) continue;
      // Against the zone it's reached from; failing that, against anything already down.
      const z = best(other, at.get(p.id)) ?? [...at.values()].map((q) => best(other, q)).find(Boolean);
      if (!z) continue;
      at.set(other.id, z);
      order.push(other);
    }
    // A zone nothing reaches still gets a footprint, beside what's already down.
    if (i === order.length - 1) {
      const lost = zones.find((z) => !at.has(z.id));
      const z = lost && [...at.values()].map((q) => best(lost, q)).find(Boolean);
      if (z) (at.set(lost.id, z), order.push(lost));
    }
  }
  let ok = at.size === zones.length;
  if (ok)
    for (const c of connections) {
      const [a, b] = c.between.map((id) => at.get(id));
      if (!a || !b) { ok = false; break; }
      // Two zones that should join and don't: grow an arm from one to the other.
      // The smaller of the two grows the arm: an arm is more wall for the next thing that has to reach it, and a
      // zone of one square has only four sides.
      const [small, big] = cellsIn(a).length <= cellsIn(b).length ? [a, b] : [b, a];
      if (!joined(a, b) && !bridge(small, big, [...at.values()]) && !(a.level === b.level && bridge(big, small, [...at.values()]))) { ok = false; break; }
      if (a.level === b.level) c.wall = wallBetween(a, b);
      else c.square = squareBetween(a, b);
    }
  if (!ok) {
    for (const z of zones) { delete z.rects; delete z.size; }
    for (const c of connections) { delete c.wall; delete c.square; }
    for (const t of packet.map.things) delete t.location?.at;
    return { packet, mapped: false };
  }
  // An arm grown later may have taken the square a wall was measured on: measure every wall again at the end.
  for (const c of connections) {
    const [a, b] = c.between.map((id) => at.get(id));
    if (a.level === b.level) c.wall = wallBetween(a, b);
  }
  placeThings(packet, at);
  // Put everything on non-negative coordinates.
  const all = [...at.values()].flatMap(cellsIn);
  const [dx, dy] = [Math.min(...all.map(([x]) => x)), Math.min(...all.map(([, y]) => y))];
  for (const z of zones) {
    const { r, arm } = at.get(z.id);
    z.rects = [[r.x - dx, r.y - dy, r.w, r.h], ...arm.map(([x, y]) => [x - dx, y - dy, 1, 1])];
    delete z.size;
  }
  for (const c of connections) {
    if (c.wall) c.wall = c.wall.map(([x, y]) => [x - dx, y - dy]);
    if (c.square) c.square = [c.square[0] - dx, c.square[1] - dy];
  }
  for (const t of packet.map.things) if (t.location?.at) t.location.at = [t.location.at[0] - dx, t.location.at[1] - dy];
  return { packet, mapped: true };
}
