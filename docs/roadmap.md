# Roadmap

Phases in order, each with an exit test. **Open questions live only here**, in the phase that has to answer them, each with a recommendation. When one is settled, it moves to `docs/decisions.md` and the spec is updated in the same commit.

**Current phase: 7 (The generator).** Phases 0–5 are done, and Phase 6 is folded into Phase 7: Act 1 is generated, not written by hand (D115). The game plays one way: the DM rules and the engine keeps the books (D125).

**Next thread: combat.** It's the biggest open design problem, and the reason the work so far has leaned on non-combat encounters. See "Combat" below. Decide it before the table is built, since fights run there.

---

## Done

Each phase's full record (findings, causes and fixes) is in git history; what it settled is in `docs/decisions.md`.

- **Phase 0: Restructure.** One home per fact, Gravenhold in `legacy/`, its content in `content/`.
- **Phase 1: Contracts.** Every contract as a schema in `schemas/`, checked by `node --test` (D32).
- **Phase 2: Judgment test bench.** The calls' judgment held on the Cells (D48–D59). The bench (`bench/`) now runs the companion and campfire calls and Camp.
- **Phase 3: Engine core.** The engine as a pure reducer whose logs replay exactly (D60–D64).
- **Phase 4: The Cells, playable** (D65–D79). The first two playtests, on the engine's pipeline, found its rules left no room to play. The third, with the DM ruling and the engine keeping the books, won by a lot (D75), and that's now the only way the game plays (D125).
- **Phase 5: Companions ported** (D80–D113). The relationship model with Gravenhold's numbers, special cases as declared data, the campfire, outfits, and an open roster.
- **Phase 6: Act 1, hand-authored.** Folded into Phase 7 (D115).

## Open from play

Not gates. Each is answered when play shows it.

- **Pacing and game feel.** *Recommendation:* add nothing until a playtest shows a specific failure, then find its cause before changing anything.
- **Card leaks the engine can't see.** The engine rejects a card that names a hidden thing, but not one that describes it in plain words ("he's got them on his belt"). *Recommendation:* watch for it in playtests before adding anything.
- **Call records for playtests.** *Recommendation:* during playtests the save keeps the last few dozen call outputs (not inputs) and the replay log, so a post-mortem can see what each call said; D10 still holds, since it's the player's own save.
- **A failed call left its message behind** (Phase 4): the next call saw the old message and followed it. *Recommendation:* a message whose call fails is marked failed and not resent; the page offers to send it again.
- **The campfire feels like Gravenhold's,** and the three newest companions (Annaleise, Sable, Celeste) play as written. Judged in Camp and in play. Still open from Phase 5: nobody in the roster has dark skin, and Ruby has no quick friend.
- **The campaign turn.** The relationship model counts exchanges with the player (`nextTurn`). *Recommendation:* the page advances it once per player message in the huddle, the Moment or camp, and calls `endEncounter` with the hand-off.
- **Beats outside camp.** Only the campfire reports beats (D80). If playtests show a rupture or a discovery that has to land in an encounter, the companion call is where to add it.
- **Second-voice lines in the huddle.** A private channel gives her second voice's voice, but the companion call's candidates have no speaker. If Ember needs her own lines over the rings, the candidate needs a speaker.

## Combat (the next thread)

Not designed yet. What's true now: a fight runs in the Moment, a round at a time, through the scene call. The DM rules each round, rolls are bands the engine rolls, and HP lives in the ledger (enemies' from their sheet or their tier in `content/rules.js`). The engine's own combat rounds are retired (D125). Questions to answer, before building anything:
1. **What makes a fight fun here instead of a slog?** The same test as any encounter (`docs/design/encounter-craft.md` §1): decisions whose consequences you can partly see, dice that settle what's left, and every outcome leading somewhere. A fight that's trading blows until HP runs out fails it.
2. **What a round is.** One message where the player says what everyone does, or something more like a plan card for a fight? How many rounds a fight should take, and how it ends: down, fled, yielded, surrounded, the alarm.
3. **The companions in a fight.** Does the player command them, or do they act from their own data, the way stances do? How they speak during a fight without a call per round (D127).
4. **Cost.** One scene call per round on full context. Whether a fight gets a lighter slice or a cheaper tier, as questions do (D127).
5. **A fight as the point of an encounter,** with a setup (D118's genre): terrain, positions, traps and a plan before it starts, and how the generator builds one.

*Recommendation:* talk it through first, with the encounter craft guide and Gravenhold's combat rule (`content/rules.js`) as the starting points, and decide in `docs/decisions.md` before any code.

## Next build: the table

The screen and call design in D127, with ability uses (D128). Built after combat is decided, before Act 1 is played (Phase 7's step 7).

**Build order**
1. **The companion call for both.** One call voicing both companions from their briefs, each free to pass. On the bench, run the same huddle cases as one shared call and as two separate calls, and judge whether the two still sound like different people and still catch a flawed plan's holes some of the time (D38, D40). If the shared call loses that, keep two calls.
2. **The read-only slice and the cheap tier** for questions to the DM, with `test/budget.test.js` holding its size.
3. **Ability uses** (D128) in the ledger, the DM's calls and the sheet, with the campfire refill.
4. **The two tabs,** the addressee picker and the call routing, then the specs (`docs/spec/ui.md`, `architecture.md`, `context.md`, the call specs) in the same commit.

**Exit:** a question to the DM costs one cheap call; a table moment costs at most two; the companions' voices hold in a playtest; Fern can't Wild Shape twice before a rest.

## Phase 7: The generator

Generation as `docs/spec/generation.md` describes it: code picks a seed, the sketch call designs the whole encounter in plain English, the critique call plays it, one revision cuts or connects, the encode calls turn it into a ruled-mode packet in stages, and code lays it out (D116–D120). It builds rooms with an outfit each (D121) and campfires (D122), and carries attachments and callbacks across the hand-off (D123). Act 1 is generated with it.

**Exit:**
- Generated packets pass validation within one retry, and stay inside the calls' budgets (D76).
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
3. **Act 1's genres.** *Recommendation:* from the act's mechanics (`content/setting.js`): escape, infiltration, a negotiation with a deadline, a mechanism or hazard, and a fight with a setup. A hazard is a fixed fact, notes and placed events, and a fight runs as the Moment's rounds, so none of these needs new engine rules.
4. **Layout from a sketch.** *Recommendation:* the sketch writes topology plus approximate sizes and rough placement ("cells ~10×10 along the north wall of a ~30-ft corridor"), never coordinates (D28), and states any distance that matters as a constraint ("the peg within 5 ft of the stool"). Code snaps it to the grid and validates it. A failure goes back once, described as relationships; then the packet ships without a map (D9). No open spaces (D124).
5. **Quality checks.** *Recommendation:* the checks in `docs/spec/packet.md` produce warnings, not rejections, and go to the critique as facts, not to the sketch as rules. Add one: every route to the objective crossing three or more separate barriers in a row (the slog). Drop any that test triggers, meters or sense links, which packets don't have (D125).
6. **Clocks that aren't a person.** Routines belong to NPCs, so a tide or a bell tower has no home. *Recommendation:* a placed event for a one-off, and a routine on a thing for a cycle, when a generated packet first needs one.
7. **Where the act ends.** *Recommendation:* Gravenhold's rule (a minimum number of encounters solved, the act's goals met, the player chooses to move on) becomes an engine condition plus a player choice. The AI never moves the party to the next act.
8. **Waiting for the next packet.** Generation is four to eight `complex` and `default` calls, charged to the player (D2). *Recommendation:* start as soon as the hand-off is final, during the closing narration and any room or campfire (`docs/spec/generation.md`), and measure the wait before optimizing.
9. **How many campfires an act.** *Recommendation:* one after every two or three encounters, with the act's sanctuary as the last. A starting value.

## Later

Acts 2–5, the open world after Gravenhold (Gravenhold's "open" mode), and the parked features (D24).

- **A vibe at new game start.** The player types an adventure's vibe ("trapped in a creepy noble's masquerade, gothic eldritch horror", "an epic escape from hell"), and the campaign is built from it. Not a different world: the same companions and the same shape of five acts (trapped, crossing the working levels, uncovering the secret, the climax, getting out), with the factions, alarms, acts and enemy generated, and a short pitch the player can reroll. *What it needs first:* each companion's file split into a core that never changes and setting hooks the vibe rewrites in the same shape (Fern's is always "something alive and sacred is being exploited here, and she was caught defending it"). That is the romance pillar's content, so it's real work across every companion.
