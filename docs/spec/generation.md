# Generation

How the game builds its next encounter, room or campfire (D117). Built in Phase 7; until then the Cells is the only packet. Generated packets carry only what the DM reads (D116). How to design a *good* one is in `docs/design/encounter-craft.md`.

---

## Three stages
Generation happens at three moments, each deciding only what it can decide well then (D164):
1. **The world, once** (`docs/spec/calls/pitch.md`): everything stable, and the pools later stages draw from: factions with their ladders, five regions on the rising curve, mysteries with their edges and clues.
2. **The act, when it begins** (`docs/spec/calls/act.md`): what the region is like now, what it's busy with, who holds it, and its peak, from what the party has done.
3. **The room, when it's entered:** the pipeline below.

Later stages see slices, never pools: a room gets one busy line, at most one clue, at most one extra, chosen by code, so nothing in a pool can take over every room.

## When it runs
When an encounter or room ends and its hand-off is final (`docs/spec/state.md`), the next packet starts generating, during the closing narration and any room or campfire that follows. An act's call runs as the act begins (`beginAct`), before its first room. Loading a save never generates (D11).

## The pipeline

Code: `src/game/generate.js` (`generateRoom`: `seedRoom`, the code steps, then `designRoom`, the calls and the layout, D154). It runs once the party has taken an exit and the campaign has entered the next room's kind (`docs/spec/campaign.md`).

| Step | Who | Does |
|---|---|---|
| **Exits** | Code | Draws the kinds of room this room's exits lead to (D144) |
| **Seed** | Code | Picks the question (`src/campaign/seed.js`, below) |
| **Sketch** | `sketch` call | Writes the whole room as a DM's prep note, premise first (`docs/spec/calls/sketch.md`) |
| **Encode** | `encode` call | Turns the sketch into packet data without geometry, checked by the engine once laid out (`docs/spec/calls/encode.md`) |
| **Edges** | Code | Adds the mysteries' edges that apply here as hidden facts (`edgesFor`): a climax gets its act's climax edges, a faction's room that faction's edges from their act on. Never sent to the sketch (D164) |
| **Layout** | Code | Puts it on the grid from rough sizes (`src/engine/layout.js`); if it can't, the packet ships without a map (D9) |

The sketch is generator-only: no play call ever sees it (D59), and it holds no route (D156). Nothing reviews the sketch before encode: a clever move the room didn't plan for is the player's reward, and what the craft asks of a room is in the sketch's prompt (D156). How to design a good room is `docs/design/encounter-craft.md`; the motifs are `content/motifs.js`.

## The seed (D118, D153, D160–D164)
What the seed fixes:
- **The kind** comes from the way (D144); the exits' kinds are drawn with it.
- **Whose room it is** (D158): one companion's slot or no one's, no one's about half the time, never the same companion twice running; the climax is both companions'. A companion's thing (the motif) is drawn only when the room is someone's.
- **The tone,** from very stressed about time to a fantasy playground, leaning toward stress when the leg's strain is high.
- **What the place is busy with** (D162): a kind from the act's busy lines, with its line in the act's words, never repeated within an act (without a plan, a kind from `BUSY`).
- **Whose place it is,** for an encounter, the climax or an oddity: one of the factions that hold the region now, by the act's plan (or the region's holders).
- **The shape and its centrepiece** (D163), from wide lists, neither repeated within an act.
- **The prize,** for an encounter, an oddity or a quiet room (D164, D168): none about half the time, gold, a relic or a journal page. A page is one the campaign hasn't placed, from the act's live mysteries; the sketch is told only who wrote it, never its words, which the party reads at camp.
- **At most one extra** (D164), never in two rooms running: **someone from before**, from the verdicts' memory, only in an encounter or an oddity, at most once an act each; or **a sign of the act's peak**, from its hints, at most one a leg.

Its leaning is **one motif**, a situation's shape with no examples, not repeated in the act where it can be helped (D168). From the act's pools (D167), each item used once in the act: **a setting** for a quiet room, an oddity or a campfire, a different one from earlier in the act until they run out; and **news** as a third kind of extra. Pages come only from the act's live mysteries. **Her story's feature** reaches the sketch once an act for each companion; her other rooms touch her values. **The tone** also darkens as the act goes on, by the leg the room is in.

The campaign records what the act has used (motifs, busy-withs, shapes, centrepieces, premises, signs, people brought back) and resets them when an act ends; the clues placed and the memory last the campaign.

## What the sketch sees (D119, D164)
| Tier | Holds |
|---|---|
| **Must honour** | How the party arrives (the exit's stub, what it carries) and the last rooms' log lines |
| **Background** | The place in brief, the region's name, the act's question and aim, and the faction whose place it is, with its rules and local face (none when that face is the act's peak). No picture of the region, and never the heart or the tensions, except at a climax |
| **Seed** | Everything above, with its prize, any extra, and the act's earlier premises |
| **Climax** | The act's goal, what has changed, and its peak, the heart, and the act's rooms so far |

Plus the party: who each is, never their abilities, so no room is built around one; each companion's values; her story's needs and her quest only when the room is hers (D158). No example rooms (D161), and never an AI summary of the act. On the Forge, a designer's brief comes first where it and the seed disagree, and an unpinned busy-ness gives way to it (D166).

## What every packet must have
Beyond `docs/spec/packet.md`'s consistency checks:
- **Every attachment it was handed resolves** in it (D123), or the packet is rejected.
- **Every exit carries a next-scene stub** (D119), and the exits lead to exactly the kinds code drew (D144).
- **Its fail-forward ending moves the story on,** and so does `captured`, which every encounter has (D131): each has a next-scene stub that takes the party somewhere new, never back to where they started.
- **Anyone who might fight has a tier and `breaks`** (D130), and a fight encounter's objective is something other than everyone down (`docs/design/encounter-craft.md` §3.9).
- **A room has no objective or deadline** (D121). An outfit is a reward placed where it fits, for a companion in the party (D143).
- **It fits the calls' budgets** (D76): `test/budget.test.js`'s late-game limits hold for a generated packet too.
- **It places companions by slot,** never by name (D126).
- **It holds the seed's journal page,** when it placed one, as a thing the party can carry whose reward is that page, and no reward but the seed's prize (D164, D165, D168).
