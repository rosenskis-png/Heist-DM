// Generation (docs/spec/generation.md, D117, D153, D156): the next room, from the campaign and the hand-off. Code draws
// the kinds its exits lead to and its seed; the sketch call designs it; the encode call turns it into packet data; code
// lays it out. The sketch is generator-only and thrown away.
import { drawExits } from "../campaign/run.js";
import { seedFor } from "../campaign/seed.js";
import { layout } from "../engine/layout.js";
import { sketchCall } from "../calls/sketch.js";
import { encodeCall } from "../calls/encode.js";

// How many exits a room has, by kind, before the way's count says where they lead (D144).
export const EXITS = { encounter: 2, climax: 1, quiet: 1, oddity: 2, merchant: 1, campfire: 1, sanctuary: 0 };

// The code half: the kinds the room's exits lead to, and its seed. `camp` has the room's kind entered
// (`camp.way.here`). Returns the seed and the campaign with its random positions and used motifs moved on.
export function seedRoom(camp, world) {
  const kind = camp.way.here;
  const drawn = drawExits(camp, EXITS[kind] ?? 1);
  return seedFor(drawn.camp, world, kind, drawn.kinds);
}

// The AI half, from a seed: sketch, encode, layout. `c` holds the seed, world, party, handoff and log (and, on the bench
// only, the designer's `brief`, D154, and a `sketch` already written, to resume a room whose encode failed).
// `io.onStage(name, value)` hears each stage as it finishes, for the bench.
export async function designRoom(io, env, c) {
  const stage = (name, value) => (io.onStage?.(name, value), value);
  const sketch = c.sketch ?? stage("sketch", await sketchCall(io, env, c));
  const encoded = stage("encoded", await encodeCall(io, env, { ...c, sketch }));
  return stage("laid out", layout(encoded));
}

// `camp` is the campaign, with the room's kind already entered (`camp.way.here`); `world` its world; `party` the party's
// sheets as they are in the world; `handoff` the last room's, with `stub` the line its exit carried; `log` the last
// rooms' log lines. `env` has the prompts and `examples.encoded`. Returns the packet, whether it has a map, the seed,
// and the campaign with its random positions and used motifs moved on.
export async function generateRoom(io, env, { camp, world, party, handoff = null, log = [] }) {
  const { seed, camp: next } = seedRoom(camp, world);
  const { packet, mapped } = await designRoom(io, env, { seed, world, party, handoff, log });
  return { packet, mapped, seed, camp: next };
}
