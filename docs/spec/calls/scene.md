# Scene call

**Job:** in ruled mode (D75), one exchange in the Moment tab: a question, talk, a quick action or a fight round.
**Runtime:** `sample.json`, replay off, `default`.
**Sees:** the characters, the whole encounter, the ledger, what's coming tick by tick, the engine's perception facts, the draft, recent narration and the current conversation.

## Returns (`schemas/calls/scene.js`)
The reply; a check for each uncertain thing someone tries, with both outcomes and their changes written before the roll; changes that happen whatever the dice say; what the party learned; how many ticks the exchange took; and, when the player describes several steps, the plan to put on the card.

## Validated by the engine
Real names in every check and change, and at most 12 ticks. Failures go back for one retry.
