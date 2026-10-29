# Engine Requirements

What the engine must do, gathered from the v4 spec and `encounter-design.md`. This is the starting brief for designing the engine, not a design.

**The rule behind everything here:** code computes, AI judges (v4 principle 2). The engine owns every fact, number and rule that can be checked. The AIs get the engine's *results* as facts, and return structured decisions that the engine validates before applying.

---

## 1. Data it holds

### 1.1 Campaign state (lives across encounters)
- **Act** and the act history.
- **Invariants.** Each one can carry an **act gate**: a minimum act before it applies. Example: the Hollow King's heartbeat is gated to Act 4 (v4 §3.5).
- **Campaign alert,** plus whatever else the campaign layer carries forward (open question, v4 §13.6).
- **Character sheets.**
  - Class abilities, with their exact effects, conditions and limits.
  - HP and conditions.
  - Ability uses per encounter and per rest.
- **Companions.**
  - Profiles, secrets, stance triggers.
  - Relationship tracks.
  - Memories and commitments.
- **Gear and items** the party holds.
- **The encounter log:** one line per finished encounter.
- **Carry-forward state,** handed to the next encounter's starting conditions: alert, gear, NPC fates, companions with the party, which exit was used.

### 1.2 The encounter packet (fixed for the encounter)
- **Intent.**
  - The objective, written as a condition the engine can check.
  - Alternate objectives, including a fail-forward ending.
  - Optional objectives.
  - A purpose line and an expected length.
  - **No routes, ever.** The engine must reject a packet that contains route-like fields.
- **People.** One sheet per NPC: wants, fears, knows, will never, temper, disposition, position, and an optional schedule.
- **Map, stored as a graph:**
  - **Zones:** id, description, purpose line.
  - **Connections:** type; attributes (`locked`, `open`, `see_through`, `climb`, rat-sized…); which side each one is operated from; travel cost in ticks.
  - **Sense links:** which zones can be seen or heard from which, per observer, and which may vary with a schedule beat.
  - **Light level per zone,** if senses depend on it.
- **Things:** objects with properties (free text for the AI to judge, plus any flags the engine checks), and their location: a zone, a holder, or a schedule.
- **Fixed facts,** including rulings made in advance (for example, "Wild Shape ends when the party leaves the cell block").
- **Hidden things,** marked hidden.
- **Schedules,** authored in ticks (§2.3).
- **Meters and their ladders,** such as suspicion and alert (§2.4).
- **Reaction triggers:** condition → state change rules the engine can run without asking an AI (§2.5).
- **Opening description,** stored word for word.

### 1.3 Live encounter state
- **Positions** of every party member, NPC and item.
- **Flags:** locked, broken, alerted, and the like.
- **Tick and pending ticks.**
- **Meter values,** for example Snag's suspicion.
- **NPC dispositions.**
- **Ability uses spent** and one-way states (Fern stays a rat until the encounter ends).
- **Known flags:** what the party has perceived or learned. This drives the map and the companions' view.
- **Canon added** (texture and rulings), append-only.
- **The event log.**
- **The table read:** plans committed vs expected length, roll outcomes, consequences that landed, and the player's last few messages. Facts only.
- **The draft card** and pending stances.
- **Objective status.**

---

## 2. Computations

### 2.1 Validation
- **Packet consistency (v4 §3.3 checklist).**
  - Every id that's referenced exists.
  - Every barrier says how it's operated and from which side.
  - Every observer says what it can see and hear.
  - Every zone has a purpose line.
  - Any failure sends the packet back to the generator for regeneration.
- **Packet quality** (`encounter-design.md` §10; proposals, so tune these after playtesting):
  - Every element is connected to at least two others.
  - Zones the objective depends on have two or more routes to them, or are flagged as the deliberate chokepoint.
  - Every exit has a closing condition, and the alarm ladder refers to it.
  - All schedule periods share one tick grid, and there are at most two independent clock sources.
  - At least one one-time event happens before the encounter's natural end.
  - Every schedule has a cue the party can perceive from a zone they can reach.
  - Every party member's abilities interact with at least one element.
- **AI output.** Every structured output is checked against its schema and against current state before anything is applied. A failure gets one retry, with the errors listed.

### 2.2 Map and perception
- **Routing on the zone graph:**
  - routes and travel time in ticks;
  - whether a zone is reachable given the current connection flags;
  - which side a barrier can be operated from.
- **Observers per zone per tick:** who can see or hear the zone, worked out from positions, schedule beats, sense links, light, and meter effects. Example: at Suspicion 1, Snag can see the far cell's back corner.
- **The perceivable set:** what the party can perceive right now. This is what the companions and the map are given.

### 2.3 Time and schedules
- **Ticks,** using the v4 §10 tick-cost table.
- **Pending ticks** are applied one at a time, checking for arrivals after each.
- **Schedules come in two kinds:**
  - **Cycles:** a period, a phase offset, and a state per beat.
  - **One-time events:** fire at a given tick, or when a condition is met.
- **A schedule beat can move things, not just people.** Example: the keys are on Snag's belt during Pace and on the peg during Sit and Drink.
- **Projection:** the engine can work out the state at any future tick. The card needs this.
- **Skipped beats:** schedules can be changed by meters or triggers. Example: at Suspicion 2, Snag's Drink beat is dropped.

### 2.4 Meters
- **A meter has:** a scope (one NPC, the encounter, or the campaign), a current value, and a ladder.
- **The ladder:** each level applies state changes, such as a schedule edit, a sense change, a connection closing, or a keys-stay-on-belt rule.
- **Decay rules:** for example, "−1 after one full cycle with no anomaly and every prisoner still". A decay can be blocked by a condition, for example "not while the peg is empty".

### 2.5 Reaction triggers
- **The engine runs deterministic reactions written in the packet.** Examples:
  - noise heard → investigate next tick, suspicion +1;
  - keys touched → keys stay on belt until suspicion is 0;
  - Uzga arrives at tick 12.
- **Anything that needs judgment stays with the world call (v4 §6.3).** Examples: how Snag bargains, what he'll accept.
- **Where to draw the line is an open decision (§5).**

### 2.6 The plan pipeline (v4 §6)
1. **Validate the step call's output.**
   - Every move follows a connection.
   - Every id is real.
   - Every **precondition holds at the projected tick.** Example: the keys aren't on the peg during a Pace beat.
2. **Attach facts to each step:** its projected tick, its route, the observers who can see or hear it at that tick, and the barriers it crosses.
3. **Check the pricing call's output.** Every observer, barrier and hazard the engine listed must have either a priced risk or a named mitigation. Anything uncovered is sent back.
4. **Strip internal-only fields** (hidden checks) before the card is shown.
5. **Execute each step in order:**
   - advance the tick and apply schedules, meters and triggers;
   - check for observers the card didn't list (reveal them and stop);
   - run internal checks on hidden facts (reveal and stop);
   - skip risks whose dependencies no longer hold;
   - roll the remaining risks;
   - apply the consequences, honoring `stops_plan`;
   - apply the step's effects;
   - check the objective, any combat start, kept stance triggers and player checkpoints.
6. **Log every result as structured data** for the narration call.

### 2.7 Dice, combat, abilities, stances
- **Dice.**
  - A d100 roll against odds, using the v4 odds bands.
  - The random number generator must be seedable, so tests and replays are reproducible.
- **Combat** (the Gravenhold combat rule):
  - HP;
  - abilities whose conditions are met bypass HP;
  - each exchange, enemies who weren't dealt with deal damage (outnumbering);
  - a character at 0 HP is down, not dead;
  - the engine decides when combat ends;
  - ticks accrue on rounds 2, 4, 6….
- **Abilities.**
  - The engine tracks uses per encounter and per rest, and one-way states.
  - Whether an ability's conditions are met in fiction is judged by the AI, with the engine's facts in hand.
- **Stances.**
  - The engine checks the fixed list of triggers: `node_has_tag`, `entity_revealed`, `actor_hp_below`, `entity_in_zone`, `item_acquired`.
  - It applies keep, resolved or override decisions, and writes overrides to the relationship tracks.
- **Objectives** are checked after every step and at the end of every combat.

---

## 3. Context assembly (v4 §9)

- **Three tiers, in this order:** campaign, then encounter, then live, so the longest possible prefix is cached.
- **Each call gets only what the visibility table allows (v4 §9.2):**
  - **Hidden things** go only to the plan calls and the Moment AI, marked hidden.
  - **Companions** see only what the party knows, plus their own secrets.
  - **The table read** goes only to the world call.
- **Act gates are enforced here.**
  - A gated invariant isn't in context before its act.
  - The campaign tier is rebuilt when the act changes.
  - **Worked examples need act tags too.** The Cells example's commentary mentions an Act 4 invariant, so only §11.1–11.4 may be sent in Acts 1–3.
- **Raw transcripts:** only the last few messages of the relevant channel. Everything that matters is already in state, canon or the log.

---

## 4. What the engine must not do

- **Judge** plausibility, progress, "solved", NPC motives, or odds.
- **Write prose.**
- **Hold pacing formulas,** risk budgets or escalation curves (removed in v4 §12).
- **Store or send routes.** The generator's private route check is thrown away.
- **Invent entities or events.** It only runs what the packet and the AIs' validated outputs say.

---

## 5. Open decisions for the engine thread

1. **Reaction triggers vs. the world call.** Which reactions are engine rules (cheap, deterministic, provably fair) and which are AI judgment? Leaning: meters, ladders, decay, arrivals and simple sensory reactions go to the engine; anything with motive goes to the AI.
2. **Distance.** Should connections carry travel time in ticks only, or also a size or length for things like chase calibration? Ticks are enough for the Cells; the cavern would want more.
3. **How detailed the sense model is.** Per-zone see/hear links that vary by schedule beat, or something richer (light levels, smell for creatures like wolves)? Start minimal: see and hear, varying per beat.
4. **The format for schedules and triggers.** It needs to be small enough for the generator to write reliably, and rich enough to express "the keys move with the beat" and "decay blocked while the peg is empty".
5. **The condition language.** One shared syntax for objectives, preconditions, triggers, stance triggers and decay blockers.
6. **What carries between encounters** (v4 §13.6), and the format the next packet receives it in.
7. **Map rendering** from the zone graph, known parts only.
8. **Stack and persistence.** Gravenhold was a single-file React app. Engine state needs saving, loading and replaying from the event log.

---

## 6. Acceptance test: the Cells

Use the worked example (`encounter-design.md` §11) as the first fixture. With a seeded random number generator, the engine must:

1. **Load and validate** the packet, and reject a variant that contains a route field.
2. **Project the first card's steps** against Snag's cycle, and flag that the keys aren't on the peg during the Pace step.
3. **List the observers per step for the second card,** matching the table: none on steps 1, 2 and 5; Snag behind the peg on step 3; Snag at the cask on step 4.
4. **Roll steps 3 and 4,** apply the stated failure consequences, and stop the plan on step 3's failure but not on step 4's.
5. **Run the suspicion ladder:**
   - at level 1, the far cell's corner becomes visible to Snag;
   - at level 2, the Drink beat is dropped;
   - one full still cycle brings suspicion down by 1;
   - decay is blocked while the peg is empty.
6. **Fire Uzga's arrival at tick 12,** and the fail-forward ending if Fern is still in her cell.
7. **Change Snag's reaction from "go for the drum" to "bargain"** when the drum is flagged as gnawed.
8. **End Fern's Wild Shape** when the party reaches the stair top, and check the objective.
9. **Trip Fern's stance** on a step tagged `lethal`.
10. **Never put the heartbeat invariant into any Act 1 context.**
