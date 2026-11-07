// A room's seed (D118, D153, D158): code picks the question the sketch call answers, so a model asked for a room doesn't
// write the average one every time. Pure and seeded; the campaign's `seedRng` and `used` motifs live in it.
import { motifs } from "../../content/motifs.js";
import { d100 } from "../engine/rng.js";

// The axes a room can differ on (docs/design/encounter-craft.md §2, §8, §16). Fixed: kind, tone, whose room, exits.
// Leanings, which the sketch may use or leave (D160): x-factor, shape, core, prize, motifs, factions.
export const XFACTORS = ["explore", "interact", "acquire", "overcome", "get through"];
// The space's rough form, and the one thing the eye goes to (D163): fixed, drawn by code from wide lists and not repeated
// within an act, because any image the prompt itself holds becomes an anchor (D161, D163).
export const SHAPES = ["a street or alley", "a long gallery or nave", "a warren of small chambers", "a garden or orchard", "a market of stalls", "a river crossing or ford", "a field of pillars or columns", "a wide stair hall", "a courtyard open to the sky", "a ship's deck or barge", "a pit or bowl", "terraces down a slope", "a tower or shaft", "a bridge or ledge over a drop", "an island in something", "a cave of natural rock", "a ruin half fallen in", "a crossroads of tunnels"];
export const CENTREPIECES = ["a statue or idol", "a great machine", "a fire or forge", "a tree or great growth", "a throne or seat of honour", "a wreck", "a pool or spring", "a beast", "a tower or scaffold", "an altar", "a table set for many", "a gate or portcullis", "a pile of something valuable", "a cart, wagon or vessel", "a grave or tomb", "a bell, drum or horn", "a map, model or mural", "a hole in the floor"];
// What the room is built around (encounter-craft §16).
export const CORES = ["a place hard at its own work", "one big thing in a space", "a danger in the way"];
// What the place is busy with when the party arrives (D162): drawn so an act's rooms don't repeat it, and fitted to the
// world by the sketch, so a world whose life is one industry doesn't make every room that industry.
export const BUSY = ["hard labour", "a feast or celebration", "a rite or worship", "a punishment or execution", "trade or a market", "getting ready for a raid", "sleep or the night watch", "sickness or a plague", "ruin and decay", "beasts or monsters kept or loose", "a burial or mourning", "a contest or a game", "building or repair", "training or drill"];
// Whether there's anything worth having beyond the way out; none is about half (encounter-craft §16).
export const PRIZES = ["none: getting out is the whole of it", "something worth the risk"];
export const TONES = ["very stressed about time", "tense", "even", "light", "a fantasy playground"];
// Rooms with a challenge get every axis; the calm kinds get a tone and motifs, and the oddity a hook too.
const CHALLENGED = ["encounter", "climax"];
// Whose room it is (D158): one companion's slot, or neither, which is the commonest; never the same companion twice in a
// row. The climax is both companions' (D148: a choice at its peak, often between their threads).
export const SLOTS = ["companion_a", "companion_b"];
function spotlightFor(rng, kind, last) {
  if (kind === "climax") return "both";
  const r = roll(rng, 10);
  const slot = r < 5 ? null : SLOTS[r % 2];
  return slot && slot === last ? null : slot;
}

const roll = (rng, n) => (d100(rng) - 1) % n;
const pickFrom = (rng, list) => list[roll(rng, list.length)];

// The seed for a room of `kind`, given the campaign `camp` (its way, rng and used motifs), its `world`, and the kinds
// code drew for the room's exits. A rough stretch (the leg's strain) leans the tone toward stress; a smooth one toward
// play. Motifs suit the kind and avoid those the act has used, where it can. Returns the seed and the campaign with its
// random position and used motifs moved on.
export function seedFor(camp, world, kind, exits = []) {
  const rng = { rng: camp.seedRng ?? camp.way.rng ^ 0x9e3779b9 };
  const used = camp.used ?? [];
  const seed = { kind, act: camp.act, exits };
  seed.spotlight = spotlightFor(rng, kind, camp.spotlight ?? null);
  // A companion's thing needs a companion whose room it is.
  const fit = motifs.filter((m) => m.kinds.includes(kind) && (seed.spotlight || m.id !== "valued_thing"));
  const fresh = fit.filter((m) => !used.includes(m.id));
  const pool = [...(fresh.length >= 2 ? fresh : fit)];
  const n = CHALLENGED.includes(kind) ? 1 + roll(rng, 2) : 1;
  const count = Math.min(n, pool.length);
  seed.motifs = [];
  while (seed.motifs.length < count) seed.motifs.push(pool.splice(roll(rng, pool.length), 1)[0]);
  const lean = Math.max(-2, Math.min(2, Math.round(((camp.way.strain ?? 0) - 2) / 2)));
  seed.tone = TONES[Math.max(0, Math.min(TONES.length - 1, roll(rng, TONES.length) - lean))];
  if (CHALLENGED.includes(kind) || kind === "oddity") seed.xFactor = pickFrom(rng, XFACTORS);
  const usedBusy = camp.usedBusy ?? [];
  const busyPool = BUSY.filter((b) => !usedBusy.includes(b));
  seed.busy = pickFrom(rng, busyPool.length ? busyPool : BUSY);
  const fresh2 = (list, used) => (list.filter((x) => !used.includes(x)).length ? list.filter((x) => !used.includes(x)) : list);
  const usedShapes = camp.usedShapes ?? [];
  const usedCentres = camp.usedCentres ?? [];
  seed.shape = pickFrom(rng, fresh2(SHAPES, usedShapes));
  seed.centrepiece = pickFrom(rng, fresh2(CENTREPIECES, usedCentres));
  if (CHALLENGED.includes(kind)) {
    seed.core = pickFrom(rng, CORES);
    seed.prize = pickFrom(rng, PRIZES);
    // Whose place it is (D162): one faction, fixed, so rooms differ by who holds them.
    seed.factions = [pickFrom(rng, Object.keys(world.factions))];
  }
  return { seed, camp: { ...camp, seedRng: rng.rng, used: [...used, ...seed.motifs.map((m) => m.id)], usedBusy: [...usedBusy, seed.busy], usedShapes: [...usedShapes, seed.shape], usedCentres: [...usedCentres, seed.centrepiece], spotlight: seed.spotlight } };
}
