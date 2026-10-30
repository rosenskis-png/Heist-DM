# Pricing call

**Job:** make local judgments on the validated steps, with the engine's route and observer facts in hand.
**Runtime:** `sample.json`, replay on, `default` to start; Phase 2 compares it with `complex` (D15).
**Sees:** the "Pricing" column of `docs/spec/context.md` §2, including the engine's facts for each step: the foreseen ones it prices, and, separately, the projected arrivals the party doesn't foresee.

## Price the plan the party expects (D36)
Each step is priced at its own honest odds, **as the party expects the world to be**: against the observers, barriers and hazards the party foresees, and as if the step's preconditions hold. Where they won't, the engine says what to assume in the step's `as_if` (D42): "Fern, as a rat, pulls the key ring off the peg" is priced as exactly that, as if the ring were on the peg, even though at that tick it's on Snag's belt. "She picks the vault lock" is priced as picking the lock, even if a guard the party doesn't know about is about to walk in. That guard interrupts the plan during execution; he never changes the price.

The card never tells the player a plan will go wrong. A bad plan shows up as honest bands on the dangers the party can see, and as interruptions when it meets the ones it can't.

## Returns (`schemas/calls/pricing.js`)
For each foreseen uncertainty on each step (every observer, barrier and hazard the engine listed, whether or not the plan addressed it):
- If it's handled by a **named mechanism** (an ability, an item, a fact, or another step), it's automatic. Careful wording isn't a mechanism.
- Otherwise: a **difficulty band** from the list below (D33), a **one-line reason** naming the facts that set it, and a **failure consequence written as state-change operations**, listing which of the step's effects it `cancels`, marked `stops_plan` if it invalidates the rest of the plan. Reactions the packet already writes as triggers (suspicion rising) are left to the engine.

Plus:
- **Warnings** (internal, never shown): for each projected arrival the party doesn't foresee, the band for hearing it coming, or `automatic` with the mechanism in the reason (Lyra hears through walls).
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
Every foreseen observer, barrier and hazard has a priced risk or a named mitigation, and nothing the party doesn't foresee is priced or named in a shown reason. Every projected arrival has a warning. Anything wrong is sent back.
