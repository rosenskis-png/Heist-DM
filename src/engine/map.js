// Geometry checks for a packet (docs/spec/packet.md, Validation; D28).
// Coordinates stay in here; the AIs get only the facts derived from them (D9).

export const other = (c, z) => c.between.find((x) => x !== z);

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

// Two zones on one level share a wall (for hears_through_walls, engine.md §5).
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
  // A packet without a map (D9, D153): no zone has a footprint, and there's nothing to check. Half a map is wrong.
  const mapped = zones.filter((z) => z.rects?.length).length;
  if (!mapped) return [];
  if (mapped < zones.length) return [`only some zones have footprints: ${zones.filter((z) => !z.rects?.length).map((z) => z.id).join(", ")} don't`];
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
