# Engine

What the engine computes. **Code computes, AI judges** (principle 2): the engine owns every fact, number and rule that can be checked. The AIs get its *results* as facts, and return structured decisions that the engine validates before applying.

The acceptance test is `fixtures/cells/acceptance.md`.

---

## 1. Validation
- **Packets:** the consistency checks (reject) and quality checks (warn) in `docs/spec/packet.md`.
- **AI output:** every structured output is checked against its schema and against current state before anything is applied. A failure gets one retry, with the errors listed (D13).

## 2. Map and perception
- **From geometry** (D9, D28): zone sizes, distances along connections, distances between placed things, and adjacency. These go to the AIs as facts.
- **Routes** (D54): a move without a `path` takes the shortest route that everything moving fits through. A route the player named that fails the fit check goes to the ruling call (D55); an exception it grants is kept for that thing and connection. A move longer than two crossings is split into consecutive steps, and someone carrying a connection's `key` unlocks it in passing, if something moving with them doesn't fit while it's locked (D56, D63).
- **Fit:** an actor or thing crosses a connection only if its size (`tiny` < `small` < `medium` < `large`) is no bigger than the connection's `fits`, or its `fits_unlocked` once it's unlocked (D53). People are `medium` unless a flag says otherwise (Fern as a rat is `tiny`).
- **Routing on the zone graph:** routes and travel time in ticks; whether a zone is reachable given the current connection flags; which side a barrier can be operated from.
- **Observers per step:** every NPC not acting in the plan (D61) who, at the step's tick, is in a zone on the step's route, sees one, or hears one at the step's noise level or louder (`silent` < `quiet` < `speech` < `loud`). Senses come from the NPC's sheet or current beat, edited by meters. Example: at Suspicion 1, Snag can see the far cell's back corner. The route is every zone an actor or moved thing occupies during the step.
- **The perceivable set:** what the party can perceive right now, pooled across party members (the whisper rings make sharing free). This is what the companions and the map are given, and what a plan's conditions are checked against (D39). Each member:
  - **sees** their own zone, any zone joined to it by a `see_through` connection or an open one, and any zone its `sees` list names (the cells look down the corridor into the guardroom), if that zone isn't `dark` (or the member has the `sees_in_dark` trait);
  - **hears** their own zone, and speech or louder in any zone joined to it by a connection (with `hears_through_walls`, any zone that shares a wall with theirs);
  - perceives an NPC's beat if they can see the NPC or hear its cue.
- **What the party knows:** everything it has perceived or learned, plus the routines and events marked `known` in the packet or revealed in play. Foreseen observers on the card come from this (§6).

## 3. Time and schedules
- **Ticks,** per the table in `docs/spec/architecture.md`, with D16's rule that a step takes place in the tick it starts in.
- **Pending ticks** are applied one at a time, checking for arrivals after each.
- **Cycles:** a period, a phase offset, and a state per beat. A beat can move things, not just people: the keys are on Snag's belt during Pace and on the peg during Sit and Drink.
- **One-time events:** fire at a given tick, or when a condition is met.
- **Projection:** the state at any future tick, as it will really be and as the party expects it to be. The card needs both (§6).
- **Edits:** meters and triggers can change schedules. At Suspicion 2, Snag's Drink beat is dropped, and his cycle is the beats left: Pace, Sit. An override moves an NPC for some ticks, starting on the next one.
- **Slack** (D41): when a packet is loaded, each event marked `deadline` moves by 2% of its tick per point of the campaign's slack (−10 to +10, so at most ±20%), rounded once to the nearest tick. When an encounter with a deadline ends, slack goes up by 1 after the fail-forward ending or with 15% or less of the deadline to spare, and down by 1 with 50% or more to spare. Nothing moves during an encounter, and the player never sees slack.

## 4. Meters
- **A meter has** a scope (one NPC, the encounter, or the campaign), a current value, and a ladder.
- **The ladder:** each level applies state changes, such as a schedule edit, a sense change, a connection closing, or a keys-stay-on-belt rule.
- **Decay:** e.g. −1 after one full cycle with no anomaly and every prisoner still. A decay can be blocked by a condition, e.g. while the peg is empty.

## 5. Reaction triggers
The engine runs deterministic reactions written in the packet:
- noise heard → investigate next tick, suspicion +1;
- keys touched → keys stay on belt until suspicion is 0;
- Uzga arrives at tick 21.

**The boundary** (D18): if a reaction can be written as condition → operations with no "unless he decides", it's an engine rule. Anything that chooses between options (how Snag bargains, what he'll accept) goes to the world call.

## 6. The plan pipeline
The card prices the plan the party expects; reality interrupts it (D36).

1. **Validate the step call's output:**
   - every move follows a connection;
   - every id is real;
   - every `when` and `if` is a `plan_condition` (only things someone could perceive, D39) and refers only to things the party knows, including learned routines (D35).
2. **Project each step.** Each step is projected as if the earlier steps went as planned:
   - **its tick:** right after the previous step, or, with a `when`, the first tick its condition holds, waiting at most `max_wait` ticks (default 6);
   - **its route,** and the barriers it crosses;
   - **`as_if`** (internal): the step's own preconditions that won't hold at that tick, written as what the pricing call should assume instead ("the key ring is on the peg"; D42);
   - **foreseen observers and hazards:** those the party knows will be there at that tick (NPCs it knows of, on routines and events it knows). Observers include anyone who perceives the actors while they wait;
   - **interrupts** (internal): where reality is projected to differ from what the party expects. An NPC the party didn't foresee would see or hear the step (`arrival`); an effect can't happen at that tick (the keys aren't on the peg, the ring is too big for the gutter); a hidden fact defeats it; a trigger fires first; a wait runs out; no one can perceive a `when` or `if` when it's checked.
3. **Check the pricing call's output.**
   - Every step is priced, including steps with interrupts, as if their preconditions held (`as_if`).
   - Every foreseen observer, barrier and hazard has a priced risk or a named mitigation, and nothing else is priced. Anything uncovered is sent back.
   - Every `arrival` has a warning band.
   - A shown reason or failure summary that names something the party doesn't know is sent back.
4. **Strip the internal fields** (`as_if`, interrupts, internal checks, warnings) before the card is shown.
5. **Execute each step in order:**
   - apply the tick's schedules (each beat's `on_start` rules), meters and triggers;
   - if the step has a `when` that doesn't hold yet, the actors wait: the tick passes and the line above repeats. If `max_wait` runs out first, the plan is interrupted (`wait_expired`);
   - evaluate its `if`; when it's false, apply `otherwise`: skip the step, stop the plan, or run the alternative instead;
   - a `when` or `if` is checked only if someone in the party can perceive what it's about at that tick (§2). If no one can, the plan is interrupted (`cant_perceive`) instead of guessing;
   - **interrupt before the step begins** if the party can already see that it won't go as planned, if something the card didn't foresee would perceive it, a trigger has fired that changes the situation, or an internal check reveals a hidden fact. For an arrival, roll the warning: on a success, the party's next plan gets one step before it lands (the arrival resolves at the end of that tick instead of the start); on a failure, it lands as the scene opens. An arrival the card never projected (the world changed mid-plan) rolls at Medium;
   - skip risks whose conditions no longer hold;
   - roll the remaining risks;
   - apply the consequences of failed risks: their operations, minus the step effects they `cancel`;
   - apply the step's effects in order;
   - **an interruption happens at the first instant anyone in the party could recognize that a remaining step won't work** (D46, D47, D62), not when a character runs into it. Before the step begins and before each of its effects, the engine re-projects the plan's remaining steps from what the party perceives right now plus what it knows (learned routines, known events). If that projection shows a step failing, the plan stops there. Something merely different right now isn't enough: an empty peg during Snag's Pace doesn't stop a plan that takes the keys on his Drink, because the party knows they'll be back by then. Moves already made stand, and what they noticed becomes known. Recognizing takes seeing: the party must see the spot where the plan expects a thing, and see it isn't there (D62). If no one could notice it until the effect itself, it interrupts at that effect;
   - run triggers; stop if a failed risk had `stops_plan`;
   - check the objective, any combat start, kept stance triggers and player checkpoints.
6. **Log every result as structured data** for the narration call, including each interrupt and its warning roll.

An interrupt is not a failure. The world turn picks up at that moment, and the player plans from there.

## 7. Dice, combat, abilities, stances
- **Dice:** the AIs judge a difficulty band; the engine rolls a d100 against the band's number (D33). No AI reads or writes these numbers, and the player never sees them. The random number generator is seedable, so tests and replays are reproducible.

  | Band | Easy | Medium | Hard | Very hard | Near impossible |
  |---|---|---|---|---|---|
  | Succeeds on d100 ≤ | 80 | 65 | 45 | 25 | 10 |
- **Combat** (Gravenhold's rule; `content/rules.js`):
  - HP;
  - abilities whose conditions are met bypass HP;
  - each exchange, enemies who weren't dealt with deal damage;
  - a character at 0 HP is down, not dead;
  - the engine decides when combat ends;
  - ticks accrue on rounds 2, 4, 6….
- **Abilities:** the engine tracks uses per encounter and per rest, and one-way states, from each ability's `declared` block (D30). Whether an ability's conditions are met in the fiction is judged by the AI, with the engine's facts in hand.
- **Stances:** the engine checks stance triggers (conditions), applies keep / resolved / override, and writes overrides to the relationship tracks.
- **Objectives** are checked after every step and at the end of every combat.

## 8. Condition language (D17)
JSON predicate trees: `{"all": [...]}`, `{"any": [...]}`, `{"not": ...}`, and the atoms below. Used for objectives, preconditions (`requires`), triggers, rule guards, stance triggers, meter decay and `until`. Shapes: `schemas/defs.js`.

| Atom | True when |
|---|---|
| `in_zone: [entity, zone]` | the entity is in the zone |
| `party_all_in: zone` | every party member is in the zone |
| `holds: [holder, item]` | the holder (an actor, a thing such as the peg, or `party` for any member) has the item |
| `flag: [entity, key, value]` | the flag on an entity, connection or thing has that value (`locked`, `gnawed`, `form`) |
| `meter: [meter, op, n]` | the meter compares true |
| `tick: [op, n]` | the current tick compares true |
| `beat: [npc, beat]` | the NPC's schedule is on that beat |
| `revealed: id` | the hidden thing has been revealed |
| `hp_below: [actor, n]` | the actor's HP is below n |
| `disposition: [npc, value]` | the NPC's disposition is that value |
| `step_tagged: tag` | the step being resolved carries the tag |
| `noticed_by: npc` | during this tick, a risk covering that NPC failed, or a `loud` step reached their hearing |

**Bindings:** `@self` is the actor using an ability; `@step_zone` is the zone of the step being resolved.

## 9. State-change operations (D17)
One list, used by triggers, rules, ladders, events, consequences, effects, abilities and every AI write. Shapes: `schemas/defs.js`.

| Operation | Does |
|---|---|
| `move` | moves an actor to a zone, along a `path` of at most two crossings, each named by the zone it enters or, where two connections join the same zones, by the connection (D51) |
| `give` | puts an item in a holder's hands, along a `path` (as for `move`) if it travels |
| `place` | puts an item down in a zone |
| `consume` | removes an item from play |
| `set_flag` | sets a flag; the key must be one the packet or a sheet already uses (D52) |
| `meter_add` | changes a meter, then applies the ladder levels it reaches |
| `set_disposition` | changes an NPC's disposition |
| `edit_schedule` | drops a beat, or overrides an NPC's position for some ticks |
| `set_sense` | changes what an NPC sees or hears on a beat |
| `reveal` | makes a hidden thing, or an NPC's routine, known to the party |
| `add_canon` | records texture or a ruling |
| `use_ability` | spends a use and applies the ability's declared effects (D30) |
| `add_ticks` | adds pending ticks (an extra-time consequence) |
| `start_combat` | starts a fight with the listed enemies |
| `damage` | removes HP |
| `end_encounter` | ends the encounter with a named outcome |

`set_flag`, `edit_schedule` and `set_sense` can carry `until`: a condition that, once true, undoes the change. That's how a ladder level lapses when its meter falls.

**Rules** (`{if, then, else}`) wrap operations wherever the packet runs them unconditionally otherwise: in events, triggers and beats' `on_start`.

There is no operation that adds a zone, a connection or a hidden thing (D29).

## 10. What the engine must not do
- **Judge** plausibility, progress, "solved", NPC motives, or odds.
- **Write prose.**
- **Hold pacing formulas,** risk budgets or escalation curves (D4).
- **Store or send routes.** The generator's private route check is thrown away.
- **Invent entities or events.** It only runs what the packet and the AIs' validated outputs say.
- **Name a companion.** Companion behaviour comes from her file (D8).
- **Call an AI.** The call layer does that; the engine stays pure (D12).
