# Sketch call

**Job:** design the next room whole, in plain English, design statement first, before any of it becomes data (D117, D153).
**Runtime:** `sample.json`, replay off, `complex`. Budget 32 KB.
**Sees** (`sketchInput` in `src/context.js`): its prompt, which carries the craft as judgment (`docs/design/encounter-craft.md`); the seed (kind, tone, x-factor, shape, what makes its choices meaningful, two or three motifs, the kinds its exits lead to); the world's place, life, heart, tensions, this act, the factions in the room and its room kinds; the party (what each can do; each companion's values, the features her story needs, and her quest once its act is near); must honour, the way the party arrives and the last rooms' log lines; and the worked example (`fixtures/generator/encoded.json`). Revising, also its own sketch and the critique. On the Forge only, the designer's brief, when one is given (D154).

## Returns (`schemas/calls/sketch.js`)
- **The design statement:** start, goal, the challenge as "X by Y, hard because Z", outcomes, x-factor and pressure (encounter-craft §2).
- **The sketch:** blockout (with the golden path, a working note encode drops), people, places and things, pressure, prizes and the ways on, and what the opening shows. Rough sizes in squares, never coordinates (D28). Never routes the DM would see.

On a revision it may cut, connect or swap elements, never add one (D120). No play call ever sees a sketch (D59).
