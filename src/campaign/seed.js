// A room's seed (D118, D153, D158): code picks the question the sketch call answers, so a model asked for a room doesn't
// write the average one every time. Pure and seeded; the campaign's `seedRng` and `used` motifs live in it.
import { motifs } from "../../content/motifs.js";
import { d100 } from "../engine/rng.js";

// The axes a room can differ on (docs/design/encounter-craft.md §2, §3, §8, §10).
export const XFACTORS = ["explore", "interact", "acquire", "overcome", "get through"];
export const SHAPES = ["linear", "branching", "open", "hub"];
export const MEAT = ["costs that differ in kind", "incomplete information", "a dilemma", "prizes that compete"];
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
  const n = CHALLENGED.includes(kind) ? 2 + roll(rng, 2) : 1;
  const count = Math.min(n, pool.length);
  seed.motifs = [];
  while (seed.motifs.length < count) seed.motifs.push(pool.splice(roll(rng, pool.length), 1)[0]);
  const lean = Math.max(-2, Math.min(2, Math.round(((camp.way.strain ?? 0) - 2) / 2)));
  seed.tone = TONES[Math.max(0, Math.min(TONES.length - 1, roll(rng, TONES.length) - lean))];
  if (CHALLENGED.includes(kind) || kind === "oddity") seed.xFactor = pickFrom(rng, XFACTORS);
  if (CHALLENGED.includes(kind)) {
    seed.shape = pickFrom(rng, SHAPES);
    seed.meat = pickFrom(rng, MEAT);
    const factions = Object.keys(world.factions);
    seed.factions = [pickFrom(rng, factions)];
    if (factions.length > 1 && roll(rng, 2)) seed.factions.push(pickFrom(rng, factions.filter((f) => f !== seed.factions[0])));
  }
  return { seed, camp: { ...camp, seedRng: rng.rng, used: [...used, ...seed.motifs.map((m) => m.id)], spotlight: seed.spotlight } };
}
