# Architecture

Who does what, the encounter loop, and time. For why it's shaped this way, see `docs/principles.md`. The DM rules and the engine keeps the books (D75, D125).

---

## Actors

| Actor | Calls | Job |
|---|---|---|
| **Engine** | none | Owns all state: the clock, routines and placed events, dice, the ledger's consistency, the objective, saves and the hand-off (`docs/spec/engine.md`). Pure code: no DOM, no AI calls (D12). It never judges whether an action is possible. |
| **The DM** | Adjudicate, resolve, scene, question and verdict | Rules on plans and makes the card, plays a card out against the world as it really is and narrates it, answers questions, rules on what the player does or says aloud at the table, and judges how a room went once it's over (D146). |
| **Companions** | The party call for both at the table; the companion call for a private word; the campfire | Voice the companions over the rings, in private and at the campfire (D132). |
| **Generation** | Sketch, critique and encode, once per packet | Builds the next encounter, room or campfire from a seed code picks (`docs/spec/generation.md`). |

Every AI call goes through the artifact runtime's `sample` (D2). Each call's contract is in `docs/spec/calls/`, and what each sees is in `docs/spec/context.md`.

## Modes

| Mode | Cards | Ticks | Calls |
|---|---|---|---|
| **Encounter** | yes | yes | adjudicate, resolve, scene, question, party, companion |
| **Room** (exploration, social, respite; D22, D121) | no | only for events the room places | scene, question, party, companion |
| **Campfire** (a room where the party rests; D122) | no | no, time passes freely | campfire, one call per companion (D45) |

## Encounter loop

1. **The table.** Code decides which calls a message runs, from who it's for (D127):

   | The player | Calls |
   |---|---|
   | asks the DM | the question call only, on the cheapest tier, with the read-only slice (D133) |
   | does something, or speaks to a person aloud | the scene call, then the party call |
   | talks to the party over the rings | the party call only (D132) |
   | says a private word to one companion | her companion call only |
   | talks the plan over | the party call |

   A question changes nothing in the world, and what its answer settles becomes fact. The scene call (`docs/spec/calls/scene.md`) rules on what the player tries, rolls a check where failure is possible and interesting, and says how long it took. Talk takes no time; only physical work does (D77). Anything that's really a plan of several steps goes to the draft, and so does a fight: once anyone is fighting the party, the scene call only answers and talks (D130). Party talk is over the rings, with time paused. The companions' stances go onto the draft as pending.
2. **Commit.** On the Plans tab the player builds the plan as a list of actions, with any timing and conditions (D35, D134), and decides each pending stance (keep / resolved / override). Only the player writes plan content.
3. **The card** (`docs/spec/calls/adjudicate.md`). The DM rules on the plan as a DM would: each step's tick, when the whole plan is done, a roll only where failure is possible and interesting, its band and what failure costs, and up to three lasting rulings the plan depends on. It reads the plan the way the player means it, and adds no waits, safety steps or better ideas (D77). It's ruled from what the party knows, and names nothing hidden. The player confirms, edits, or marks checkpoints (D69).
4. **The dice.** The engine rolls every roll on the card before anything is played out. The DM never sees the numbers, and a retry never rerolls.
5. **Playing it out** (`docs/spec/calls/resolve.md`). One call sees everything and plays the card against the world as it really is. It honours the dice and the card's stated costs, stops the plan where reality differs, has people act from their sheets and the packet's notes, records every change in the ledger, and then narrates from that record (D78). The engine lands each step's changes at that step's tick.
6. **Fights** are plans (D130). A card covers a beat: what everyone does over the next few moments. The account ends on what anyone still fighting is visibly about to do (`threats`), and the next card answers it. Harm to the party is conditions and `down`, never HP.
7. **Finish.** The engine checks the objective after every change, and the encounter ends when it's met, an alternate or the fail-forward ending holds, the whole party is down (captured, D131), or the player leaves. However it ends, the party moves on.

## Time

Ticks exist only in encounters and in rooms that place events. A tick is about a minute of real work (D77). Routines and events are written in ticks when the packet is built.

| What | Ticks |
|---|---|
| A plan | the card's `ends_at`, step by step |
| A scene exchange | what the DM says it took: none for talk and social rolls |
| A question, party talk, card review | 0 |

When time passes, routines move the people still following them and their beats' rules run, and placed events fire on their tick.
