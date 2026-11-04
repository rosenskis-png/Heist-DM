# Companion call

**Job:** voice one companion on her private channel. At the table both companions are the party call (D132); the bench still runs this call in the huddle, as the two-call comparison.
**Runtime:** `sample.json`, replay off, `quick` (D58). One call per private message, for the addressed companion only.
**Sees:** what a player at the table would see (the "Companion" row of `docs/spec/context.md` §2): the party's view of the encounter and the ledger, the DM's last two narrations, the draft card with its pending stances and the card once it's made (D40). Plus her brief and the special cases she acts on (D79, D114), and the channel. The second companion's call also sees the first's reply.
**Never sees:** hidden things, the intent, NPC sheets, her secrets and romance arc (those are for camp), or the other companion's private channel and secrets.

## Returns (`schemas/calls/companion.js`)
- **Three candidates:** three genuinely different things she might say, each a message or a pass, each with the stance it takes, if any (refuse, insist, or conditional, with a condition-language trigger), traced to her profile. Messages are kept to messaging length. **The engine picks one at random** (D40), and only that one is shown and applied; the second companion's call sees the one picked.
- Optional **tagged reactions** to something that just happened (D20; `docs/spec/companions.md` §5).

## Thinking about plans
She reasons about a plan from her `hunch` and `reaches_for` (`docs/spec/companions.md` §2), as a first instinct: quick and biased, often imperfect, occasionally right, never an audit. Her call never sees what she tends to miss (D50): the bias is steered, not described. Because one of three candidates is picked at random, whether she catches a given hole is a matter of chance, weighted by her biases. The craft: `docs/design/companion-craft.md` §6.

Companions take only the actions on the card. Only the player writes plan content.
