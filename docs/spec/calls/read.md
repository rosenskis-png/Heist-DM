# Read call

**Job:** read a newly generated room once, as a player hearing it for the first time (D177). Generation only.
**Runtime:** `sample.json`, replay off, `quick`. One call for an encounter or a climax; none for a calm room, a room being remade, or a room resumed on the bench.
**Sees:** the room sheet as the player will see it when the room opens (`sheetText(roomSheet(...))`), and nothing else.
**Never sees:** the sketch, the packet, the seed, the party's abilities.

## Returns (`schemas/calls/read.js`)
- **layout:** the room as the reader pictures it.
- **handles:** up to eight things a player could take hold of to get past the danger, each with what they'd try and what it might cost.
- **unclear:** up to five things they'd have to ask before planning.

Code (`src/calls/read.js`, `designRoom` in `src/game/generate.js`) counts distinct handles. Fewer than four, and the room goes back to the sketch once with the handles and the unclear points as a first reader's notes. No play call sees any of it.
