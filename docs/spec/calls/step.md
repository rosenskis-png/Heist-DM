# Step call

**Job:** turn the plan the player wrote into steps. No odds.
**Runtime:** `sample.json`, replay on, `default` (`docs/spec/context.md` §4).
**Sees:** the "Step" column of `docs/spec/context.md` §2.

## The plan it reads
The player writes the plan in prose, usually as numbered steps. It can include timing ("when he sits down, Fern grabs the keys") and conditions ("if the cask is unguarded she takes the sack; if not, she leaves it"). **The plan is the player's** (D35): the step call translates their words faithfully, including their mistakes, and never adds timing, waits or conditions they didn't write.

## Returns (`schemas/calls/step.js`)
- **Steps.** One step is one zone traversal or one distinct time-consuming action. Parallel actions by different characters share a step. Restating or elaborating creates no step.
- Each step lists its actors, its zone, how loud it is, what it uses, and its **effects** as state-change operations (moves, items, flags). A move crosses at most two connections.
- **Timing, only where the player gave it:** `when` (wait until a condition holds, with `max_wait` if the player said how long). Without `when`, a step happens right after the previous one.
- **Conditions, only where the player gave them:** `if`, with `otherwise` set to `skip` ("if not, she doesn't"), `stop` ("if not, we call it off"), or the alternative action the player described ("if not, she comes back").
- Timing and conditions are written as `plan_condition`s: only things a party member could see or hear, plus the time, and only what the party knows (things it has seen, routines it has learned). During execution, someone in the party has to be able to perceive the condition when it's checked, or the plan stops there (D39). The step call doesn't fix that for the player: "if he's asleep" is written as the player said it, even if no one will be able to see him.
- Each step is tagged from a fixed list: `violent`, `lethal`, `theft`, `deception`, `loud`, `starts_combat`.
- **Rulings** on what the plan assumes about the map, judged against the full map. The map is complete (D29), so a feature it doesn't have (a coal chute) is `ruled_out`; one that exists, even hidden, is used (`exists`); a judgment about an existing thing ("one rat can drag the ring") is a `ruling`, added to canon.
- **Internal checks:** when a hidden fact defeats a step (the cask is bolted down), the step proceeds normally, and the engine reveals the fact and stops when the party reaches it.

## Validated by the engine
Every move follows a connection, every id is real, and every `when` and `if` refers only to what the party knows. The engine then projects each step's tick, route, observers and barriers for the pricing call (`docs/spec/engine.md` §6). A step that can't work out as written isn't an error: it's priced normally, and reality interrupts it during execution (D36). Errors go back for one retry.
