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
2. **Three separate interfaces.** The single chat with competing demands is split into **Plan** (the committed action and its resolution), **Moment** (questions, checks, conversation, combat) and **Companions** (the huddle, plus the campfire). Each AI does one job with a small, focused prompt. Deliberation in the huddle doesn't move the world.

Together these also give **context economy**: a lot of story per call, each call complete on its own.

---

## Repo map

| Path | What it is |
|---|---|
| `docs/principles.md` | Lessons from Gravenhold, the 8 design principles, and the reflexes to resist |
| `docs/roadmap.md` | Phases, exit tests, and **every open question** with a recommendation |
| `docs/decisions.md` | Settled decisions, cited as D1, D2, …: what, why, and what each rules out |
| `docs/spec/` | The current design: `architecture`, `packet`, `state`, `engine`, `context`, `companions`, `ui`, and one file per AI call in `calls/` |
| `docs/design/encounter-craft.md` | How to design a good encounter, at any scale |
| `fixtures/cells/` | The worked example and the engine's first acceptance test |
| `content/` | Game data: companions, pairs, classes, rules, setting. The source of truth for content. |
| `prompts/` | One prompt per AI call (from Phase 2) |
| `legacy/` | Gravenhold, untouched and playable, with a readable copy and a map of what to reuse |

The design before this layout (specs v3 and v4, the engine brief) is preserved on branch `design-archive` (commit `53a65be`).

## Status

**Phase 1: Contracts.** See `docs/roadmap.md`.
