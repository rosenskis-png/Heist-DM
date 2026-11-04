# State

What the engine holds and who may write it. The packet (`docs/spec/packet.md`) is fixed; everything here changes.

---

## Campaign state (lives across encounters)
- **Act,** and the act history.
- **Invariants:** world facts that never change once they're in play. Each can carry an **act gate**, the first act it applies in (`docs/spec/context.md`). Data: `content/setting.js`.
- **Two campaign clocks:** alert and days (D21).
- **Slack:** a hidden −10..+10 that moves the next encounter's deadlines (D41). Never shown.
- **Character sheets:** class or companion abilities with their exact effects, conditions and limits; the conditions each carries until the next campfire (D130); ability uses per encounter and per rest. Abilities are exact, conditional and limited, and they're the main way a plan handles a risk.
- **Companions:** which two are in the party, their relationship state (including each one's view of the other, D92), memories and commitments, and what each owns to wear and has on (`docs/spec/companions.md`).
- **The player:** name, class, and the hidden secret, which reveals by act (`content/setting.js`).
- **Gear and items** the party holds.
- **The encounter log:** one line per finished encounter. The sketch call reads it as background (D119).
- **What the act has used:** the kinds, genres and motifs of its packets, so the next seed avoids repeats (D118).
- **The hand-off** from the last encounter (below).

## Live encounter state (bounded by the encounter)
- **The ledger** (`docs/spec/engine.md` §2): positions and holdings, flags, the DM's facts, the party's conditions, toughness, threats and moods, who's off their routine, and what the party has revealed.
- **Tick and pending ticks.**
- **Known:** the routines and events marked `known` in the packet, plus everything revealed in play. These drive the map, the companions' view, and what the card is ruled from (D36).
- **Canon added:** texture narrated after the opening (anything narrated is real once said). The card's rulings become facts. Later calls may not contradict either.
- **Event log:** one line per step played out, check and event. The engine writes it from the DM's validated outputs.
- **Draft card:** the plan the player is writing, plus pending companion stances. Everyone at the table sees it, companions included (D40). Once committed and ruled on, it becomes the card, with its dice once they're rolled.

Raw transcripts are kept within an encounter, but only the last few messages of the relevant channel go into prompts. Anything consequential is already in the ledger, canon or the event log.

## Writeback

The engine checks that every write names real things before committing it (`docs/spec/engine.md` §2).

| Source | Writes |
|---|---|
| Adjudicate call | The card: steps, ticks, rolls and their stakes, rulings (which become facts), notes |
| Resolve call | Each step's account and ledger changes, people's response, threats, texture (canon) |
| Scene call | Ledger changes, checks with both outcomes, threats, the time it took, a plan to send to the draft |
| Companion call | Stances, tagged reactions (D20) |
| Card confirmation | Stance decisions, checkpoints |
| Engine | Ticks, routines, events, rolls, objective status, `down` at no toughness left, the event log, the hand-off |
| Campfire | Relationship changes (including each one's view of the other), beliefs, storm level, caught asides, beats, memories, revealed secrets, commitments, her outfit |

## The hand-off (D21)

When an encounter ends, the engine writes a hand-off object, and the next packet's starting conditions are built from it:

- alert and days;
- gear, and the conditions the party carries until a campfire (D130);
- companions present;
- the exit used, and its next-scene stub (D119);
- **attachments** (D123): who travels with the party and who is missing from it. The next packet must resolve each one, and the engine drops them when that encounter ends;
- **the world's memory** (D123): NPC fates and who saw the party, which come back only through a callback the seed allows;
- the outcome, its kind (objective, alternate, fail-forward, captured or other) and the optional objectives met and missed, which move how the companions feel when it ends (D131);
- the ticks to spare before the deadline, which update slack (D41);
- the one-line log entry.

Only the hand-off, memories and commitments cross between encounters (principle 4). Nothing is summarized.

## Saves (D11)
A save is a snapshot of campaign state plus the current encounter's state, including its event log, and what the table said: every feed, the draft card and its stances, any open conversation (D74). The packet and the sheets come back from content by id. Saves are three slots per player in the artifact's `db`, under the player's own private path, with JSON export and import. Loading a save never calls an AI. Code: `src/game/session.js`, `app/store.js`.

## Replay (D60)
The engine is `apply(state, action) → state`, and state includes the random generator's position. A replay log is the encounter's starting inputs (packet, party, campaign values, seed) plus every action in order: validated AI outputs, committed cards, ticks passing. Applying it again gives deep-equal state. It's a test and debugging tool, never a save (D11).
