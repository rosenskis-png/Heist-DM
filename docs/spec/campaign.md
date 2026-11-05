# Campaign

How a campaign is put together above the encounter: acts, legs, rooms and campfires, what the player sees of the way ahead, and what carries from one to the next (D140–D143). A single room's contents are `docs/spec/packet.md`; what the engine holds is `docs/spec/state.md`; how a room is generated is `docs/spec/generation.md`.

---

## 1. The shape

- **A campaign is five acts** (`content/setting.js`). Every act is an escape from part of a much larger place that has its own life and isn't mainly concerned with the party: kitchens feeding a garrison, a chapel mid-rite, a forge on a deadline. Its people are most likely hostile, but they're going about their business, not hunting the party. The campaign starts small: a cell inside an enemy fortress, not a prison complex.
- **An act** is a run of legs, then its climax, then its sanctuary.
- **A leg** is a run of rooms that ends at a campfire (§4).
- **A room** is one packet. Its kind is an encounter, a quiet room, a merchant, something odd, a campfire or the climax.
- **The way is one-way.** Each room leads to the next through one of its exits, and the party never goes back. A room they leave is gone, along with whatever they didn't take from it.

## 2. The way ahead is drawn as the party goes

No map of the act is built in advance.
- **When a room is written, code draws the kind of room each of its exits leads to,** from the act's weights, with the campaign's seeded generator. The act's map is just the tree of what has been drawn, and only the branch the party took is kept.
- **Code counts.** It tracks how many rooms are left in this leg and how many legs are left in the act. When a leg's count runs out, every exit leads to its campfire. After the last leg, every exit leads to the climax, and the climax leads to the sanctuary. A campfire at the end of every leg is guaranteed by the count, not by checking a graph. Code: `src/campaign/way.js`.
- **The counts and the kinds** (D144; starting values in `content/setting.js`, `way`):
  - A leg is three rooms. Each room that goes rough adds one more, at most two a leg, and only while the leg still has rooms left, so a rough stretch takes longer to reach the campfire, but a campfire the exits already lead to stays where it is.
  - Every act has at least two legs, so every path has a campfire before the climax as well as the sanctuary after it. Each act opens on an encounter.
  - Each exit's kind is drawn by weight (encounter 6, quiet room 2, something odd 1, merchant 1). A calm room (quiet, odd or a merchant) never follows another, a leg has at most one merchant, and a room's exits differ in kind where they can.
- **A room's content is written just in time:** when its exit is offered, or after the party takes it. It's built from the act's design, the hand-off and the kind code drew (`docs/spec/generation.md`).

## 3. What the player sees

- **Only the exits from where they are.** Each exit feels different in the fiction ("warm, wet air", "the clatter of a kitchen"). When the party has earned a choice, it may be told plainly what each way leads to. Nothing two rooms ahead is ever shown.
- **The act builds toward its climax through subtle foreshadowing** across its rooms. The climax isn't announced when the act starts, and it shouldn't feel unexpected when it arrives.
- **The way on is earned in the fiction.** Each of a room's exits names the zone the party leaves from (`docs/spec/packet.md` §1). The party leaves by an exit they managed to reach. If the room ends without them all at one (captured, or carried off by its ending), code picks one of its exits and marks it forced.
- **How well a room went** decides how much choice the party gets of the next one. A room that went well can offer a choice between ways on; a room that went badly may have its way on chosen for it. A forced way on should lead to a different kind of next room, not simply a worse one. How a room offers or withholds that choice is part of its own design; it's one consequence among several, and no single shape is required.
- **Momentum may build in either direction within a leg.** A great room can lead to better chances in the next, and a bad one to worse. The campfire is where it resets.

## 4. Campfires

- **Every leg ends at a campfire,** and the act ends at its sanctuary, the act's main campfire.
- **A campfire is a night.** The party sleeps there and wakes to morning. Otherwise, the time of day is a room's to use if it wants; it's never a clock the party plans around.
- **Every companion is present at every campfire.** A separation, whether captured, split up or sent away, resolves before the leg's campfire, so code never lets one start where it couldn't.
- **A campfire is downtime and a fresh start,** never a trade-off between resting and something else. A leg that went well can't be ridden to the end of the act, and one that went badly doesn't follow the party past the fire.

## 5. What resets and what carries

| What | How long it lasts |
|---|---|
| Hurts (conditions, D130), per-rest ability uses (D128), and the leg's momentum | Until the next campfire |
| How the companions feel about the player and about each other, memories, commitments, companion goals, outfits, and the world's memory (D123) | The whole game |

## 6. No campaign clocks

Nothing counts against the party across rooms: no alert, no days and no hidden slack (D141). Pressure lives inside rooms, in the shape each room gives it. Anything hidden and gradual is a slow gradient that the fiction shows, never a counter with a threshold.
