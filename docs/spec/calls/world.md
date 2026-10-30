# World call

**Job:** decide how the world responds. Structure only, no prose.
**Runtime:** `sample.json`, replay on, `default` to start; Phase 2 compares it with `complex` (D15).
**Sees:** the "World" column of `docs/spec/context.md` §2: resolution results, current state, people, intent, and the table read.

## Returns (`schemas/calls/world.js`)
NPC actions and reactions as state-change operations: moves, disposition shifts, a fight starting, an alarm raised.
- Each must follow from an NPC's sheet and from what just happened.
- No new entities or threats beyond those placed in the packet (principle 8).
- Flags use only keys the packet already uses. An action that changes nothing the engine tracks has empty ops (D52).
- Reactions the packet already writes as triggers are run by the engine, not decided here (D18).

## Pacing lives here
The intent says what the encounter is for, and the table read says how it has actually gone. This call judges pacing from those. There is no pacing formula (D4).
