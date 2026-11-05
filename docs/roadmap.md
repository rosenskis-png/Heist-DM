# Roadmap

Phases in order, each with an exit test. **Open questions live only here**, in the phase that has to answer them, each with a recommendation. When one is settled, it moves to `docs/decisions.md` and the spec is updated in the same commit.

**Current phase: 7 (The generator).** Phases 0–5 are done, and Phase 6 is folded into Phase 7: Act 1 is generated, not written by hand (D115). The game plays one way: the DM rules and the engine keeps the books (D125).

**Combat is decided:** a fight is a plan (D130), and the party always moves on, with how it went moving how they feel (D131). **The table is built and played once** (D127, D128, D132–D138); a second playtest checks the fixes, below. **Phase 7 starts with a rethink of encounter design** (D139), which has settled the campaign's shape so far (D140–D143, `docs/spec/campaign.md`).

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
- **The campfire feels like Gravenhold's,** and the three newest companions (Annaleise, Sable, Celeste) play as written. Judged in Camp and in play. Still open from Phase 5: nobody in the roster has dark skin, and Ruby has no quick friend.
- **The campaign turn.** The relationship model counts exchanges with the player (`nextTurn`). *Recommendation:* the page advances it once per player message in the huddle, the Moment or camp, and calls `endEncounter` with the hand-off.
- **Beats outside camp.** Only the campfire reports beats (D80). If playtests show a rupture or a discovery that has to land in an encounter, the companion call is where to add it.
- **Second-voice lines in the huddle.** A private channel gives her second voice's voice, but the companion call's candidates have no speaker. If Ember needs her own lines over the rings, the candidate needs a speaker.

## Combat

Decided and built (D130, D131). What's left:
- **The combat abilities are redesigned and rebalanced before Act 1 is final.** They're Gravenhold's, written for rounds and HP. *Recommendation:* each says exactly what it does in a beat and what it needs in place, without HP or rounds, and every one creates a decision (an opening, a position, a choice of target) rather than only removing an enemy. Judge them on the bench with fight cards.
- **Whether a fight card feels like homework** in play, against "I hit him" in the Moment. *Recommendation:* watch for it; the card already reads one line the way the player means it (D77).
- **Threats that bind.** *Recommendation:* in playtests, check that an unanswered threat lands as shown and nothing worse, and that the card's notes flag it, before adding anything.
- **The morale numbers** (`content/relationship.js`). Starting values; tune them once the hand-off and campfires play end to end.

## The table: played once, fixed, playing again

The first playtest (on the Cells, with D135's call records) found one companion's voice failing and over a quarter of the input wasted on retries; D137 and D138 fix what it found. The second playtest checks them.

**Exit:** the companions' voices hold in a playtest, and limited abilities hold to their uses.

**Open questions**
- **Wild Shape's uses.** The exit asked that Fern can't Wild Shape twice before a rest, but her file gives it once per encounter and three times per rest, and that's what the engine holds. Not pushed in the first playtest. *Recommendation:* keep the file's numbers until the balance pass the designer has deferred; set `rest: 1` there if twice is too many.
- **Whether the DM records `used`.** It did, the one time it came up. *Recommendation:* keep watching the party's sheet; nothing to add unless a use goes unrecorded.
- **Whether the ledger fills.** It reached 16 of 20 facts in 11 ticks, but questions added only 2; most of the pressure was resolve recording the card's rulings again, which D138 stops. *Recommendation:* watch the fact count in the developer view; raise `LEDGER.facts` only if a longer encounter fills it with facts that still matter.
- **Whether companions catch too much,** now that each says one thing (D137). *Recommendation:* compare their catches on the bench's flaw cases with the old rates; bring chance back only in a form that never drops an answer to the player.
- **Trivial actions as cards.** The first playtest ran six plans of easy rolls to open doors and tie up a beaten guard, about three minutes of waiting, and used "Do something" once. *Recommendation:* watch it on an encounter that isn't the Cells; if it holds, make low-stakes actions the scene call's job and say so under the picker, before adding anything.
- **A companion's line becoming a rule on herself.** Fern's "once I'm a rat I'm a rat till we're out" was recorded as facts barring her magic for the rest of the encounter. *Recommendation:* watch it; if it recurs, the engine rejects a fact about a companion's own abilities that her sheet doesn't say.
- **Things that act.** The rats were a thing, and the plan made them act, so the card went back twice. *Recommendation:* the DM can make a thing an actor mid-encounter, as an op the engine records, rather than the generator foreseeing who can be talked into acting.

## Phase 7: The generator

Generation as `docs/spec/generation.md` describes it: code picks a seed, the sketch call designs the whole encounter in plain English, the critique call plays it, one revision cuts or connects, the encode calls turn it into a ruled-mode packet in stages, and code lays it out (D116–D120). It builds rooms (D121) and campfires (D122, D142) into the campaign's one-way legs (D140), and carries attachments and callbacks across the hand-off (D123). Act 1 is generated with it.

**Exit:**
- Generated packets pass validation within one retry, and stay inside the calls' budgets (D76).
- On the bench, ten sketches from the same act read as different encounters, and the designer judges them as good as the worked sketches the rethink produces (D139).
- The critique call finds the flaws planted in hand-made sketches in 4 of 5 runs.
- Act 1 plays end to end from a new game: generated encounters and rooms, a campfire ending every leg, the climax, and every separation resolved before its campfire.

**Build order** (each judged on the bench before the next, as Phase 2 judged the play calls)
0. **Rethink encounter design** (D139): what makes a good encounter in a game where the DM rules, from first principles, with the Cells, the heist and the cavern rethought rather than copied. The output rewrites `docs/design/encounter-craft.md` and its references. Discussed with the designer before anything is written; the playtest's lessons and starting questions are in `docs/design/encounter-rethink.md`. Settled so far: the campaign's shape (D140), no campaign clocks or slack (D141), campfires (D142), and outfits as rewards (D143).
   - **Then the campaign layer, in code, before any generator** (each tested without an AI call): code drawing each exit's kind and counting the leg and the act; exits that point at the next room's kind, and how much choice the party earned; how a room's ending is judged and what it moves; gold and relics; separations that resolve before the campfire; the climax as a kind of room; the setting rewritten as living places (`content/setting.js`); and a test run through two legs and a climax on stand-in packets.
1. **The motif library** (`content/motifs.js`), from the rethought design. Each genre's promise.
2. **Worked examples:** two or three sketches of different genres, drafted by Claude for the designer to judge, to the rethought standard. They're the only hand-written material (D115).
3. **The seed** in code: kind, genre, motifs, mechanics, callback, campfire placement, and what the act has used.
4. **Sketch and critique** on a bench tab: generate ten sketches per seed, read them side by side, and plant flaws to test the critique. No encoding yet; this tests judgment, not code.
5. **Encode** in stages, validated by the engine, and the layout from the sketch's rough sizes.
6. **The hand-off:** attachments, the world's memory, next-scene stubs (including the captured ending's, which always moves the party on, D131), the conditions the party carries, `endEncounter` with the hand-off, and any rewards the room gives.
7. **Play Act 1** from a new game.

**Open questions**
1. **The sketch's format.** Answered after the rethink. *Recommendation:* the fields of `fixtures/cells/walkthrough.md` §1, not its kind of properties (intent, people table, routines, places as relationships, things and properties, fixed facts, hidden things, events, attachments, exits with stubs, what the opening shows), about 1–2 KB. Tables where the walkthrough has them.
2. **A motif's format.** *Recommendation:* a name; the pattern in a paragraph; the decisions it creates (routing, timing, approach, what to keep, `docs/design/encounter-craft.md` §2); what it usually connects to; the genres it suits; and the encounter it came from. Never a route.
3. **Act 1's genres.** *Recommendation:* from the act's mechanics (`content/setting.js`): escape, infiltration, a negotiation with a deadline, a mechanism or hazard, and a fight with a setup. A hazard is a fixed fact, notes and placed events, and a fight runs as cards (D130), so none of these needs new engine rules.
4. **Layout from a sketch.** *Recommendation:* the sketch writes topology plus approximate sizes and rough placement ("cells ~10×10 along the north wall of a ~30-ft corridor"), never coordinates (D28), and states any distance that matters as a constraint ("the peg within 5 ft of the stool"). Code snaps it to the grid and validates it. A failure goes back once, described as relationships; then the packet ships without a map (D9). No open spaces (D124).
5. **Quality checks.** *Recommendation:* the checks in `docs/spec/packet.md` produce warnings, not rejections, and go to the critique as facts, not to the sketch as rules. Add one: every route to the objective crossing three or more separate barriers in a row (the slog). Drop any that test triggers, meters or sense links, which packets don't have (D125).
6. **Clocks that aren't a person.** Routines belong to NPCs, so a tide or a bell tower has no home. *Recommendation:* a placed event for a one-off, and a routine on a thing for a cycle, when a generated packet first needs one.
7. **Waiting for the next packet.** Generation is four to eight `complex` and `default` calls, charged to the player (D2). *Recommendation:* start as soon as the hand-off is final, during the closing narration and any room or campfire (`docs/spec/generation.md`), and measure the wait before optimizing.
8. **How long legs and acts are.** *Recommendation:* 3–5 rooms a leg and 2–3 legs an act, with each kind's weight per act, as starting values in `content/setting.js`.
9. **How a room's ending is judged, and what it moves.** The question is never whether the party gets through, but how well. *Recommendation:* one call when the room ends reads the record (the account, the ledger, what the party took and left behind, the hurts) rather than the narration, and rates how it went from 1 to 10 against anchors written for 3, 6 and 9, so the rating doesn't settle on a polite 7. It also says, for each companion, what moved how she feels and why, as tagged reactions (D20) the engine caps. Nothing inside the room depends on it, so it's not the in-encounter judgment of progress that principle 6 rules out. The rating decides how much choice of the next room the party gets, and replaces D131's ending kinds.
10. **What's at stake in the climax,** which the party always gets through. *Recommendation:* how epic the escape is, what the act built up deciding it; a choice at the peak, often between the companions' threads; and a reward pick as the act closes, all landing in the sanctuary scene.
11. **Gold and relics.** *Recommendation:* gold is one number, spent at merchants. A relic is a name and one sentence the DM reads as a fact, maybe with a small declared block (D30), kept for the act. The climax decides how many the player keeps into the next act (0 to about 3), once their strength and how common they are are known. No inventory beyond these.

## Later

Acts 2–5, the open world after Gravenhold (Gravenhold's "open" mode), and the parked features (D24).

- **A vibe at new game start.** The player types an adventure's vibe ("trapped in a creepy noble's masquerade, gothic eldritch horror", "an epic escape from hell"), and the campaign is built from it. Not a different world: the same companions and the same shape of five acts (trapped, crossing the working levels, uncovering the secret, the climax, getting out), with the factions, alarms, acts and enemy generated, and a short pitch the player can reroll. *What it needs first:* each companion's file split into a core that never changes and setting hooks the vibe rewrites in the same shape (Fern's is always "something alive and sacred is being exploited here, and she was caught defending it"). That is the romance pillar's content, so it's real work across every companion.
