# Sketch call

**Job:** design the next room whole, as a DM's prep note, premise first, before any of it becomes data (D117, D160).
**Runtime:** `sample.json`, replay off, `complex`. Budget 32 KB. Its output goes straight to encode; nothing reviews it (D156).
**Sees** (`sketchInput` in `src/context.js`): its prompt, which carries the craft as judgment (`docs/design/encounter-craft.md` §16); the seed, split into what it fixes (kind, tone, whose room it is, the kinds its exits lead to) and its leanings (what the room is built around, a shape, whether there's a prize, the x-factor, one or two motifs), which the sketch uses or leaves; the world's place, life, heart, tensions, this act, the factions in the room and its room kinds; the party (what each can do and each companion's values; for the companion whose room it is, the features her story needs and her quest once its act is near, D158); must honour, the way the party arrives and the last rooms' log lines; and the example rooms (`fixtures/generator/sketches.json`), with no commentary. On the Forge only, the designer's brief, when one is given (D154).

## Returns (`schemas/calls/sketch.js`)
In the order it's written:
- **premise:** the room in one sentence a player would repeat.
- **shape:** one picturable shape, and where the party, the danger and the ways on sit on it, in relational words. No measurements.
- **things:** a line each for what matters: what it is, what state it's in, where it is next to the others. Never what it's for. A crowd is one line. Nothing placed or blocked for one party member's ability (D159).
- **cut:** the weakest thing, left out of everything else, or "nothing".
- **pressure:** what's already moving and what a player sees as it worsens; never a deadline; "none" for a calm room.
- **outcomes:** three to five end states, never how the party got there (D156).
- **notes:** what each person wants, what the place won't allow, anything worth having, and the ways on, one per kind drawn.
- **opening:** two or three short paragraphs in motion, with a small event that shows how the room works (`docs/spec/packet.md` §5, D155, D159).

Never a route, not even as a working note (D156). No play call ever sees a sketch (D59).
