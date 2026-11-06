# Generation

How the game builds its next encounter, room or campfire (D117). Built in Phase 7; until then the Cells is the only packet. Generated packets carry only what the DM reads (D116). How to design a *good* one is in `docs/design/encounter-craft.md`.

---

## When it runs
When an encounter or room ends and its hand-off is final (`docs/spec/state.md`), the next packet starts generating, during the closing narration and any room or campfire that follows. Loading a save never generates (D11).

## The pipeline

Code: `src/game/generate.js` (`generateRoom`). It runs once the party has taken an exit and the campaign has entered the next room's kind (`docs/spec/campaign.md`).

| Step | Who | Does |
|---|---|---|
| **Exits** | Code | Draws the kinds of room this room's exits lead to (D144) |
| **Seed** | Code | Picks the question (`src/campaign/seed.js`, below) |
| **Sketch** | `sketch` call | Writes the whole room in plain English, design statement first (`docs/spec/calls/sketch.md`) |
| **Critique** | `critique` call | Plays it four ways and reports what's wrong (`docs/spec/calls/critique.md`). Encounters and the climax only |
| **Revise** | `sketch` call | Rewrites the sketch from the critique: cut, connect or swap, never add. Once, and only if there were problems |
| **Encode** | `encode` call | Turns the sketch into packet data without geometry, checked by the engine once laid out (`docs/spec/calls/encode.md`) |
| **Layout** | Code | Puts it on the grid from rough sizes (`src/engine/layout.js`); if it can't, the packet ships without a map (D9) |

The sketch and the critique are generator-only: no play call ever sees them (D59). The critique's runs and the sketch's golden path are thrown away. How to design a good room is `docs/design/encounter-craft.md`; the motifs are `content/motifs.js`.

## The seed (D118, D153)
- **The kind** comes from the way (D144); the exits' kinds are drawn with it.
- **Two or three motifs** for an encounter or the climax, one for a calm room, suited to the kind and avoiding those the act has used where it can.
- **The tone,** from very stressed about time to a fantasy playground, leaning toward stress when the leg's strain is high.
- **For an encounter or the climax:** the x-factor (explore, interact, acquire, overcome, get through), the shape (linear, branching, open, hub), what makes its choices meaningful (costs that differ in kind, incomplete information, a dilemma, a truth to deduce, prizes that compete), and one or two of the world's factions. An oddity gets an x-factor too.

The campaign records the act's used motifs, and the seed's random position, so the next seed differs; both reset when an act ends.

## What the sketch sees (D119)
| Tier | Holds |
|---|---|
| **Must honour** | How the party arrives (the exit's stub, what it carries) and the last rooms' log lines |
| **Background** | The world's place, life, heart and tensions, this act, the factions in the room, its room kinds |
| **Seed** | Everything above |

Plus the party, each companion's values and needs, and the worked example. Never an AI summary of the act.

## What every packet must have
Beyond `docs/spec/packet.md`'s consistency checks:
- **Every attachment it was handed resolves** in it (D123), or the packet is rejected.
- **Every exit carries a next-scene stub** (D119), and the exits lead to exactly the kinds code drew (D144).
- **Its fail-forward ending moves the story on,** and so does `captured`, which every encounter has (D131): each has a next-scene stub that takes the party somewhere new, never back to where they started.
- **Anyone who might fight has a tier and `breaks`** (D130), and a fight encounter's objective is something other than everyone down (`docs/design/encounter-craft.md` §3.9).
- **A room has no objective or deadline** (D121). An outfit is a reward placed where it fits, for a companion in the party (D143).
- **It fits the calls' budgets** (D76): `test/budget.test.js`'s late-game limits hold for a generated packet too.
- **It places companions by slot,** never by name (D126).
