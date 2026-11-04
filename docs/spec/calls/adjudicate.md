# Adjudicate call

**Job:** rule on the player's plan and make its card (D75).
**Runtime:** `sample.json`, replay on, `default`.
**Sees:** the characters, with what's left of each limited ability (D128), the encounter with hidden things marked and only the routines the party knows, the ledger, the next ticks as the party expects them, decided stances, recent exchanges at the table (no private words) and the plan, as the draft's actions numbered in order (D134). The ledger's facts include what the DM's answers settled (D133).

## Returns (`schemas/calls/adjudicate.js`)
- **Steps,** in the player's order and timing, read the way the player means them (D77). Each has who, the tick it happens on (steps can share one), and a roll only where failure is possible and interesting. A roll has its band, reason, what failure costs and whether failure stops the plan.
- **When the whole plan is done** (`ends_at`).
- **Rulings:** at most three lasting truths the plan depends on, which join the ledger when it runs (D76).
- **Notes** for this card only, shown and then dropped, including any threat the plan leaves unanswered (D130).

In a fight the card is a beat: what everyone does over the next few moments, about a tick. Each blow that could go either way has a roll, and its stated cost is the only harm it can do (D130).

## Validated by the engine
Steps numbered in order, starting no earlier than now and never before the step above; `ends_at` no earlier than the last step; real people; no hidden thing named anywhere on the card; rulings no longer than a fact. Failures go back for one retry.
