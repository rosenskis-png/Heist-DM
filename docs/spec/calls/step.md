# Step call

**Job:** turn the committed plan into steps. No odds.
**Runtime:** `sample.json`, replay on, `default` (`docs/spec/context.md` §4).
**Sees:** the "Step" column of `docs/spec/context.md` §2.

## Returns (schema: Phase 1)
- **Steps.** One step is one zone traversal or one distinct time-consuming action. Parallel actions by different characters share a step. Restating or elaborating creates no step.
- Each step lists its actors, its zone, and its **effects** as state-change operations (moves, items, flags).
- Each step is tagged from a fixed list: `violent`, `lethal`, `theft`, `deception`, `loud`, `starts_combat`.
- **Rulings on features the map doesn't have** (a coal chute). Judged against the full map, each is one of:
  - ruled out by a known fact (name the fact);
  - allowed (added to canon);
  - ruled out only by a hidden fact. The step proceeds normally, and the engine records an internal check that reveals the fact when the party reaches that step.

## Validated by the engine
Every move follows a connection, every id is real, and every precondition holds at the projected tick (`docs/spec/engine.md` §6). The engine then attaches each step's tick, route, observers and barriers for the pricing call. Errors go back for one retry.
