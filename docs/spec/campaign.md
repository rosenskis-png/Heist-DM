# Campaign

How a campaign is put together above the encounter: acts, legs, rooms and campfires, what the player sees of the way ahead, and what carries from one to the next, and the worlds it's set in (D140–D150). Code: `src/campaign/way.js` (the way ahead) and `src/campaign/run.js` (what a room's end, a campfire and the act's end do). A single room's contents are `docs/spec/packet.md`; what the engine holds is `docs/spec/state.md`; how a room is generated is `docs/spec/generation.md`.

---

## 1. The shape

- **A campaign is five acts** (`content/setting.js`, `arc`), set in a world (§9). Every act is an escape from part of a much larger place that has its own life and isn't mainly concerned with the party: kitchens feeding a garrison, a chapel mid-rite, a forge on a deadline. Its people are most likely hostile, but they're going about their business, not hunting the party. The campaign starts small: a cell inside an enemy fortress, not a prison complex.
- **An act** is a run of legs, then its climax, then its sanctuary.
- **A leg** is a run of rooms that ends at a campfire (§4).
- **A room** is one packet. Its kind is an encounter, a quiet room, a merchant, something odd, a campfire or the climax.
- **The way is one-way.** Each room leads to the next through one of its exits, and the party never goes back. A room they leave is gone, along with whatever they didn't take from it.

## 2. The way ahead is drawn as the party goes

No map of the act is built in advance.
- **When a room is written, code draws the kind of room each of its exits leads to,** from the act's weights, with the campaign's seeded generator. The act's map is just the tree of what has been drawn, and only the branch the party took is kept.
- **Code counts.** It tracks how many rooms are left in this leg and how many legs are left in the act. When a leg's count runs out, the room has one exit, to its campfire (D169). After the last leg, every exit leads to the climax, and the climax leads to the sanctuary. A campfire at the end of every leg is guaranteed by the count, not by checking a graph. Code: `src/campaign/way.js`.
- **The counts and the kinds** (D144; starting values in `content/setting.js`, `way`):
  - A leg is three rooms. Each room's verdict (§3) moves the leg's strain: a rough room raises it, a good one eases it, never below nothing. Every four points add one more room, at most two a leg, and only while the leg still has rooms left. So a rough stretch takes longer to reach the campfire, but a campfire the exits already lead to stays where it is (D146). A room strain adds is always an encounter, never a quiet room or a merchant: more road to the fire, not a reward for doing worse (D149).
  - Every act has at least two legs, so every path has a campfire before the climax as well as the sanctuary after it. Each act opens on an encounter.
  - Each exit's kind is drawn by weight (encounter 6, quiet room 2, something odd 1, merchant 1). A calm room (quiet, odd or a merchant) never follows another, a leg has at most one merchant, and a room's exits differ in kind where they can.
- **A room's content is written just in time:** when its exit is offered, or after the party takes it. It's built from the act's design, the hand-off and the kind code drew (`docs/spec/generation.md`).

## 3. What the player sees

- **Only the exits from where they are.** Each exit feels different in the fiction ("warm, wet air", "the clatter of a kitchen"). When the party has earned a choice, it may be told plainly what each way leads to. Nothing two rooms ahead is ever shown.
- **The act builds toward its climax through subtle foreshadowing** across its rooms. The climax isn't announced when the act starts, and it shouldn't feel unexpected when it arrives.
- **The way on is earned in the fiction.** Each of a room's exits names the zone the party leaves from (`docs/spec/packet.md` §1). The party leaves by an exit they managed to reach. If the room ends without them all at one (captured, or carried off by its ending), code picks one of its exits and marks it forced.
- **How well a room went is judged when it ends,** by the verdict call (`docs/spec/calls/verdict.md`, D146). It reads the record, not the narration, and rates the room from 1 to 10. The rating moves how everyone feels when they reach camp, and the leg's strain. The same call says what moved each companion's feelings, by her own values.
- **How well a room went** decides how much choice the party gets of the next one. A room that went well can offer a choice between ways on; a room that went badly may have its way on chosen for it. A forced way on should lead to a different kind of next room, not simply a worse one. How a room offers or withholds that choice is part of its own design; it's one consequence among several, and no single shape is required.
- **Momentum may build in either direction within a leg.** A great room can lead to better chances in the next, and a bad one to worse. The campfire is where it resets.

- **Between rooms** (D173, `src/game/journey.js`): when a room ends the page runs the verdict, moves the campaign on by the exit taken, begins the act if it has no plan, and generates the next room while the player reads the verdict; "Go on" walks them in. A calm room ends when the player picks one of its ways on; the sanctuary ends when they rest, and the act ends once they pick the relics to keep. The menu can end any room as it stands. Gravenhold opens in the Cells; a pitched world generates its first room before the party wakes.

## 4. Gold, relics and merchants

- **Gold** is one number. It's spent at merchants and carries through the whole game (D147).
- **A relic** is a name and one sentence: a passive edge the DM reads as a fact ("beasts hesitate before attacking whoever wears it"). Every DM call sees the party's gold and relics. The party holds at most six in an act (`content/setting.js`, `relics`). How many carry into the next act is the climax's to decide (§5).
- **A room offers them as things:** a thing can carry a reward, gold or a relic, which the party gets if one of them holds it when the room ends (`docs/spec/packet.md` §3). Rewards are one lever among several, placed where they fit; no room is required to have one.
- **A merchant's things have a price.** The party pays when one of them takes it, and the engine refuses a change that spends more gold than the party has.
- There's no inventory beyond these.

## 5. The climax

- **The climax is a room the party always gets through.** What's at stake is how: how epic the escape is, decided by what the act built up; a choice at its peak, often between the companions' threads; and what comes away with them (D148).
- **Its verdict decides how many of the act's relics carry into the next act:** none for a rough climax, up to three for a great one (`content/setting.js`, `relics.keptByRating`), and never more than the party has (D149). The player picks which at the sanctuary, and the next act starts fresh with them and the gold. How the companions feel, and everything else in §7's last row, carries as always.

## 6. Campfires

- **Every leg ends at a campfire,** and the act ends at its sanctuary, the act's main campfire.
- **A campfire is a night.** The party sleeps there and wakes to morning. Otherwise, the time of day is a room's to use if it wants; it's never a clock the party plans around.
- **Every companion is present at every campfire.** A separation, whether captured, split up or sent away, resolves before the leg's campfire, so code never lets one start in a room whose exits already lead to the campfire or the climax, and the party is whole again at the fire.
- **A campfire is downtime and a fresh start,** never a trade-off between resting and something else. A leg that went well can't be ridden to the end of the act, and one that went badly doesn't follow the party past the fire.

## 7. What resets and what carries

| What | How long it lasts |
|---|---|
| Hurts (conditions, D130), per-rest ability uses (D128), and the leg's momentum | Until the next campfire |
| Relics | The act, then as many as the climax allows (§5) |
| Gold, how the companions feel about the player and about each other, memories, commitments, companion goals, outfits, and the world's memory (D123) | The whole game |

## 8. No campaign clocks

Nothing counts against the party across rooms: no alert, no days and no hidden slack (D141). Pressure lives inside rooms, in the shape each room gives it. Anything hidden and gradual is a slow gradient that the fiction shows, never a counter with a threshold.

## 9. Worlds

Every adventure is set in a world (`content/worlds/`, D150). The rules every world shares are in `content/setting.js`: the five-act shape, the way ahead, relics, the whisper rings, and how much of the player's secret each act may show. A world holds what changes:

- **The place** and **its way out.**
- **Its roles:** the nouns companion text uses as slots (`docs/spec/companions.md` §2): its name, what kind of place it is, who built it, who rules it now, its commander and master, its working levels, its old depths and its seat of power. Code fills them (`src/campaign/world.js`).
- **Its heart:** what's sealed at the bottom, that the factions want.
- **Its life:** what it's busy with, whatever the party does.
- **Its factions,** and the **tensions** between them: what they want from each other, not only from the party.
- **Its features:** what it holds that companions' stories need. Each companion lists hers as `needs`, and a world that lacks one for a companion in the party has a problem to fix.
- **Its factions' ladders:** three named leaders each, lowest first: a local face, a lieutenant and the top, each with a visible hook. Each act's peak climbs them (D164).
- **Its regions:** the part of the place each act crosses, what it is, its sanctuary, the factions that hold it at first, and how it feels, rising from personal (Act 1) through communal and ancient to mythic (Act 4), then the aftermath (Act 5). What happens in an act is decided when it begins, by the act call (`docs/spec/calls/act.md`).
- **Its mysteries:** truths the game never confirms, each with an edge (one place later where knowing it quietly helps, as a hidden fact in the packets it applies to) and a journal someone in the world wrote about it, torn into pages that rooms hold as rewards and the party reads at camp (D164, D168).
- **The player's secrets** it can draw from, and **world facts that never change** (`invariants`, with act gates). The player's secrets and the rings are revealed by act, as story; the mysteries never are.

Gravenhold is the default world and the worked example a generated world is written to match. A player who types a vibe at setup gets a world from the pitch call instead (`docs/spec/calls/pitch.md`, D151), in the same shape (`schemas/world.js`), holding every feature the two chosen companions need; the session keeps it whole and saves it, and it's never generated again. In every world the rings exist, the adventure is medieval fantasy, and the party is escaping a hostile, living place much bigger than itself, starting from a small prison inside it.

