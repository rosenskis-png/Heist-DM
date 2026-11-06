// The way ahead (docs/spec/campaign.md §2, D140, D144). Code draws the kind of room each exit leads to, and counts the
// rooms left in the leg and the legs left in the act, so a campfire ends every leg and the climax ends the act. No map is
// built in advance. Pure and seeded: the way's random position lives in it, like the engine's (D60).
import { setting } from "../../content/setting.js";
import { d100 } from "../engine/rng.js";
import { EXIT_KINDS } from "../../schemas/packet.js";

export const KINDS = EXIT_KINDS;
// The kinds a leg is made of; the rest come from the count.
const DRAWN = ["encounter", "quiet", "oddity", "merchant"];
const calm = (kind) => ["quiet", "oddity", "merchant"].includes(kind);

const rules = () => setting.way;
const actOf = (act) => setting.acts[act - 1];

// The way at the start of an act. Its first room is an encounter (the act opens in trouble), so the leg still holds
// `rooms - 1` after it.
export function startAct(act, seed = 1) {
  return { act, legs: actOf(act).legs, leg: 1, left: rules().rooms - 1, extra: 0, owed: 0, strain: 0, seen: [], here: "encounter", rng: seed >>> 0 };
}

function pick(way, kinds) {
  const w = rules().weights;
  const total = kinds.reduce((t, k) => t + w[k], 0);
  let r = ((d100(way) - 1) / 100) * total;
  for (const k of kinds) if ((r -= w[k]) < 0) return k;
  return kinds[kinds.length - 1];
}

// The kinds of room the current room's `n` exits lead to, and the way with its random position moved on. When the leg's
// count is used up, every exit leads to its campfire, or to the climax after the last leg; the climax leads to the
// sanctuary, and the sanctuary ends the act (no exits). Otherwise each exit's kind is drawn by weight: a calm room never
// follows another, a leg has at most one of each kind in `once`, and a room's exits differ where they can.
export function exitKinds(way, n = 1) {
  const next = structuredClone(way);
  if (way.here === "sanctuary") return { way: next, kinds: [] };
  if (way.here === "climax") return { way: next, kinds: ["sanctuary"] };
  if (way.left === 0) return { way: next, kinds: Array(n).fill(way.leg < way.legs ? "campfire" : "climax") };
  // A room strain added to the leg is an encounter, never a quiet room or a merchant (D149).
  if (way.owed > 0) return { way: next, kinds: Array(n).fill("encounter") };
  const allowed = DRAWN.filter((k) => !(calm(k) && calm(way.here)) && !(rules().once.includes(k) && way.seen.includes(k)));
  const kinds = [];
  for (let i = 0; i < n; i++) {
    const fresh = allowed.filter((k) => !kinds.includes(k) && !(rules().once.includes(k) && kinds.includes(k)));
    kinds.push(pick(next, fresh.length ? fresh : allowed.filter((k) => !rules().once.includes(k))));
  }
  return { way: next, kinds };
}

// The way once the party leaves the current room for a room of `kind`, given the room's verdict `rating` (D146). The
// rating moves the leg's strain (a rough room raises it, a good one eases it), and each `strain.per` points add one
// room to the leg, at most `addedMax` a leg, only while the leg has rooms left: once a room's exits lead to the campfire,
// the campfire is in sight. A room once added stays. A campfire starts the next leg, with no strain.
export function enter(way, kind, { rating = null } = {}) {
  if (!KINDS.includes(kind)) throw new Error(`unknown kind of room: ${kind}`);
  const next = structuredClone(way);
  const { strain, addedMax } = rules();
  // The room being entered was drawn before this rating: an encounter pays off a room strain added earlier.
  if (kind === "encounter" && next.owed > 0) next.owed -= 1;
  if (rating != null) next.strain = Math.max(0, next.strain + strain.pivot - rating);
  while (next.left > 0 && next.extra < addedMax && next.extra < Math.floor(next.strain / strain.per)) {
    next.left += 1;
    next.extra += 1;
    next.owed += 1;
  }
  if (kind === "campfire") Object.assign(next, { leg: next.leg + 1, left: rules().rooms, extra: 0, owed: 0, strain: 0, seen: [] });
  else if (DRAWN.includes(kind)) {
    next.left -= 1;
    next.seen.push(kind);
  }
  next.here = kind;
  return next;
}

// Which exit the party leaves by. The hand-off names it when the whole party ended in one exit's zone; otherwise (they
// were captured, or the ending carried them off) code picks one of the room's exits, seeded, and says it was forced.
export function wayOn(way, exits = [], handoff = {}) {
  const next = structuredClone(way);
  const chosen = exits.find((e) => e.id === handoff.way_on);
  if (chosen) return { way: next, exit: chosen, forced: false };
  if (!exits.length) return { way: next, exit: null, forced: true };
  return { way: next, exit: exits[(d100(next) - 1) % exits.length], forced: true };
}
