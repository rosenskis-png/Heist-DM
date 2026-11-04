// The game's rules numbers. A fight is a plan (D130): its steps are ruled and rolled like any other, so the only
// numbers fights add are these. Semantics: docs/spec/engine.md §2.
export const skills = [
  "Might",
  "Agility",
  "Stealth",
  "Lore",
  "Insight",
  "Presence",
];

// How many telling blows put a person down, by tier. A blow the DM rules a success is one; an ability or a
// devastating hit can be more. Most fights end before this, when someone breaks (their sheet's `breaks`).
export const toughness = {
  civilian: 1,
  minion: 1,
  guard: 1,
  elite: 2,
  boss: 3,
};

// Conditions on the party: at most this many at once, each one line (D130).
export const CONDITIONS = { max: 6, length: 80 };

// What each person in a fight is visibly about to do, as the account leaves it (D130): at most this many.
export const THREATS = { max: 6, length: 100 };
