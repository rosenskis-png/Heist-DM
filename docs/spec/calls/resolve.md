# Resolve call

**Job:** in ruled mode (D75), play a committed card out against the world as it really is, and record what happened.
**Runtime:** `sample.json`, replay off, `default`.
**Sees:** everything: the characters, the whole encounter, the ledger, what each routine and event really does tick by tick, the plan, the card, and which rolls succeeded (never the numbers).

## Returns (`schemas/calls/resolve.js`)
- **Each step,** in order, up to where the plan stopped: whether it happened (yes, partly, no), one line of what actually happened, and its changes to the ledger.
- **Where reality stopped the plan,** if it did, and why, as the party sees it.
- **People's response** once it's over (`after`), and the tick the plan ends.

## Validated by the engine
Steps in order from 1; all of them unless the plan stopped, and none after the stop; no step whose roll failed happening in full; real names in every change; an end tick no earlier than the last step that happened. Failures go back for one retry.
