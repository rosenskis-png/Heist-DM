// A room's seed (D118, D153, D158, D164, D196, D197): code picks the question the sketch call answers, so a model asked
// for a room doesn't write the average one every time. Each room gets one place from the act's pools (a plain place for a
// room with danger in it or a merchant, a stranger setting for a calm room), one motif, and at most one prize and one
// extra. No lists of images: every one became something rooms had to reconcile, or came back in room after room. Pure
// and seeded; the campaign keeps the seed's random position and what the act has used.
import { motifs } from "../../content/motifs.js";
import { d100 } from "../engine/rng.js";
import { setting } from "../../content/setting.js";

// What's worth having beyond the way out (D164): nothing about half the time; a clue is one more kind of reward.
export const PRIZES = ["none: getting out is the whole of it", "gold", "a relic", "a journal page"];
const PRIZE_WEIGHTS = [10, 4, 2, 4];
// Where a follower is going (D192): the rooms that can be that place, and how likely the room is it, by how many rooms
// they've travelled with the party: never the first, then one in three, one in two from the third, and always from the fifth.
const DESTINATION_KINDS = ["encounter", "oddity", "quiet"];
const destinationOdds = (n) => (n >= 5 ? 1 : n >= 3 ? 2 : n >= 1 ? 3 : 0);
// Rooms that may hold a prize; rooms a returning character may turn up in (the designer's call).
const PRIZED = ["encounter", "oddity", "quiet"];
const CALLBACK_KINDS = ["encounter", "oddity"];
// Outfits (D195): hidden or hard to reach in a room without a fight, two or three an act, and one more as the reward
// for every climax. `OUTFITS_CALM` is the share of the way's drawn rooms that are quiet or odd (content/setting.js).
const OUTFIT_KINDS = ["quiet", "oddity", "campfire"];
const OUTFITS_CALM = 0.3;
// The calm rooms the act gives settings for (D167), and the rooms set in one of its plain places (D196).
const SET_KINDS = ["quiet", "oddity", "campfire"];
const PLACE_KINDS = ["encounter", "merchant"];
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
// `world`, and the kinds code drew for the room's exits. Returns the seed
// and the campaign with its random position and what it has used moved on.
export function seedFor(camp, world, kind, exits = []) {
  const rng = { rng: camp.seedRng ?? camp.way.rng ^ 0x9e3779b9 };
  const plan = camp.plan ?? null;
  const used = camp.used ?? [];
  const room = (camp.roomNo ?? 0) + 1;
  const seed = { kind, act: camp.act, exits };
  seed.spotlight = spotlightFor(rng, kind, camp.spotlight ?? null);
  // One motif a room: a situation's shape, as a leaning (D163, D169), not repeated in the act where it can be helped.
  const fit = motifs.filter((m) => m.kinds.includes(kind) && (seed.spotlight || m.id !== "valued_thing"));
  const pool = [...fresh(fit, used, (m) => m.id)];
  // One motif a room (D179): two pulled a room toward two ideas joined together.
  const n = camp.first ? 0 : Math.min(1, pool.length);
  seed.motifs = [];
  while (seed.motifs.length < n) seed.motifs.push(pool.splice(roll(rng, pool.length), 1)[0]);
  // Where the room is (D167, D196): a plain place for a room with danger in it or a merchant, a setting for a calm
  // room, each a different one from any used earlier in the act until they run out. The adventure's first room (D197)
  // is where the party comes to, so it draws neither.
  const settingsUsed = camp.settingsUsed ?? [];
  const placesUsed = camp.placesUsed ?? [];
  const first = !!camp.first;
  if (first) seed.first = true;
  else if (PLACE_KINDS.includes(kind) && plan?.places?.length) seed.place = pickFrom(rng, fresh(plan.places, placesUsed));
  else if (SET_KINDS.includes(kind) && plan?.settings?.[kind]?.length) seed.setting = pickFrom(rng, fresh(plan.settings[kind], settingsUsed));
  // Her story's feature once an act; her other rooms touch her values (D167).
  const storyShown = camp.storyShown ?? [];
  if (seed.spotlight && seed.spotlight !== "both") seed.herStory = !storyShown.includes(seed.spotlight);
  // The prize, and for a clue, which one and how it's carried: each clue is placed once in a campaign.
  const placed = camp.cluesPlaced ?? [];
  if (PRIZED.includes(kind) && !first) {
    seed.prize = weighted(rng, PRIZES, PRIZE_WEIGHTS);
    if (seed.prize === "a journal page") {
      const live = plan?.mysteries?.length ? (world.mysteries ?? []).filter((m) => plan.mysteries.includes(m.id)) : world.mysteries ?? [];
      // A journal page (D168): its writer reaches the sketch, never its words, which the party reads at camp.
      const open = live.flatMap((m) => m.journal.pages.map((p) => ({ id: p.id, mystery: m.id, author: m.journal.author }))).filter((p) => !placed.includes(p.id));
      if (open.length) seed.clue = pickFrom(rng, open);
      else seed.prize = "gold";
    }
  }
  // The follower's destination (D192): this room may be the place they've been trying to reach. It's the room's
  // premise, so the room has no other extra.
  const follower = (camp.carried ?? []).find((x) => x.kind === "follower" && x.goal);
  if (follower && DESTINATION_KINDS.includes(kind) && !camp.destination) {
    const odds = destinationOdds(room - 1 - (follower.since ?? 0));
    if (odds && roll(rng, odds) === 0) seed.destination = { name: follower.name, goal: follower.goal, motive: follower.motive ?? null };
  }
  // At most one extra, never two rooms running: a returning character, or news (D164, D197).
  const calledBack = camp.calledBack ?? [];
  const quiet = camp.lastExtra === room - 1 || !!seed.destination || first;
  if (!quiet && CALLBACK_KINDS.includes(kind) && roll(rng, 3) === 0) {
    const who = (camp.memory ?? []).filter((p) => !calledBack.includes(p.name));
    // The act's picks first: people who'd plausibly be in this region (D167).
    const likely = who.filter((p) => (plan?.returning ?? []).some((n) => p.name === n || p.name.startsWith(n) || n.startsWith(p.name)));
    if (who.length) seed.callback = pickFrom(rng, likely.length ? likely : who);
  }
  const newsUsed = camp.newsUsed ?? [];
  if (!quiet && !seed.callback && kind !== "campfire" && kind !== "sanctuary" && roll(rng, 3) === 0) {
    const left = (plan?.news ?? []).filter((n) => !newsUsed.includes(n));
    if (left.length) seed.news = pickFrom(rng, left);
  }
  const extra = seed.callback || seed.news;
  // An outfit (D195): the climax always rewards one; a calm room hides one while the act is short of its two or three,
  // more likely the fewer calm rooms are left. It's that room's only prize.
  const target = camp.outfitTarget ?? 2 + roll(rng, 2);
  if (kind === "climax") seed.outfit = "after";
  else if (OUTFIT_KINDS.includes(kind) && !first) {
    const need = target - (camp.outfitsFound ?? []).filter((f) => f.act === camp.act && !f.climax).length;
    const w = camp.way;
    const ahead = (w.left ?? 0) + Math.max(0, (w.legs ?? 1) - (w.leg ?? 1)) * (setting.way.rooms ?? 3);
    const chances = 1 + Math.max(0, (w.legs ?? 1) - (w.leg ?? 1)) + Math.round(ahead * OUTFITS_CALM);
    if (need > 0 && (need >= chances || roll(rng, chances) < need)) {
      seed.outfit = "hidden";
      delete seed.prize;
      delete seed.clue;
    }
  }
  return {
    seed,
    camp: {
      ...camp,
      seedRng: rng.rng,
      roomNo: room,
      used: [...used, ...seed.motifs.map((m) => m.id)],
      placesUsed: seed.place ? [...placesUsed, seed.place] : placesUsed,
      cluesPlaced: seed.clue ? [...placed, seed.clue.id] : placed,
      outfitTarget: target,
      calledBack: seed.callback ? [...calledBack, seed.callback.name] : calledBack,
      settingsUsed: seed.setting ? [...settingsUsed, seed.setting] : settingsUsed,
      newsUsed: seed.news ? [...newsUsed, seed.news] : newsUsed,
      storyShown: seed.herStory ? [...storyShown, seed.spotlight] : storyShown,
      ...(extra ? { lastExtra: room } : {}),
      ...(seed.destination ? { destination: { name: seed.destination.name, room } } : {}),
      first: false,
      spotlight: seed.spotlight,
    },
  };
}
