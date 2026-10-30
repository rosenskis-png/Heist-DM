# Pricing call

**Job:** make local judgments on the validated steps, with the engine's route and observer facts in hand.
**Runtime:** `sample.json`, replay on, `default` to start; Phase 2 compares it with `complex` (D15).
**Sees:** the "Pricing" column of `docs/spec/context.md` §2, including the engine's facts for each step.

## Returns (schema: Phase 1)
For each uncertainty on each step (every observer, barrier and hazard the engine listed, whether or not the plan addressed it):
- If it's handled by a **named mechanism** (an ability, an item, a fact, or another step), it's automatic. Careful wording isn't a mechanism.
- Otherwise: **odds** from the bands below, a **one-line reason** naming the facts that set them, and a **failure consequence written as state-change operations**, marked `stops_plan` if it invalidates the rest of the plan.
- **New rulings** made along the way, for canon.

| Difficulty | Odds |
|---|---|
| Trivial | Automatic |
| Easy | 75–90% |
| Medium | 55–75% |
| Hard | 35–55% |
| Very hard | 15–35% |
| Near impossible | 5–15% |

## Validated by the engine
Every listed observer, barrier and hazard has a priced risk or a named mitigation. An uncertainty with neither is sent back.

## The risk to watch
The card-edit loop is where a stall could hide (`fixtures/cells/walkthrough.md` §6). Pricing every listed uncertainty at its projected tick is the defence: the first card surfaces every timing problem at once.
