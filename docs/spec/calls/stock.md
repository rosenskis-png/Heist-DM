# Stock call

**Job:** when a room ends, take stock with the player out of character. Grant what the game missed, name who could come along, and keep the loose ends (D190).
**Runtime:** `sample.json`, replay off, `default`. It runs once when a room ends, before the verdict, and again for each thing the player says until they walk on.
**Sees:** the party; the whole encounter as the DM knew it; the ledger and the log at the end; what the DM narrated in the room, newest first, up to its share of the call; what the game has the party carrying out; what the party came in with, including a follower's goal and motive; who has reached their goal here; and, once the talk has started, the lists as they stand, the talk so far and what the player says. Code: `stockInput` in `src/context.js`.

## Returns (`schemas/calls/stock.js`)
- **The reply:** what the DM says across the table. It's short, says yes or no and why, and holds no narration or new events.
- **Found:** things the party has that the game didn't record, each with who holds it and why in a few words. This is the whole list of what has been granted so far, every time. The game's own pack is never taken away here; the player chooses what to leave.
- **Followers:** everyone who could come along, the whole list every time. Each has a name, pronouns, looks, how they are, a goal (a real place, person or thing a later room could be), a motive (why they really want it, good or bad, never shown to the player) and up to three lines of what they know.
- **Notes:** up to four loose ends, each a lack that matters (`item`) or a thread, the whole list every time.

## What code does with it
`applyStock` in `src/campaign/stock.js` lays each answer over the stock. A follower who came in keeps their name, pronouns, looks, goal and motive whatever the answer says. One who reached their goal in this room is never offered. Found things get ids that can't clash with the pack's. The player's choices settle it (`settleStock`): up to the pack's limit, one follower or none. The campaign keeps the result (`docs/spec/campaign.md` §10).

## Validated by the engine
Every found thing's holder is in the party, and no follower is listed twice. Failures go back for one retry.
