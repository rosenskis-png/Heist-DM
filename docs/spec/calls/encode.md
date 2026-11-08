# Encode call

**Job:** turn a room's sketch into packet data, without geometry (D117, D153).
**Runtime:** `sample.json`, replay off, `default`. Budget 28 KB.
**Sees** (`encodeInput`): its prompt, what the seed fixes (kind, mode, act, the exits' kinds), the party's slots, the worked example (`fixtures/generator/encoded.json`), the sketch, the room's only prize, and the journal page's id when the seed placed one, as a thing the party can carry, its properties never its words (D168); the check sends back a packet without a thing carrying that clue, or with any other reward (D164, D165).

## Returns (`schemas/calls/encode.js`)
The packet's shape (`schemas/packet.js`) with each zone's footprint replaced by a rough `size` in squares (and a `level` if it isn't on the ground), and no walls, squares or coordinates. Code lays it out (`src/engine/layout.js`): zones outward from where the party starts, each connection on a wall the two zones share, or on a square inside both between levels. If a connection can't be placed, the packet ships without a map (D9).

## Validated by the engine (`encodeProblems` in `src/calls/encode.js`)
Laid out, it must pass the engine's packet checks; its mode must fit its kind (a room for quiet, oddity, merchant, campfire and sanctuary), an encounter must have an objective and a room none; its exits must lead to exactly the kinds code drew, one each; a merchant must sell something; and its act must be the seed's. Failures go back for one retry.
