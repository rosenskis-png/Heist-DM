// The motif library (D118, D152, D168): short patterns of how a situation in a living place is built, from the
// encounter craft (docs/design/encounter-craft.md). The seed draws one for a room, a leaning the sketch uses or leaves.
// A motif is a situation's shape, never an image: no examples, so none can become an anchor (D163). It describes the
// world, never the party's routes. `kinds`: the kinds of room it suits.
export const motifs = [
  {
    id: "business_as_usual",
    name: "The place at work",
    pattern: `The room is busy with its own purpose, and its people are doing their jobs. The party must pass through, take something, or get something done without becoming the room's business.`,
    decisions: `when to move, who to imitate, what to disturb; the cost of interrupting the work`,
    kinds: ["encounter", "climax"],
  },
  {
    id: "two_sides",
    name: "Two sides at odds",
    pattern: `Two people or groups in the room want different things from each other. Neither is mainly concerned with the party, and either could be played against the other, at a price.`,
    decisions: `whom to side with, what to promise, whether to light the fuse`,
    kinds: ["encounter", "climax", "merchant"],
  },
  {
    id: "rising_water",
    name: "Something rising",
    pattern: `Something in the room worsens in visible steps whatever the party does. Each step closes something off or spoils something worth having, and the order is plain before it bites.`,
    decisions: `what to save first, what to abandon, how fast to commit`,
    kinds: ["encounter", "oddity", "climax"],
  },
  {
    id: "the_holder",
    name: "Someone holds what you need",
    pattern: `A person carries or guards the thing the party needs, and has wants, fears and limits of their own. They can be fought, fooled, bribed, frightened or helped, and each way leaves something behind.`,
    decisions: `force, trade, trick or help, and what each costs later`,
    kinds: ["encounter", "merchant", "climax"],
  },
  {
    id: "the_watcher",
    name: "Eyes on the room",
    pattern: `Someone or something watches the room from a vantage the party can see but not easily reach, and raises the room's attention when they see trouble. Where their attention goes, and what draws it away, is plain.`,
    decisions: `stay out of sight, blind them, or win them over`,
    kinds: ["encounter", "climax"],
  },
  {
    id: "membrane",
    name: "Where two spaces meet",
    pattern: `The room joins two parts of the place with different rules, and something worth having sits on the boundary. Passing as one side gives you away to the other.`,
    decisions: `which side to pass as, and when to switch`,
    kinds: ["encounter", "oddity"],
  },
  {
    id: "fork_of_prizes",
    name: "Two ways, two prizes",
    pattern: `Two ways lead on from the room, each with something worth having along it and something guarding it, and each leading to a different kind of place. A party that does well can take both and choose; one that does adequately takes one; one that struggles is carried on.`,
    decisions: `which prize, which way, and how greedy to be`,
    kinds: ["encounter"],
  },
  {
    id: "the_captive",
    name: "Another captive",
    pattern: `Someone else is held here. They want out too, know something useful, and would cost something to free.`,
    decisions: `free them, use them, or leave them; what they'd do once free`,
    kinds: ["encounter", "quiet", "oddity"],
  },
  {
    id: "old_works",
    name: "The builders' works",
    pattern: `Something the place's builders left still works by its own consistent rules, and its rules can be learned from what's in the room before they're relied on.`,
    decisions: `learn the rules, then use them against the room or for the way on`,
    kinds: ["encounter", "oddity", "quiet"],
  },
  {
    id: "the_offer",
    name: "An offer with a hook",
    pattern: `Someone in the room offers the party exactly what they need, for something they'd rather not give: a favour later, a betrayal of someone else, a piece of their gear, a secret. The offer's terms are stated, and so is who'd be hurt.`,
    decisions: `accept, haggle, refuse, or take it anyway`,
    kinds: ["merchant", "oddity", "encounter"],
  },
  {
    id: "wonder",
    name: "Something wondrous",
    pattern: `The room holds something beautiful or strange that rewards lingering and curiosity, with one thing that happens if the party stays, and one prize only patience finds.`,
    decisions: `how long to linger, and what to share`,
    kinds: ["quiet", "oddity", "campfire", "sanctuary"],
  },
  {
    id: "valued_thing",
    name: "A companion's thing",
    pattern: `Something in the room touches one companion's values or story, so how the party treats it matters to her, and the efficient plan may cost her something.`,
    decisions: `what the plan costs a companion, and whether it's worth it`,
    kinds: ["encounter", "quiet", "oddity", "climax"],
  },
  {
    id: "safe_hollow",
    name: "A place that screams safety",
    pattern: `A hidden, defensible or sacred spot the place's people don't come to, plainly safe at a glance, with room to sleep and one small comfort.`,
    decisions: `none that matter; it's for rest and talk`,
    kinds: ["campfire", "sanctuary", "quiet"],
  },
];
