# AI DM System — Specification (v4)

Supersedes v1–v3. Companion characters, relationship tracks, campfire scenes and exploration rooms carry over from Gravenhold unless this document changes them.

---

## 0. Vision

The game should feel like playing with a great DM and good friends.

A great DM takes your idea seriously. You say "what if we go through the coal chute?" and they don't check an answer key. They think about the world for a second and say "...okay, roll Athletics." The world is real enough that cleverness matters, and the DM is fair enough that failure stings. The DM is on the side of the story, so failure turns into something interesting rather than a wall or a treadmill. When a plan is brilliant, the DM lets it sing. Your friends at the table have their own ideas, quirks and opinions about what you just did.

The bar this spec targets first is **competence**: a consistent, logical game with a layout that makes sense, details that stay put, plans judged on their merits, and dice that matter. Greatness is built on top of that.

---

## 1. Design principles

These are the rules for writing the rest of this spec, and for changing it later.

1. **Structure over instruction.** A rule written into a prompt competes with every other rule in that prompt. Gravenhold's stalls came from rules that were each right and jointly wrong. Where a behaviour matters, enforce it with structure: who holds authority, what each call can see, and what the engine validates. Prompts hold judgments, never rules about rules.
2. **Code computes, AI judges.** Arithmetic, geometry, bookkeeping and objective checks live in the engine. An AI receives their *results* as facts, never their formulas.
3. **Decide, then narrate.** A call either returns structure (decisions, state changes) or prose (narration), never both. Narration is written last, from settled state, so prose never invents state.
4. **The encounter is the unit of complete knowledge.** An encounter is small enough that its entire truth goes into every call, word for word. Nothing is summarized inside an encounter. Only state, a one-line log entry, memories and commitments cross between encounters.
5. **Structure first, prose second.** The map is built as relationships before any description is written. Descriptions are written from the map.
6. **Global judgments become local ones.** The AI never judges "progress" or "solved." It judges each step locally (possible? what changes? how likely?) and the engine composes the result.
7. **Everything that happens becomes state.** Effects, failure consequences, NPC reactions and new details are all written as changes to the same structure, so a situation pushed off-plan by dice is as consistent as one that went to plan.
8. **No improvised twists.** The AI never invents a mid-encounter surprise. Everything the player didn't see coming was placed at generation (hidden things, NPC agendas, schedules) or follows from dice consequences and NPCs acting on their sheets. "Unexpected" means the player didn't know it, never that the DM made it up on the spot.

---

## 2. Architecture

| Actor | Calls | Job |
|---|---|---|
| **Engine** | — | Owns all state; does geometry, dice, ticks, schedules, validation, objective checks, the event log and the table read |
| **Generator** | Once per encounter (+ validation retry) | Builds the encounter packet (§3) |
| **Plan AI** | Step call, Pricing call, World call, Narration call | Turns committed plans into resolvable steps; prices them; plays the world's response; narrates |
| **Moment AI** | One call per exchange; one per combat round | Answers questions, runs checks, plays NPCs, runs combat; redirects actions to the draft card |
| **Companion AI** | One call per companion per message | Voices each companion in huddle and campfire |

Plan-side calls are split into several smaller sequential calls (decide → validate → narrate). The player expects a wait when committing a plan, so the extra latency is acceptable there. Moment and huddle calls stay single and fast because they are conversational.

---

## 3. The encounter packet (fixed for the encounter)

Built by the generator, validated by the engine, cached for the whole encounter.

### 3.1 Intent
- **Objective:** a condition the engine can check (`party_all_in: [zone_E]`, `item_held: idol`). Optional alternate objectives, including one fail-forward ending.
- **Purpose:** what this encounter is for, in one or two concrete sentences.
- **Expected length:** in plans committed (e.g. 1–2, 3–5).
- **No routes.** The intent never lists solutions, obvious or alternative. The generator may privately verify that at least one route exists; that route is never stored or sent.

### 3.2 People
One sheet per NPC: `wants`, `fears`, `knows`, `will_never`, temper and how they react under pressure, `disposition`, position, and `schedule` if any. NPC reactions on world turns come from these sheets.

### 3.3 Map
Expressed as **relationships**, not coordinates. The engine renders the drawing from it.
- **Zones:** id, short description, and a **purpose line** (why it exists and how it's used, e.g. "where the jailers eat, dice and sleep in shifts; the drain runs to the midden"). Purpose is what keeps improvised detail consistent.
- **Connections:** what links zones (door, bars, grate, stairs), with attributes (`locked`, `open`, `see_through`, `climb`), **which side each thing operates from**, and whether it can be reached from the other side.
- **Sightlines and hearing:** which zones can be seen or heard from which, and by whom.
- **Usable things:** objects with obvious uses, light sources, hazards, loose items.
- **Fixed facts:** physical facts that rule things out, including load-bearing material facts ("the hinges of cell 1 are rotten and give way under a heavy impact").
- **Hidden things:** marked hidden; included for the AI, never shown to the player until revealed.

**Generator checklist (validated by the engine):** every barrier states how it is operated and from which side; every observer states what it can see and hear; every zone has a purpose; every id referenced exists. A packet that fails the checklist is regenerated.

### 3.4 Opening description
Written from the map after the map is final. Stored word for word and sent with every call in the encounter.

### 3.5 Invariants (campaign level, not per encounter)
A short list of world facts that never change (e.g. "the drum beneath the fortress keeps the same slow beat; it is the Hollow King's heartbeat"). Sent to every call.

---

## 4. Live encounter state (changes, bounded by the encounter)

- **State:** positions, connection and alarm flags, NPC dispositions and positions, items, the tick, objective status ("in the archway: 0 of 3").
- **Canon added:** texture introduced after the opening (anything narrated is real once said) and **rulings** ("rats can drag the ring, slowly, and it scrapes"; "Wild Shape ends when the party leaves the cell block"). Append-only. Later calls may not contradict them.
- **Event log:** one line per resolved card, roll, fight or conversation. Written by the engine from structured results; the only AI-written lines are the Moment AI's "learned" facts.
- **Table read:** plans committed vs expected length, roll outcomes and any streak, consequences landed, and the player's last 2–3 messages word for word. Facts only, no verdicts. Sent to the Plan AI's world call only.
- **Draft card:** steps the player has added or the Moment AI has redirected, plus pending companion stances.

Within an encounter, raw transcripts are kept but only the last few messages of the relevant channel go into prompts. Anything consequential is already in state, canon or the event log.

---

## 5. Encounter loop

1. **World turn.** The engine applies pending ticks and schedules. The Plan AI's world call decides NPC reactions and arrivals (§6.3); the narration call describes the situation.
2. **Huddle** (time paused). The player talks with companions. Stances go onto the draft card as pending.
3. **Moments** (optional). Questions, checks, conversations, fights (§7). Actions are redirected to the draft card.
4. **Commit.** The player submits the plan and decides each pending stance (keep / resolved / override). Only the player writes plan content.
5. **Card** (§6.1–6.2). Steps, engine validation, pricing. The player confirms or edits.
6. **Execute.** The engine resolves step by step (§6.4). Narration covers everything up to the end of the plan or the first stop.
7. **Stop or finish.** On a stop, return to step 1. The engine checks the objective after every step; when it is met, the encounter ends.

---

## 6. Plan AI

### 6.1 Step call
**Job:** turn the plan into steps. No odds.
- One step = one zone traversal or one distinct time-consuming action. Parallel actions by different characters share a step. Restating or elaborating creates no step.
- Each step lists actors, zone, and **effects** as state changes (moves, items, flags).
- Each step is tagged from a fixed list: `violent`, `lethal`, `theft`, `deception`, `loud`, `starts_combat`.
- If the plan uses a feature not in the map (a coal chute), the step call rules on it against the full map: ruled out by a known fact (name it); allowed (added to canon); or ruled out only by a hidden fact (proceeds normally, and the engine records an internal check that reveals the fact when the party reaches that step).

**Engine validation between calls:** every move follows a connection; every id is real. The engine then computes, for each step, the route, the observers who can see or hear it at that tick, and the barriers crossed, and attaches these as facts. Errors go back for one retry.

### 6.2 Pricing call
**Job:** local judgments on the validated steps, with the engine's route and observer facts in hand.
- For each uncertainty on each step (every observer, barrier and hazard the engine listed, whether or not the plan addressed it): is it handled by a named mechanism (an ability, item, fact or another step)? If so, it's automatic. Careful wording isn't a mechanism.
- Otherwise: odds from the bands below, a one-line reason naming the facts that set them, and a **failure consequence written as state changes**, marked `stops_plan` if it invalidates the rest.
- New rulings made along the way are returned for canon.

| Difficulty | Odds |
|---|---|
| Trivial | Automatic |
| Easy | 75–90% |
| Medium | 55–75% |
| Hard | 35–55% |
| Very hard | 15–35% |
| Near impossible | 5–15% |

The engine checks the priced card against its observer list. An uncertainty with no risk and no mitigation is sent back.

**Card shown to the player:** steps, what each changes, each risk's odds and reason, and what failure costs. Internal checks are never shown.

### 6.3 World call
**Job:** decide how the world responds. Structure only, no prose.
- Receives: the resolution results, current state, people, intent and table read.
- Returns NPC actions and reactions as state changes (moves, disposition shifts, a fight starting, an alarm raised). Each must follow from an NPC's sheet and from what just happened. No new entities or threats beyond those placed in the packet (principle 8).
- This is where pacing judgment lives: the intent and the table read tell it how the encounter has gone against what it was for.

### 6.4 Execution (engine)
Per step: tick and advance schedules; check for unlisted observers (reveal and stop); check internal checks (reveal and stop); skip risks whose conditions no longer hold; roll the rest; apply consequences; apply effects; check the objective; check `starts_combat`, kept stances and player checkpoints.

### 6.5 Narration call
**Job:** prose only. Receives the settled results of execution and the world call and narrates them: the montage, any stop, the world's response. It may add texture (returned as canon), never state.

---

## 7. Moment AI

- **Sees** the full encounter packet, including hidden things marked hidden, plus state, canon, the event log and the current conversation. Seeing hidden things prevents contradictions (describing a wall as solid when there's a secret door behind it).
- **Searching a specific spot always rolls**, whether or not anything is there, so a roll is never a tell.
- **Checks in one call:** returns the check (skill, odds, reason) with both the success and the failure narration; the engine shows the one that matches the roll.
- **Plays NPCs** from their sheets. Uncertain persuasion, deception or intimidation becomes a check.
- **Redirects** any action that moves the party or changes the world to the draft card.
- **Never** advances time, applies consequences for delay, or introduces threats.
- **Returns each turn, when relevant:** facts the party just learned (one line each), disposition shifts, promises made, new texture.
- **Combat:** one call per round. It narrates the last round's engine results, sets each enemy's intent for this round from its sheet, and gives odds for any unusual action the player declared. The engine does all the math and decides when combat ends. The player commands the whole party; kept stances still apply.

---

## 8. Companion AI

- **Sees** what a player at the table would see: the known map, the opening description, canon and rulings, the event log, the draft card and pending stances, plus her own profile, secrets, relationship state and memories, and the channel. The second companion's call also sees the first companion's reply.
- **Never sees** hidden facts, the intent, NPC sheets beyond what's been learned, or the other companion's private channel and secrets.
- **Returns** a message or a pass, an optional stance (traced to her stance triggers), and an optional one-line reaction to something that just happened. The engine turns reactions into relationship changes within caps; this is how the romance tracks get input during encounters.
- **Private channel:** only the addressed companion is called.
- **Stances:** refuse, insist or conditional, with conditional triggers from a fixed engine-checkable list. Only the player writes plan content. Companions take only the actions on the card.
- **Campfire** (top-tier model): full profile, relationship state, memories, commitments, the campaign log and the last encounter's event log. Returns messages plus relationship changes, memories, revealed secrets and commitments.

---

## 9. Context assembly

### 9.1 Blocks and caching

| Tier | Blocks | Cached |
|---|---|---|
| Campaign | Role rules, style guide, worked examples, invariants, character sheets (stable part), companion profile (companion calls) | For the session |
| Encounter | Intent, people, map, opening description | For the encounter |
| Live | State, canon added, event log, table read, draft card, recent raw exchanges, the request | No |

Prompts are ordered campaign → encounter → live, so the cached prefix is as long as possible.

### 9.2 Who gets what

| Block | Step | Pricing | World | Narration | Moment | Companion |
|---|---|---|---|---|---|---|
| Character sheets | full | full | condition | voice notes | full | own full; others' known abilities |
| Intent | ✓ | ✓ | ✓ | ✓ | — | — |
| People | ✓ | ✓ | ✓ | ✓ | ✓ | learned only |
| Map | full | full | full | full | full, hidden marked | known only |
| Opening description | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| State, canon, event log | full | full | full | full | full | known only |
| Engine route/observer facts | — | ✓ | — | — | — | — |
| Table read | — | — | ✓ | — | — | — |
| Card | plan + decided stances | validated steps | results | results + world actions | draft | draft + pending stances |
| Recent raw exchanges | few | — | — | few | current conversation | visible huddle this encounter |
| Huddle content | — | — | — | — | — | own channels |
| Companion secrets / relationships | — | — | — | — | — | own only |

### 9.3 Token cost
High-frequency calls (moment, huddle) are mostly cached prefix. Cache reads cost a fraction of normal input, so the live portion (a few thousand tokens) is what each exchange really pays for. Huddle replies are kept short (messaging length), and private-channel messages call only one companion. Gravenhold called its model with caching off; caching must be on.

---

## 10. Time

Ticks exist only in encounters. Schedules are authored in ticks at generation.

| Event | Ticks |
|---|---|
| Plan step | 1 |
| Extra-time consequence | as stated |
| Check | 1 (added to pending) |
| Conversation | 1 when it ends |
| Combat | 1 on rounds 2, 4, 6, … |
| Question, huddle, card review | 0 |

Pending ticks are applied one at a time at the next world turn, checking for arrivals after each.

---

## 11. Writeback sources

| Source | Writes |
|---|---|
| Step call | Effects, tags, canon features, internal checks |
| Pricing call | Odds, consequences, rulings |
| World call | NPC actions and reactions |
| Narration call | Texture (canon) |
| Moment AI | Learned facts, dispositions, promises, texture, check results |
| Companion AI | Stances, reactions |
| Card confirmation | Stance decisions, checkpoints |
| Engine | Ticks, schedules, rolls, consequences applied, effects, objective status, event log, table read |
| Campfire | Relationship changes, memories, secrets, commitments |

The engine validates every write against the map and state before committing it.

---

## 12. Removed from v3

The risk budget, phases, overtime caps and floor, the escalation curve and budget extensions, the improvisation allowance, world vs introduced risk, the odds ledger as a separate structure (rulings and canon cover it), per-risk pause flags (replaced by `stops_plan` on consequences), the reference route as a sizing tool, and the reveal follow-up call. Pacing and difficulty now come from the intent, the table read and worked examples, judged by the World and Pricing calls.

---

## 13. Open questions

1. **Map generation quality.** How the generator reliably produces dense, purposeful, multi-route maps, and how the engine checks quality beyond the consistency checklist. Next thread.
2. **Pacing and game feel.** Whether intent + table read + worked examples are enough for the World and Pricing calls to pace well and price fairly. Needs playtesting before adding anything.
3. **Encounter size ceiling.** How large an encounter's full truth can get before it needs splitting into two encounters at a doorway.
4. **Relationship scoring.** Tuning the caps on companion reactions; mapping each companion's values to node tags.
5. **Betrayal and other companion-driven events.** These must become engine events placed at generation or decided in advance, since companions only act on the card.
6. **Campaign layer.** What carries between encounters beyond state, memories and commitments (alert level, the ritual clock, act structure).
7. **Exploration rooms.** Confirm they use the same packet format (map, purpose, people, opening) without cards or ticks.
