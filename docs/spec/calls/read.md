# Read call

**Job:** read a newly generated room once, as a player hearing it for the first time (D177). Generation only.
**Runtime:** `sample.json`, replay off, `quick`. One call for an encounter or a climax; none for a calm room, a room being remade, or a room resumed on the bench.
**Sees:** the room sheet as the player will see it when the room opens (`sheetText(roomSheet(...))`), and nothing else.
**Never sees:** the sketch, the packet, the seed, the party's abilities.

## Returns (`schemas/calls/read.js`)
- **clear:** whether, after one hearing, the reader could picture the room and knew what they'd want in it.
- **layout:** the room as the reader pictures it.
- **handles:** up to eight things a player could take hold of, each with what they'd try and what it might cost. For the designer on the Forge; never counted.
- **unclear:** up to five things they'd have to ask before planning.

Code (`src/calls/read.js`, `designRoom` in `src/game/generate.js`) reads `clear`. When it's false, the room goes back to the sketch once, with how the reader pictured it and the unclear points as a first reader's notes (D196). No play call sees any of it.
