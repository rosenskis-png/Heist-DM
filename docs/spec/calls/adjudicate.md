# Adjudicate call

**Job:** in ruled mode (D75), rule on the player's plan and make its card.
**Runtime:** `sample.json`, replay on, `default`.
**Sees:** the characters, the encounter with hidden things marked and only the routines the party knows, the ledger, the next ticks as the party expects them, decided stances, recent exchanges and the plan.

## Returns (`schemas/calls/adjudicate.js`)
- **Steps,** in the player's order and timing. Each has who, the tick it starts on, how many ticks it takes (0 for something done alongside another step), and a roll only where failure is possible and interesting. A roll has its band, reason, what failure costs and whether failure stops the plan.
- **Rulings** the plan depends on, which become facts when it runs.

## Validated by the engine
Steps numbered in order, starting no earlier than now and never before the step above; real people; no hidden thing named anywhere on the card. Failures go back for one retry.
