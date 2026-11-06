# Sketch call

**Job:** design the next room whole, in plain English, design statement first, before any of it becomes data (D117, D153).
**Runtime:** `sample.json`, replay off, `complex`. Budget 32 KB. Its output goes straight to encode; nothing reviews it (D156).
**Sees** (`sketchInput` in `src/context.js`): its prompt, which carries the craft as judgment (`docs/design/encounter-craft.md`); the seed (kind, whose room it is, tone, x-factor, shape, what makes its choices meaningful, two or three motifs, the kinds its exits lead to); the world's place, life, heart, tensions, this act, the factions in the room and its room kinds; the party (what each can do and each companion's values; for the companion whose room it is, the features her story needs and her quest once its act is near, D158); must honour, the way the party arrives and the last rooms' log lines; and the worked example (`fixtures/generator/encoded.json`). On the Forge only, the designer's brief, when one is given (D154).

## Returns (`schemas/calls/sketch.js`)
- **The design statement:** start, goal, the challenge as "X by Y, hard because Z", three to five outcomes as end states (never how the party got there), x-factor and pressure (encounter-craft §2).
- **The sketch:** blockout, people, places and things, pressure, prizes and the ways on, and the opening (`docs/spec/packet.md` §5). Small: three or four zones, two or three people who matter, one or two sources of pressure, five or six things at most (D159). Nothing placed or blocked for one party member's ability (D159). Rough sizes in squares, never coordinates (D28). Never a route, not even as a working note (D156).

No play call ever sees a sketch (D59).
