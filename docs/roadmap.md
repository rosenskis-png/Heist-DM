# Roadmap

Phases in order, each with an exit test. **Open questions live only here**, in the phase that has to answer them, each with a recommendation. When one is settled, it moves to `docs/decisions.md` and the spec is updated in the same commit.

**Current phase: 1 (Contracts),** built and awaiting the designer's review.

---

## Phase 0: Restructure (no game code)

- [x] Preserve the old layout on branch `design-archive` (commit `53a65be`).
- [x] Move every fact to a single home: `docs/principles.md`, `docs/decisions.md`, `docs/spec/`, `docs/design/`, `fixtures/`, `content/`.
- [x] Fix inconsistencies in the Cells walkthrough: Card 1's timing (D16) and the horn vs. war drum mix-up.
- [x] Extract the content into `content/` and verify it against the original (D6).
- [x] Add a readable copy of Gravenhold's code and a map of it in `legacy/README.md`.
- [x] **Runtime check** (D12): a multi-file artifact loads ES modules and data files, and `sample.json` works. All four rows passed on the check page (https://claude.ai/artifact/NagBL673dCymHK5NLdZkBM).

**Exit:** every fact has one home; nothing in `docs/` contradicts `docs/spec/`; content matches the original.

## Phase 1: Contracts

Write down what each part promises, precisely enough to build against.

- [x] An output schema and validation rules for each of the 8 calls: `schemas/calls/`, linked from `docs/spec/calls/` (D32).
- [x] The condition language and the state-change operations: `schemas/defs.js`, `docs/spec/engine.md` §8–9.
- [x] The schedule, meter and reaction formats: `schemas/packet.js`, `docs/spec/packet.md` §4.
- [x] The geometry format (D28).
- [x] The Cells packet as data: `fixtures/cells/packet.json`, with both cards and card 2's expected results.

**Exit:** the Cells packet, both of its cards and its expected results can be written without free-text escape hatches, except in the fields meant for judgment. Checked by `node --test` (`test/contracts.test.js`).

## Phase 2: Judgment test bench (an artifact)

A bare artifact page that takes a hand-written packet and hand-computed engine facts, and runs the real step, pricing and world calls, plus a Fern and Lyra huddle, through `sample`. The designer runs it and gives feedback; the page shows each call's input and output on screen.

**Exit:**
- The Cells tests in `fixtures/cells/walkthrough.md` pass in 5 of 5 runs: a card on turn one; Card 1 priced as the party expects, with nothing the party doesn't foresee leaking into its bands or reasons; Card 2 about two Easy rolls, with the player's timing kept and none added.
- Three plans the docs never mention (the bench-nail lockpick, bending the bars, bribing Snag through Brannoc) get fair prices.
- Fern and Lyra read like Gravenhold's companions. Shown the same flawed plan ten times, each catches its holes some of the time, the ones her `planning` block predicts more often (D38, D40), and her three candidates are genuinely different takes.
- Model tiers are chosen (D15).

**Open questions**
1. **Companion baseline.** *Recommendation:* judge them against their profiles in `content/`. If the designer can export 2–3 Gravenhold transcripts with strong companion scenes, they make a better baseline.
2. **Prompt shape.** *Recommendation:* one `prompts/<call>.md` per call: the role, the judgment it owns, a style guide shared across calls, and worked examples tagged by act. No rules about rules. Phase 2 is where these get written and tested.

## Phase 3: Engine core (Node)

Pure ES modules tested with `node --test`, with a seeded random number generator. Validation against the contracts already exists (`src/validate.js`); the engine adds the consistency checks in `docs/spec/packet.md` and everything in `docs/spec/engine.md`.

**Exit:** `fixtures/cells/acceptance.md` passes in full, and replaying a recorded log reproduces state exactly.

## Phase 4: The Cells, playable

The three interfaces, the card, the map (D9), saves (D11), and Fern and Lyra.

**Exit:**
- The rat plan gets the party out of their cells by exchange 4.
- Across 5 playtests: no stalls, a median of 2 card edits or fewer, and no interruption that a playtester calls unfair (D36).
- The map matches the walkthrough's layout exactly.

**Open questions**
1. **Pacing and game feel.** Are the intent, the table read and worked examples enough for the world and pricing calls to pace well and price fairly? *Recommendation:* add nothing until a playtest shows a specific failure, then find its cause before changing anything.
2. **Map renderer.** *Recommendation:* SVG drawn from geometry. Unknown zones are not drawn, and an exit to an unknown zone shows as a labelled gap. The clock is always visible next to it.
3. **Layout on a phone.** *Recommendation:* Plan, Moment and Companions as tabs, with an unread marker on each. The card opens as a sheet over the Plan tab.

## Phase 5: Companions ported

All 8 companions, the relationship model, configurations, the campfire, and the special cases as declared data (D8). Every remaining ability gets its `declared` block (D30).

**Exit:** a campfire scene and relationship changes behave like Gravenhold's, and adding or removing a companion takes one file and one registry line.

**Open questions**
1. **Shapes for the special cases.** *Recommendation:* see the table in `docs/spec/companions.md`.
2. **Caps on relationship changes.** *Recommendation:* start from Gravenhold's caps (per-turn changes clamped; heat and intimacy gains capped at +4 per encounter) and tune after playtests.
3. **Companion-driven events** (personal quests). *Recommendation:* each quest is placed in a packet at generation, as hidden things and an optional objective. The companion knows about it through her own data. Nothing fires unless it was placed.
4. **Pairs with no written dynamic.** *Recommendation:* the pair starts at 0. Each companion's call already sees the other's public profile (name, role, blurb, voice) and judges the dynamic from her own beliefs, admires and despises.

## Phase 6: Act 1, hand-authored

The Cells, plus 2–3 more packets including at least one room, and the hand-off between encounters (D21).

**Exit:** Act 1 plays end to end from a new game.

**Open questions**
1. **Where the act ends.** *Recommendation:* Gravenhold's rule (a minimum number of encounters solved, the act's goals met, the player chooses to move on) becomes an engine condition plus a player choice. The AI never moves the party to the next act.

## Phase 7: The generator

Built in stages, each validated by the engine before the next: objective and people → zones and geometry → things → clock → alarm ladder → opening description.

**Exit:** generated packets pass validation within one retry, and play comparably to the hand-authored Act 1 packets.

**Open questions**
1. **Layout from a sketch.** *Recommendation:* the generator writes topology plus approximate sizes and rough placement ("cells ~10×10 along the north wall of a ~30-ft corridor"), never coordinates (D28). A layout step in code snaps that to the grid and validates it. Settle the sketch format here. If layout fails, the encounter ships without a map (D9).
2. **Quality checks.** *Recommendation:* the checks in `docs/spec/packet.md` produce warnings, not rejections, until playtests show which ones predict a bad encounter. A generator can satisfy a count like "every element connects to two others" without being good.

## Later

Acts 2–5, the open world after Gravenhold (Gravenhold's "open" mode), and the parked features (D24).

- **Improvised structure** (D29). If playtests show players wanting to find features the packet doesn't have, revisit with the player-initiated version first: the DM judges the feature against the zone's purpose line and fixed facts, a "maybe" becomes a search check, and an `add_connection` operation places it.
