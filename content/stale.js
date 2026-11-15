// Worn-out props (D169, D197): things generated rooms and worlds kept reaching for, in every genre, until they were in
// nearly every one. The pitch, the act and each room are told never to build on them, and an answer that does goes
// back once.
export const STALE = [
  "hanging cages, or anything kept in a cage on a chain",
  "ledgers and tallies, and clerks or overseers keeping records",
  "bells of any kind, rung to summon, warn or command, or worn so someone can be heard coming",
];

// The same props as words an answer can be checked for. Only words that mean nothing else: "count" is also a title.
export const STALE_WORDS = /hanging cage|cages? (?:hung|hangs|hanging|swings?|swinging|on (?:a |its )?chains?)|\bledgers?\b|\btall(?:y|ies)\b|\b(?:hand-?)?bells?\b|\bbelfr(?:y|ies)\b/i;

// What an answer builds on that it shouldn't, as a problem to send back.
export function staleProblems(out) {
  const m = JSON.stringify(out).match(STALE_WORDS);
  return m ? [`"${m[0]}" is worn out (${STALE.join("; ")}): replace it with something this place and its people would have`] : [];
}
