// Extracted from Gravenhold (legacy/gravenhold.html). See docs/spec/companions.md.
// Optional dynamics between two companions, keyed "a|b" in either order.
// `start` is where both start, or each one's own starting view of the other, keyed by id (D73). A view is one
// number (affection) or the three axes (D77).
// A missing pair falls back to the two profiles.
export const pairs = {
  "vesper|nadia": {
    start: { vesper: { affection: 2, respect: 1, trust: 0 }, nadia: { affection: -1, respect: 0, trust: -2 } },
    dynamic: `Vesper can taste Ember's hunger and finds it fascinating; Nadia finds Vesper exhausting.`,
  },
  "vesper|ruby": {
    start: { vesper: { affection: 2, respect: -3, trust: -1 }, ruby: { affection: -5, respect: -2, trust: -5 } },
    dynamic: `Vesper finds Ruby's devotion delicious and teases it; Ruby wants to stab her.`,
  },
  "vesper|fern": {
    start: { vesper: { affection: 2, respect: -1, trust: 2 }, fern: { affection: 4, respect: 2, trust: 3 } },
    dynamic: `Two unashamed women; Fern thinks Vesper is lovely, Vesper finds Fern's innocence-without-shame baffling.`,
  },
  "vesper|lyra": {
    start: -2,
    dynamic: `Lyra distrusts a demon on principle; Vesper loves needling the noble elf.`,
  },
  "vesper|serena": {
    start: 0,
    dynamic: `Two seductresses who recognise each other; mutual respect and constant one-upmanship.`,
  },
  "vesper|morgana": {
    start: -1,
    dynamic: "Two women used to being in control; a cold war of charm.",
  },
  "nadia|ruby": {
    start: { nadia: { affection: 1, respect: 0, trust: -2 }, ruby: { affection: -2, respect: -1, trust: -3 } },
    dynamic: `Nadia tries to soothe Ruby; Ember thinks Ruby is dangerous and says so.`,
  },
  "nadia|fern": {
    start: { nadia: { affection: 3, respect: 2, trust: 3 }, fern: { affection: 4, respect: 2, trust: 4 } },
    dynamic: "Warm and easy: performers and free spirits; Fern adores Ember.",
  },
  "nadia|lyra": {
    start: 1,
    dynamic: `Mutual respect between two women of grace; Lyra finds Ember unsettling at first.`,
  },
  "nadia|serena": {
    start: 0,
    dynamic:
      "Serena loves stealing Nadia's thunder; Nadia loves the competition.",
  },
  "nadia|morgana": {
    start: -1,
    dynamic: "Morgana wants Ember as a tool; Nadia will never allow it.",
  },
  "ruby|fern": {
    start: { ruby: { affection: -1, respect: -2, trust: -1 }, fern: { affection: 3, respect: 1, trust: 2 } },
    dynamic: `Fern keeps trying to hug Ruby; Ruby doesn't know what to do with kindness that isn't his.`,
  },
  "ruby|lyra": {
    start: { ruby: -3, lyra: -1 },
    dynamic: `Lyra sees Ruby as a danger to him; Ruby sees Lyra as the rival she most fears.`,
  },
  "ruby|serena": {
    start: { ruby: -4, serena: 1 },
    dynamic: "Serena teases Ruby for sport; Ruby takes it very badly.",
  },
  "ruby|morgana": {
    start: { ruby: -3, morgana: 0 },
    dynamic: "Morgana treats Ruby as a feral pet; Ruby hates being handled.",
  },
  "fern|lyra": {
    start: 1,
    dynamic: `Gentle friends; Fern teaches Lyra to laugh, Lyra protects Fern's trust.`,
  },
  "fern|serena": {
    start: 0,
    dynamic: `Fern finds Serena's games silly and charming; Serena can't fluster her, which drives her mad.`,
  },
  "fern|morgana": {
    start: -1,
    dynamic: "Fern won't bow to anyone; Morgana finds her refusal intriguing.",
  },
  "lyra|serena": {
    start: -1,
    dynamic: `Lyra's honesty against Serena's games; Serena enjoys trying to trick her.`,
  },
  "lyra|morgana": {
    start: -1,
    dynamic: `An elf who has seen queens rise and fall; Morgana resents not impressing her.`,
  },
  "serena|morgana": {
    start: 0,
    dynamic: `Two women who rule rooms differently; allies in scheming, rivals in everything else.`,
  },
  "lisa|vesper": {
    start: 1,
    dynamic: "SISTERS (see VARIANT).",
  },
  "lisa|nadia": {
    start: 1,
    dynamic: "SISTERS (see VARIANT).",
  },
  "lisa|ruby": {
    start: 1,
    dynamic: "SISTERS (see VARIANT).",
  },
  "fern|lisa": {
    start: 1,
    dynamic: "SISTERS (see VARIANT).",
  },
  "lisa|lyra": {
    start: 1,
    dynamic: "SISTERS (see VARIANT).",
  },
  "lisa|serena": {
    start: 1,
    dynamic: "SISTERS (see VARIANT).",
  },
  "lisa|morgana": {
    start: 1,
    dynamic: "SISTERS (see VARIANT).",
  },
};
