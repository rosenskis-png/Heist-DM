# Roadmap

Phases in order, each with an exit test. **Open questions live only here**, in the phase that has to answer them, each with a recommendation. When one is settled, it moves to `docs/decisions.md` and the spec is updated in the same commit.

**Current phase: 4 (The Cells, playable).** Phases 0–3 are done.

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

**Exit** (met; see Result below):
- The Cells tests in `fixtures/cells/walkthrough.md` pass in 5 of 5 runs: a card on turn one; Card 1 priced as the party expects, with nothing the party doesn't foresee leaking into its bands or reasons; Card 2 about two Easy rolls, with the player's timing kept and none added.
- Three plans the docs never mention (the bench-nail lockpick, bending the bars, leaning on Snag through Brannoc) get fair prices.
- Fern and Lyra read like Gravenhold's companions. Shown the same flawed plan ten times, each catches its holes some of the time, the ones her `hunch` points at more often and the ones her `misses` describes less often (D38, D40, D50), and her three candidates are genuinely different takes.
- Each call's tier at each position of the speed and quality setting is chosen (D48).

**How to run this phase** (guidance from the design thread that shaped D35–D46)
- **This phase tests judgment, not code.** Build only the bench page. The engine's facts are written by hand; don't start the engine or the UI.
- **A prompt holds the judgment its call owns, and nothing else.** Before adding any instruction, ask whether structure already handles it (what the call sees, what the schema allows, what the engine validates). If a failure tempts you to add a rule, find its cause first (`docs/principles.md`, "Reflexes to resist"). Keep each prompt short enough to read in one go, and test whether an instruction earns its place by removing it.
- **Worked examples are the main tool for feel.** Write them as carefully as content, tag them by act, and never send `fixtures/cells/walkthrough.md` §5 to Acts 1–3. Never use the encounter under test as a worked example: the bench would grade a memorized answer.
- **Try to break the new rules on purpose:**
  - the step call must keep a plan's mistakes: a plan with no timing stays literal, and it never adds waits or conditions (D35);
  - the pricing call must price each action as itself (`as_if`, D42) and never let something the party doesn't foresee into a band or a reason (D36);
  - narration must give an interruption its moment, at the instant someone could notice, and keep hidden things out (D46);
  - companions must give three genuinely different takes, catch a flawed plan's holes only some of the time, and still sound like Gravenhold's companions, romance floor included (D27, D38, D40).
- **The designer judges feel; the bench shows evidence.** Show every call's assembled input and raw output, and the prompt size. When something feels wrong, record what happened and its cause here before changing anything.
- **Don't reopen a decision without reading its "why".** To change one, add a new entry that supersedes it.

**Bench findings** (first 30 runs; cause, then fix)
1. **Every step call wrote move paths as zones, not connections** (5 of 5). Cause: the contract said "id" and never said which kind. Fix: paths name zones (D51), and the bench checks fit. Two runs also carried the iron ring through the rat-sized gutter, right after ruling it too big; the fit check now catches that.
2. **Narration moved Fern out of her cell** in 5 of 5 interrupted runs, and talked about "step one" and "the plan". Cause: it got the results without the steps they belong to, so it guessed from the plan's prose. Fix: it now sees each step with its result (`docs/spec/context.md` §2); the style guide keeps the machinery offstage.
3. **The world call invented flags** in every run (`offering_deal`, `with_party`). Cause: an action that changes no tracked state had nowhere to go. Fix: D52.
4. **Companions talked game mechanics** ("the ruling", "a one-way switch", "until the encounter ends"), echoing the wording of their ability text. Fix: the style guide keeps characters inside the world.
5. **Pricing** stayed within a band of the targets. Keys in hand were priced Easy, not automatic: judgment, left alone.
6. **Second round: the step call still chose routes.** When the plan didn't say which way, it sent the key ring through the gutter in most runs, and retrying split card 1 into eleven steps. Cause: route-finding was the AI's job, and the retry message pushed it to split every crossing. Fix: D54, and a ruling call for named routes that fail on size (D55).
7. **Third round.** Every card 1 run retried over bookkeeping (an unlock left out, a three-crossing walk out): D56. The ruling call repeated the size labels it was given: D57.
8. **Huddle:** Fern caught the one-rat hole in 5 of 10 lines said (her hunch) and the timing hole in 3 (her blind spot). Lyra caught timing in only 2, and spent most turns on Brannoc. The grader counted talk about Brannoc as the walk-out hole, so its flaw texts are now sharper.

**Result.** The calls' judgment holds on the Cells. Every exit test above ran on the bench except the following, which the designer judged by gut instead of by repeated runs: Card 2 pricing and the nail and bars plans on the final prompts, and the `complex` tier for pricing and world. The tiers are D58. Companion voices were judged against their profiles in `content/`, since no Gravenhold transcripts were exported.

**Carried into Phase 3:**
- **Pricing leaks.** One early run named the keys' location in a shown reason. The engine's check (`docs/spec/engine.md` §6) must catch these, not the prompt.
- **Rulings** (D55, D57) and **routes** (D54): the engine implements both, and the bench's `bench/checks.js` is the working reference for move validation, fit, keys and splitting long moves (D56).
- **Flag keys** (D52): the engine rejects keys the packet doesn't use.

## Phase 3: Engine core (Node)

Pure ES modules tested with `node --test`, with a seeded random number generator. Validation against the contracts already exists (`src/validate.js`); the engine adds the consistency checks in `docs/spec/packet.md` and everything in `docs/spec/engine.md`.

**Exit:** `fixtures/cells/acceptance.md` passes in full, and replaying a recorded log reproduces state exactly (D60).

**Scope.** Code lives in `src/engine/`, one module per section of `docs/spec/engine.md`. Context assembly is pure and acceptance items 10–11 test it, so it moves from `bench/assemble.js` to `src/`. The bench's move, fit and flag checks become calls to the engine, and the bench keeps only its grading. Abilities, stances and objectives are built in general form from the `declared` blocks. Combat is built only as far as the Cells need (`start_combat` records that a fight has begun); its rounds wait for Phase 4.

**Result.** Every item in `fixtures/cells/acceptance.md` passes in `test/engine.test.js`, and a recorded log replays to deep-equal state. Building it settled D61–D63 and corrected two fixtures: card 1's step 4 route listed a cell nobody stands in, and the acceptance test's slack example contradicted D43's arithmetic (at ±3, rounding once gives 22 and 20, not 21).

**Carried into Phase 4:**
- **Pricing leaks the engine can't see.** It sends back a shown reason that names a hidden thing or an NPC the party doesn't foresee. It can't catch one that describes an unforeseen fact in plain words ("he's got them on his belt"). The likeliest source is the `as_if` line the pricing call is sent (D42). *Recommendation:* watch for it in playtests before adding anything.
- **Hazards** are always empty: the packet format has nothing that is one. The Cells don't need any.
- **Combat rounds** (`content/rules.js`): `start_combat` only records the fight.
- **The bench page now loads `src/`** (the engine and `src/context.js`), so republishing it needs those files.

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
1. **Shapes for the special cases.** Until they're declared, they're on no allowlist and never reach a prompt (D59); the engine resolves the active variant (Lisa's) and sends only that. *Recommendation:* see the table in `docs/spec/companions.md`.
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
