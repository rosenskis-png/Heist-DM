// A room's seed (D118, D153, D158, D162–D164): code picks the question the sketch call answers, so a model asked for a
// room doesn't write the average one every time. Pure and seeded; the campaign keeps the seed's random position and
// what the act has used.
import { motifs } from "../../content/motifs.js";
import { d100 } from "../engine/rng.js";

export const TONES = ["very stressed about time", "tense", "even", "light", "a fantasy playground"];
// What the place is busy with when the party arrives (D162). The act call writes what each kind looks like in this
// region (D164); code draws a kind per room, never repeating within an act.
export const BUSY = ["hard labour", "a feast or celebration", "a rite or worship", "a punishment or execution", "trade or a market", "getting ready for a raid", "sleep or the night watch", "sickness or a plague", "ruin and decay", "beasts or monsters kept or loose", "a burial or mourning", "a contest or a game", "building or repair", "training or drill"];
// The space's rough form, and the one thing the eye goes to (D163): fixed, from wide lists, not repeated within an act,
// because any image the prompt itself holds becomes an anchor.
export const SHAPES = ["a street or alley", "a long gallery or nave", "a warren of small chambers", "a garden or orchard", "a market of stalls", "a river crossing or ford", "a field of pillars or columns", "a wide stair hall", "a courtyard open to the sky", "a ship's deck or barge", "a pit or bowl", "terraces down a slope", "a tower or shaft", "a bridge or ledge over a drop", "an island in something", "a cave of natural rock", "a ruin half fallen in", "a crossroads of tunnels"];
export const CENTREPIECES = ["a statue or idol", "a great machine", "a fire or forge", "a tree or great growth", "a throne or seat of honour", "a wreck", "a pool or spring", "a beast", "a tower or scaffold", "an altar", "a table set for many", "a gate or portcullis", "a pile of something valuable", "a cart, wagon or vessel", "a grave or tomb", "a bell, drum or horn", "a map, model or mural", "a hole in the floor"];
// What's worth having beyond the way out (D164): nothing about half the time; a clue is one more kind of reward.
export const PRIZES = ["none: getting out is the whole of it", "gold", "a relic", "a journal page"];
const PRIZE_WEIGHTS = [10, 4, 2, 4];
// Rooms with a challenge; rooms that may hold a prize; rooms a returning character may turn up in (the designer's call).
const CHALLENGED = ["encounter", "climax"];
const PRIZED = ["encounter", "oddity", "quiet"];
const CALLBACK_KINDS = ["encounter", "oddity"];
const HINT_KINDS = ["encounter", "oddity", "quiet"];
// The calm rooms the act gives settings for (D167).
const SET_KINDS = ["quiet", "oddity", "campfire"];
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
const fresh = (list, used, key = (x) => x) => {
  const left = list.filter((x) => !used.includes(key(x)));
  return left.length ? left : list;
};
function weighted(rng, items, weights) {
  let n = roll(rng, weights.reduce((a, b) => a + b, 0));
  for (let i = 0; i < items.length; i++) if ((n -= weights[i]) < 0) return items[i];
  return items[0];
}

// The seed for a room of `kind`, given the campaign `camp` (its way, rng, act plan and what the act has used), its
// `world`, and the kinds code drew for the room's exits. A rough stretch leans the tone toward stress. Returns the seed
// and the campaign with its random position and what it has used moved on.
export function seedFor(camp, world, kind, exits = []) {
  const rng = { rng: camp.seedRng ?? camp.way.rng ^ 0x9e3779b9 };
  const plan = camp.plan ?? null;
  const used = camp.used ?? [];
  const room = (camp.roomNo ?? 0) + 1;
  const seed = { kind, act: camp.act, exits };
  seed.spotlight = spotlightFor(rng, kind, camp.spotlight ?? null);
  // One motif, a situation's shape, as a leaning (D164, D168), not repeated in the act where it can be helped.
  const fit = motifs.filter((m) => m.kinds.includes(kind) && (seed.spotlight || m.id !== "valued_thing"));
  seed.motifs = fit.length ? [pickFrom(rng, fresh(fit, used, (m) => m.id))] : [];
  // A calm room's setting, from the act's: a different one from any used earlier in the act (D167).
  const settingsUsed = camp.settingsUsed ?? [];
  if (SET_KINDS.includes(kind) && plan?.settings?.[kind]?.length) seed.setting = pickFrom(rng, fresh(plan.settings[kind], settingsUsed));
  // Her story's feature once an act; her other rooms touch her values (D167).
  const storyShown = camp.storyShown ?? [];
  if (seed.spotlight && seed.spotlight !== "both") seed.herStory = !storyShown.includes(seed.spotlight);
  // Tone: a rough leg leans stressed, a smooth one playful, and the act darkens as it goes (D167).
  const lean = Math.max(-2, Math.min(2, Math.round(((camp.way.strain ?? 0) - 2) / 2)));
  const legs = camp.way.legs ?? 1;
  const late = legs > 1 ? Math.round((((camp.way.leg ?? 1) - 1) / (legs - 1)) * 1.5) : 0;
  seed.tone = TONES[Math.max(0, Math.min(TONES.length - 1, roll(rng, TONES.length) - lean - late))];
  // What it's busy with: a kind the act's region has, in the act's words when there is a plan.
  const usedBusy = camp.usedBusy ?? [];
  const busy = plan?.busy?.length ? pickFrom(rng, fresh(plan.busy, usedBusy, (b) => b.kind)) : { kind: pickFrom(rng, fresh(BUSY, usedBusy)) };
  seed.busy = busy.kind;
  if (busy.line) seed.busyLine = busy.line;
  const usedShapes = camp.usedShapes ?? [];
  const usedCentres = camp.usedCentres ?? [];
  seed.shape = pickFrom(rng, fresh(SHAPES, usedShapes));
  seed.centrepiece = pickFrom(rng, fresh(CENTREPIECES, usedCentres));
  // Whose place it is: one of the factions that hold the region now.
  if (CHALLENGED.includes(kind) || kind === "oddity") {
    const holders = (plan?.holders ?? world.regions?.[camp.act - 1]?.holders ?? []).filter((f) => world.factions[f]);
    seed.factions = [pickFrom(rng, holders.length ? holders : Object.keys(world.factions))];
  }
  // The prize, and for a clue, which one and how it's carried: each clue is placed once in a campaign.
  const placed = camp.cluesPlaced ?? [];
  if (PRIZED.includes(kind)) {
    seed.prize = weighted(rng, PRIZES, PRIZE_WEIGHTS);
    if (seed.prize === "a journal page") {
      const live = plan?.mysteries?.length ? (world.mysteries ?? []).filter((m) => plan.mysteries.includes(m.id)) : world.mysteries ?? [];
      // A journal page (D168): its writer reaches the sketch, never its words, which the party reads at camp.
      const open = live.flatMap((m) => m.journal.pages.map((p) => ({ id: p.id, mystery: m.id, author: m.journal.author }))).filter((p) => !placed.includes(p.id));
      if (open.length) seed.clue = pickFrom(rng, open);
      else seed.prize = "gold";
    }
  }
  // At most one extra, never two rooms running: a returning character, or a sign of the act's peak (D164).
  const calledBack = camp.calledBack ?? [];
  const hintsUsed = camp.hintsUsed ?? [];
  const quiet = camp.lastExtra === room - 1;
  if (!quiet && CALLBACK_KINDS.includes(kind) && roll(rng, 3) === 0) {
    const who = (camp.memory ?? []).filter((p) => !calledBack.includes(p.name));
    // The act's picks first: people who'd plausibly be in this region (D167).
    const likely = who.filter((p) => (plan?.returning ?? []).some((n) => p.name === n || p.name.startsWith(n) || n.startsWith(p.name)));
    if (who.length) seed.callback = pickFrom(rng, likely.length ? likely : who);
  }
  if (!quiet && !seed.callback && HINT_KINDS.includes(kind) && camp.hintLeg !== camp.way.leg && roll(rng, 2) === 0) {
    const left = (plan?.hints ?? []).filter((h) => !hintsUsed.includes(h));
    if (left.length) seed.hint = pickFrom(rng, left);
  }
  const newsUsed = camp.newsUsed ?? [];
  if (!quiet && !seed.callback && !seed.hint && kind !== "campfire" && kind !== "sanctuary" && roll(rng, 3) === 0) {
    const left = (plan?.news ?? []).filter((n) => !newsUsed.includes(n));
    if (left.length) seed.news = pickFrom(rng, left);
  }
  const extra = seed.callback || seed.hint || seed.news;
  return {
    seed,
    camp: {
      ...camp,
      seedRng: rng.rng,
      roomNo: room,
      used: [...used, ...seed.motifs.map((m) => m.id)],
      usedBusy: [...usedBusy, seed.busy],
      usedShapes: [...usedShapes, seed.shape],
      usedCentres: [...usedCentres, seed.centrepiece],
      cluesPlaced: seed.clue ? [...placed, seed.clue.id] : placed,
      calledBack: seed.callback ? [...calledBack, seed.callback.name] : calledBack,
      hintsUsed: seed.hint ? [...hintsUsed, seed.hint] : hintsUsed,
      settingsUsed: seed.setting ? [...settingsUsed, seed.setting] : settingsUsed,
      newsUsed: seed.news ? [...newsUsed, seed.news] : newsUsed,
      storyShown: seed.herStory ? [...storyShown, seed.spotlight] : storyShown,
      ...(extra ? { lastExtra: room } : {}),
      ...(seed.hint ? { hintLeg: camp.way.leg } : {}),
      spotlight: seed.spotlight,
    },
  };
}
