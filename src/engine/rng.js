// The seeded random number generator (docs/spec/engine.md §7). Its position lives in state (D60), so a replay
// rolls the same numbers. Fixtures can force rolls instead: `s.forced` is used up first.

// mulberry32: small, fast and good enough for d100.
export function d100(s) {
  if (s.forced?.length) return s.forced.shift();
  let t = (s.rng = (s.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (((t ^ (t >>> 14)) >>> 0) % 100) + 1;
}

// The number a band rolls against (engine.md §7). No AI reads these.
export const ODDS = { automatic: 100, easy: 80, medium: 65, hard: 45, very_hard: 25, near_impossible: 10 };
