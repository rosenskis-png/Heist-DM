# Question call

**Job:** answer a question to the DM, and record what the answer settles as fact (D127, D133).
**Runtime:** `sample.json`, replay off, `quick`. One call per question, and no other call runs with it.
**Sees:** the read-only slice (`docs/spec/context.md` §2): the party and its abilities, with what's left of them; the places, ways, things and fixed facts, with hidden things marked so the answer never contradicts them; who's there and the routines and events the party knows, without their sheets or how they react; the opening; the ledger without its event log; the DM's recent answers; and the question.
**Never sees:** people's sheets, the packet's reaction notes, what's coming tick by tick, the objective, or the companions' briefs.

## Returns (`schemas/calls/question.js`)
- **The reply,** as a DM says it across the table. A question that would take a look or a roll gets what the party can tell from where they are; doing it is the player's move.
- **Rulings:** what the answer settles that the encounter and the ledger don't already say, one fact each. They join the ledger as facts the party knows, so every later call reads them as true, and the card is priced on them.
- **Retire:** facts that no longer matter, to make room when the ledger is full.
- **Learned:** anything else the party now knows, for the log.

Nothing moves and no time passes: the schema has no checks, changes, threats or ticks.

## Validated by the engine
Real names in every ruling, the ledger's limits (D76), and nothing the party hasn't found named in the reply or a ruling. Failures go back for one retry.
