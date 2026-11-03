# Roadmap

Phases in order, each with an exit test. **Open questions live only here**, in the phase that has to answer them, each with a recommendation. When one is settled, it moves to `docs/decisions.md` and the spec is updated in the same commit.

**Current phase: 7 (The generator).** Phases 0–5 are done. Phase 6 is folded into Phase 7: Act 1 is generated, not written by hand (D115).

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

**Closed** by the designer (D115). Its open questions below stay open and are answered in play, not as a gate. Lyra left the roster (D103) but the playable Cells still uses her as its own party member.

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

**Third playtest** (ruled mode, improvised; escaped at tick 19 of 21). The designer: ruled mode wins by a lot, with creativity and improv but no sycophancy or inconsistency (the DM turned down a weak bluff twice). Two problems:
1. **Time too tight.** The escape took 5 ticks, because each small action was a step with its own tick and the card dropped the escape the player plainly meant. Cards were remade 20 times to fit plans to the clock. Fixed by D77.
2. **Tokens.** Late-game calls were about 45 KB: 17 KB of facts (82 of them, mostly the card's notes, some stale) and 16.6 KB of encounter JSON. Fixed by D76 and D78; the same point in the game is now about 20 KB a call, with one call fewer per plan.

**Next build, as discussed:** the table and action restructure. One main tab for talk (narration, the DM, NPCs and companions chiming in, all free), whispers, and an action tab for plans and fights. D79's briefs are what make one call voicing both companions safe.

**Open questions**
1. **Pacing and game feel.** Are the intent, the table read and worked examples enough for the world and pricing calls to pace well and price fairly? *Recommendation:* add nothing until a playtest shows a specific failure, then find its cause before changing anything.
2. **The Moment call's judgment.** Untested on the real model: whether it rolls when it should (and only then), keeps hidden things out, redirects actions instead of resolving them, and marks what the party learns. *Recommendation:* run the bench's Moment tab before the first playtest, and treat its misses like the Phase 2 bench findings.
3. **Combat on the real model** (D67). Only recorded outputs have run it. *Recommendation:* play at least one playtest into the fight on purpose (open a cell on Snag's Pace with the drum whole), and watch whether bands, yields and the end of the fight feel fair.
4. **Who owns talking to someone in earshot** (finding 6)? Calling out to the jailer is both talk and an act in the world. *Recommendation:* the Moment owns it, with persuasion as a check and the time it costs, and the step call sends a step whose point is persuading someone back there, the way the Moment sends actions to the plan. The card keeps physical plans.
5. **Call records for playtests** (finding 11). *Recommendation:* during playtests the save keeps the last few dozen call outputs (not inputs) and the replay log, so a post-mortem can see what each call said; D10 still holds, since it's the player's own save.

**Carried from Phase 3:** pricing leaks the engine can't see are still unwatched (*recommendation:* watch for them in playtests); hazards are still always empty, which the Cells don't need.

## Phase 5: Companions ported

The companions (eight; the roster is open), the relationship model, configurations, the campfire, and the special cases as declared data (D8). Every remaining ability gets its `declared` block (D30).

**Exit:** a campfire scene and relationship changes behave like Gravenhold's, and adding or removing a companion takes one file and one registry line.

**Closed** by the designer (D115). The unchecked items below are judged in play.

- [x] The relationship model, ported with Gravenhold's numbers as content (D80): `src/campaign/relationship.js`, `content/relationship.js`.
- [x] Special cases as general mechanisms declared in each file (D81): `tie`, `secondVoice`, `extraBeats`, `stageLabels`, `notes`.
- [x] A schema for companion files, and tests that keep the roster open (D82): `schemas/companion.js`, `test/companions.test.js`.
- [x] Every ability has a `declared` block, companions and classes. Only Wild Shape and Lyra's senses carry effects or traits; the rest are use counts, and judgment handles what they do.
- [x] The campfire: `prompts/campfire.md`, `campfireInput` in `src/context.js`, the engine's beat and voice checks, and a Campfire tab on the bench with five cases.
- [ ] **The campfire feels like Gravenhold's.** Run the bench's Campfire cases and judge them by gut, as Phase 2 did for voices. Look for the romance floor in each companion's register, beats only when the scene earns them, small honest changes, and the declared cases working (Fern waiting, Ember appearing after the payoff, no storm while cooling, Lisa as her sister's sister). Republishing the bench needs `src/campaign/`, `content/relationship.js` and `content/companions/index.js` alongside the files it already loads.

**Bench findings** (the designer's first campfire runs; cause, then fix)
1. **Fern lost her ring voice and her clothes in rat form.** Cause: her ability text led with "can't speak aloud" and said nothing about her gear, and no companion call knew its own form. Fix: the text now says she talks over the rings and her gear merges into the new form; a companion's call now gets the form an ability put her in.
2. **Nadia's eyes flashed gold whenever she relayed Ember.** Cause: it was written into her look, first meeting, pursuit and relay text. Fix: removed; she speaks of Ember freely in the third person, and Ember has her own `admires` and `despises`.
3. **Payoff scenes faded at the first kiss.** Cause: every payoff scene ends in "Fade.", and the craft said to cut at "the threshold" without saying which. Fix: D84.
4. **Camp with both needed more.** The designer asked for two calls an exchange, alternating, with something moving each time: D85.
5. **Outfits should change in play:** D86.
6. Character feel otherwise held.
7. **Outfits failed** (second round). Cause: the campfire's `outfit` had to be a valid id, so a model writing null or guessing an id failed validation, and her call got no id for what she had on and no description of what else she owned. Fix: `outfit` is an id or null, and her call gets the id of what she's wearing and the id and look of each other outfit.
8. **Nadia and Ember turned jealous** (second round). Cause: the first fix framed Ember's tastes against Nadia's, on top of an old hidden layer about each wanting him alone. Fix: D87, and her file rewritten to the designer's description.
9. **The Campfire tab broke after switching away, and some responses didn't show** (third round). Cause: saved runs don't keep inputs, and the campfire view read them, so rendering threw once saved runs loaded. Fix: guarded, and each run now renders on its own, so one bad run can't blank a case.
10. **Camp with both stayed shallow** (third round). Cause: every answer had to move something, so the second opened a small question of her own, and nothing invited the two to deal with each other. Fix: D88.
11. **Ember should wait for the payoff,** then choose: D89.
12. **Lisa** (from Gravenhold): in private she may dream aloud about a future with just him, but the secret thrill matters more; she never demands he choose, and after being caught and swearing it off she'll try to start it again. Her pursuit and suppressed desire are rewritten to say so.
13. **Nadia, refined** (fourth round, character design). Ember is familiar with a body she can only hold briefly, not new to one; before the payoff she barely speaks, so whether she's real stays open; after it, what she is stays open. Nadia is a little shy alone; together the two are in control. Her secret is now the mark the fire leaves on everyone they let in. "Djinn" is gone from her text, since it answered the question. Two gated notes carry the before and after.
14. **Ruby, refined** (fourth round). She reads the other companion's smallest remark as a play for him, answers with quiet, wounded cruelty that works on him, never admits she's wrong in front of the other, and never de-escalates unless the other grovels. Not involved, she's the boundary-pushing cool girl; involved, she starts things in front of the other out of spite. Gated notes carry the stages; the honest admission waits until she feels trust on all sides (D91).
15. **Is the bench still the right tool?** It was built to test the calls' judgment on fixed cases; character design needs free scenes with follow-up turns. Fix: the bench's **Camp** tab, free play with any two companions, every number editable, and a "Describe looks" summary per companion. Fixed cases stay for regression; character feel is judged in Camp and then in Phase 4's real play.
16. **Perception, not truth** (fifth round): D91.
17. **Nadia's talk of Ember follows the relationship:** rare and vague far from the payoff, more frequent and grounded near it, plainly real after it, withdrawn if she's hurt. Her secret is now the Hearth, a burned cult whose fire Ember came out of, which grows on devotion and marks everyone it takes in; the dark path is giving in to it, the deep path finding Ember another way to be whole.
18. **Ruby is hot and cold:** manic and dangerous or quiet and wounded, always knives, always hypersexual. With the other companion: cool girl when it's good, quiet manipulation when she's hurt, a real tantrum when slighted and the other won't back down. Alone with him: storms, then always crashes back adoring and a little ashamed. Her blind spot (a submissive rival plus a steady player) and her pull toward him when he's less steady are in her file.

19. **Feelings didn't drive behaviour** (sixth round). At −10 regard, or −10 toward the other companion, they played neutral and warmed to niceness; wrong reads never surprised anyone. Cause: the numbers reached the call bare, and one pair number was too thin. Fix: D92, D93, D94.
20. **Whispers, triangles, storms, Ember in company, Lisa's grudge, Vesper's shamelessness:** D95 to D99. Vesper's pursuit is now shameless, sexual and a little desperate, a performance; her deep path is self-respect while staying a succubus.
21. **Serena, Morgana and Lyra replaced** by Annaleise, Sable and Celeste (D103). Lyra stays as the Cells encounter's fixture party member. Still open: nobody in the roster has dark skin, and Ruby has no quick friend.
- [ ] **Play the three new companions in Camp:** Annaleise's broken English and deliberate misunderstandings; Sable's subtle shifting and her impersonations (with "show who's really here" on, then off); Celeste's fixed devotion and how long her secret holds; Lisa with each as her sister.

**Result** (so far). Adding a companion is one file and one line, checked by a test that plays a companion who isn't in the roster through every input; removing any companion leaves every other pairing working. Phase 5's open questions are settled in D80, D81 and D83.

**Carried into Phase 4:**
- **The campaign turn.** The relationship model counts exchanges with the player (`nextTurn`); the UI advances it once per player message in the huddle, a moment or camp, and calls `endEncounter` with the hand-off.
- **Beats outside camp.** Only the campfire reports beats (D80). If playtests show a rupture or a discovery that has to land in an encounter, the companion call is where to add it.
- **Getting outfits in play.** `addOutfit` exists, but nothing calls it yet. The UI needs a way to give one (a found item, a gift), and the wardrobe screen calls `equip`.
- **Second-voice lines in the huddle.** A private channel gives her second voice's voice, but the companion call's candidates have no speaker. Nadia can relay Ember there; if Ember needs her own lines over the rings, the candidate needs a speaker.

## Phase 6: Act 1, hand-authored

Folded into Phase 7 (D115). Its questions moved there.

## Phase 7: The generator

Generation as `docs/spec/generation.md` describes it: code picks a seed, the sketch call designs the whole encounter in plain English, the critique call plays it, one revision cuts or connects, the encode calls turn it into a ruled-mode packet in stages, and code lays it out (D116–D120). It builds rooms with an outfit each (D121) and campfires (D122), and carries attachments and callbacks across the hand-off (D123). Act 1 is generated with it.

**Exit:**
- Generated packets pass validation within one retry, and stay inside ruled mode's budgets (D76).
- On the bench, ten sketches from the same act read as different encounters, and the designer judges them comparable to the Cells.
- The critique call finds the flaws planted in hand-made sketches in 4 of 5 runs.
- Act 1 plays end to end from a new game: generated encounters, rooms with outfits, campfires, and every attachment resolved within one encounter.

**Build order** (each judged on the bench before the next, as Phase 2 judged the play calls)
1. **The motif library** (`content/motifs.js`): the Cells' motifs, and the heist's and the cavern's from `docs/design/encounter-craft.md`'s appendix. Each genre's promise.
2. **Worked examples:** two or three sketches of different genres, drafted by Claude for the designer to judge. They're the only hand-written material (D115).
3. **The seed** in code: kind, genre, motifs, mechanics, callback, campfire placement, and what the act has used.
4. **Sketch and critique** on a bench tab: generate ten sketches per seed, read them side by side, and plant flaws to test the critique. No encoding yet; this tests judgment, not code.
5. **Encode** in stages, validated by the engine, and the layout from the sketch's rough sizes.
6. **The hand-off:** attachments, the world's memory, next-scene stubs, and the outfit a room gives.
7. **Play Act 1** from a new game.

**Open questions**
1. **The sketch's format.** *Recommendation:* the shape of `fixtures/cells/walkthrough.md` §1 (intent, people table, routines, places as relationships, things and properties, fixed facts, hidden things, events, attachments, exits with stubs, what the opening shows), about 1–2 KB. Tables where the walkthrough has them.
2. **A motif's format.** *Recommendation:* a name; the pattern in a paragraph; the decisions it creates (routing, timing, approach, what to keep, `docs/design/encounter-craft.md` §2); what it usually connects to; the genres it suits; and the encounter it came from. Never a route.
3. **Act 1's genres.** *Recommendation:* from the act's mechanics (`content/setting.js`): escape, infiltration, a negotiation with a deadline, a mechanism or hazard, and a fight with a setup. In ruled mode a hazard is a fixed fact plus placed events, and a fight runs as the Moment's rounds, so none of these needs new engine rules.
4. **Layout from a sketch.** *Recommendation:* the sketch writes topology plus approximate sizes and rough placement ("cells ~10×10 along the north wall of a ~30-ft corridor"), never coordinates (D28), and states any distance that matters as a constraint ("the peg within 5 ft of the stool"). Code snaps it to the grid and validates it. A failure goes back once, described as relationships; then the packet ships without a map (D9). No open spaces (D124).
5. **Quality checks.** *Recommendation:* the checks in `docs/spec/packet.md` produce warnings, not rejections, and go to the critique as facts, not to the sketch as rules. Add one: every route to the objective crossing three or more separate barriers in a row (the slog). Drop the ones that test triggers, meters or sense links, which ruled packets don't have (D116).
6. **Clocks that aren't a person.** Routines belong to NPCs, so a tide or a bell tower has no home. *Recommendation:* a placed event for a one-off, and a routine on a thing for a cycle, when a generated packet first needs one.
7. **Where the act ends.** *Recommendation:* Gravenhold's rule (a minimum number of encounters solved, the act's goals met, the player chooses to move on) becomes an engine condition plus a player choice. The AI never moves the party to the next act.
8. **Waiting for the next packet.** Generation is four to eight `complex` and `default` calls, charged to the player (D2). *Recommendation:* start as soon as the hand-off is final, during the closing narration and any room or campfire (`docs/spec/generation.md`), and measure the wait before optimizing.
9. **How many campfires an act.** *Recommendation:* one after every two or three encounters, with the act's sanctuary as the last. A starting value.

## Later

Acts 2–5, the open world after Gravenhold (Gravenhold's "open" mode), and the parked features (D24).

- **A vibe at new game start.** The player types an adventure's vibe ("trapped in a creepy noble's masquerade, gothic eldritch horror", "an epic escape from hell"), and the campaign is built from it. Not a different world: the same companions and the same shape of five acts (trapped, crossing the working levels, uncovering the secret, the climax, getting out), with the factions, alarms, acts and enemy generated, and a short pitch the player can reroll. *What it needs first:* each companion's file split into a core that never changes and setting hooks the vibe rewrites in the same shape (Fern's is always "something alive and sacred is being exploited here, and she was caught defending it"). That is the romance pillar's content, so it's real work across every companion.
- **Improvised structure** (D29). If playtests show players wanting to find features the packet doesn't have, revisit with the player-initiated version first: the DM judges the feature against the zone's purpose line and fixed facts, a "maybe" becomes a search check, and an `add_connection` operation places it.
