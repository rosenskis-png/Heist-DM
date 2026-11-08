// Worn-out props (D169): things generated rooms and worlds kept reaching for until they were in nearly every one. The
// seed tells each room, the act and the pitch never to build on them, and the sketch is sent back once if it does.
export const STALE = [
  "hanging cages, or anything kept in a cage on a chain",
  "ledgers, tallies, counts, and clerks or overseers keeping records",
];

// The same props as words a sketch can be checked for.
export const STALE_WORDS = /hanging cage|cages? (?:hung|hangs|hanging|swings?|swinging|on (?:a |its )?chains?)|\bledgers?\b|\btall(?:y|ies)\b|\bcounting\b|\bthe count\b|\bhead-?count\b/i;
