# Adjudicate call

**Job:** in ruled mode (D75), rule on the player's plan and make its card.
**Runtime:** `sample.json`, replay on, `default`.
**Sees:** the characters, the encounter with hidden things marked and only the routines the party knows, the ledger, the next ticks as the party expects them, decided stances, recent exchanges and the plan.

## Returns (`schemas/calls/adjudicate.js`)
- **Steps,** in the player's order and timing, read the way the player means them (D77). Each has who, the tick it happens on (steps can share one), and a roll only where failure is possible and interesting. A roll has its band, reason, what failure costs and whether failure stops the plan.
- **When the whole plan is done** (`ends_at`).
- **Rulings:** at most three lasting truths the plan depends on, which join the ledger when it runs (D76).
- **Notes** for this card only, shown and then dropped.

## Validated by the engine
Steps numbered in order, starting no earlier than now and never before the step above; `ends_at` no earlier than the last step; real people; no hidden thing named anywhere on the card; rulings no longer than a fact. Failures go back for one retry.
