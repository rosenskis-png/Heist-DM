# Heist-DM

A text RPG run by AI: an AI dungeon master, two AI companions, and the player. It's a new game built from **Gravenhold**, the prototype that proved the companions (`legacy/`), with gameplay redesigned around what went wrong there.

This README is the project's compass. Read it, then `docs/principles.md`, before designing or building anything.

---

## The vision

The game has two pillars (D23).

**Companions worth caring about.** Each companion is a full character, in the tradition of the great RPG companion romances: her own fantasy, voice, secrets and depths, and a relationship that grows or sours with what you do. Gravenhold proved this works. The new game must not lose it.

**A great DM.** The game should feel like playing with a great DM and good friends. A great DM's magic isn't the rules. It's that they take your idea seriously. You say "what if we go through the coal chute?" and they don't check an answer key. They think about the world for a second and say "...okay, roll Athletics."

- **The world is real enough that cleverness matters.**
- **The DM is fair enough that failure stings.**
- **The DM is on the side of the story,** so failure turns into something interesting rather than a wall or a treadmill.
- **They read the table:** when a plan is brilliant they let it sing, when things drag they push, and when the climax arrives it feels earned.
- **Your friends at the table** have their own ideas, quirks and opinions about what you just did.

Every design decision is judged against these. If a mechanic makes the game feel more like a spreadsheet, a video-game level or a puzzle with an answer key, it is wrong even if it works.

### The bar, in order
1. **Competence first.** A consistent, logical game: a layout that makes sense and doesn't shift, details that stay put, plans judged on their merits, dice that actually matter, encounters that end. This is the hard part and the current focus.
2. **Greatness second.** Pacing, game feel and taste are built on top of a competent DM. They are not a substitute for it.

---

## Why it's built this way

In Gravenhold's opening cell-block escape, a good first-turn plan took ten exchanges and zero dice rolls, and ended with the player frozen four steps from the exit. **The DM didn't fail by forgetting. It failed by obeying:** each rule in its prompt fixed a real problem, but rules in a prompt compete, and the only behaviour that satisfied all of them was to stall. The full story, the root causes and the design principles are in `docs/principles.md`.

**The two breakthroughs (keep these):**
1. **The plan card.** The player commits a whole plan, and the DM walks it step by step until something doesn't work. Stakes are stated before the dice, the engine rolls, and the stated consequences are the only things that happen. This takes the "when does the plan run?" decision away from the DM, which is exactly the decision it stalled on.
2. **Talk apart from commitment.** The single chat with competing demands is split into **the table** (questions, talk, quick actions and the companions over the rings) and **Plans** (the committed plan and its resolution), plus the campfire. Code decides which AI calls a message runs, from who it's for, so each call does one job with a small, focused prompt (D127). Talk over the rings doesn't move the world.

Together these also give **context economy**: a lot of story per call, each call complete on its own.

---

## Repo map

| Path | What it is |
|---|---|
| `docs/principles.md` | Lessons from Gravenhold, the 8 design principles, and the reflexes to resist |
| `docs/roadmap.md` | Phases, exit tests, and **every open question** with a recommendation |
| `docs/decisions.md` | Settled decisions, cited as D1, D2, …: what, why, and what each rules out |
| `docs/spec/` | The current design: `architecture`, `campaign`, `packet`, `state`, `engine`, `generation`, `context`, `companions`, `ui`, and one file per AI call in `calls/` |
| `schemas/` | The contracts as JSON Schema: the packet, the card, results, the condition language and operations, and one file per AI call in `calls/` (D32) |
| `src/` | Code: the engine (`src/engine/`, D60), the campaign layer (`src/campaign/`: the roster and the relationship model), context assembly (`src/context.js`), one module per AI call (`src/calls/`), the game loop and what the page shows (`src/game/`), and the contract validator |
| `app/` | The game page: an artifact drawing `src/game/` (https://claude.ai/artifact/Nq4W2TAcHNEjFGJcpdHyDp) |
| `test/` | `node --test` suites |
| `docs/design/encounter-craft.md` | How to design a good room, rethought for the DM era (D152); its sources in `docs/design/references/` |
| `docs/design/companion-craft.md` | How to play the companions: tone, the romance floor, fellow-player behaviour |
| `fixtures/cells/` | The Cells worked example, and a recorded card and account for the rat plan |
| `content/` | Game data: companions, pairs, classes, rules, the rules every world shares (`setting.js`), the worlds (`worlds/`, Gravenhold first), the questions a pitch answers (`pitch.js`), the relationship model's numbers, and the encounter packets (`content/encounters/`). The source of truth for content. |
| `prompts/` | One prompt per AI call, plus the shared style guide |
| `bench/` | The judgment test bench: an artifact page that runs the companion and campfire prompts on hand-written cases, plus Camp, free play with any two companions |
| `bench/forge.html` | The Forge: the designer's bench for the generator. A campaign from a vibe (the world as the DM sees it, the pitch as the player reads it), then rooms in it by kind, pinned seed and brief, every stage shown (D154) |
| `fixtures/bench/` | The bench's huddle and campfire cases |
| `legacy/` | Gravenhold, untouched and playable, with a readable copy and a map of what to reuse |

The design before this layout (specs v3 and v4, the engine brief) is preserved on branch `design-archive` (commit `53a65be`).

## Status

**Phases 4 and 5 are done** (D115): the Cells is playable with the DM ruling and the engine keeping the books (D125), and the companions are ported, two of them chosen by the player (D126). **Phase 7: The generator** is the current phase, and Act 1 will be generated rather than written by hand (`docs/spec/generation.md`, D115–D124). Combat is decided (a fight is a plan, and the party always moves on: D130, D131), so the table (D127) is the next build. See `docs/roadmap.md`.
