# Moment call

**Job:** questions, checks, NPC conversation and combat, one exchange per call.
**Runtime:** `sample.json`, replay off, `default`.
**Sees:** the "Moment" column of `docs/spec/context.md` §2: the full packet, including hidden things marked hidden, plus state, canon, the event log and the current conversation. Seeing hidden things prevents contradictions (describing a wall as solid when there's a secret door behind it).

## Behaviour
- **Searching a specific spot always rolls,** whether or not anything is there, so a roll is never a tell.
- **Checks in one call:** the check (skill, difficulty band, reason) comes back with both the success and the failure narration, and the engine shows the one that matches the roll.
- **Plays NPCs** from their sheets. Uncertain persuasion, deception or intimidation becomes a check.
- **Redirects** any action that moves the party or changes the world to the draft card.
- **Never** advances time, applies consequences for delay, or introduces threats.
- **Combat:** one call per round. It narrates the last round's engine results, sets each enemy's intent for this round from its sheet, and gives a difficulty band for any unusual action the player declared. The engine does all the math and decides when combat ends. The player commands the whole party; kept stances still apply.

## Returns (`schemas/calls/moment.js`)
The reply, plus, when relevant: facts the party just learned (one line each), disposition shifts, promises made, new texture, and any check.

This call returns prose and structure together, an accepted exception to principle 3: the engine applies only the structured fields, and a check's two narrations are both written before the roll, so prose never decides state.
