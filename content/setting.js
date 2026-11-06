// The rules every world shares (docs/spec/campaign.md, D150). What changes with the world (the place, its factions, its
// acts) is in content/worlds/. playerSecretReveal says how much of the player's secret each act may show (Act 4 and
// later use the Act 4 line).
export const setting = {
  // The shape every adventure shares: five acts, each with this many legs (D144).
  arc: [
    { act: "trapped", legs: 2 },
    { act: "crossing the place", legs: 3 },
    { act: "uncovering its secret", legs: 3 },
    { act: "the climax", legs: 2 },
    { act: "getting out", legs: 2 },
  ],
  whisperRings: `All three woke wearing identical silver rings they can't remove; the rings allow silent telepathy to one person or the whole party. Who put them there is a mystery revealed in Act 3; characters may wonder briefly but never harp on it.`,
  // How the way ahead is drawn (docs/spec/campaign.md §2, D144, D146). Starting values. A leg is `rooms` rooms long.
  // Each room's verdict moves the leg's strain by `strain.pivot - rating` (never below 0), and every `strain.per` points
  // add one more room, at most `addedMax` a leg, so a rough stretch takes longer to reach the campfire. Every act's
  // `legs` is at least 2, so every path has a campfire before the climax as well as the sanctuary after it. Each exit's
  // kind is drawn by `weights`; a non-encounter never follows another, and a leg has at most `once` of each kind listed.
  way: {
    rooms: 3,
    addedMax: 2,
    strain: { pivot: 6, per: 4 },
    weights: { encounter: 6, quiet: 2, oddity: 1, merchant: 1 },
    once: ["merchant"],
  },
  // Relics (D147, D148). Starting values: the party holds at most `max` in an act, and the climax's verdict rating
  // decides how many it keeps into the next, `keptByRating[rating - 1]`.
  relics: { max: 6, keptByRating: [0, 0, 0, 1, 1, 1, 2, 2, 3, 3] },
  playerSecretReveal: {
    1: "Never hint yet.",
    2: "Only faint hints (dreams, wards reacting oddly). Do not reveal.",
    3: "Reveal it this act in a dramatic moment that fits.",
    4: "He knows this now; it matters.",
  },
};
