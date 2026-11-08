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

- **The player's gender in companion text.** The pitch and Gravenhold now say "they" (D157), but the companions' files still speak of the player as "he" in places (Celeste's first line, "When she sees him"). *Recommendation:* a role slot for the player's pronouns, filled in code like the world's roles (D150), chosen at setup.
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

Generation as `docs/spec/generation.md` describes it: code picks a seed, the sketch call designs the whole encounter in plain English, the encode call turns it into a ruled-mode packet, and code lays it out (D116–D119, D170). It builds rooms (D121) and campfires (D122, D142) into the campaign's one-way legs (D140), and carries attachments and callbacks across the hand-off (D123). Act 1 is generated with it.

**Exit:**
- Generated packets pass validation within one retry, and stay inside the calls' budgets (D76).
- On the bench, ten sketches from the same act read as different encounters, and the designer judges them as good as the worked sketches the rethink produces (D139).
- Act 1 plays end to end from a new game: generated encounters and rooms, a campfire ending every leg, the climax, and every separation resolved before its campfire.

**Built:** the three stages, the room pipeline and the Forge, consolidated and frozen in D170; and the page runs a campaign (D171): verdicts between rooms, the next room generated while the player reads, ways on from calm rooms, relics kept at the sanctuary, a new act after it.

**Still to do**
1. **Play Act 1** from a new game, in a pitched world and in Gravenhold. This is the exit test, and it decides what happens to everything else here: a change to generation comes from a failure in play (D170). *Recommendation:* export a post-mortem from the developer view at the end of each room that felt wrong, and note which room and why before reading any call output.
2. **The campfire conversation at a campfire room.** A campfire is a generated calm room for now (D171); the campfire call (`docs/spec/calls/campfire.md`) and its relationship beats aren't wired to it. *Recommendation:* add it when the first campfire in play feels empty, not before.
3. **The ten-room batch,** only if play leaves a question about variety: ten rooms from one world on the Forge, scored against a rubric written before reading them (D170).
4. **Separations and post-game acts,** which the runner doesn't do yet (D171). *Recommendation:* wait for Act 1.
5. **Clean out the engine-era material** the rethink replaces: `fixtures/cells/walkthrough.md`'s old design notes, and the Cells itself once a generated room replaces it (D139).

**Open questions**
1. **Quality checks.** *Recommendation:* the checks in `docs/spec/packet.md` produce warnings, not rejections, shown on the Forge for the designer, never sent to the sketch as rules (there's no review call to read them, D170). Add one: every route to the objective crossing three or more separate barriers in a row (the slog). Drop any that test triggers, meters or sense links, which packets don't have (D125).
2. **Clocks that aren't a person.** Routines belong to NPCs, so a tide or a bell tower has no home. *Recommendation:* a placed event for a one-off, and a routine on a thing for a cycle, when a generated packet first needs one.
3. **Waiting for the next packet.** A room is two calls, a `complex` sketch and a `default` encode, after the verdict (D171); on the Forge a room takes 75 to 130 seconds, and the act call adds its own at each act's start. *Recommendation:* measure the wait in play before optimizing; the verdict has to come first, since its rating moves the next room's ways on.

## Later

Acts 2–5, the open world after Gravenhold (Gravenhold's "open" mode), and the parked features (D24).

- **Judge the pitch on the bench.** The pitch call is built (D151) and offered on the setup screen. Six worlds on the Forge all wrote the same heart and the same two player secrets as Gravenhold, so code now draws their kinds (D170); judge them in play. *Recommendation:* run it on a handful of vibes and companion pairs; read each world against Gravenhold for the frame (a living place much bigger than the party, a heart the factions want, tensions between them), for how well it fits the companions' needs, and for rerolls that really differ. Add a critique call only if the frame is missed.
