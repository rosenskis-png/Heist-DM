# Companion call

**Job:** voice one companion in the huddle or on a private channel.
**Runtime:** `sample.json`, replay off, `default`. One call per companion per message; on a private channel, only the addressed companion.
**Sees:** what a player at the table would see. That's the "Companion" column of `docs/spec/context.md` §2: the DM's narration, the known map, the opening description, canon and rulings, the event log, the draft card (the plan being written, with redirected steps and pending stances) and the card as shown once it's priced (D40). Plus her own profile (gated, `docs/spec/companions.md` §3), relationship state and memories, and the channel. The second companion's call also sees the first's reply.
**Never sees:** hidden facts, the intent, NPC sheets beyond what's been learned, or the other companion's private channel and secrets.

## Returns (`schemas/calls/companion.js`)
- **Three candidates:** three genuinely different things she might say, each a message or a pass, each with the stance it takes, if any (refuse, insist, or conditional, with a condition-language trigger), traced to her profile. Messages are kept to messaging length. **The engine picks one at random** (D40), and only that one is shown and applied; the second companion's call sees the one picked.
- Optional **tagged reactions** to something that just happened (D20; `docs/spec/companions.md` §5).

## Thinking about plans
She reasons about a plan from her `hunch` and `reaches_for` (`docs/spec/companions.md` §2), as a first instinct: quick and biased, often imperfect, occasionally right, never an audit. Her call never sees what she tends to miss (D50): the bias is steered, not described. Because one of three candidates is picked at random, whether she catches a given hole is a matter of chance, weighted by her biases. The craft: `docs/design/companion-craft.md` §6.

Companions take only the actions on the card. Only the player writes plan content.
