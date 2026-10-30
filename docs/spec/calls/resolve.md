# Resolve call

**Job:** in ruled mode (D75), play a committed card out against the world as it really is, record what happened, and narrate it (D78).
**Runtime:** `sample.json`, replay off, `default`.
**Sees:** everything: the characters, the whole encounter, the ledger, what each routine and event really does tick by tick, the plan, the card, and which rolls succeeded (never the numbers).

## Returns (`schemas/calls/resolve.js`)
- **Each step,** in order, up to where the plan stopped: whether it happened (yes, partly, no), one line of what actually happened, and its changes to the ledger.
- **Where reality stopped the plan,** if it did, and why, as the party sees it.
- **People's response** once it's over (`after`), and the tick the plan ends.
- **The narration,** last, written from that record, and any texture it added. It follows `docs/spec/calls/narration.md`: paint the scene, give an interruption its moment, keep hidden things out.

## Validated by the engine
Steps in order from 1; all of them unless the plan stopped, and none after the stop; no step whose roll failed happening in full; real names in every change; an end tick no earlier than the last step that happened; the ledger's limits (D76). Failures go back for one retry.
