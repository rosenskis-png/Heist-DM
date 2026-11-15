# Generation

How the game builds its next encounter, room or campfire (D117). The page runs it between rooms (D173). Generated packets carry only what the DM reads (D116). How to design a *good* one is in `docs/design/encounter-craft.md`.

---

## Three stages
Generation happens at three moments, each deciding only what it can decide well then (D164):
1. **The world, once** (`docs/spec/calls/pitch.md`): everything stable, and the pools later stages draw from: factions with their ladders, five regions on the rising curve, mysteries with their edges and clues.
2. **The act, when it begins** (`docs/spec/calls/act.md`): what the region is like now, the places its rooms are set in, who holds it, and its peak, from what the party has done.
3. **The room, when it's entered:** the pipeline below.

Later stages see slices, never pools: a room gets one place or setting, at most one clue, at most one extra, chosen by code, so nothing in a pool can take over every room.

## When it runs
When an encounter or room ends and its hand-off is final (`docs/spec/state.md`), the verdict runs, and then the next packet generates while the player reads it (`nextRoom` in `src/game/journey.js`, D173): the verdict comes first because its rating moves the leg's strain, which decides the next room's ways on. An act's call runs as the act begins (`beginAct`), before its first room. Loading a save never generates (D11).

## The pipeline

Code: `src/game/generate.js` (`generateRoom`: `seedRoom`, the code steps, then `designRoom`, the calls and the layout, D154). It runs once the party has taken an exit and the campaign has entered the next room's kind (`docs/spec/campaign.md`).

| Step | Who | Does |
|---|---|---|
| **Exits** | Code | Draws the kinds of room this room's exits lead to (D144); the room before a campfire, the climax or the sanctuary has one way on, to it (D169) |
| **Seed** | Code | Picks the question (`src/campaign/seed.js`, below) |
| **Sketch** | `sketch` call | Writes the whole room as a DM's prep note, premise first (`docs/spec/calls/sketch.md`) |
| **Outfit** | `outfit` call | When the seed holds one, designs the room's outfit from the sketch (`docs/spec/calls/outfit.md`, D195) |
| **Encode** | `encode` call | Turns the sketch into packet data without geometry, checked by the engine once laid out (`docs/spec/calls/encode.md`) |
| **Edges** | Code | Adds the mysteries' edges that apply here as hidden facts (`edgesFor`): a climax gets its act's climax edges, a faction's room that faction's edges from their act on. Never sent to the sketch (D164) |
| **Layout** | Code | Puts it on the grid from rough sizes (`src/engine/layout.js`); if it can't, the packet ships without a map (D9) |

The sketch is generator-only: no play call ever sees it (D59), and it holds no route (D156). Nothing reviews the sketch before encode: a clever move the room didn't plan for is the player's reward, and what the craft asks of a room is in the sketch's prompt (D156). How to design a good room is `docs/design/encounter-craft.md`; the motifs are `content/motifs.js`.

## The seed (D118, D153, D160–D164, D196)
What the seed fixes:
- **The kind** comes from the way (D144); the exits' kinds are drawn with it.
- **Whose room it is** (D158): one companion's slot or no one's, no one's about half the time, never the same companion twice running; the climax is both companions'. A companion's thing (the motif) is drawn only when the room is someone's.
- **The place,** for an encounter (D196): one plain, ordinary part of the region from the act's `places`, a different one from any used earlier in the act until they run out. It is the encounter's only draw of where and what; the room's situation is the sketch's to write. A climax is set where the act's peak says.
- **For a calm room only** (quiet, oddity, merchant, campfire, sanctuary; D162, D163, D167): its tone, from very stressed about time to a fantasy playground, leaning toward stress when the leg's strain is high and darkening as the act goes on; what the place is busy with, a generic kind from `BUSY`; and the shape and its centrepiece, from wide lists. None repeats within an act.
- **Whose place it is,** for an encounter, the climax or an oddity: one of the factions that hold the region now, by the act's plan (or the region's holders).
- **Whose place it is** is drawn as below; an encounter draws no tone, busy-ness, shape, centrepiece or state for its danger (D196).
- **The prize,** for an encounter, an oddity or a quiet room (D164, D168): none about half the time, gold, a relic or a journal page. A page is one the campaign hasn't placed, from the act's live mysteries; the sketch is told only who wrote it, never its words, which the party reads at camp.
- **An outfit** (D195): never in an encounter. A quiet room, an oddity or a campfire hides one, somewhere hidden or hard to reach, while the act has fewer than its two or three (drawn once an act), more likely the fewer calm rooms are left; it's that room's only prize, and the sketch says only where it is, never what it looks like. Every climax rewards one too, given when the climax ends. The outfit call designs it after the sketch; encode makes it a thing the party can carry, and code puts the outfit on it exactly as designed. An outfit that fails to come leaves the room without one.
- **At most one extra** (D164), never in two rooms running: **someone from before**, from the verdicts' memory, only in an encounter or an oddity, at most once an act each; or **a sign of the act's peak**, from its hints, at most one a leg.

Its leaning (D163, D169): **one motif** a room, a kind of situation with no examples (D168, D179), which with the place and the way so far is what keeps one room from being the same kind as the last (D196). **Worn out:** every seed lists the props rooms must never build on (`content/stale.js`: hanging cages, ledgers and counting), and a sketch that uses one goes back once (D169). From the act's pools (D167), each item used once in the act: **a setting** for a quiet room, an oddity or a campfire, a different one from earlier in the act until they run out; and **news** as a third kind of extra. Pages come only from the act's live mysteries. **Her story's feature** reaches the sketch once an act for each companion; her other rooms touch her values. **The tone** also darkens as the act goes on, by the leg the room is in.

The campaign records what the act has used (motifs, places, busy-withs, shapes, centrepieces, premises, signs, people brought back) and resets them when an act ends; the clues placed and the memory last the campaign.

## What the sketch sees (D119, D164)
| Tier | Holds |
|---|---|
| **Must honour** | How the party arrives (the exit's stub, what it carries) and the last rooms' log lines |
| **Background** | As in D163 (D169): the world's place, its tone (D196), life, heart and tensions; the act's setting in general, its question and aim; and the faction whose place it is, with its rules, goal and the people of its ladder below the act's peak. Nothing particular from the act |
| **Seed** | Everything above, with its prize, any extra, and **the way so far**: each room already passed this act, in order, by kind and premise, so this one follows on from them and is a different kind of place |
| **Climax** | The act's goal, what has changed, and its peak, the heart, and the act's rooms so far |

Plus the party: who each is, never their abilities, so no room is built around one; each companion's values; her story's needs and her quest only when the room is hers (D158). No example rooms (D161), and never an AI summary of the act. On the Forge, a designer's brief comes first where it and the seed disagree, and an unpinned busy-ness gives way to it (D166).

## What every packet must have
Beyond `docs/spec/packet.md`'s consistency checks:
- **Every attachment it was handed resolves** in it (D123), or the packet is rejected.
- **Every exit carries a next-scene stub** (D119), and the exits lead to exactly the kinds code drew (D144).
- **Its fail-forward ending moves the story on,** and so does `captured`, which every encounter has (D131): each has a next-scene stub that takes the party somewhere new, never back to where they started.
- **Anyone who might fight has a tier and `breaks`** (D130), and a fight encounter's objective is something other than everyone down (`docs/design/encounter-craft.md` §3.9).
- **A room has no objective or deadline** (D121). An outfit is never in an encounter (D195).
- **It fits the calls' budgets** (D76): `test/budget.test.js`'s late-game limits hold for a generated packet too.
- **It places companions by slot,** never by name (D126).
- **It holds the seed's journal page,** when it placed one, as a thing the party can carry whose reward is that page, and no reward but the seed's prize (D164, D165, D168).

## The read (D177)
After a room with danger in the way (an encounter or a climax) is laid out, the read call reads it once from the player's chair (`docs/spec/calls/read.md`). If the reader says it couldn't picture the room or didn't know what it would want there, the room goes back to the sketch once with the reader's notes; the new room isn't read again. Handles are listed for the designer and never counted (D196). A read that fails holds nothing up.

## What the party has with it (D178, D192)
The campaign's `carried` list (a follower with their goal and motive, and loose ends, from taking stock) and its pack reach the sketch as something the room must honour, and the engine loads them into the room's state.

## Where a follower is going (D192)
While a follower travels with the party, the seed may make the room their goal (`docs/spec/campaign.md` §10). The sketch is told who, the place, and why they really want it: the room is that place, their story comes to a head, and they part ways by its end. It is the room's premise, so the room has no other extra.

## What a room with danger in it is built from (D179, D196)
An ordinary place the players already know, one situation that explains everything in it, a few people and things behaving as anyone would expect, something already going somewhere, and often something more to want than the way on. The seed gives the place and one motif; the world gives the tone; the sketch writes the rest. Nothing fixes how the danger stands, how many things the room holds, or whether the danger can be fought: the note says how a straight fight would likely go and how each person would take a stranger, the opening says what the party makes of it, and the encode call puts that in view as facts. How to design one is `docs/design/encounter-craft.md` §16.

## The layout (D183)
`layout` (`src/engine/layout.js`) sets each zone against the zone it's reached from, where it also meets the most other zones it joins; joins any two that still don't meet by growing an arm from the smaller; lays the room out again, differently, if a zone is walled in; and gives each thing a square. A room ships without a map only if all of that fails.
