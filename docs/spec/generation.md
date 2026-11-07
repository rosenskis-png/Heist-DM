# Generation

How the game builds its next encounter, room or campfire (D117). Built in Phase 7; until then the Cells is the only packet. Generated packets carry only what the DM reads (D116). How to design a *good* one is in `docs/design/encounter-craft.md`.

---

## When it runs
When an encounter or room ends and its hand-off is final (`docs/spec/state.md`), the next packet starts generating, during the closing narration and any room or campfire that follows. Loading a save never generates (D11).

## The pipeline

Code: `src/game/generate.js` (`generateRoom`: `seedRoom`, the code steps, then `designRoom`, the calls and the layout, D154). It runs once the party has taken an exit and the campaign has entered the next room's kind (`docs/spec/campaign.md`).

| Step | Who | Does |
|---|---|---|
| **Exits** | Code | Draws the kinds of room this room's exits lead to (D144) |
| **Seed** | Code | Picks the question (`src/campaign/seed.js`, below) |
| **Sketch** | `sketch` call | Writes the whole room as a DM's prep note, premise first (`docs/spec/calls/sketch.md`) |
| **Encode** | `encode` call | Turns the sketch into packet data without geometry, checked by the engine once laid out (`docs/spec/calls/encode.md`) |
| **Layout** | Code | Puts it on the grid from rough sizes (`src/engine/layout.js`); if it can't, the packet ships without a map (D9) |

The sketch is generator-only: no play call ever sees it (D59), and it holds no route (D156). Nothing reviews the sketch before encode: a clever move the room didn't plan for is the player's reward, and what the craft asks of a room is in the sketch's prompt (D156). How to design a good room is `docs/design/encounter-craft.md`; the motifs are `content/motifs.js`.

## The seed (D118, D153, D160)
What the seed fixes:
- **The kind** comes from the way (D144); the exits' kinds are drawn with it.
- **Whose room it is** (D158): one companion's slot or no one's, no one's about half the time, never the same companion twice running; the climax is both companions'. A companion's thing (the motif) is drawn only when the room is someone's.
- **The tone,** from very stressed about time to a fantasy playground, leaning toward stress when the leg's strain is high.
- **What the place is busy with** (D162): labour, a feast, a rite, a punishment, trade, getting ready for a raid, the night watch, sickness, ruin, beasts, a burial, a contest, building, drill; never repeated within an act, and fitted to the world by the sketch.
- **Whose place it is,** for an encounter or the climax (D162): one of the world's factions.
- **The shape and its centrepiece** (D163): the space's rough form (a street, a gallery, a warren, a garden, a market, a ford, a field of pillars, a stair hall, a courtyard, a deck, a pit, terraces, a shaft, a ledge, an island, a cave, a ruin, a crossroads of tunnels) and the one thing the eye goes to (a statue, a machine, a fire, a tree, a throne, a wreck, a pool, a beast, a scaffold, an altar, a table, a gate, a hoard, a vessel, a tomb, a bell, a mural, a hole), neither repeated within an act.

Its leanings, which the sketch uses or leaves, so they pull it away from the average room without turning into extra things:
- **Motifs:** one or two for an encounter or the climax, one for a calm room, suited to the kind and avoiding those the act has used where it can.
- **For an encounter or the climax:** what the room is built around (a place hard at its own work, one big thing in a space, a danger in the way), whether there's a prize (none, about half the time, or something worth the risk), and the x-factor (explore, interact, acquire, overcome, get through). An oddity gets an x-factor too.

The campaign records the act's used motifs, busy-withs, shapes and centrepieces, the premise of each room it has generated, whose the last room was, and the seed's random position, so the next seed differs and the next sketch goes somewhere new; all of them reset when an act ends.

## What the sketch sees (D119)
| Tier | Holds |
|---|---|
| **Must honour** | How the party arrives (the exit's stub, what it carries) and the last rooms' log lines |
| **Background** | The world's place, life, heart and tensions, this act, the factions in the room, its room kinds |
| **Seed** | Everything above |

Plus the party (what each can do and each companion's values; her story's needs and her quest only when the room is hers, D158), and no example rooms (D161). Never an AI summary of the act.

## What every packet must have
Beyond `docs/spec/packet.md`'s consistency checks:
- **Every attachment it was handed resolves** in it (D123), or the packet is rejected.
- **Every exit carries a next-scene stub** (D119), and the exits lead to exactly the kinds code drew (D144).
- **Its fail-forward ending moves the story on,** and so does `captured`, which every encounter has (D131): each has a next-scene stub that takes the party somewhere new, never back to where they started.
- **Anyone who might fight has a tier and `breaks`** (D130), and a fight encounter's objective is something other than everyone down (`docs/design/encounter-craft.md` §3.9).
- **A room has no objective or deadline** (D121). An outfit is a reward placed where it fits, for a companion in the party (D143).
- **It fits the calls' budgets** (D76): `test/budget.test.js`'s late-game limits hold for a generated packet too.
- **It places companions by slot,** never by name (D126).
