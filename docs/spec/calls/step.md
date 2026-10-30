# Step call

**Job:** turn the committed plan into steps. No odds.
**Runtime:** `sample.json`, replay on, `default` (`docs/spec/context.md` §4).
**Sees:** the "Step" column of `docs/spec/context.md` §2.

## Returns (`schemas/calls/step.js`)
- **Steps.** One step is one zone traversal or one distinct time-consuming action. Parallel actions by different characters share a step. Restating or elaborating creates no step.
- Each step lists its actors, its zone, how loud it is, what it uses, and its **effects** as state-change operations (moves, items, flags). A move crosses at most two connections.
- Each step is tagged from a fixed list: `violent`, `lethal`, `theft`, `deception`, `loud`, `starts_combat`.
- **Rulings** on what the plan assumes about the map, judged against the full map. The map is complete (D29), so a feature it doesn't have (a coal chute) is `ruled_out`; one that exists, even hidden, is used (`exists`); a judgment about an existing thing ("one rat can drag the ring") is a `ruling`, added to canon.
- **Internal checks:** when a hidden fact defeats a step (the cask is bolted down), the step proceeds normally, and the engine reveals the fact and stops when the party reaches it.

## Validated by the engine
Every move follows a connection, every id is real, and every precondition holds at the projected tick (`docs/spec/engine.md` §6). The engine then attaches each step's tick, route, observers and barriers for the pricing call. Errors go back for one retry.
