# Principles

Read this before designing anything, and especially before proposing a new system. Every principle here answers a specific Gravenhold failure. Before changing one, find out which failure it prevents.

---

## What we learned the hard way

Gravenhold proved the **companions work very well**. Everything built around them didn't.

### The failure that defines the project

In Gravenhold's opening cell-block escape, the player proposed a good plan on their first turn: Fern turns into a rat, gets the keys, everyone escapes. It took ten exchanges and zero dice rolls, and ended with the player frozen four steps from the exit, ordered not to move. The companions agreed with the plan, re-negotiated it, added conditions, moved the goalposts, and broke a campaign invariant (the drum) to create a window that wasn't needed.

**The DM didn't fail by forgetting. It failed by obeying.** Nearly every symptom traced back to an instruction in the prompt:
- "never announce, let the party work it out";
- "companions push the scene forward";
- "never hand him the floor";
- word-count minimums;
- solution paths the engine required before it accepted "solved";
- a pacing note that said "add a complication" whenever progress stalled.

Each rule fixed a real, worse earlier problem. Together, the only behaviour that satisfied all of them was to stall.

**Lesson: rules in a prompt compete.** An LLM weighs every instruction against every other. Past a point, adding a rule to fix a symptom just moves the symptom somewhere else. When fixes start needing fixes (a referee AI supervising the DM, rules correcting rules), prompt iteration has hit its ceiling.

### Other root causes

| Symptom | Root cause |
|---|---|
| Threats never followed through ("the goblin is *about* to leave...") | The AI's words don't bind its future self; each turn renegotiates. |
| Endless complication spirals | Complications came from nowhere and added homework (new sub-steps) instead of changing the situation. |
| Valid creative plans not recognized | The DM judged against a prescribed solution, sentence by sentence. |
| World moving on every message | Player deliberation happened in-world. |
| Vague, shifting layout | The prose *was* the layout. The map was a side output in coordinates the model couldn't reason with, and the room description scrolled out of context. |
| Lost details, drift | Memory lived in chat, compressed again and again into summaries. |

---

## The design principles

1. **Structure over instruction.** A rule written into a prompt competes with every other rule in that prompt. Where a behaviour matters, enforce it with structure: who holds authority, what each call can see, and what the engine validates. Prompts hold judgments, never rules about rules.
2. **Code computes, AI judges.** Arithmetic, geometry, bookkeeping and objective checks live in the engine. An AI receives their *results* as facts ("this route is visible from the grille"), never their formulas. Complexity in code is invisible and harmless; complexity in a prompt is what breaks the DM.
3. **Decide, then narrate.** A call returns either structure (decisions, state changes) or prose (narration), never both. Narration is written last, from settled state, so prose never invents state.
4. **The encounter is the unit of complete knowledge.** An encounter is small enough that its entire truth goes into every call, word for word. Nothing is summarized inside an encounter. Only state, a one-line log entry, memories and commitments cross between encounters.
5. **Structure first, prose second.** The map is built as structure before any description is written: its exact layout, what connects, who sees what, which side things are operated from, and what each zone is *for*. Descriptions are written from the map. Coordinates are for the engine and the UI; the AIs receive relationships and derived facts (sizes, distances), never coordinates.
6. **Global judgments become local ones.** The AI never judges "progress" or "solved." It judges each step locally (possible? what changes? how likely?) and the engine composes the result. Progress is just state.
7. **Everything that happens becomes state.** Effects, failure consequences, NPC reactions and new details are all written as changes to the same structure, so a situation pushed off-plan by dice is as consistent as one that went to plan.
8. **No improvised twists.** The AI never invents a mid-encounter surprise. Everything the player didn't see coming was placed at generation (hidden things, NPC agendas, schedules) or follows from dice consequences and NPCs acting on their sheets. "Unexpected" means the player didn't know it, never that the DM made it up on the spot.

### Canon has three layers
- **Structure** (prepared): layout, geometry and perception, fixed before any prose.
- **Texture** (improvised): anything narrated is real once said. The silver candelabra exists because the DM described it, so the player can grab it.
- **Rulings** (made when needed): "can rats drag the keyring?" is judged when the plan arrives, and the ruling becomes canon.

**The map is a floor, not a fence.** It fixes what's there, never what the player can try.

---

## Reflexes to resist

These are the moves AI assistants (including Claude in earlier threads) keep reaching for. Each one sounded good, and each was rejected for a reason.

- **"Add a mechanic to fix it."** The v1–v3 specs grew a risk budget, phases, overtime caps, an escalation curve, an improvisation allowance and an odds ledger, mostly as tools for pacing and game feel. Each was reasonable; together they reproduced Gravenhold's problem one level up. Before adding a mechanic, ask whether it governs *state* (fine, put it in code) or *AI behaviour* (a liability that competes with everything else).
- **"Remove the DM's judgment to make it reliable."** Replacing judgment with lookup tables (a fixed, pre-built world; a single difficulty dial; a "beaten / helped / not addressed" verdict per obstacle) makes the game reliable and lifeless. **The judgment is the product.** The goal is to give judgment better information and clear authority, not to delete it.
- **"Put everything in the world builder."** The more the encounter is pre-simulated (tick schedules for everything, senses for every creature, exhaustive contents), the more the game feels like a stealth video game and the less like D&D. Prepare situations and purposes, not simulations. An exact layout is not a simulation: it fixes where things are, not what happens.
- **"Write a pacing formula."** Pacing tools that prescribe a response ("stalled? add a complication") fail because the same symptom needs opposite cures. Gravenhold's pacing note very likely caused the drumroll. Give the DM *perception* (what the encounter is for, what has actually happened, the player's own words) and let it judge.
- **"Answer key, but flexible."** Any list of intended routes, obvious solutions or expected steps, even labelled "alternatives", drags the DM back toward steering players onto them. Encounters state an objective the engine can check, never routes.
- **"Twists for drama."** AI-invented twists are almost always poorly executed and feel like goalpost-moving. See principle 8.
- **"Summarize to save context."** Every compression loses information for good, and errors compound. Prefer scoping (small encounters), selection (send the relevant slice) and recording facts at the moment they happen.
- **"Fix the symptom you can see."** Before proposing a change, find out *why* the current version exists. Almost every odd rule in Gravenhold and in v1–v3 was fixing something worse. Understand that problem first, or the old failure comes back.
