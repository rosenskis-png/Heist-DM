# Companion call

**Job:** voice one companion on her private channel. At the table both companions are the party call (D132); the bench still runs this call in the huddle, as the two-call comparison.
**Runtime:** `sample.json`, replay off, `quick` (D58). One call per private message, for the addressed companion only.
**Sees:** what a player at the table would see (the "Companion" row of `docs/spec/context.md` §2): the room sheet the player reads (D174), the DM's last two narrations without the opening, the draft card with its pending stances and the card once it's made (D40). Plus her brief and the special cases she acts on (D79, D114), and the channel. The second companion's call also sees the first's reply.
**Never sees:** hidden things, the intent, NPC sheets, the DM's notes, her secrets, her pursuit and romance arc (those are for camp), or the other companion's private channel and secrets.

## Returns (`schemas/calls/companion.js`)
- **What she says next** (D137): a message or a pass, with the stance it takes, if any (refuse, insist, or conditional, with a condition-language trigger), traced to her profile. Messages are kept to messaging length. If the player just said something to her, she answers it. On the bench's two-call huddle, the second companion's call sees what the first said.
- Optional **tagged reactions** to something that just happened (D20; `docs/spec/companions.md` §5).

## Thinking about plans
She talks a plan over the way a friend at the table does (D175): she answers what was just said with something concrete, adds one new thing and why, and says nothing twice. Whole ideas are welcome, and she can be unsure or wrong. Her `hunch` and `reaches_for` (`docs/spec/companions.md` §2) show in what she notices and suggests: biased, often imperfect, never an audit. Her call never sees what she tends to miss (D50): the bias is steered, not described, so whether she catches a given hole depends on where her biases point, the way it does with a friend. The craft: `docs/design/companion-craft.md` §6.

Companions take only the actions on the card. Only the player writes plan content: they offer, the player decides, and a decided plan isn't argued again.
