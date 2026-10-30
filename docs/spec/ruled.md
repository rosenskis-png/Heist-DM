# Ruled mode

The DM rules; the engine keeps the books (D75). Chosen at setup, beside the engine's pipeline (`docs/spec/engine.md` §6). Code: `src/engine/ledger.js`, `src/game/ruled.js`.

---

## The ledger
What the DM writes, and what every later call reads back. Shape: `schemas/ledger.js`.

| Part | Holds |
|---|---|
| Positions and holdings | Where every person and thing is, and who holds what |
| Flags | Any key on any person, thing or connection; doors use `locked`, which the map shows |
| Facts | Anything else that's true and matters: "Snag is drunk", "the far cell's bars are bent apart". Each has an id, and the party knows it unless marked otherwise. A fact is replaced by writing its id again and ends when it's retired |
| HP and moods | For the party and the people in the encounter |
| Off routine | People with a routine whom the DM has moved. The clock leaves them where they are until a ruling puts them back on it |
| Revealed | Hidden things, routines and events the party now knows |

The engine checks only that a change names real zones, people and things. It never judges whether a change is possible.

**Limits** (D76, `LEDGER` in `src/engine/ledger.js`): at most 20 facts, each at most 160 characters, and at most 6 new ones per output. Facts are how things are now; what happened goes to the log, one line per step. An output that breaks a limit goes back for its retry. Calls get the ledger as plain lines with the last 16 log entries and the last 10 lines of texture (`ledgerText` in `src/context.js`).

## What each call gets (D76)
The encounter comes as plain lines (`encounterText`): places, ways, things where they are now, fixed facts, people's sheets and routines, the packet's prose `notes` on how they react, what's coming, and hidden things marked apart. Each call has an input budget (`BUDGET` in `src/ask.js`); one that crosses it is recorded in the save and shown in the developer view, and `test/budget.test.js` holds every ruled call under its budget at the ledger's limits.

| Call | Gets |
|---|---|
| Adjudicate | Characters; the encounter with only known routines and events; the ledger; what the party expects next; the plan |
| Resolve | Characters; the whole encounter; the ledger; what really happens tick by tick; the plan, the card and which rolls succeeded |
| Scene | Characters; the encounter without the objective; the opening; the ledger; what's coming; the draft; the conversation |
| Companion | Her brief (D79); the party's view of the encounter (no sheets, nothing hidden); the party's view of the ledger without log or texture; the DM's last two narrations; the draft |

## What the engine still does
- **The clock:** time passes when a card or an exchange takes it. Routines move the people still following them, and their beats' rules run. Placed events fire on time, and every deadline is 1.5 times as far away as the packet says (D77).
- **Dice:** a d100 against the band's number (`docs/spec/engine.md` §7), rolled before the DM plays out the card.
- **The objective,** alternates and fail-forward ending, checked after every change.
- **The map,** drawn from the ledger.

Triggers, meters, combat, perception and fit don't run as rules in ruled mode. The packet's reactions and meters are notes on how people behave, and the DM applies them.

## A plan
1. **The card** (`docs/spec/calls/adjudicate.md`): the DM's steps and the tick each happens on, when the whole plan is done, a roll where failure is possible and interesting, the lasting rulings it depends on, and notes for this card only (D77).
2. **The dice:** the engine rolls the card's rolls (`roll`). They're kept with the card, so a call that fails and is tried again can't reroll them. A checkpoint ends the plan after its step.
3. **Playing it out** (`docs/spec/calls/resolve.md`): the DM's account of each step, where reality stopped the plan, people's response, every change, and then the narration written from that record (D78). The engine lands each step's changes at that step's tick and logs its account (`resolve`).

## A Moment exchange
One call (`docs/spec/calls/scene.md`) answers, rules on what the player tries, and says how long it took: nothing for questions, talk and social rolls, only physical work takes time (D77). The engine rolls its checks, records the matching outcome and the changes that happen regardless, then lets that time pass (`scene`).
