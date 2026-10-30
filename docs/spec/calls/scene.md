# Scene call

**Job:** in ruled mode (D75), one exchange in the Moment tab: a question, talk, a quick action or a fight round.
**Runtime:** `sample.json`, replay off, `default`.
**Sees:** the characters, the encounter without the objective, the opening, the ledger, what's coming tick by tick, the draft and the current conversation (`docs/spec/ruled.md`).

## Returns (`schemas/calls/scene.js`)
The reply; a check for each uncertain thing someone tries, with both outcomes and their changes written before the roll; changes that happen whatever the dice say; what the party learned; how many ticks the exchange took (none for questions, talk and social rolls, D77); and, when the player describes several steps, the plan to put on the card.

## Validated by the engine
Real names in every check and change, the ledger's limits (D76), and at most 12 ticks. Failures go back for one retry.
