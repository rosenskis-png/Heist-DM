# Engine

What the engine computes. **Code computes, AI judges** (principle 2): the engine owns every fact, number and rule that can be checked. The AIs get its *results* as facts, and return structured decisions that the engine validates before applying.

The acceptance test is `fixtures/cells/acceptance.md`.

---

## 1. Validation
- **Packets:** the consistency checks (reject) and quality checks (warn) in `docs/spec/packet.md`.
- **AI output:** every structured output is checked against its schema and against current state before anything is applied. A failure gets one retry, with the errors listed (D13).

## 2. Map and perception
- **From geometry** (D9, D28): zone sizes, distances along connections, distances between placed things, and adjacency. These go to the AIs as facts.
- **Fit:** an actor or thing crosses a connection only if its size (`tiny` < `small` < `medium` < `large`) is no bigger than the connection's `fits`. People are `medium` unless a flag says otherwise (Fern as a rat is `tiny`).
- **Routing on the zone graph:** routes and travel time in ticks; whether a zone is reachable given the current connection flags; which side a barrier can be operated from.
- **Observers per step:** every NPC who, at the step's tick, is in a zone on the step's route, sees one, or hears one at the step's noise level or louder (`silent` < `quiet` < `speech` < `loud`). Senses come from the NPC's sheet or current beat, edited by meters. Example: at Suspicion 1, Snag can see the far cell's back corner. The route is every zone an actor or moved thing occupies during the step.
- **The perceivable set:** what the party can perceive right now. This is what the companions and the map are given.

## 3. Time and schedules
- **Ticks,** per the table in `docs/spec/architecture.md`, with D16's rule that a step takes place in the tick it starts in.
- **Pending ticks** are applied one at a time, checking for arrivals after each.
- **Cycles:** a period, a phase offset, and a state per beat. A beat can move things, not just people: the keys are on Snag's belt during Pace and on the peg during Sit and Drink.
- **One-time events:** fire at a given tick, or when a condition is met.
- **Projection:** the state at any future tick. The card needs this.
- **Edits:** meters and triggers can change schedules. At Suspicion 2, Snag's Drink beat is dropped.

## 4. Meters
- **A meter has** a scope (one NPC, the encounter, or the campaign), a current value, and a ladder.
- **The ladder:** each level applies state changes, such as a schedule edit, a sense change, a connection closing, or a keys-stay-on-belt rule.
- **Decay:** e.g. −1 after one full cycle with no anomaly and every prisoner still. A decay can be blocked by a condition, e.g. while the peg is empty.

## 5. Reaction triggers
The engine runs deterministic reactions written in the packet:
- noise heard → investigate next tick, suspicion +1;
- keys touched → keys stay on belt until suspicion is 0;
- Uzga arrives at tick 18.

**The boundary** (D18): if a reaction can be written as condition → operations with no "unless he decides", it's an engine rule. Anything that chooses between options (how Snag bargains, what he'll accept) goes to the world call.

## 6. The plan pipeline
1. **Validate the step call's output:**
   - every move follows a connection;
   - every id is real;
   - every **precondition holds at the projected tick** (e.g. the keys aren't on the peg during a Pace beat).
2. **Attach facts to each step:** its projected tick, its route, the observers who can see or hear it at that tick, and the barriers it crosses.
3. **Check the pricing call's output.** Every observer, barrier and hazard the engine listed must have either a priced risk or a named mitigation. Anything uncovered is sent back.
4. **Strip internal-only fields** (hidden checks) before the card is shown.
   **Problems** (an effect that can't happen at its projected tick: the keys aren't on the peg, a trigger fires first) are shown on the card. They aren't errors in the step call and aren't sent back.
5. **Execute each step in order:**
   - advance the tick and apply schedules (each beat's `on_start` rules), meters and triggers;
   - check for observers the card didn't list (reveal them and stop);
   - run internal checks on hidden facts (reveal and stop);
   - skip risks whose conditions no longer hold;
   - roll the remaining risks;
   - apply the consequences of failed risks: their operations, minus the step effects they `cancel`;
   - apply the step's remaining effects;
   - run triggers; stop if a failed risk had `stops_plan`;
   - check the objective, any combat start, kept stance triggers and player checkpoints.
6. **Log every result as structured data** for the narration call.

## 7. Dice, combat, abilities, stances
- **Dice:** a d100 roll against odds from the bands in `docs/spec/calls/pricing.md`. The random number generator is seedable, so tests and replays are reproducible.
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
| `move` | moves an actor to a zone, along a `path` of at most two connections (one step) |
| `give` | puts an item in a holder's hands, along a `path` if it travels |
| `place` | puts an item down in a zone |
| `consume` | removes an item from play |
| `set_flag` | sets a flag |
| `meter_add` | changes a meter, then applies the ladder levels it reaches |
| `set_disposition` | changes an NPC's disposition |
| `edit_schedule` | drops a beat, or overrides an NPC's position for some ticks |
| `set_sense` | changes what an NPC sees or hears on a beat |
| `reveal` | reveals a hidden thing |
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
