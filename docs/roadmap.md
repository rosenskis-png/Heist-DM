# Roadmap

Phases in order, each with an exit test. **Open questions live only here**, in the phase that has to answer them, each with a recommendation. When one is settled, it moves to `docs/decisions.md` and the spec is updated in the same commit.

**Current phase: 4 (The Cells, playable).** Phases 0–3 are done. Phase 4 is built; its playtests are next.

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
- [x] The Cells packet as data: `content/encounters/cells.json`, with both cards and card 2's expected results.

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
- **Combat rounds** (`content/rules.js`): `start_combat` only records the fight. *Built in Phase 4 (D67).*
- **The bench page now loads `src/`** (the engine and `src/context.js`), so republishing it needs those files. *Republished in Phase 4.*

## Phase 4: The Cells, playable

The three interfaces, the card, the map (D9), saves (D11), and Fern and Lyra.

**Exit:**
- The rat plan gets the party out of their cells by exchange 4.
- Across 5 playtests: no stalls, a median of 2 card edits or fewer, and no interruption that a playtester calls unfair (D36).
- The map matches the walkthrough's layout exactly.

**Built** (D65–D74):
- **The game page** (https://claude.ai/artifact/Nq4W2TAcHNEjFGJcpdHyDp): `app/`, drawing `src/game/` (the loop, the session and what the page shows) over the engine. Every call goes through one module in `src/calls/` and `src/ask.js`.
- **The engine** gained moments, conversations, combat rounds, player checkpoints and the table read.
- **The Moment call** has its prompt, and the bench has a Moment tab with seven cases (https://claude.ai/artifact/NyXj8wTvQDe7rsRtUNAHSc, republished with `src/`).
- `test/game.test.js` plays the rat plan with recorded outputs and gets the party out by exchange 4; `test/moment.test.js` covers the engine additions.

**How to run the playtests**
- **Run the bench's Moment tab first,** a few times per case. It's the call players use most, and the only one never run on the real model. Record what it does wrong and why here before changing the prompt.
- **Then play.** The developer view (Menu) counts exchanges and card edits, and shows the exchange by which everyone had left where they started: that's the exit's "out by exchange 4". It also shows every call's input and output. Export the replay log with any bug report.
- **What counts:** a stall is the game waiting on something the player can't see how to give. An unfair interruption is one the playtester says they had no way to see coming. Record each one with its cause before fixing anything.

**Playtest findings** (two games: one improvised, one following the walkthrough's rat plan. Cause, then recommendation; nothing is fixed yet.)
- *Result.* The rat plan escaped at exchange 5; it would have been 2 without finding 4. The improvised game never left the cells in 24 exchanges and ended with Uzga taking Fern. Both games had interruptions a player would call unfair (findings 1, 4, 5), and the improvised one stalled (3, 6).
1. **The fight's prose and state split apart.** The Moment AI narrated Fern becoming a rat, crossing the gutter and gnawing the drum, but wrote none of it as ops. At the end she was a person in her cell and the drum was whole, so Uzga took her from a cell she had left in the story. Cause: a combat round's prose can describe changes its ops don't make, and nothing checks. *Recommendation:* in a round, a change happens only as an op, and the next round is narrated from the result.
2. **The engine invented attacks.** Snag, whose intent was the drum, hit Lyra through her bars, then the rogue, then Fern twice "in the gutter". Cause: Phase 4's implementation of D67 makes every enemy nobody engaged hit someone, falling back to the first party member still standing, whatever its intent or position. The DM then argued state with the player for four exchanges, retracted in prose what the engine had recorded, wrote contradictory texture to patch it, and finally traded the drum for the lost HP. *Recommendation:* an enemy hits only when its intent is an attack on someone it can reach, as the Moment AI judges; the engine never picks a target.
3. **The central threat had no consequence written down.** Snag went for the drum for eight rounds and was "a few strides away" in every one. The packet starts a fight when a prisoner is loose but never says what happens when he reaches the drum, so neither the engine nor the AI could make it happen: Gravenhold's threat that never follows through. *Recommendation:* the packet writes it (Snag reaches the drum a set number of ticks after going for it, and what the alarm does), and combat rounds run that clock.
4. **Translation mistakes treated as the player's.** The rat plan stopped on its last step because "Lyra lets us all out" was written as four unlocks before her move into the corridor, so D64 stopped her at the second door. The improvised game's first card stopped at tick 0, most likely because the step call listed a fixed fact that isn't hidden (Wild Shape ends past the stair) as an internal check, which the engine doesn't validate. *Recommendation:* when an actor in the same step reaches a workable side, the engine orders the effects (D56's reasoning); an internal check must name a hidden, unrevealed fact or go back for the retry.
5. **A failed risk cancelled more than its summary said.** "The group stalls in the guardroom" cancelled the whole move, so nobody left their cell, the second half of the split move couldn't route, and Uzga arrived. *Recommendation:* the pricing call sees each step's effects numbered in words, so a cancel names what it undoes, and a delay is `add_ticks`.
6. **Talking to an NPC has no home.** Seven cards called out to Snag (a drinking contest, a dice game, seduction, a lie about Uzga). The card prices only observers, barriers and hazards, so the target's answer was never rolled. When Snag couldn't hear (Drink, Pace), only Brannoc was priced, and the world call had Snag not answer. The pricing call said so in its rulings: "Snag is the one being called to, and the card doesn't price how he takes the offer." The Moment tab, which runs persuasion as a check, was never used for it. *Recommendation:* see open question 4.
7. **A friendly observer priced as a risk on nearly every card.** Brannoc hears every step, so the pricing call had to invent ways he'd spoil each one; in the rat-plan game two of them landed and undercut the pitch to Snag. Cause: an observer can only be covered by a named mechanism, and "he's on our side" isn't one. *Recommendation:* a mitigation by the observer's own sheet, judged by the pricing call.
8. **Narration invented state.** After the interruption, the rat-plan narration had Lyra step out and open Brannoc's door; the improvised game's had Snag unlock two cells, and its last had the party both walking out and stuck in a cell. Cause: narration gets each step's whole effect list and an interrupt index, and has to work out which effects happened. *Recommendation:* the engine sends narration the effects that happened and the ones that didn't, in words.
9. **Leaks and machinery talk.** The first Moment answer spoke in size categories ("a medium-sized body at most", "the map doesn't give a gap") and was wrong: a rat fits between the bars. A shown reason said "suspicion 2". Pricing rulings were mostly notes about pricing ("Only Brannoc is priced here") and went into canon, beside the Moment AI's state corrections. Causes: the Moment gets the full map with size categories (D57 removed them only from the party's map and the ruling call); Phase 4 gave the pricing call the full live state, meters included, and put every pricing ruling into canon. *Recommendation:* the Moment gets rough real dimensions, as the ruling call does; the pricing call gets the party's view of state; only rulings about the world reach canon.
10. **A failed call left its message behind.** The first combat message got no reply; the next call saw it and the newer one, and the DM followed the older ("the knees have to wait"). *Recommendation:* a message whose call fails is marked failed and not resent; the page offers to send it again.
11. **Smaller:** a split move shows as two identical steps on the card; nearly every narration repeats Brannoc's plea and ends with someone "waiting to see what you do next"; Lyra spoke to Brannoc in the huddle, which only the party hears; the rat-plan game counted 5 card edits in 5 cards (one each); and call records are lost on reload, so this review couldn't read any call's actual output.

**Ruled mode** (D75), built after these findings: the DM rules and the engine keeps the books (`docs/spec/ruled.md`). It's the default at setup; the engine's pipeline is the other choice. `test/ruled.test.js` and `test/game.test.js` play the rat plan in it with recorded outputs: one card, out at exchange 1.
- **What the next playtests answer:** play the Cells in ruled mode at least twice, once improvised and once with the rat plan, and compare with the two games above. Does it feel like a DM taking your idea seriously? Do rulings hold: does anything said earlier get contradicted later? Does time feel fair? Is anything stalling?
- **Watch for:** a person the DM moved and never put back on their routine; ledger facts piling up or contradicting each other; the card leaking what the party doesn't know in ways the hidden-name check can't see; the resolve call quietly overruling the dice or the card's stated costs.
- If ruled mode wins, findings 1–5, 7 and 9 stop applying (they're the engine's rules), and Phase 6's question about the engine's vocabulary (below) changes shape.

**Open questions**
1. **Pacing and game feel.** Are the intent, the table read and worked examples enough for the world and pricing calls to pace well and price fairly? *Recommendation:* add nothing until a playtest shows a specific failure, then find its cause before changing anything.
2. **The Moment call's judgment.** Untested on the real model: whether it rolls when it should (and only then), keeps hidden things out, redirects actions instead of resolving them, and marks what the party learns. *Recommendation:* run the bench's Moment tab before the first playtest, and treat its misses like the Phase 2 bench findings.
3. **Combat on the real model** (D67). Only recorded outputs have run it. *Recommendation:* play at least one playtest into the fight on purpose (open a cell on Snag's Pace with the drum whole), and watch whether bands, yields and the end of the fight feel fair.
4. **Who owns talking to someone in earshot** (finding 6)? Calling out to the jailer is both talk and an act in the world. *Recommendation:* the Moment owns it, with persuasion as a check and the time it costs, and the step call sends a step whose point is persuading someone back there, the way the Moment sends actions to the plan. The card keeps physical plans.
5. **Call records for playtests** (finding 11). *Recommendation:* during playtests the save keeps the last few dozen call outputs (not inputs) and the replay log, so a post-mortem can see what each call said; D10 still holds, since it's the player's own save.

**Carried from Phase 3:** pricing leaks the engine can't see are still unwatched (*recommendation:* watch for them in playtests); hazards are still always empty, which the Cells don't need.

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
2. **Does the engine hold up beyond the Cells?** Its mechanisms are general (nothing in `src/engine/` names a Cells id), but it has only met one packet, so its vocabulary is Cells-sized. Known narrow spots:
   - **Recognizing a broken plan early** (D62) covers only an item missing from where the plan expects it. Other broken preconditions (a door now barred, a contact who has left) are caught only when the step reaches them.
   - **Hazards** (fire, a trap, a collapsing floor) have no packet format, so the card's `hazards` is always empty.
   - **A fight or an ending** is the only kind of trigger that interrupts a plan before its next step. A trigger that changes the situation some other way is met at the effect.
   - **Movement** is checked only by size, hands and side. Climbing, swimming or flying are priced by judgment, which is right unless a packet needs one enforced.
   - **Traits** the engine reads are named in code (`sees_in_dark`, `hears_through_walls`). A new sense needs code.
   - **Layout facts** list distances between every pair of connections and placed things in a zone, which grows fast in a big room.

   *Recommendation:* build at least one Act 1 packet deliberately unlike the Cells (a room, a hazard, an NPC who leaves, a door worked from one side), and extend the engine only where that real packet needs it. The generator must not start (Phase 7) until two differently shaped packets pass.

## Phase 7: The generator

Built in stages, each validated by the engine before the next: objective and people → zones and geometry → things → clock → alarm ladder → opening description.

**Exit:** generated packets pass validation within one retry, and play comparably to the hand-authored Act 1 packets.

**Open questions**
1. **Layout from a sketch.** *Recommendation:* the generator writes topology plus approximate sizes and rough placement ("cells ~10×10 along the north wall of a ~30-ft corridor"), never coordinates (D28). A layout step in code snaps that to the grid and validates it. Settle the sketch format here. If layout fails, the encounter ships without a map (D9).
2. **Quality checks.** *Recommendation:* the checks in `docs/spec/packet.md` produce warnings, not rejections, until playtests show which ones predict a bad encounter. A generator can satisfy a count like "every element connects to two others" without being good.

## Later

Acts 2–5, the open world after Gravenhold (Gravenhold's "open" mode), and the parked features (D24).

- **Improvised structure** (D29). If playtests show players wanting to find features the packet doesn't have, revisit with the player-initiated version first: the DM judges the feature against the zone's purpose line and fixed facts, a "maybe" becomes a search check, and an `add_connection` operation places it.
