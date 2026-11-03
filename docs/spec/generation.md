# Generation

How the game builds its next encounter, room or campfire (D117). Built in Phase 7; until then the Cells is the only packet. Generated packets carry only what the DM reads (D116). How to design a *good* one is in `docs/design/encounter-craft.md`.

---

## When it runs
When an encounter or room ends and its hand-off is final (`docs/spec/state.md`), the next packet starts generating, during the closing narration and any room or campfire that follows. Loading a save never generates (D11).

## The pipeline

| Step | Who | Does |
|---|---|---|
| **Seed** | Code | Picks the kind, the genre, 2–3 motifs, the act's mechanics, and whether a callback is allowed (D118) |
| **Sketch** | `sketch` call | Writes the whole design in plain English (`docs/spec/calls/sketch.md`) |
| **Critique** | `critique` call | Plays it three ways and reports what's wrong (D120, `docs/spec/calls/critique.md`). Encounters only |
| **Revise** | `sketch` call | Rewrites the sketch from the critique: cut, connect or swap, never add. Once |
| **Encode** | `encode` calls | Turn the sketch into packet data in stages, each validated by the engine (`docs/spec/calls/encode.md`) |
| **Layout** | Code | Snaps the sketch's sizes and placements to the grid (D28). If it fails, the packet ships without a map (D9) |

The sketch and the critique are generator-only: no play call ever sees them (D59). The critique's plans are thrown away.

## The seed (D118)
- **Kind:** an encounter, a room (D121) or a campfire (D122). Code places campfires: the act's sanctuary, plus one or two rests in between.
- **Genre:** from the act's mechanics, avoiding the genres this act has already used. Each genre has a promise (`docs/design/encounter-craft.md` §1).
- **Motifs:** 2–3 from `content/motifs.js`, avoiding the motifs this act has already used. The sketch may add at most one element from no motif.
- **Callback:** whether an NPC from the world's memory may reappear (D123). Off unless drawn.

The campaign records each act's kinds, genres and motifs, so the seed can avoid repeats.

## What the sketch sees (D119)
| Tier | Holds |
|---|---|
| **Must honour** | The hand-off, its attachments, and the exit's next-scene stub |
| **Background** | The act's goal and mechanics, the faction, and the encounter log (one engine-written line per finished encounter) |
| **Seed** | The kind, genre and its promise, motifs, mechanics, callback |

Plus the party's abilities and one worked example of a different genre. Never an AI summary of the act.

## What every packet must have
Beyond `docs/spec/packet.md`'s consistency checks:
- **Every attachment it was handed resolves** in it (D123), or the packet is rejected.
- **Every exit carries a next-scene stub** (D119).
- **A room holds exactly one outfit,** for a companion in the party, and has no objective or deadline (D121).
- **It fits the calls' budgets** (D76): `test/budget.test.js`'s late-game limits hold for a generated packet too.
- **It places companions by slot,** never by name (D126).
