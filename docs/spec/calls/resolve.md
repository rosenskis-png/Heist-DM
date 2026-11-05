# Resolve call

**Job:** play a committed card out against the world as it really is, record what happened, and narrate it (D78).
**Runtime:** `sample.json`, replay off, `default`.
**Sees:** everything: the characters, the whole encounter, the ledger with the card's rulings already in it as facts (D138), what each routine and event really does tick by tick, the plan, the card without its rulings, and which rolls succeeded (never the numbers).

## Returns (`schemas/calls/resolve.js`)
- **Each step,** in order, up to where the plan stopped: whether it happened (yes, partly, no), one line of what actually happened, and its changes to the ledger.
- **Where reality stopped the plan,** if it did, and why, as the party sees it.
- **People's response** once it's over (`after`), and the tick the plan ends.
- **What's coming** (`threats`): when anyone is still fighting the party, what each is visibly about to do, as the party sees it; empty when nobody is. It happens unless the next plan stops it (D130).
- **The narration,** last, written from that record, and any texture it added. It paints the scene (D49), gives the moment reality stopped the plan its beat, and keeps hidden things out.

## Validated by the engine
Steps in order from 1; all of them unless the plan stopped, and none after the stop except as not having happened, with no changes, which the engine drops (D138); no step whose roll failed happening in full; real names in every change and threat; an end tick no earlier than the last step that happened; the ledger's limits (D76), conditions included; abilities used within what's left of them (D128). Failures go back for one retry.
