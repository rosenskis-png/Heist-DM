// The relationship model's numbers and words, ported from Gravenhold (legacy newRel, computeReady, configOf,
// stageLabel and the scoring in applyResult). The rules that read them are in src/campaign/relationship.js;
// the meaning is in docs/spec/companions.md §3–5. Everything here is tuning: change a number, not the code (D65).

// Each track's range.
export const tracks = {
  heat: [0, 12],
  intimacy: [0, 10],
  regard: [-10, 10],
  lean: [0, 10],
};

// The pair value's range, and how far one scene may move it.
export const pair = { range: [-10, 10], perScene: 1 };

// Gravenhold's per-turn clamps (heat −2..2, depth −3..2, regard −3..2, dark 0..2) and its +4 per encounter cap
// on heat and intimacy gains, reset when an encounter ends.
export const caps = {
  perTurn: { heat: [-2, 2], intimacy: [-3, 2], regard: [-3, 2], lean: [0, 2] },
  perEncounter: { heat: 4, intimacy: 4 },
};

// After her payoff, heat no longer rises. For a companion with `leanFromHeat`, it feeds her dark branch instead,
// and intimacy gained after the payoff draws her back from it.
export const afterPayoff = { heatToLean: 0.6, intimacyFromLean: 0.5 };

// When she's hurt: a drop in intimacy this large in one turn, or regard this low.
export const hurt = { intimacyDrop: -3, regard: -5 };

// A tagged reaction (D20): which tracks each profile field moves, per point of sign × intensity.
export const scoring = {
  heatActs: { heat: 1 },
  turnoffs: { heat: 1 },
  admires: { intimacy: 1, regard: 1 },
  despises: { intimacy: 1, regard: 1 },
  suppressed: { intimacy: 1, regard: 1 },
  darkTriggers: { lean: 1 },
};

// READY thresholds. The payoff's own thresholds are in each companion's `payoff`.
export const ready = { vulnerability: 6, deepOrBond: 9 };

// What a beat does to her state when it lands. Payoff, vulnerability, deep and bond set their flag.
export const beatEffects = {
  rupture: { regard: -2 },
  // Repair heals the hurt and lifts regard to at least this.
  repair: { regardFloor: 1 },
};

// The companion's own profile fields that are gated, and when each is sent (docs/spec/companions.md §3).
// Each gate is a list of alternatives; an alternative holds when all of its terms do (`when`, below).
export const reveal = {
  first: [{ turn: ["<", 8] }],
  why: [{ turn: ["<", 8] }],
  hidden: [{ intimacy: [">=", 2] }, { payoff: true }],
  deep: [{ payoff: true }, { intimacy: [">=", 5] }, { lean: [">=", 3] }],
  dark: [{ payoff: true }, { intimacy: [">=", 5] }, { lean: [">=", 3] }],
  payoff_scene: [{ payoff: false, toPayoff: ["<=", 2] }],
  quest: [{ actsToQuest: ["<=", 1] }],
};

// A companion nobody has shown interest in, this late, is ignored.
export const ignored = { turn: 40, heat: 2, intimacy: 2 };

// What each configuration means, for her call. Her reaction to it is `react` in her file.
export const configText = {
  chosen: "He has chosen her (they are lovers).",
  thirdwheel: "He is involved with the other companion; she is the friend.",
  secondfiddle: "She wants him, but he is involved with the other companion.",
  shared: "All three are openly together.",
  cheatedOn: "He is involved with her and, secretly, with the other companion.",
  affair: "She is the other woman: he was involved with the other companion first.",
  rivals: "Both are involved with him and both know it.",
  ignored: "He has shown her almost no interest of any kind.",
  open: "Nothing is settled yet.",
};
// The share of her payoff heat at which a companion whose rival is involved still wants him.
export const secondFiddleAt = 0.6;

// Stage labels for the UI. A companion's `stageLabels` overrides any of these by key.
export const stageLabels = {
  hurt: "Hurt",
  consumed: "Consumed",
  inLove: "In love",
  bonded: "Bonded",
  loversOpening: "Lovers, opening up",
  opening: "Opening up",
  indulging: "Indulging",
  lovers: "Lovers",
  burning: "Burning",
  drawn: "Drawn",
  friends: "Friends",
  strangers: "Strangers",
};
export const stageAt = { consumed: 6, indulging: 5, burningWithin: 1, drawn: 2, friends: 3 };

// How much of the relationship the sigil shows, 0–7.
export const progressAt = { friends: 3, close: 8, max: 7 };

// How many memories each companion keeps.
export const memoryLimit = 30;
