# Pricing call

**Job:** make local judgments on the validated steps, with the engine's route and observer facts in hand.
**Runtime:** `sample.json`, replay on, `default` to start; Phase 2 compares it with `complex` (D15).
**Sees:** the "Pricing" column of `docs/spec/context.md` §2, including the engine's facts for each step. Steps the engine flagged with a problem of their own aren't sent for pricing (D34).

## Returns (`schemas/calls/pricing.js`)
For each uncertainty on each step (every observer, barrier and hazard the engine listed, whether or not the plan addressed it):
- If it's handled by a **named mechanism** (an ability, an item, a fact, or another step), it's automatic. Careful wording isn't a mechanism.
- Otherwise: a **difficulty band** from the list below (D33), a **one-line reason** naming the facts that set them, and a **failure consequence written as state-change operations**, listing which of the step's effects it `cancels`, marked `stops_plan` if it invalidates the rest of the plan. Reactions the packet already writes as triggers (suspicion rising) are left to the engine.
- **New rulings** made along the way, for canon.

| Band | Means |
|---|---|
| Automatic | Not a risk: name the mechanism instead. |
| Easy | It works unless something goes a bit wrong. |
| Medium | A real chance either way. |
| Hard | It probably fails. |
| Very hard | It works only with luck. |
| Near impossible | Worth trying only if nothing else is left. |

The band is the judgment. The engine turns it into the number it rolls against (`docs/spec/engine.md` §7).

## Validated by the engine
Every listed observer, barrier and hazard has a priced risk or a named mitigation. An uncertainty with neither is sent back.

## The risk to watch
The card-edit loop is where a stall could hide (`fixtures/cells/walkthrough.md` §6). Pricing every listed uncertainty at its projected tick is the defence: the first card surfaces every timing problem at once.
