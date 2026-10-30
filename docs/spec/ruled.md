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

## What the engine still does
- **The clock:** time passes when a card or an exchange takes it. Routines move the people still following them, and their beats' rules run. Placed events fire on time.
- **Dice:** a d100 against the band's number (`docs/spec/engine.md` §7), rolled before the DM plays out the card.
- **The objective,** alternates and fail-forward ending, checked after every change.
- **The map,** drawn from the ledger.

Triggers, meters, combat, perception and fit don't run as rules in ruled mode. The packet's reactions and meters are notes on how people behave, and the DM applies them.

## A plan
1. **The card** (`docs/spec/calls/adjudicate.md`): the DM's steps, their ticks and the time each takes, a roll where failure is possible and interesting, and the rulings the plan depends on.
2. **The dice:** the engine rolls the card's rolls (`roll`). They're kept with the card, so a call that fails and is tried again can't reroll them. A checkpoint ends the plan after its step.
3. **Playing it out** (`docs/spec/calls/resolve.md`): the DM's account of each step, where reality stopped the plan, people's response, and every change. The engine lands each step's changes at that step's tick (`resolve`).
4. **Narration** (`docs/spec/calls/narration.md`), from the settled record.

## A Moment exchange
One call (`docs/spec/calls/scene.md`) answers, rules on what the player tries, and says how long it took. The engine rolls its checks, records the matching outcome and the changes that happen regardless, then lets that time pass (`scene`).
