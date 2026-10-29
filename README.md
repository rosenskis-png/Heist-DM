# Heist-DM

A text RPG run by AI: an AI dungeon master, two AI companions, and the player. This README is the project's compass. Read it before designing or building anything, and especially before proposing a new system.

## Repo map

| Path | What it is |
|---|---|
| `docs/ai-dm-system-spec-v4.md` | **Current spec.** Architecture, calls, context assembly, encounter packet. |
| `docs/ai-dm-system-spec-v3.md` | Previous spec. Kept for history; much of it is superseded (see v4 §12). |
| `docs/engine-requirements.md` | Brief for the engine thread: data, computations, context assembly, non-goals, open decisions, and the Cells acceptance test. |
| `docs/encounter-design.md` | Encounter design principles: what makes an encounter good, time, space, senses and pursuit, a design process, candidate engine quality checks, and a worked example (the Cells, rebuilt as a v4 packet). |
| `legacy/gravenhold.html` | The original one-shot prototype (single-file React). Source of the companion, relationship, campfire and exploration-room systems. Also the best record of what goes wrong. |

---

## The vision

**The game should feel like playing with a great DM and good friends.**

A great DM's magic isn't the rules. It's that they take your idea seriously. You say "what if we go through the coal chute?" and they don't check an answer key. They think about the world for a second and say "...okay, roll Athletics."

- **The world is real enough that cleverness matters.**
- **The DM is fair enough that failure stings.**
- **The DM is on the side of the story,** so failure turns into something interesting rather than a wall or a treadmill.
- **They read the table:** when a plan is brilliant they let it sing, when things drag they push, and when the climax arrives it feels earned.
- **Your friends at the table** have their own ideas, quirks and opinions about what you just did.

Every design decision is judged against that paragraph. If a mechanic makes the game feel more like a spreadsheet, a video-game level or a puzzle with an answer key, it is wrong even if it works.

### The bar, in order

1. **Competence first.** A consistent, logical game: a layout that makes sense and doesn't shift, details that stay put, plans judged on their merits, dice that actually matter, encounters that end. This is the hard part and the current focus.
2. **Greatness second.** Pacing, game feel and taste are built on top of a competent DM. They are not a substitute for it.

---

## What we learned the hard way

Gravenhold proved the **companions work very well**. Everything built around them didn't.

### The failure that defines the project

In Gravenhold's opening cell-block escape, the player proposed a good plan on their first turn: Fern turns into a rat, gets the keys, everyone escapes. It took ten exchanges, zero dice rolls, and ended with the player frozen four steps from the exit, ordered not to move. The companions agreed with the plan, re-negotiated it, added conditions, moved the goalposts, and broke a campaign invariant (the drum) to create a window that wasn't needed.

**Crucially, the DM didn't fail by forgetting. It failed by obeying.** Nearly every symptom traced to an instruction in the prompt: "never announce, let the party work it out", "companions push the scene forward", "never hand him the floor", word-count minimums, solution paths the engine required before accepting "solved", a pacing note that said "add a complication" whenever progress stalled. Each rule fixed a real, worse earlier problem. Together, the only behaviour that satisfied all of them was to stall.

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

## The two breakthroughs (keep these)

1. **The plan card.** The player commits a whole plan; the DM treats it as one logical thread and walks it step by step until something doesn't work. Stakes are stated before the dice, the engine rolls, and the stated consequences are the only things that happen. This also takes the "when does the plan run?" decision away from the DM, which is exactly the decision it stalled on.
2. **Three separate interfaces.** The single chat with competing demands is split into **Plan** (committed action and its resolution), **Moment** (questions, checks, conversation, combat) and **Companions** (the huddle, plus campfire). Each AI does one job with a small, focused prompt. Deliberation in the huddle doesn't move the world.

Together these also give **context economy**: a lot of story per call, each call complete on its own, instead of many small calls each rebuilding a growing world from compressed notes.

---

## Guiding principles

These are expanded in v4 §1. In short:

1. **Structure over instruction.** If a behaviour matters, enforce it through structure (who has authority, what each call can see, what the engine validates), not by adding a prompt rule.
2. **Code computes, AI judges.** Geometry, arithmetic, bookkeeping and objective checks live in the engine. AIs receive *results* ("this route is visible from the grille"), never formulas. Complexity in code is invisible and harmless; complexity in a prompt is what breaks the DM.
3. **Decide, then narrate.** A call returns either structure or prose, never both. Prose is written last, from settled state.
4. **The encounter is the unit of complete knowledge.** Keep encounters small enough that their entire truth goes into every call, word for word. Nothing is summarized inside an encounter.
5. **Structure first, prose second.** The map is built as relationships (what connects, who sees what, which side things operate from, what each room is *for*) before any description is written.
6. **Global judgments become local ones.** The AI never judges "progress" or "solved." It judges each step (possible? what changes? how likely?) and the engine composes the result. Progress is just state.
7. **Everything that happens becomes state.** Effects, failure consequences, NPC reactions, new details: all written into the same structure, so a dice-driven detour is as consistent as the plan.
8. **No improvised twists.** Surprises are placed at generation (hidden things, NPC agendas, schedules) or follow from dice and NPCs acting on their sheets. The AI never invents a surprise on the spot.

### Canon has three layers
- **Structure** (prepared): geometry and perception, fixed before any prose.
- **Texture** (improvised): anything narrated is real once said. The silver candelabra exists because the DM described it, so the player can grab it.
- **Rulings** (made when needed): "can rats drag the keyring?" is judged when the plan arrives, and the ruling becomes canon.

**The map is a floor, not a fence.** It fixes what's there, never what the player can try.

---

## Reflexes to resist

These are the moves AI assistants (including Claude in earlier threads) keep reaching for. Each one sounded good, and each was rejected for a reason.

- **"Add a mechanic to fix it."** The v1–v3 specs grew a risk budget, phases, overtime caps, an escalation curve, an improvisation allowance and an odds ledger, mostly as tools for pacing and game feel. Each was reasonable; together they reproduced Gravenhold's problem one level up. Before adding a mechanic, ask whether it governs *state* (fine, put it in code) or *AI behaviour* (a liability that competes with everything else).
- **"Remove the DM's judgment to make it reliable."** Replacing judgment with lookup tables (a fixed, pre-built world; a single difficulty dial; a "beaten / helped / not addressed" verdict per obstacle) makes the game reliable and lifeless. **The judgment is the product.** The goal is to give judgment better information and clear authority, not to delete it.
- **"Put everything in the world builder."** The more the encounter is pre-simulated (tick schedules for everything, senses, exhaustive contents), the more the game feels like a stealth video game and the less like D&D. Prep situations and purposes, not simulations.
- **"Write a pacing formula."** Pacing tools that prescribe a response ("stalled? add a complication") fail because the same symptom needs opposite cures. Gravenhold's pacing note very likely caused the drumroll. Give the DM *perception* (what the encounter is for, what has actually happened, the player's own words) and let it judge.
- **"Answer key, but flexible."** Any list of intended routes, obvious solutions or expected steps, even labelled "alternatives", drags the DM back toward steering players onto them. Encounters state an objective the engine can check, never routes.
- **"Twists for drama."** AI-invented twists are almost always poorly executed and feel like goalpost-moving. See principle 8.
- **"Summarize to save context."** Every compression loses information for good, and errors compound. Prefer scoping (small encounters), selection (send the relevant slice) and recording facts at the moment they happen.
- **"Fix the symptom you can see."** Before proposing a change, find out *why* the current version exists. Almost every odd rule in Gravenhold and in v1–v3 was fixing something worse. Understand that problem first, or the old failure comes back.

---

## What carries over from Gravenhold

- The companions: profiles, voices, fantasies, depth profiles, secrets, quests.
- Relationship tracks, beats, configurations (the love-triangle states), memories and promises.
- Campfire scenes and private conversations.
- Exploration and social rooms (no cards, no clock).
- Character classes and the style of their abilities: exact, conditional and limited. Abilities are the main way a plan handles a risk.

Companions act like fellow players: opinions, reasoning, disagreement, in-character values. They **never** hold the plan hostage, gatekeep, invent conditions or take actions that aren't on the card. If one won't do something, it becomes a stance the player rules on.

---

## Current status and next steps

- **Spec:** v4 is current. Its open questions are in v4 §13.
- **Next:** the encounter designer (generator). A consistent map can still be a bad map, and the map now carries most of the load. A good encounter needs structure written as relationships, a purpose for every zone, plenty of usable things, people with wants and reactions, more than one way through (never written down as solutions), and fixed facts.
- **Not yet decided:** how relationship scoring gets input during encounters, how betrayals and other companion-driven events become engine events, and what the campaign layer carries between encounters.
