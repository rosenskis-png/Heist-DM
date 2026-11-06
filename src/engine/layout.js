// The layout (D28, D153): code puts a generated room on the 5-ft grid from the sketch's rough sizes, so the AIs never
// write coordinates. Each zone arrives with `size: [w, h]` in squares (and maybe a `level`); each connection is placed
// on a wall the two zones share, or, between levels, on a square inside both. Zones are placed outward from where the
// party starts, each against the zone it's reached from. If a connection can't be placed (a loop that won't close),
// the packet ships without a map rather than with a wrong one (D9): no footprints, no walls. Pure.

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

// Where a zone of size w×h can go against `p` without overlapping anything already on its level, nearest the middle
// of each side first.
function besides(p, w, h, level, placed) {
  const free = (r) => !placed.some((q) => q.level === level && overlaps(q, r));
  const tries = [];
  for (let d = 0; d < Math.max(p.w, p.h) + Math.max(w, h); d++)
    for (const s of [d, -d]) {
      const cy = p.y + Math.floor((p.h - h) / 2) + s;
      const cx = p.x + Math.floor((p.w - w) / 2) + s;
      tries.push({ x: p.x + p.w, y: cy }, { x: p.x - w, y: cy }, { x: cx, y: p.y + p.h }, { x: cx, y: p.y - h });
    }
  return tries.map((t) => ({ ...t, w, h, level })).find((r) => free(r) && sharedWall(p, r));
}

// Over another zone on a different level, sharing a square with it.
function above(p, w, h, level, placed) {
  const free = (r) => !placed.some((q) => q.level === level && overlaps(q, r));
  for (const [cx, cy] of cellsOf(p))
    for (let dx = 0; dx < w; dx++)
      for (let dy = 0; dy < h; dy++) {
        const r = { x: cx - dx, y: cy - dy, w, h, level };
        if (free(r)) return r;
      }
  return null;
}

const squareIn = (a, b) => cellsOf(a).find(([x, y]) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) ?? null;

export function layout(input) {
  const packet = structuredClone(input);
  const { zones, connections } = packet.map;
  const sizeOf = (z) => (z.size ?? [3, 3]).map((n) => Math.max(1, Math.min(20, Math.round(n))));
  const levelOf = (z) => z.level ?? 0;
  const startId = packet.start?.positions?.player;
  const order = [zones.find((z) => z.id === startId) ?? zones[0]];
  const at = new Map();
  const [w0, h0] = sizeOf(order[0]);
  at.set(order[0].id, { x: 0, y: 0, w: w0, h: h0, level: levelOf(order[0]) });
  let ok = true;
  for (let i = 0; i < order.length && ok; i++) {
    const p = order[i];
    for (const c of connections.filter((c) => c.between.includes(p.id))) {
      const other = zones.find((z) => z.id === c.between.find((id) => id !== p.id));
      if (!other || at.has(other.id)) continue;
      const [w, h] = sizeOf(other);
      const placed = [...at.values()];
      const r = levelOf(other) === levelOf(p) ? besides(at.get(p.id), w, h, levelOf(other), placed) : above(at.get(p.id), w, h, levelOf(other), placed);
      if (!r) { ok = false; break; }
      at.set(other.id, r);
      order.push(other);
    }
  }
  if (ok && at.size === zones.length)
    for (const c of connections) {
      const [a, b] = c.between.map((id) => at.get(id));
      if (a.level === b.level) c.wall = sharedWall(a, b);
      else c.square = squareIn(a, b);
      if (!c.wall && !c.square) { ok = false; break; }
    }
  if (!ok || at.size !== zones.length) {
    for (const z of zones) { delete z.rects; delete z.size; }
    for (const c of connections) { delete c.wall; delete c.square; }
    for (const t of packet.map.things) delete t.location?.at;
    return { packet, mapped: false };
  }
  for (const z of zones) {
    const r = at.get(z.id);
    z.rects = [[r.x, r.y, r.w, r.h]];
    delete z.size;
  }
  // Put everything on non-negative coordinates.
  const all = [...at.values()];
  const [dx, dy] = [Math.min(...all.map((r) => r.x)), Math.min(...all.map((r) => r.y))];
  for (const z of zones) z.rects = z.rects.map(([x, y, w, h]) => [x - dx, y - dy, w, h]);
  for (const c of connections) {
    if (c.wall) c.wall = c.wall.map(([x, y]) => [x - dx, y - dy]);
    if (c.square) c.square = [c.square[0] - dx, c.square[1] - dy];
  }
  return { packet, mapped: true };
}
