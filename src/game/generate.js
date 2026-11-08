// Generation (docs/spec/generation.md, D117, D153, D156): the next room, from the campaign and the hand-off. Code draws
// the kinds its exits lead to and its seed; the sketch call designs it; the encode call turns it into packet data; code
// lays it out. The sketch is generator-only and thrown away, except its premise, which the campaign keeps for the act's
// next sketches (D162).
import { drawExits, actBegun } from "../campaign/run.js";
import { seedFor } from "../campaign/seed.js";
import { layout } from "../engine/layout.js";
import { sketchCall } from "../calls/sketch.js";
import { encodeCall } from "../calls/encode.js";
import { actCall } from "../calls/act.js";

// The mysteries' edges that apply in this room (D164), as hidden facts the DM weighs and never says: a climax gets the
// edges of its act's climax; a faction's room gets that faction's edges from their act on. Never sent to the sketch.
export function edgesFor(world, seed) {
  return (world.mysteries ?? [])
    .filter((m) => (m.edge.at === "climax" ? seed.kind === "climax" && seed.act === m.edge.act : seed.factions?.includes(m.edge.at) && seed.act >= m.edge.act))
    .map((m) => ({ id: `edge_${m.id}`, text: `${m.edge.text} This shapes how likely steps are; never say it, show it or hint at it.`, hidden: true }));
}

// The act call when an act begins (D164): from the world and the campaign's history (each earlier act's peak, rooms and
// log), what this act holds. After Act 5, `intent` is what the player says they want to do. Returns the campaign with
// the act's plan.
export async function beginAct(io, env, { camp, world, party = [], intent = null }) {
  const plan = await actCall(io, env, { world, act: camp.act, earlier: camp.history ?? [], peaks: camp.peaks ?? [], memory: camp.memory ?? [], party, intent });
  return actBegun(camp, plan);
}

// How many exits a room has, by kind, before the way's count says where they lead (D144).
export const EXITS = { encounter: 2, climax: 1, quiet: 1, oddity: 2, merchant: 1, campfire: 1, sanctuary: 0 };

// The code half: the kinds the room's exits lead to, and its seed. `camp` has the room's kind entered
// (`camp.way.here`). Returns the seed and the campaign with its random positions and used motifs moved on.
export function seedRoom(camp, world) {
  const kind = camp.way.here;
  const drawn = drawExits(camp, EXITS[kind] ?? 1);
  // The room before a campfire, the climax or the sanctuary has one way on, to it (D169).
  const kinds = drawn.kinds.every((k) => ["campfire", "climax", "sanctuary"].includes(k)) ? drawn.kinds.slice(0, 1) : drawn.kinds;
  return seedFor(drawn.camp, world, kind, kinds);
}

// The AI half, from a seed: sketch, encode, layout. `c` holds the seed, world, party, handoff and log (and, on the bench
// only, the designer's `brief`, D154, and a `sketch` already written, to resume a room whose encode failed).
// `io.onStage(name, value)` hears each stage as it finishes, for the bench.
export async function designRoom(io, env, c) {
  const stage = (name, value) => (io.onStage?.(name, value), value);
  const sketch = c.sketch ?? stage("sketch", await sketchCall(io, env, c));
  const encoded = await encodeCall(io, env, { ...c, sketch });
  const edges = edgesFor(c.world, c.seed);
  const withEdges = edges.length ? { ...encoded, map: { ...encoded.map, facts: [...encoded.map.facts, ...edges] } } : encoded;
  stage("encoded", withEdges);
  return { ...stage("laid out", layout(withEdges)), sketch };
}

// `camp` is the campaign, with the room's kind already entered (`camp.way.here`); `world` its world; `party` the party's
// sheets as they are in the world; `handoff` the last room's, with `stub` the line its exit carried; `log` the last
// rooms' log lines. `env` has the prompts and `examples.encoded`. Returns the packet, whether it has a map, the seed,
// and the campaign with its random positions and used motifs moved on.
export async function generateRoom(io, env, { camp, world, party, handoff = null, log = [] }) {
  const { seed, camp: next } = seedRoom(camp, world);
  const { packet, mapped, sketch } = await designRoom(io, env, { seed, world, party, handoff, log, earlier: camp.premises ?? [], plan: camp.plan ?? null });
  // The act's rooms so far, by premise, so the next sketch goes somewhere different (D162).
  return { packet, mapped, seed, camp: { ...next, premises: [...(next.premises ?? []), `${seed.kind}: ${sketch.premise}`] } };
}
