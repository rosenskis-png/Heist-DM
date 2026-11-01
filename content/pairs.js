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
  "nadia|ruby": {
    start: { nadia: { affection: 1, respect: 0, trust: -2 }, ruby: { affection: -2, respect: -1, trust: -3 } },
    dynamic: `Nadia tries to soothe Ruby; Ember thinks Ruby is dangerous and says so.`,
  },
  "nadia|fern": {
    start: { nadia: { affection: 3, respect: 2, trust: 3 }, fern: { affection: 4, respect: 2, trust: 4 } },
    dynamic: "Warm and easy: performers and free spirits; Fern adores Ember.",
  },
  "ruby|fern": {
    start: { ruby: { affection: -1, respect: -2, trust: -1 }, fern: { affection: 3, respect: 1, trust: 2 } },
    dynamic: `Fern keeps trying to hug Ruby; Ruby doesn't know what to do with kindness that isn't his.`,
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
  "annaleise|vesper": {
    start: { vesper: { affection: 3, respect: 3, trust: 0 }, annaleise: { affection: 2, respect: 1, trust: 1 } },
    dynamic: `Vesper tastes the intent behind every 'misunderstanding' and adores it; Annaleise can't tell whether Vesper is a friend or the one person who sees right through her.`,
  },
  "annaleise|nadia": {
    start: { nadia: { affection: 2, respect: 0, trust: -1 }, annaleise: { affection: 3, respect: 2, trust: 2 } },
    dynamic: `Nadia is charmed; Ember sees straight through the act and says so, through Nadia.`,
  },
  "annaleise|ruby": {
    start: { ruby: { affection: -4, respect: -3, trust: -5 }, annaleise: { affection: 1, respect: -1, trust: 0 } },
    dynamic: `Annaleise's 'only friendly' affection with him is Ruby's worst trigger; Annaleise doesn't understand, sweetly, on purpose.`,
  },
  "annaleise|fern": {
    start: { fern: { affection: 5, respect: 2, trust: 2 }, annaleise: { affection: 4, respect: 2, trust: 3 } },
    dynamic: `Two unashamed women who sketch and bathe together; Fern finds the misunderstandings delightful, until she notices the lies in them.`,
  },
  "sable|vesper": {
    start: { vesper: { affection: 1, respect: 3, trust: -2 }, sable: { affection: -1, respect: 1, trust: -3 } },
    dynamic: `Vesper can taste when someone's desire doesn't match her face; Sable keeps her distance from the one person who might notice.`,
  },
  "sable|nadia": {
    start: { nadia: { affection: 1, respect: 1, trust: 0 }, sable: { affection: 0, respect: 1, trust: -2 } },
    dynamic: `Ember notices that Sable's face never quite settles; Sable avoids being alone with Nadia.`,
  },
  "sable|ruby": {
    start: { ruby: { affection: -3, respect: -1, trust: -4 }, sable: { affection: -3, respect: -2, trust: -2 } },
    dynamic: `A powder keg: Ruby's open jealousy against Sable's invisible manipulation.`,
  },
  "sable|fern": {
    start: { fern: { affection: 3, respect: 1, trust: 3 }, sable: { affection: 1, respect: 0, trust: -1 } },
    dynamic: `Fern trusts her completely; if she learns Sable lies, it's the one thing Fern can't forgive.`,
  },
  "celeste|vesper": {
    start: { vesper: { affection: 1, respect: -1, trust: -2 }, celeste: { affection: 2, respect: 0, trust: 1 } },
    dynamic: `A succubus and a priestess of light: Vesper can taste the hunger in Celeste's worship, and something colder under it.`,
  },
  "celeste|nadia": {
    start: { nadia: { affection: 1, respect: 1, trust: -3 }, celeste: { affection: 3, respect: 1, trust: 2 } },
    dynamic: `Nadia knows what devoted orders can do; to her, the Ordo's light smells faintly of the Hearth's fire.`,
  },
  "celeste|ruby": {
    start: { ruby: { affection: -5, respect: -2, trust: -4 }, celeste: { affection: 2, respect: 0, trust: 1 } },
    dynamic: `Ruby can't make her back down: Celeste never stops serving him and never raises her voice.`,
  },
  "celeste|fern": {
    start: { fern: { affection: 4, respect: 2, trust: 3 }, celeste: { affection: 3, respect: 2, trust: 3 } },
    dynamic: `Fern thinks devotion is lovely; Celeste thinks Fern is a child of the light who doesn't know it yet.`,
  },
  "annaleise|sable": {
    start: { annaleise: { affection: 2, respect: 1, trust: 2 }, sable: { affection: -1, respect: 1, trust: -1 } },
    dynamic: `Annaleise kisses everyone hello; Sable has to remember which face she was wearing last time.`,
  },
  "annaleise|celeste": {
    start: { annaleise: { affection: 2, respect: 0, trust: 1 }, celeste: { affection: 2, respect: 0, trust: 2 } },
    dynamic: `Celeste approves of Annaleise's devotion to him, and less of the rest; Annaleise thinks the priestess is a prude, sweetly.`,
  },
  "sable|celeste": {
    start: { sable: { affection: 0, respect: 0, trust: -2 }, celeste: { affection: 2, respect: 1, trust: 2 } },
    dynamic: `Celeste trusts the quiet girl; Sable studies Celeste's devotion like a face she can't wear.`,
  },
};
