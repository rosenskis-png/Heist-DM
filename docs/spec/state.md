# State

What the engine holds and who may write it. The packet (`docs/spec/packet.md`) is fixed; everything here changes.

---

## Campaign state (lives across encounters)
- **Act,** and the act history.
- **Invariants:** world facts that never change once they're in play. Each can carry an **act gate**, the first act it applies in (`docs/spec/context.md`). Data: `content/setting.js`.
- **Two campaign clocks:** alert and days (D21).
- **Slack:** a hidden −10..+10 that moves the next encounter's deadlines (D41). Never shown.
- **Character sheets:** class or companion abilities with their exact effects, conditions and limits; HP and conditions; ability uses per encounter and per rest. Abilities are exact, conditional and limited, and they're the main way a plan handles a risk.
- **Companions:** which two are in the party, their relationship state, the pair value, memories and commitments, and what each owns to wear and has on (`docs/spec/companions.md`).
- **The player:** name, class, and the hidden secret, which reveals by act (`content/setting.js`).
- **Gear and items** the party holds.
- **The encounter log:** one line per finished encounter.
- **The hand-off** from the last encounter (below).

## Live encounter state (bounded by the encounter)
- **Positions** of every party member, NPC and item.
- **Flags:** locked, broken, alerted, and the like.
- **Tick and pending ticks.**
- **Meter values,** e.g. Snag's suspicion.
- **NPC dispositions.**
- **Ability uses spent,** and one-way states (Fern stays a rat until the encounter ends).
- **Known flags:** what the party has perceived or learned, including routines and events (marked `known` in the packet, or revealed in play). These drive the map, the companions' view, and which observers a card foresees (D36).
- **Canon added:** texture introduced after the opening (anything narrated is real once said) and **rulings** ("rats can drag the ring, slowly, and it scrapes"). Append-only; later calls may not contradict them.
- **Event log:** one line per resolved card, roll, fight or conversation. The engine writes it from structured results. The only AI-written lines are the Moment AI's "learned" facts.
- **Table read:** plans committed vs. expected length, roll outcomes and any streak, consequences that landed, and the player's last 2–3 messages word for word. Facts only, no verdicts. Sent only to the world call.
- **Draft card:** the plan the player is writing, plus steps the Moment AI has redirected and pending companion stances. Everyone at the table sees it, companions included (D40). Once committed and priced, it becomes the card.
- **Objective status,** e.g. "in the archway: 0 of 3".

Raw transcripts are kept within an encounter, but only the last few messages of the relevant channel go into prompts. Anything consequential is already in state, canon or the event log.

## Writeback

The engine validates every write against the map and state before committing it. Every write uses the shared state-change operations (D17).

| Source | Writes |
|---|---|
| Step call | Effects, tags, rulings, internal checks |
| Pricing call | Odds, consequences, rulings |
| World call | NPC actions and reactions |
| Narration call | Texture (canon) |
| Moment AI | Learned facts, dispositions, promises, texture, check results |
| Companion AI | Stances, tagged reactions (D20) |
| Card confirmation | Stance decisions, checkpoints |
| Engine | Ticks, schedules, rolls, consequences applied, effects, objective status, event log, table read |
| Campfire | Relationship changes (including the pair value), beats, memories, revealed secrets, commitments, her outfit |

## The hand-off (D21)

When an encounter ends, the engine writes a hand-off object, and the next packet's starting conditions are built from it:

- alert and days;
- gear, conditions, HP;
- NPC fates, by id;
- companions present;
- the exit used (which decides the next scene);
- the outcome and the ticks to spare before the deadline, which update slack (D41);
- the one-line log entry.

Only the hand-off, memories and commitments cross between encounters (principle 4). Nothing is summarized.

## Saves (D11)
A save is a snapshot of campaign state plus the current encounter's packet and state, including its event log. Saves are stored per player in the artifact's `db`, with JSON export and import. Loading a save never calls an AI.

## Replay (D60)
The engine is `apply(state, action) → state`, and state includes the random generator's position. A replay log is the encounter's starting inputs (packet, party, campaign values, seed) plus every action in order: validated AI outputs, committed cards, ticks passing. Applying it again gives deep-equal state. It's a test and debugging tool, never a save (D11).
