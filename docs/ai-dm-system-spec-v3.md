# AI DM System — Feature Specification (v3)

Changes and additions to the existing engine. This covers game systems and how they interact. Existing systems not mentioned here stay as they are unless they conflict with this spec.

**Guiding split:** the Plan AI makes judgment calls up front, on the card. The engine carries them out mechanically. The Plan AI then narrates what the engine did. No AI is asked mid-execution whether something "counted."

---

## 1. Architecture

The **game engine** is the single source of truth. All AI actors are stateless callers that receive context assembled from engine state plus recent chat history, and return structured output the engine validates and commits.

| Actor | Calls | Role |
|---|---|---|
| **Plan AI** | Card call, Execution call | Prices committed plans; narrates world turns and plan execution; ingests moment chat and writes its consequences |
| **Moment AI** | Main call; reveal follow-up call | Answers questions, runs perception/knowledge/social checks, runs social and combat moments; reveals what the party perceives; redirects state-changing actions to the card; handles all interaction in exploration rooms |
| **Companion AI** | One call per companion, sequential | Voices each of the two companions in huddle and campfire chats |
| **Scene Writeback** | Event-triggered in exploration rooms | Converts exploration moment chat into state deltas |

The engine owns: campaign direction, canonical scene state (zones, connections, sightlines, entities, fixed facts, schedules, objective), the perceivable set, character data, dice rolls, time ticks, pending ticks, the risk budget, the odds ledger, node effects, dependency checks, assumption checks, hidden checks, stance-trigger checks, objective checks, pause detection, the escalation curve, and all writeback validation.

**In encounters, the Moment AI never advances time, adds complications, or applies consequences for delay.** Only the engine and the Plan AI change the world. (Exploration rooms have a narrow exception, §8.7.)

---

## 2. UI Layout

- **Top half:** two tabs.
  - **Plan tab:** world turns, adjudication cards, execution montages.
  - **Moment tab:** questions, checks, social and combat moments. Shows an **End conversation** button during social moments and a **Leave combat** button when fleeing is possible (§8.5).
- **Bottom half:** huddle chat, with three sub-tabs.
  - **Group:** player + both companions; visible to all three.
  - **Private (Companion A):** player + Companion A only.
  - **Private (Companion B):** player + Companion B only.
- **Map:** shows only zones, connections and entities with `known: true`.
- **Card panel:** shows the active adjudication card, including any remaining steps of a paused plan, any **draft steps** added by Moment AI redirects (§8.1), and any **pending stances** from companions (§9.3).
- **Card display:** each node shows what it changes, and each risk shows its odds, whether it is world or introduced risk, and whether failure stops the plan. Engine-internal fields (hidden checks) are never displayed.
- **Status:** current tick, risk budget (spent / total) and phase are visible.
- **Companion messages** display as soon as each sequential call returns. The first companion's message is shown while the second generates.

---

## 3. Room Types

| Room type | Active AIs | Time | Notes |
|---|---|---|---|
| **Encounter** | Plan AI, Moment AI, Companion AI | Ticks (§10) | Full encounter loop (§5) |
| **Exploration** | Moment AI, Companion AI | No ticks | No Plan AI and no cards. Everything resolves in the moment. Scene Writeback runs on consequential events, every N exchanges, and before any transition (§8.6) |
| **Campfire** | Companion AI | No ticks | Downtime companion interaction; writes relationship state |

Room transitions and encounter starts are engine-owned. The Moment AI may request a transition; the engine flushes any pending Scene Writeback, then executes it.

---

## 4. Engine State Additions

### 4.1 Entities
Each entity (NPC, enemy, object, hazard) has:
- `id`, `zone`, `description`
- `known` (bool): whether the player has perceived it. Drives map visibility and card-call filtering.
- `hidden` (bool): placed but unrevealed. A hidden entity has `known: false` and is never in the perceivable set until revealed by a successful check or by execution.
- `schedule` (optional): position or state per tick, for patrols, routines, deadlines and environmental changes.
- `senses` (optional): zones the entity can perceive. May vary by schedule tick. Used for pause detection (§7.1) and observer consistency. Default: own zone plus zones visible from it.
- NPC sheet (for NPCs): `wants`, `fears`, `knows`, `will_never`, `disposition` (track).

### 4.2 Encounter (Canonical Scene State)
- `zones`: each with an id, description, contents, `known`, and `visible_from` (zones from which it can be seen).
- `connections`: links between zones (doors, stairs, grates, windows), with simple attributes where relevant (e.g. `locked`, `climb`, `open`, `see_through`), and `known`.
- `fixed_facts`: physical facts that rule things out (e.g. "the walls are solid granite", "the coal chute is bricked up"), each with `known`.
- `objective`: a single resolution condition expressed as engine state (e.g. `party_all_in: [zones]`, `item_held: id`). No other condition in the encounter is mandatory.
- `alternate_objectives` (optional): other engine-state conditions that also resolve the encounter. May include one **fail-forward** objective (a worse outcome, e.g. escape without the item) that the Plan AI steers toward in deep overtime.
- `optional_objectives`: extra engine-state conditions the player may opt into.
- `hidden_entity_cap`: 0–2.
- `tick`: the current world tick.
- `pending_ticks`: time accrued during moments, applied on the next Plan AI call (§10).
- `risk_budget`: `{total, spent, improvised_spent, overtime_cards}` (§6.3).
- `escalations`: count of escalations applied this encounter (§6.5).
- `odds_ledger`: stored odds per obstacle, `{obstacle_id: {odds, reason, set_on_tick}}` (§6.4).
- `hidden_checks`: engine-internal checks recorded from card calls (§6.2), `{node_id, feature, blocking_fact_id}`.

**Perceivable set (engine-computed, not stored):** all non-hidden entities, zones, connections and fixed facts in the party's zones or in zones visible from them. Recomputed on every tick and every party move.

**Canon rules:**
- The canonical scene state is sent to Plan AI calls, filtered per §12. The Moment AI receives the perceivable set (§8.2). The map renders from state.
- **Narration writes canon:** any new physical detail introduced in narration (a grate, a window, a ledge) must be returned as a state delta in the same output. Once committed, it is canon for all later calls.
- Narration may not contradict canonical state, including facts not yet known to the player.
- **The map is a floor, not a fence:** a feature's absence from state does not mean it doesn't exist. A route is ruled out only by a fact in state (`fixed_facts`, entity positions, connection attributes).

### 4.3 Characters and Companions
- Character sheets: abilities, skills, HP, conditions.
- Companion data adds: `reasoning_bias`, `secrets` (per companion; never in the other companion's context), `stance_triggers` (values or traits that justify stances), and `relationship_state` with the player and with the other companion.
- **Each secret references state ids** (an NPC, a hidden entity, a fixed fact, a commitment), so revealing it changes something in play.
- **Positions taken:** a short per-companion list of stances and arguments made this encounter; survives huddle compression (§12).

### 4.4 Commitments
A list of promises, deals and agreements made in moments or campfire scenes: `{who, to_whom, what, conditions, status}`.

### 4.5 Encounter Generation
The generator places facts: zones, connections, sightlines, fixed facts, entities, schedules, senses, hidden entities, and the objective.

To size the encounter, it authors one **reference route**: an ordinary, competent way to reach the objective. From that route it sets `risk_budget.total`. The reference route is internal only: never shown, never sent to any AI, and never mandatory. It exists to prove one competent route exists and to calibrate size.

It does not predict the player's approach, define mandatory steps, or set odds. There are no mandatory content requirements (such as a required timer); time pressure exists only where the scene's schedules create it.

---

## 5. Encounter Loop

1. **World turn (Plan AI, Execution call).** The engine applies `pending_ticks` one at a time (§10), advancing schedules and checking for arrivals after each. The Plan AI ingests moment chat since its last call (§8.6), writes its deltas, narrates the current situation (including any arrivals), and the map updates.
2. **Huddle (time paused, optional).** The player talks with companions in the group or private chats. No world time passes. Companion stances declared here are added to the draft card as **pending stances** (§9.3).
3. **Moment tab (optional).** Looking, talking and fighting (§8). Anything that moves the party or changes the world is redirected onto the draft card. The world doesn't change during this step; time costs accrue to `pending_ticks`.
4. **Commit.** The player submits a plan in the Plan tab, including any draft steps, and decides each pending stance (keep, resolved, or override; §9.3). Only the player enters plan content.
5. **Adjudication card (Plan AI, Card call).** The plan is broken into nodes with effects, tags and dependencies; risks are assigned and priced (§6). The player confirms, or edits and resubmits.
6. **Execute.** The engine resolves the plan node by node (§7.1). The Plan AI narrates the montage up to the end of the plan or the first pause.
7. **On pause:** handled according to the pause type (§7.2), then return to step 1 (or to the huddle or combat, per §7.2). Unexecuted steps stay on the card as a draft.
8. **On objective met** (checked after every node): the encounter resolves. **On plan completion without the objective:** return to step 1. The party starts the next plan from its current position.

---

## 6. Nodes, Risk and Odds

**Nodes are time. The risk budget is pacing. Position is progress. Schedules are time pressure.**

### 6.1 Objective and Progress
- The engine checks the objective (and any alternate objectives) after every node, using node effects (§6.2). Resolution never depends on an LLM recognizing a condition.
- **Progress is positional:** after a pause, the next plan starts from the party's current zones and state. Nothing reverts unless a stated consequence reverts it.
- **Measuring progress:** the card call estimates the world-risk cost of the most plausible **known** route from the plan's end point to the objective (`remaining_estimate`; 0 if the plan reaches the objective). It is labeled on the card as based on what the party knows. Node count measures time only (§10); the risk budget measures pacing only (§6.3).
- **The Plan AI may declare the encounter resolved by other means** (e.g. a negotiated surrender). It must state a reason, and the engine records the resolution.

### 6.2 Nodes
- **One node = one zone traversal or one distinct time-consuming action** (pick a lock, climb a wall, grab an item).
- Restating, describing or elaborating an action doesn't create a node, and neither do conditional instructions within an action.
- **Parallel actions by different characters share a node** (e.g. "Lyra watches the street while I vault the fence" = 1 node).
- Each node costs 1 tick (§10).
- **Effects (mandatory):** every node states what it changes, as engine state: party moves (`actor → zone`), items acquired, and attributes set (e.g. `connection.cage.locked = false`). The engine applies effects as the node completes (§7.1).
- **Tags:** every node carries tags from a fixed list: `violent`, `lethal`, `theft`, `deception`, `loud`, `starts_combat`. Tags drive stance checks (§9.3) and combat pauses (§7.2).
- **Path trace (card call, mandatory, before risks are assigned):** the card call traces the full physical route from the party's current position through canonical state, whether or not the plan mentions each part. The trace lists:
  - every zone passed through and every connection crossed;
  - every known entity present in, or perceiving, each zone at its projected tick;
  - every object, lock, barrier or condition the route requires interacting with.

  Route elements the plan doesn't address are priced as unprepared attempts. The trace is shown on the card, and the player corrects any misrouting before confirming.
- **Plausible unmodeled routes:** if a plan uses a feature not in state (e.g. a coal chute), the card call checks it against **all** fixed facts, known and unknown:
  - **Ruled out by a known fact:** the card names that fact, and the route is not planned.
  - **Not ruled out by any fact:** the feature is added as a state delta and the route plans through it.
  - **Ruled out only by an unknown fact:** no delta is written. The card presents the route exactly as it would an allowed one, with no label or difference in pricing approach, and the card call records a **hidden check** (`hidden_checks`) for the node. The engine resolves it when the party reaches that node (§7.1).
  - Every unmodeled feature carries at least one risk unless it is trivially perceivable, priced the same way whether or not a hidden check exists.

### 6.3 Risk Budget
**The budget is a pacing yardstick, not a quota.** Cards are never padded up to it.

**Risk cost:** each unmitigated risk costs its failure chance (cost = 100 − odds). A 70% roll costs 30; a 90% roll costs 10. 100 ≈ one expected failure.

| Size | Total |
|---|---|
| Minor | 100 |
| Standard | 200 |
| Major | 350 |

Sizes are a guide; the generator's reference route sets the actual `total` (§4.5).

**Definitions:**
- `total`: how much risk the encounter is intended to contain.
- `spent`: how much **world risk** has actually been rolled through on plan cards.
- **Phase** is derived from `spent ÷ total` only. Time never feeds phase; time pressure comes only from schedules.
- **The budget is not progress.** Progress is position and objective state (§6.1) only.
- **"Cap"** refers only to the overtime per-card limit, never to `total`.

**Two kinds of risk:**
- **World risk:** obstacles and dangers on the traced path toward the objective (or toward a chosen optional objective), including improvised risk. Spends budget. Subject to overtime caps.
- **Introduced risk:** risk the plan deliberately creates or seeks out that doesn't serve progress toward an objective (provoking an NPC, gratuitous stunts, off-route detours, taking extra loot not tied to an optional objective). It is **always priced and rolled at full weight regardless of phase**, never capped, carries full consequences, and **never spends budget**.

Because cost equals failure chance, reaching overtime requires absorbing roughly `total ÷ 100` expected failures while pursuing the objective. Nothing else moves phase.

**Ledger. These are the only events that change budget state:**

| Event | `total` | `spent` | `improvised_spent` | `overtime_cards` | `escalations` |
|---|---|---|---|---|---|
| Encounter starts | = generator value | 0 | 0 | 0 | 0 |
| Card priced or projected | — | — | — | — | — |
| Card confirmed while in overtime | — | — | — | +1 | — |
| World-risk roll resolved (success or failure) | — | + cost | + cost, if improvised | — | — |
| Introduced-risk roll resolved | — | — | — | — | — |
| Risk mitigated, automatic, or skipped by a false dependency | — | — | — | — | — |
| Failure, setback | — | — | — | — | — |
| Failure, escalation hits | + extension | — | — | — | +1 |
| Failure, escalation misses (fallback applies) | — | — | — | — | — |
| Near-miss; hidden-entity reveal; discovery | — | — | — | — | — |
| Any Moment AI roll (checks, social, combat) | — | — | — | — | — |
| Any tick (nodes, moments, setbacks) | — | — | — | — | — |

Nothing ever subtracts from any counter. If an escalation raises `total` enough that phase drops back out of overtime, `overtime_cards` does not reset.

**Card pricing sequence (card call):**
1. **Trace** the full path (§6.2).
2. **Price** every world risk found on the path from canonical state, reusing the odds ledger (§6.4).
3. **Mitigate:** risks the plan handles become automatic (cost 0). Each mitigation must name the mechanism doing the handling: an ability, item, state fact, or another node (e.g. "node 1 draws the bouncer's attention"). Careful or detailed wording is not a mechanism.
4. **Improvise (optional):** add plausible risks not yet in state, written as canon deltas. The encounter-wide improvisation allowance is 20% of `total`. A card's improvised cost may not exceed `0.2 × total − improvised_spent`. Improvised risks count against the allowance only when rolled (see ledger). Improvisation may not be used to pad a plan toward budget.
5. **Price introduced risks** and mark them `introduced`.
6. **Set per-risk execution data:** dependencies, failure consequence, and whether failure pauses (§6.5).
7. **Project:** show the plan's net projected world-risk cost, `remaining_estimate`, and **projected finish** = `spent` + projected world-risk cost + `remaining_estimate`, against `total`, plus the current phase. Introduced risk is shown separately and excluded from these figures. A plan projecting a finish well under `total` is the intended reward for good planning.

**Phase**, sent to the Plan AI on every call:

| Phase | spent / total |
|---|---|
| Opening | < 33% |
| Middle | 33–75% |
| Late | 75–100% |
| Overtime | > 100% |

- **In late phase,** the Plan AI favors consolidating world risks. New threats arrive only through escalation or scheduled events.
- **In overtime,** the budget never reaches zero, and pressure toward resolution increases:
  - each new card's total world-risk cost is capped at `total × 0.25 × 0.5^overtime_cards`, using the count before the card is confirmed (25%, 12.5%, 6.25%, …);
  - if a card's world risk exceeds the cap, the Plan AI fits it first by **merging risks into fewer rolls**, and only if that is not enough, by **world changes that justify easier conditions** (a guard leaves, a door is propped open), written as deltas. It never changes the odds of an obstacle whose situation hasn't changed;
  - **floor:** if the traced path contains any genuine danger, the card carries at least one world risk costing ~10 (a ~90% roll), even when that exceeds the cap;
  - introduced risk is unaffected;
  - the Plan AI steers toward resolution, and toward the fail-forward objective if one exists and overtime is deep.

### 6.4 Odds
The card call sets odds for each unmitigated risk by judgment, using these guidance bands, and states a one-line reason per roll.

| Difficulty | Guidance range |
|---|---|
| Trivial | Automatic |
| Easy | 75–90% |
| Medium | 55–75% |
| Hard | 35–55% |
| Very hard | 15–35% |
| Near impossible | 5–15% |

Reasons should name the state facts, plan elements, abilities or conditions that set the odds.

**Odds ledger:** each risk names its `obstacle_id` (the lock, the guard's line of sight, the climb). When a risk on an obstacle is first priced, its odds are written to the ledger. Later cards reuse the stored odds unless a state change justifies new ones, and the reason must cite that change. Mitigation still applies normally; it makes the risk automatic rather than altering its stored odds.

### 6.5 Failure Consequences and Escalation
Each roll lists a failure consequence of one of two kinds:
- **Setback:** damage, lost position, an alerted NPC, a lost resource, a revealed party member, extra time (adds ticks).
- **Escalation:** adds a threat to the world (pursuers, an alarm state, a sealed door) and, when it hits, **raises `total` by a stated extension (typically 30–60)**. Escalations never add mandatory conditions. Every escalation must also list a **fallback setback**.

**Pause flag:** each roll states `pauses_on_failure`.
- **Pauses:** failures that invalidate the rest of the plan: lost position, a revealed party member, an alerted NPC who is on or perceiving the remaining path, or any escalation hit.
- **Continues:** failures that leave the remaining plan valid: damage, a lost consumable, extra time, noise nobody listed hears.

The player may override the flag on the card. An escalation hit always pauses regardless of the flag.

**Escalation chance.** This applies only when a roll whose failure consequence is an escalation fails. It is the probability that the escalation happens; otherwise the fallback setback applies. It depends only on how many escalations have already happened this encounter:
```
escalation_chance = max(0.05, 0.70 × 0.60^escalations)
```
| Escalations so far | 0 | 1 | 2 | 3 | 4 | 5+ |
|---|---|---|---|---|---|---|
| Chance | 70% | 42% | 25% | 15% | 9% | 5% |

- **In overtime,** the chance is halved for world-risk failures (floor 2.5%).
- **Introduced-risk failures** always use the full, unhalved curve.
- There is no cap on the number of escalations. The curve alone makes each one less likely than the last.
- The card shows each escalation with its current chance and its fallback. On failure, the engine rolls: a hit applies the escalation and increments `escalations`; a miss applies the fallback setback. The stated consequences are the only things that happen.

**Setbacks** don't change the budget. Their costs (e.g. re-crossing ground after lost position) are priced naturally on the next card. Extra-time setbacks add ticks immediately.

**Hidden entities** cause pauses on contact (§7.1). They are not escalations and don't spend budget unless a world-risk roll results.

### 6.6 Card Schema
```json
{
  "phase": "opening | middle | late | overtime",
  "budget_total": 200,
  "budget_spent": 60,
  "tick": 6,
  "projected_cost": 85,
  "introduced_risk_shown_separately": [{"node": "n5", "odds": 40}],
  "remaining_estimate": 40,
  "remaining_estimate_basis": "known route",
  "projected_finish": 185,
  "overtime_cap": null,
  "state_deltas": [],
  "trace": [
    {"zone": "string", "connections_crossed": ["ids"], "entities_present_or_perceiving": ["ids"], "interactions_required": ["string"], "addressed_by_plan": true}
  ],
  "nodes": [
    {
      "id": "n3",
      "plan_text": "string",
      "actors": ["ids"],
      "zone": "string",
      "projected_tick": 8,
      "tags": ["theft"],
      "effects": {
        "moves": [{"actor": "id", "to_zone": "id"}],
        "acquires": [{"actor": "id", "item": "id"}],
        "sets": [{"target": "id", "attr": "locked", "value": false}]
      },
      "risks": [
        {
          "description": "string",
          "obstacle_id": "cage_lock",
          "kind": "world | introduced",
          "improvised": false,
          "mitigated": false,
          "mitigation_reason": "string | null (must name a mechanism)",
          "odds": 60,
          "odds_source": "ledger | new | changed",
          "cost": 40,
          "reason": "string",
          "depends_on": [{"target": "cage", "attr": "locked", "value": true}],
          "pauses_on_failure": false,
          "failure": {
            "type": "setback | escalation",
            "consequence": "string",
            "extra_ticks": 1,
            "escalation_effect": "string | null",
            "budget_extension": 40,
            "escalation_chance": 0.42,
            "fallback_setback": "string | null"
          }
        }
      ],
      "assumptions": ["cellar contains only listed entities"]
    }
  ],
  "stances": [{"companion": "id", "stance": {}, "decision": "keep | resolved | override"}],
  "checkpoints": ["after node 4"],
  "engine_internal": {
    "hidden_checks": [{"node_id": "n4", "feature": "coal chute exit", "blocking_fact_id": "fact_7"}]
  }
}
```
`engine_internal` is stripped before the card is displayed and is never sent to any other AI call.

---

## 7. Execution and Pauses

### 7.1 Resolution Per Node
1. **Tick:** the engine advances 1 tick and updates entities on their schedules.
2. **Assumption check:** is there an entity in the node's zone, or able to sense it, that isn't listed on the card (including revealed hidden entities and schedule changes)? If so, set it `known: true` and pause.
3. **Hidden check:** if this node has a recorded hidden check, the blocking fact applies: set it `known: true` and pause (discovery).
4. **Dependency check:** for each risk, compare `depends_on` to current state. If a dependency is false (the door is already unlocked, the observer is gone), the risk becomes automatic and spends no budget. No pause.
5. **Roll** each remaining unmitigated risk: the engine rolls d100 against the odds.
   - **Success:** continue.
   - **Near-miss (success within 10 points of the threshold):** a minor complication is narrated in the montage. It is flavor only: no pause, no budget, never an escalation, and it never writes state. Exception: if the complication would introduce an entity, it is treated as step 2 instead.
   - **Failure:** apply the consequence, resolving escalation per §6.5. Pause if `pauses_on_failure` is true or an escalation hit; otherwise continue.
6. **Effects:** apply the node's effects, unless a pausing failure on this node prevents them (e.g. lost position). Continue-through failures still apply effects.
7. **Objective check:** if the objective or an alternate objective is met, the encounter resolves.
8. **Combat check:** if the node is tagged `starts_combat`, or a consequence starts a fight, pause into combat.
9. **Stance check:** if a kept companion stance's conditional trigger is met (§9.3), pause.
10. **Checkpoint check:** if a player-declared checkpoint is reached, pause.

### 7.2 Pause Types

| Trigger | Next state |
|---|---|
| Failed roll (pausing) | World turn; the consequence is applied |
| Unaccounted entity revealed | Entity set to `known: true`; world turn; the player may open a moment |
| Discovery (hidden check) | Fact set to `known: true`; world turn |
| Combat started | Combat moment (§8.4); then world turn |
| Stance tripped | Huddle |
| Checkpoint | Huddle |

### 7.3 Resume
After a pause is handled, the remaining nodes are shown on the card. The player chooses **Resume** (re-planned from the party's current position and re-priced against the new known state, the odds ledger, and the remaining budget) or **Edit**. No retyping is required.

### 7.4 Execution Output Schema
```json
{
  "narration": "string (includes near-miss complications and continue-through failures)",
  "nodes_completed": ["node ids"],
  "pause": {"type": "failure | entity | discovery | combat | stance | checkpoint", "detail": "string"} | null,
  "state_deltas": []
}
```

The engine resolves the nodes; the Execution call narrates the engine's results. It does not decide outcomes, deviations or stance trips, and characters (including companions) take only the actions on the card.

---

## 8. Moment AI

### 8.1 Scope and Boundary
The Moment AI handles **looking, talking and fighting**: questions, perception/insight/knowledge checks, social moments and combat moments.

**Boundary rule:** any action that moves the party or changes the physical state of the world is a plan node. When the player attempts one in the Moment tab ("I slip behind the bar and go downstairs"), the Moment AI does not resolve it. It returns a redirect, and the engine adds it to the draft card.

In encounters it **never** advances time, adds complications, introduces new threats, or applies consequences for delay. It may not move the scene along.

### 8.2 Perception and Reveals
- **Main call:** the Moment AI receives the engine's **perceivable set** (§4.2) and recent history, not full canonical state.
- **Anything in the perceivable set** may be described freely, at no time cost. Default toward answering.
- **Hidden or out-of-sight things** are revealed only through a successful check:
  1. The main call requests a check (skill, odds, reason).
  2. The engine rolls.
  3. On success, the engine makes a **reveal follow-up call**, passing the details that check can uncover (hidden entities, facts or features within the check's scope). The follow-up narrates what is found and returns `reveals`.
  4. On failure, no follow-up call is made, and the Moment AI narrates that nothing more is found.
- Anything revealed is set `known: true` by the engine and appears on the map.

### 8.3 Checks
- **No Moment AI roll (checks, social, combat) changes risk budget state.** The budget paces plan cards only.
- **Anything requiring an ability, time or risk** becomes a check. The engine rolls, using the §6.4 bands; the Moment AI sets odds and a reason.
- **In encounters,** checks add their tick cost (§10) to `pending_ticks`.
- **In exploration rooms,** checks have no time cost.
- Results are posted to the Moment tab and are visible to the player and both companions.

### 8.4 Social and Combat Moments
- **Social:** the Moment AI plays the NPC from its sheet. Disposition shifts with the exchange. Uncertain attempts (persuade, deceive, intimidate) become checks.
- **Combat:**
  - The engine handles all combat math (attacks, damage, HP, conditions) and determines when combat ends.
  - **Each round is a mini-card.** The player declares actions for the whole party, including commanding companions, sees the odds, the round resolves, then enemies act according to the Moment AI's intent.
  - Companion stances still apply. A companion may refuse a command its kept stance covers.
  - In encounters, the tick cost (§10) is added to `pending_ticks` when combat ends.

### 8.5 Ending a Moment
- A social moment begins when the player addresses an NPC in the Moment tab.
- **A social moment ends** when the player presses **End conversation** or commits a plan. Switching tabs does not end it.
- The Moment AI may signal that an NPC is finishing the exchange (`npc_disengaging: true`), but it cannot end the moment itself.
- **Combat ends** when the engine determines it has ended, or when the player successfully uses **Leave combat** (resolved by the engine as a flee attempt).
- In encounters, a social moment adds its single tick (§10) to `pending_ticks` when it ends.

### 8.6 Moment Writeback
- **Moment AI (all rooms):** writes `reveals` and new physical canon details only.
- **Encounters:** on its next call, the Plan AI receives the moment chat since its own last call and writes the remaining outcomes (dispositions, commitments, combat results) as `state_deltas`. It does not need to infer reveals.
- **Exploration rooms:** the engine runs Scene Writeback over recent moment chat and companion-visible events when any of the following occurs: a consequential event (§8.7), every N exchanges (tunable), or before any room transition or encounter start.

### 8.7 Exploration Exception
In exploration rooms only, the Moment AI may apply **immediate, local, physical consequences of its own checks** (a trap fires, a ledge crumbles, a lock jams). The engine applies any damage or conditions. It still may not introduce new threats or apply consequences for delay. Applying such a consequence triggers Scene Writeback.

### 8.8 Moment Output Schema
```json
{
  "narration": "string",
  "check": {"skill": "string", "odds": 65, "reason": "string"} | null,
  "reveals": ["ids (reveal follow-up call only)"],
  "redirect_to_plan": {"plan_text": "string"} | null,
  "npc_disengaging": false,
  "canon_deltas": [],
  "local_consequence": "string | null (exploration only)",
  "transition_request": "string | null"
}
```

---

## 9. Companion AI

### 9.1 Calls
- Two sequential calls, one per companion. The second call sees the first companion's response.
- **Order:** the companion the player addressed goes first. Otherwise alternate, or put the companion whose data is more relevant to the topic first.
- Either companion may output `pass` (nothing to add).
- **Encounter huddle style:** short, instant-messaging length messages.

### 9.2 Channels
- Every companion prompt starts with the current channel (`group` or `private`). Companions decide what to reveal from their secrets based on the channel.
- Companions aren't aware of the other companion's private chats. That content never appears in their context.

### 9.3 Stances
Companions may say in chat what they will or won't do, and may declare typed stances:
- `refuse`: will not do X.
- `insist`: will do X regardless.
- `conditional`: if a trigger occurs, will refuse or do Y.

Rules:
- **Only the player enters plan content.** Companions never add steps to the card.
- A declared stance is added to the draft card as a **pending stance**. At commit, the player decides each one:
  - **Keep:** the stance applies to this plan; conditional triggers are checked during execution.
  - **Resolved:** the player addressed it in the huddle (persuasion, or a promise recorded as a commitment), and it no longer applies.
  - **Override:** the plan proceeds against the stance. The override is written to `relationship_state`.
- Every stance must trace to that companion's `stance_triggers` data.
- Stances should be infrequent, and refusals are preferred over conditionals. Conditionals remain allowed.
- **Conditional triggers use a fixed, engine-checkable list:** `node_has_tag(tag)`, `entity_revealed(id)`, `actor_hp_below(actor, %)`, `entity_in_zone(id, zone)`, `item_acquired(id)`.
- Kept stances appear on the card. The Plan AI sees stances, never huddle deliberation.
- Kept conditional stances are checked by the engine during execution (§7.1, step 9).

### 9.4 Companion Output Schema
```json
{
  "message": "string | null",
  "pass": false,
  "stance": {"type": "refuse | insist | conditional", "trigger": {"kind": "node_has_tag | entity_revealed | actor_hp_below | entity_in_zone | item_acquired", "args": {}} | null, "action": "string"} | null
}
```

### 9.5 Companions in Execution
The Execution call receives each companion's `reasoning_bias` for **voice and manner only**: how they speak, react and carry themselves in the montage. Companions take only the actions on the card. Any action a companion would take differently must be raised as a stance in the huddle, before commit.

### 9.6 Campfire
- Uses the Companion AI with the top-tier model.
- Writes back `relationship_state` changes, secrets revealed, and commitments.

---

## 10. Time (Encounters Only)

All values are tunable constants. Entity schedules are authored in ticks.

| Event | Tick cost | When applied |
|---|---|---|
| Plan node | 1 | Immediately, during execution |
| Extra-time setback | As stated | Immediately, during execution |
| Combat | 1 on round 2 and every 2 rounds after (rounds 2, 4, 6, …) | Added to `pending_ticks` at combat end |
| Social moment | 1 | Added to `pending_ticks` when the moment ends (§8.5) |
| Check (perception, knowledge, social, etc.) | 1 | Added to `pending_ticks` |
| Question (no check) | 0 | — |
| Huddle, card review | 0 | — |

- **Pending ticks are applied one at a time** at the start of the next Plan AI call. After each tick, the engine advances schedules and checks whether any entity has entered or can now perceive the party's zone. Any such arrival is passed to the world turn to narrate. Nothing jumps multiple positions unchecked.
- The world never changes during a moment.
- On every tick, the engine advances entity schedules and environmental conditions.
- **Ticks never affect phase or the risk budget.** Time matters only through schedules.
- Exploration and campfire rooms have no ticks.

---

## 11. Visibility Matrix

| Viewer | Plan chat | Moment chat | Group huddle | Own private chat | Other companion's private chat |
|---|---|---|---|---|---|
| Plan AI | Recent | Since its last call (full), plus recent | No | — | No |
| Moment AI | Recent | Recent | No | — | No |
| Companion A | Recent | Recent | Yes | Yes | No |
| Companion B | Recent | Recent | Yes | Yes | No |
| Scene Writeback | — | Since last writeback, plus room state | No | — | No |
| Player | All | All | All | All | All |

---

## 12. Context Assembly

**Prompt order for all calls:** static content first (rules, style guide, stable character and companion data, campaign summary), dynamic content last (mutable sheet fields such as HP, conditions and relationship state; state snapshot; recent history; the request). This lets the static prefix be prompt-cached.

**Static prefixes are per actor.** A companion's secrets appear only in that companion's own calls, never in the shared prefix used by the Plan AI, Moment AI or the other companion.

| Call | Receives |
|---|---|
| **Card call** | Campaign summary, the party's current positions, encounter state **filtered to `known: true`** (zones, connections, entities, fixed facts, known schedules), the objective, phase, `risk_budget` (total, spent, improvised allowance remaining, overtime cap), the odds ledger, odds bands, current escalation chance, the committed plan and its decided stances. **For plausibility rulings only,** the full list of fixed facts, flagged as not to be revealed (§6.2) |
| **Execution call** | Campaign summary, full canonical scene state, phase, the confirmed card (without `engine_internal`), engine resolution results, arrivals from pending-tick application, companions' `reasoning_bias` (voice only), moment chat since its last call, recent Plan history |
| **Moment AI, main call (encounter)** | The engine's perceivable set, participants, relevant NPC sheets, recent Plan and Moment history |
| **Moment AI, reveal follow-up** | The check and its result, the details within the check's scope, the perceivable set |
| **Moment AI (exploration)** | The perceivable set, campaign summary, recent history across tabs; reveal follow-ups as above |
| **Scene Writeback** | Room state as of the last writeback, moment chat since then |
| **Companion call** | Channel, own companion data and secrets, positions taken, player-known state, recent Plan and Moment history, a rolling summary of earlier huddle plus recent huddle messages from channels this companion can see |
| **Campfire call** | Companion data, relationship state, commitments, campaign summary, the campfire exchange |

**Huddle compression:** on commit, the huddle up to that point collapses to *the committed plan + decided stances + positions taken + a short summary*, which is kept in companion context. The full transcript stays in the UI.

---

## 13. Writeback

Every output with consequences returns structured `state_deltas`. The engine validates them against state before committing. Writeback sources:
- **Execution call:** narrated consequences, new canon details, and outcomes of moment chat since its last call (dispositions, commitments, combat results).
- **Card call:** canonized plausible routes and features; hidden checks (engine-internal); world changes used to fit the overtime cap.
- **Moment AI:** reveals (from reveal follow-ups), and new physical canon details introduced in narration. In exploration, local consequences of its own checks.
- **Card confirmation:** stance decisions, checkpoints, optional objectives.
- **Engine:** node effects, combat results, tick application, budget spend, overtime-card count, escalation rolls, odds-ledger entries, dependency skips, hidden-check discoveries, objective checks.
- **Huddle:** promises (to commitments).
- **Stance overrides:** to `relationship_state`.
- **Scene Writeback:** exploration room outcomes.
- **Campfire:** relationship changes, revealed secrets, commitments.

Facts that exist only in chat history must not be relied on across calls beyond the ingestion windows above. Anything consequential is written to engine state.

---

## 14. Model Tiering

| Situation | Model |
|---|---|
| Plan AI (both calls) | Top tier |
| Companion AI, campfire | Top tier |
| Moment AI, exploration rooms | Top tier |
| Scene Writeback | Top tier |
| Companion AI, encounter huddle | Cheaper tier |
| Moment AI, encounters (main and reveal follow-up) | Cheaper tier |

---

## 15. Shared Style Guide

All narrating actors share one style guide in their static prompt. Moment AI prose inside encounters stays short and functional. The Plan AI is the primary narrative voice for encounters.
