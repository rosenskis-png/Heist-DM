# Engine

What the engine does. **Code computes, AI judges** (principle 2): the DM rules and the engine keeps the books (D75, D125). The engine owns every fact and number that can be kept consistent, checks that the DM's rulings name real things, and never judges whether anything is possible. Code: `src/engine/`, a reducer (D60).

---

## 1. Loading a packet
- **The consistency checks** in `docs/spec/packet.md` reject a packet; the quality checks only warn.
- **Party slots** (D126): the packet places companions as `companion_a` and `companion_b`, and loading binds each to the party's companions in order (`bindParty`).

## 2. The ledger
What the DM writes, and what every later call reads back. Shape: `schemas/ledger.js`; code: `src/engine/ledger.js`.

| Part | Holds |
|---|---|
| Positions and holdings | Where every person and thing is, and who holds what |
| Flags | Any key on any person, thing or connection; doors use `locked`, which the map shows, and a person out of the fight is `down` |
| Facts | Anything else that's true and matters: "Snag is drunk", "the far cell's bars are bent apart". Each has an id, and the party knows it unless it's marked otherwise. A fact is replaced by writing its id again, and ends when it's retired |
| Conditions | The party's hurts and hindrances, one line each: what it stops someone doing. Added or replaced by id, ended by `recover`, carried in the hand-off, and cleared at a campfire (D130) |
| Toughness | The telling blows each person in the encounter can still take, from their tier (`content/rules.js`). The DM writes `wounds`; at none left the engine sets them `down`. The party has none: its harm is conditions and `down` |
| Threats | What each person fighting the party is visibly about to do, as the party sees it. The resolve call replaces them every time; the scene call when it writes them. Nobody who's down threatens anyone, and they end with the encounter |
| Moods | The people in the encounter's dispositions |
| Off routine | People with a routine whom the DM has moved. The clock leaves them where they are until a ruling puts them back on it |
| Revealed | Hidden things, routines and events the party now knows |
| Ability uses | Each limited ability the party has used this encounter (`used`, D128), counted against its `declared` uses per encounter and per rest. Per-encounter uses refill when the next encounter loads; per-rest uses spent travel in the hand-off until a rest (`rest` in `src/engine/handoff.js`), which also clears conditions |

**The engine checks only that a change names real zones, people and things.** A card, an account or a question's answer (D133) that names something the party doesn't know yet, a use past what's left of an ability, steps out of order, a step that happened in full after its roll failed, or a change that breaks a limit goes back for the one retry (D13).

**Limits** (D76, `LEDGER`): at most 20 facts, each at most 160 characters, and at most 6 new ones per output. Facts are how things are now; what happened goes to the log, one line per step. At most 6 conditions, each at most 80 characters, and at most 6 threats, each at most 100 (`CONDITIONS`, `THREATS`).

**A fight is a plan** (D130): once anyone is fighting the party, a scene with a check or time in it goes back, since what the party does goes on the card.

## 3. The clock
- **Time passes** when a card or a scene exchange takes it (`docs/spec/architecture.md`).
- **Routines:** a period, a phase and one beat per tick. At tick *t* the beat is `beats[(t + phase) % period]`. Each beat puts its person somewhere and runs its `on_start` rules: the keys go on Snag's belt as he starts to pace. People the DM has taken off their routine stay put.
- **Placed events** fire at their tick, or when their condition first holds, and run their rules.
- **The objective,** alternates and fail-forward ending are checked after every change and every tick. Before them, every encounter's last ending: with the whole party down, it ends as `captured` (D131).

## 4. Dice
The DM judges a band; the engine rolls a d100 against the band's number (D33). The engine rolls every roll on a card before the DM plays it out, keeps them with the card so a retry can't reroll, and tells the DM only which succeeded. No AI reads or writes these numbers, and the player never sees them. The generator is seeded, so tests and replays are reproducible.

| Band | Easy | Medium | Hard | Very hard | Near impossible |
|---|---|---|---|---|---|
| Succeeds on d100 ≤ | 80 | 65 | 45 | 25 | 10 |

Skill numbers are on the sheets the DM reads when it chooses a band. The engine never adds them to a roll (D68).

## 5. What the party perceives
Used for the map and for who the player can talk to, never as a rule (`src/engine/perceive.js`). A room with no drawn map is one scene (D174): every place in it that isn't hidden or dark is in sight and in earshot, and the DM rules on what can be made out from where. In a drawn room: Pooled across the party, since the whisper rings make sharing free. Each member sees their own zone, any zone joined to it by a `see_through` or open connection, and any zone its `sees` list names, unless it's dark (or they have `sees_in_dark`). They hear their own zone and any zone joined to theirs by a connection (with `hears_through_walls`, any zone that shares a wall with theirs). `inSight` lists what the opening must name (D136): the people in zones they see, the things in those zones and their own (even dark), unless a person carries them, and the barriers out of their own zones; never hidden ones.

## 6. The hand-off
When an encounter ends, the engine writes the hand-off (`docs/spec/state.md`, `src/engine/handoff.js`). It records the ending's kind (objective, alternate, fail-forward, captured or other) and the optional objectives met and missed, each tested as it stands at the end, which the verdict call reads (D146); the exit the party left by (D144); and the gold and relics carried out (D147).

## 7. Replay (D60)
The engine is `apply(state, action) → state`, and state includes the random generator's position. A replay log is the encounter's starting inputs (packet, party, seed) plus every action in order: the DM's validated outputs, rolls, operations and time passing. Applying it again gives deep-equal state.

## 8. Condition language (D17)
JSON predicate trees: `{"all": [...]}`, `{"any": [...]}`, `{"not": ...}`, and the atoms below. Used for objectives, events' `when` and rule guards. Shapes: `schemas/defs.js`.

| Atom | True when |
|---|---|
| `in_zone: [entity, zone]` | the entity is in the zone |
| `party_all_in: zone` | every party member is in the zone |
| `holds: [holder, item]` | the holder (a person, a thing such as the peg, or `party` for any member) has the item |
| `flag: [entity, key, value]` | the flag on a person, connection or thing has that value |
| `tick: [op, n]` | the current tick compares true |
| `beat: [npc, beat]` | the person's routine is on that beat |
| `revealed: id` | the hidden thing has been revealed |
| `disposition: [npc, value]` | the person's disposition is that value |

## 9. Operations (D17)
What a packet's events, beats and start run. Shapes: `schemas/defs.js`. The DM's own writes are ledger changes (§2).

| Operation | Does |
|---|---|
| `move` | puts a person in a zone (D129) |
| `give` | puts an item in a holder's hands |
| `place` | puts an item down in a zone |
| `set_flag` | sets a flag |
| `reveal` | makes a hidden thing, a routine or an event known to the party |
| `add_canon` | records texture |
| `end_encounter` | ends the encounter with a named outcome |

An ability's declared effects use the same operations, with `@self` for the companion they're about.

## 10. What the engine must not do
- **Judge** plausibility, progress, "solved", NPC motives, odds, or whether an action can happen.
- **Write prose.**
- **Hold pacing formulas,** risk budgets or escalation curves (D4).
- **Store or send routes.** No call writes one (D156).
- **Invent people or events.** It runs only what the packet and the DM's validated outputs say.
- **Name a companion.** Companion behaviour comes from her file (D8); packets use slots (D126).
