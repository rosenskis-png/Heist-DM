# Scene call

**Job:** one exchange at the table when the player does something or speaks to a person aloud. A question to the DM is the question call instead (D133). Once anyone is fighting the party, only talk; what the party does goes on the card (D130). The party call follows it (D127).
**Runtime:** `sample.json`, replay off, `default`.
**Sees:** the characters, the encounter without the objective, the opening, the ledger, what's coming tick by tick, the draft and the current conversation (`docs/spec/context.md` §2).

## Returns (`schemas/calls/scene.js`)
The reply; a check for each uncertain thing someone tries, with both outcomes and their changes written before the roll; changes that happen whatever the dice say; what the party learned; when anyone is fighting the party, what each is visibly about to do (`threats`; left out, the last ones stand); how many ticks the exchange took (none for questions, talk and social rolls, D77); and, when the player describes several steps, the plan to put on the card.

## Validated by the engine
Real names in every check, change and threat, the ledger's limits (D76), abilities used within what's left of them (D128; a check counts its costlier outcome), and at most 12 ticks; mid-fight, no checks and no time. Failures go back for one retry.
