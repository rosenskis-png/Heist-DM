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

// How each companion feels about the other, on three axes, and her read of how the other feels about her on the
// same three (D77): the range, and how far one answer may move each. A pair's `start` that is one number sets
// affection only.
export const axes = ["affection", "respect", "trust"];
export const pair = { range: [-10, 10], perScene: 2 };

// With no change to one of these tracks in an answer, a value below `to` rises by `by`: her natural interest in
// him, so any history can be recovered (D78). It never pulls a value down.
export const baseline = { to: 2, by: 1, tracks: ["heat", "intimacy", "regard"] };

// The chance, in percent, that the other companion catches an aside, by the risk the speaker declares (D80).
export const asideCatch = { low: 1, medium: 2, high: 4 };

// What each number means, for her call (D79). Each band is [lowest value, text]; the highest band at or below the
// value applies. Player tracks describe her toward him; each axis has her own view and her read of the other's.
export const stances = {
  heat: [[0, "no desire for him at all"], [1, "a flicker of interest in him"], [3, "she wants him, and it shows when she lets it"], [5, "she wants him badly"], [9, "she's consumed with wanting him"]],
  intimacy: [[0, "he's a stranger to her; she shares nothing real"], [2, "getting to know him; a little of her guard is down"], [5, "close: she tells him true things"], [8, "deeply close: he knows her"]],
  regard: [[-10, "contempt or open hostility: she doesn't want his company, and his kindness reads as manipulation"], [-6, "she resents him: cool, guarded, sharp, and easy charm gets nothing"], [-2, "she hasn't made up her mind about him"], [2, "she likes him"], [6, "she thinks highly of him and would defend him"]],
  affection: {
    own: [[-10, "you hate her"], [-6, "you dislike her"], [-2, "you're indifferent to her, or of two minds"], [3, "you like her"], [7, "you love her"]],
    read: [[-10, "she hates you"], [-6, "she dislikes you"], [-2, "she's indifferent to you"], [3, "she likes you"], [7, "she loves you"]],
  },
  respect: {
    own: [[-10, "you hold her in contempt"], [-6, "you look down on her"], [-2, "you have no strong view of her judgment or abilities"], [3, "you respect her"], [7, "you admire her"]],
    read: [[-10, "she holds you in contempt"], [-6, "she looks down on you"], [-2, "she has no strong view of you"], [3, "she respects you"], [7, "she admires you"]],
  },
  trust: {
    own: [[-10, "you'd expect her to betray you"], [-6, "you don't trust her"], [-2, "you're wary of her"], [3, "you trust her"], [7, "you'd trust her with your life"]],
    read: [[-10, "she expects you to betray her"], [-6, "she doesn't trust you"], [-2, "she's wary of you"], [3, "she trusts you"], [7, "she'd trust you with her life"]],
  },
};

// Gravenhold's per-turn clamps (heat −2..2, depth −3..2, regard −3..2, dark 0..2) and its +4 per encounter cap
// on heat and intimacy gains, reset when an encounter ends.
export const caps = {
  perTurn: { heat: [-2, 2], intimacy: [-3, 2], regard: [-3, 2], lean: [0, 2] },
  perEncounter: { heat: 4, intimacy: 4 },
};

// After her payoff, heat stays fluid (D78). For a companion with `leanFromHeat`, heat gained then also feeds her
// dark branch, and intimacy gained after the payoff draws her back from it.
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
// Computed from her own involvement and what she believes about him and the other (D81), never the truth about them.
export const configText = {
  chosen: "He has chosen her (they are lovers), as far as she knows.",
  former: "They were lovers once; it's over, for now.",
  thirdwheel: "She believes he's involved with the other companion; she is the friend.",
  secondfiddle: "She wants him, but she believes he's involved with the other companion.",
  shared: "All three are openly together.",
  cheatedOn: "They're lovers, and she's found out he's also involved with the other companion, behind her back.",
  affair: "They're lovers, and she knows he was involved with the other companion first: she's the other woman, and it's secret.",
  rivals: "Both are involved with him, and it's out in the open.",
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
  former: "Former lovers",
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
