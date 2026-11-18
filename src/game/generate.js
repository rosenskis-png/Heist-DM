// Generation (docs/spec/generation.md, D117, D153, D156): the next room, from the campaign and the hand-off. Code draws
// the kinds its exits lead to and its seed; the sketch call designs it; the encode call turns it into packet data; code
// lays it out. The sketch is generator-only and thrown away, except its premise, which the campaign keeps for the act's
// next sketches (D162).
import { drawExits, actBegun, climaxChosen } from "../campaign/run.js";
import { seedFor } from "../campaign/seed.js";
import { layout } from "../engine/layout.js";
import { sketchCall } from "../calls/sketch.js";
import { encodeCall } from "../calls/encode.js";
import { readCall, lost } from "../calls/read.js";
import { load } from "../engine/load.js";
import { roomSheet, sheetText } from "../context.js";
import { actCall } from "../calls/act.js";
import { outfitCall } from "../calls/outfit.js";

// The mysteries' edges that apply in this room (D164, D197), as hidden facts the DM weighs and never says: an edge at
// a climax reaches that act's climax; any other reaches every room from its act on, so the same key works wherever the
// party tries it. Never sent to the sketch.
export function edgesFor(world, seed) {
  return (world.mysteries ?? [])
    .filter((m) => (m.edge.at === "climax" ? seed.kind === "climax" && seed.act === m.edge.act : seed.act >= m.edge.act))
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
  // The room before a campfire, the climax or the sanctuary leads only there (D169), but an encounter still has two ways
  // to get there, two different exits to the same place (D186).
  const only = drawn.kinds.length > 0 && drawn.kinds.every((k) => ["campfire", "climax", "sanctuary"].includes(k));
  const kinds = only ? Array((EXITS[kind] ?? 1) > 1 ? 2 : 1).fill(drawn.kinds[0]) : drawn.kinds;
  return seedFor(drawn.camp, world, kind, kinds);
}

// The AI half, from a seed: sketch, encode, layout. `c` holds the seed, world, party, handoff and log (and, on the bench
// only, the designer's `brief`, D154, and a `sketch` already written, to resume a room whose encode failed).
// `io.onStage(name, value)` hears each stage as it finishes, for the bench.
export async function designRoom(io, env, c) {
  const stage = (name, value) => (io.onStage?.(name, value), value);
  const sketch = c.sketch ?? stage("sketch", await sketchCall(io, env, c));
  // The room's outfit (D195), designed from the sketch: hidden in a calm room, or the climax's reward. An outfit that
  // fails to come is no reason to hold the room up: the room goes on without one.
  const outfit = c.seed.outfit && env.prompts?.outfit
    ? stage("outfit", await outfitCall(io, env, { room: { sketch, world: c.world, plan: c.plan, seed: c.seed }, found: c.found ?? [] }).catch(() => null))
    : null;
  const hidden = c.seed.outfit === "hidden" ? outfit : null;
  // A good design isn't thrown away because encoding it slipped (D185): encoding gets a second, fresh go with the
  // same sketch, and if that fails too the error carries the sketch, so trying again starts from it.
  let encoded;
  try {
    encoded = await encodeCall(io, env, { ...c, sketch, outfit: hidden });
  } catch (e) {
    try {
      encoded = await encodeCall(io, env, { ...c, sketch, outfit: hidden });
    } catch (e2) {
      e2.sketch = sketch;
      throw e2;
    }
  }
  // Which way on leads where is drawn, not designed (D198): the sketch writes its ways on without knowing, and they take
  // the seed's kinds in the order they're written, which the draw already randomised.
  encoded = { ...encoded, intent: { ...encoded.intent, exits: (encoded.intent.exits ?? []).map((e, i) => ({ ...e, leads_to: c.seed.exits[i] ?? e.leads_to })) } };
  const edges = edgesFor(c.world, c.seed);
  const withEdges = edges.length ? { ...encoded, map: { ...encoded.map, facts: [...encoded.map.facts, ...edges] } } : encoded;
  stage("encoded", withEdges);
  const room = { ...stage("laid out", layout(withEdges)), sketch, outfit };
  // One reading from the player's chair (D177): a room where danger stands in the way, read with only what the
  // player will be told. If the reader couldn't follow it, the room goes back to the sketch once, with the reader's
  // notes (D196). A read that fails never holds a room up, and a room made again isn't read again.
  if (!READ.includes(c.seed.kind) || c.sketch || c.reader || !env.prompts?.read) return room;
  const read = await readCall(io, env, { told: toldOf(room.packet, c.party) }).catch(() => null);
  stage("read", read);
  return read && lost(read) ? designRoom(io, env, { ...c, reader: read }) : room;
}

// The kinds of room that are read: the ones with a danger to get past.
const READ = ["encounter", "climax"];
// What the player will be told as the room opens: the room sheet, or the opening alone if the room won't load.
function toldOf(packet, party) {
  try {
    return sheetText(roomSheet(load({ packet, party })));
  } catch {
    return packet.opening;
  }
}

// `camp` is the campaign, with the room's kind already entered (`camp.way.here`); `world` its world; `party` the party's
// sheets as they are in the world; `handoff` the last room's, with `stub` the line its exit carried; `log` the last
// rooms' log lines. `env` has the prompts and `examples.encoded`. Returns the packet, whether it has a map, the seed,
// and the campaign with its random positions and used motifs moved on.
export async function generateRoom(io, env, { camp, world, party, handoff = null, log = [], resume = null }) {
  // Trying again after a failure keeps the seed and the sketch already written (D185).
  const { seed, camp: next } = resume?.seed ? { seed: resume.seed, camp: resume.camp } : seedRoom(camp, world);
  let designed;
  try {
    designed = await designRoom(io, env, { seed, world, party, handoff, log, earlier: camp.premises ?? [], plan: camp.plan ?? null, met: seed.kind === "climax" ? (camp.memory ?? []).filter((p) => p.act === camp.act) : [], carried: camp.carried ?? [], items: camp.items ?? [], found: camp.outfitsFound ?? [], ...(resume?.sketch ? { sketch: resume.sketch } : {}) });
  } catch (e) {
    e.resume = { seed, camp: next, sketch: e.sketch ?? null };
    throw e;
  }
  const { packet, mapped, sketch, outfit } = designed;
  // The act's rooms so far, by premise, so the next sketch goes somewhere different (D162). An outfit the room holds
  // is counted toward the act's (D195); the climax's waits for the climax to end.
  const placed = outfit && (seed.outfit === "after" || packet.map.things.some((t) => t.reward?.outfit?.id === outfit.id));
  const found = placed ? [...(next.outfitsFound ?? []), { id: outfit.id, name: outfit.name, text: outfit.text, act: seed.act, ...(seed.outfit === "after" ? { climax: true } : {}) }] : next.outfitsFound ?? [];
  // The climax's antagonist, as the sketch chose from the act's candidates (D197).
  const chosen = seed.kind === "climax" ? climaxChosen(next, sketch.antagonist ?? null) : next;
  return { packet, mapped, seed, camp: { ...chosen, premises: [...(next.premises ?? []), `${seed.kind}: ${sketch.premise}`], outfitsFound: found, ...(placed && seed.outfit === "after" ? { climaxOutfit: outfit } : {}) } };
}
