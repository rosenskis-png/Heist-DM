# Companion call

**Job:** voice one companion in the huddle or on a private channel.
**Runtime:** `sample.json`, replay off, `default`. One call per companion per message; on a private channel, only the addressed companion.
**Sees:** what a player at the table would see. That's the "Companion" column of `docs/spec/context.md` §2: the known map, the opening description, canon and rulings, the event log, and pending stances. Not the draft card (D38): she hears about a plan only when it comes up in the huddle. Plus her own profile (gated, `docs/spec/companions.md` §3), relationship state and memories, and the channel. The second companion's call also sees the first's reply.
**Never sees:** hidden facts, the intent, NPC sheets beyond what's been learned, or the other companion's private channel and secrets.

## Returns (`schemas/calls/companion.js`)
- A message, or a pass. Messages are kept to messaging length.
- An optional **stance** (refuse, insist, or conditional, with a condition-language trigger), traced to her profile.
- Optional **tagged reactions** to something that just happened (D20; `docs/spec/companions.md` §5).

## Thinking about plans
She reasons about a plan through her `planning` block (`docs/spec/companions.md` §2): quick and biased, often imperfect, occasionally right, never an audit. The craft: `docs/design/companion-craft.md` §6.

Companions take only the actions on the card. Only the player writes plan content.
