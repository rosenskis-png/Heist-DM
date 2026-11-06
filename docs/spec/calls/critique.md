# Critique call

**Job:** test a room's sketch by playing it before it becomes data (D120, D153).
**Runtime:** `sample.json`, replay off, `complex`. Budget 20 KB. Encounters and the climax only; calm rooms skip it.
**Sees** (`critiqueInput`): its prompt, the seed, the party, and the sketch.

## Returns (`schemas/calls/critique.js`)
Four runs, each clean and messy: force, guile, something odd, and a plain player with no clever ideas. Then the problems, each tied to an element and a fix (cut, connect or swap): a clean run that produces nothing; one roll deciding the room; an approach with nothing to grab; one approach plainly best; a party member with nothing to do; an element nothing touched; a bypass that empties the threat; a property that reads as a hint; only one side wanting anything; pressure that's a deadline or needs arithmetic; the plain player stuck; a companion the room never touches (encounter-craft §14).

The runs are routes: the revision reads them, and then they're thrown away. With no problems, there's no revision.

**How it's tested:** plant known flaws in hand-made sketches and count how often it finds them (roadmap, Phase 7).
