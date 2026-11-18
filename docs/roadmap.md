# Roadmap

Phases in order, each with an exit test. **Open questions live only here**, in the phase that has to answer them, each with a recommendation. When one is settled, it moves to `docs/decisions.md` and the spec is updated in the same commit.

**Current phase: 7 (The generator), toward v0.1** (the path is under Open from play). Phases 0–5 are done, and Phase 6 is folded into Phase 7: Act 1 is generated, not written by hand (D115). The game plays one way: the DM rules and the engine keeps the books (D125).

**Combat is decided:** a fight is a plan (D130), and the party always moves on, with how it went moving how they feel (D131). **Phase 7 starts with a rethink of encounter design** (D139), which has settled the campaign's shape so far (D140–D143, `docs/spec/campaign.md`).

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
- **The table** (D127, D128, D132–D138). Built, played once, fixed; its exit (the companions' voices hold, limited abilities hold to their uses) held in the second shakedown. What it left to watch is under Still open from earlier play.

## Open from play

Not gates. Each is answered when play shows it.

### The path to v0.1 (alpha)
Two shakedowns (D174–D187) settled the loop: the room sheet, companions as friends at the table, stakes before the roll, trouble on failure, the pack and carry-over, the map, and the post-mortem fixes. What's left, in order:

1. ~~One leg in the goblin camp~~: played; the act stays a chain of rooms (D188).
2. **Camp in the runner.** Built (D190): the campfire call at campfire rooms and the sanctuary, with beats, journal pages, outfits given from `camp.gifts`, where she stands afterward, the rooms since the last fire, and strong moments kept. The bench's look behind the scene is in the Camp tab (D191). Left: playing it, then reading answers aloud. *Recommendation:* judge in the Act 1 playtest whether the road since the last fire gives her enough to call back (the verdict's reactions may be too thin to recall the moment itself); if it doesn't, the verdict records one line per companion of what she did and what was done for her.
3. **Setup choices.** The class choice (setup is rogue only), the player's pronouns as a role slot filled in code (the companions' files still say "he" in places), and the player's secret by act (`content/setting.js` gates it; nothing writes it yet).
4. **The combat abilities pass** (below, under Combat).
5. **Play Act 1 end to end with camp in it.** The exit: the companions are worth caring about at camp, the DM runs rooms well, nothing breaks across room boundaries, and the act ends wanting Act 2.

**After v0.1:** playing from the prep note instead of the encoded packet (the token refactor); rooms between the fights, or an act that opens on a calm room; a move the DM calls fatal failing forward (the DM says so before it's committed, and if the player goes ahead it costs rather than refuses); separations and post-game acts; the seed's ingredient pools reviewed for premises that are machines; tuning the morale numbers, the pack's size and the ladders.

### Still open from earlier play
- **Taking stock in play (D192).** It's untested whether the stock reply keeps the room's hidden things and a follower's motive to itself, and whether the destination odds bring a follower's goal round at a good pace. *Recommendation:* judge both in the first leg played with it, before changing anything.
- **Memories of rooms in play (D193).** Whether the verdict picks moments she'd really carry, and whether five a leg and five core is the right size. *Recommendation:* judge at the first two campfires before tuning.
- **Pacing and game feel.** *Recommendation:* add nothing until a playtest shows a specific failure, then find its cause before changing anything.
- **Card leaks the engine can't see.** The engine rejects a card that names a hidden thing, but not one that describes it in plain words ("he's got them on his belt"). *Recommendation:* watch for it in playtests before adding anything.
- **The campfire feels like Gravenhold's,** and the three newest companions (Annaleise, Sable, Celeste) play as written. Judged in Camp and in play. Still open from Phase 5: nobody in the roster has dark skin, and Ruby has no quick friend.
- **The campaign turn.** The relationship model counts exchanges with the player (`nextTurn`). *Recommendation:* the page advances it once per player message in the huddle, the Moment or camp, and calls `endEncounter` with the hand-off.
- **Beats outside camp.** Only the campfire reports beats (D80). If playtests show a rupture or a discovery that has to land in an encounter, the companion call is where to add it.
- **Second-voice lines in the huddle.** A private channel gives her second voice's voice, but the companion call's candidates have no speaker. If Ember needs her own lines over the rings, the candidate needs a speaker.
- **Wild Shape's uses.** Fern's file gives it once per encounter and three times per rest, and that's what the engine holds. *Recommendation:* keep the file's numbers until the abilities pass; set `rest: 1` there if twice is too many.
- **Whether the DM records `used`.** It did, the one time it came up. *Recommendation:* keep watching the party's sheet; nothing to add unless a use goes unrecorded.
- **Whether the ledger fills.** It reached 16 of 20 facts in 11 ticks, mostly from resolve recording the card's rulings again, which D138 stops. *Recommendation:* watch the fact count in the developer view; raise `LEDGER.facts` only if a longer encounter fills it with facts that still matter.
- **Whether companions catch too much,** now that each says one thing (D137). *Recommendation:* compare their catches on the bench's flaw cases with the old rates; bring chance back only in a form that never drops an answer to the player.
- **Things that act.** The rats were a thing, and the plan made them act, so the card went back twice. *Recommendation:* the DM can make a thing an actor mid-encounter, as an op the engine records, rather than the generator foreseeing who can be talked into acting.

## Combat

Decided and built (D130, D131). What's left:
- **The combat abilities are redesigned and rebalanced before Act 1 is final.** They're Gravenhold's, written for rounds and HP. *Recommendation:* each says exactly what it does in a beat and what it needs in place, without HP or rounds, and every one creates a decision (an opening, a position, a choice of target) rather than only removing an enemy. Judge them on the bench with fight cards.
- **Whether a fight card feels like homework** in play, against "I hit him" in the Moment. *Recommendation:* watch for it; the card already reads one line the way the player means it (D77).
- **Threats that bind.** *Recommendation:* in playtests, check that an unanswered threat lands as shown and nothing worse, and that the card's notes flag it, before adding anything.
- **The morale numbers** (`content/relationship.js`). Starting values; tune them once the hand-off and campfires play end to end.

## Phase 7: The generator

Generation as `docs/spec/generation.md` describes it: code picks a seed, the sketch call designs the whole encounter in plain English, the encode call turns it into a ruled-mode packet, and code lays it out (D116–D119, D172). It builds rooms (D121) and campfires (D122, D142) into the campaign's one-way legs (D140), and carries attachments and callbacks across the hand-off (D123). Act 1 is generated with it.

**Exit:**
- Generated packets pass validation within one retry, and stay inside the calls' budgets (D76).
- On the bench, ten sketches from the same act read as different encounters, and the designer judges them as good as the worked sketches the rethink produces (D139).
- Act 1 plays end to end from a new game: generated encounters and rooms, a campfire ending every leg, the climax, and every separation resolved before its campfire.

**Built:** the three stages, the room pipeline and the Forge, consolidated and frozen in D172; and the page runs a campaign (D173): verdicts between rooms, the next room generated while the player reads, ways on from calm rooms, relics kept at the sanctuary, a new act after it.

**Still to do**
1. **Play Act 1** from a new game, in a pitched world and in Gravenhold. This is the exit test, the same playtest as item 5 of the path to v0.1 (one run answers both), and it decides what happens to everything else here: a change to generation comes from a failure in play (D172). *Recommendation:* export a post-mortem from the developer view at the end of each room that felt wrong, and note which room and why before reading any call output.
2. **Camp at campfire rooms:** item 2 of the path to v0.1, above.
3. **The ten-room batch,** only if play leaves a question about variety: ten rooms from one world on the Forge, scored against a rubric written before reading them (D172).
4. **Separations and post-game acts,** which the runner doesn't do yet (D173). *Recommendation:* wait for Act 1.
5. **Clean out the engine-era material** the rethink replaces: `fixtures/cells/walkthrough.md`'s old design notes, and the Cells itself once a generated room replaces it (D139).

**Open questions**
0. **Whether D196's rooms are better.** The plain-place rooms are on branch `claude/nifty-cray-a1jrcn`, to compare with `main`. *Recommendation:* the designer runs three very different worlds on that branch's Forge, about five rooms each, and is the only judge: can I follow it after one read, is it the story I asked for, do I know what I want and what I'm up against, and are the five different from each other. Merge, change or drop D196 on that.
   - **How tense a room is** is no longer drawn at all (D197), so strain no longer leans a room toward stress. *Recommendation:* add it back as its own draw only if the batch's encounters all sit at one pitch.
   - **How populated a world is.** The pitch now allows an empty place and a single faction, but the regions still rise from personal to mythic with holders and ladders. *Recommendation:* judge from the three worlds whether a lonely place survives the template before changing it.
   - **Worn-out props** (`content/stale.js`): cages, ledgers and now bells, checked in the pitch, the act and the sketch (D197). *Recommendation:* count how often the check fires in the batch, and look for what in the prompts invites each prop before adding another.
   - **Stranger calm rooms.** Quiet rooms and oddities are set in the act's strange settings, their one draw (D197), and the designer means to push them further. *Recommendation:* a round of its own after the encounters are settled, so the two aren't judged together.
   - **The room's layout, for the map rework.** The first D196 room was a landing halfway up a spiral stair from which the party could somehow see both the top and the bottom, and the designer could not picture it. It isn't known whether the sketch had no real layout in mind or had one and didn't say it. *Recommendation:* when the map is rebuilt (places and connections together), have the layout the player reads and the layout the map draws come from one source, and test it on this case: a stair, a landing and what can be seen from it.
   - **Not always a cell, and no gear to take back.** Every adventure still starts with the party held in a cell and Act 1's job still includes getting gear back (the pitch prompt, `content/setting.js`'s arc, the Cells, and the companions' role nouns such as the prison's master). The designer wants any way of being plainly trapped: a door locked behind them, a ferry that doesn't come for three days. *Recommendation:* its own change, starting from what the companions' files assume.
   - **The narration should carry the room** (the designer's next change). The opening reads as flavour, and the room can only be played from the sheet. It should be the other way round: from the narration alone the player knows what's going on and where everything is, and the sheet is where they look up what's in each place. *Recommendation:* design it as its own change, together with the map rework, since both are about how the player holds the room.
   - **Quiet rooms as curiosities.** A quiet room or an oddity should feel mysterious, odd and magical, a curiosity, never another encounter room with the danger taken out. *Recommendation:* a round of its own, after the encounters settle.
   - **Foreshadowing the climax.** Rooms no longer carry signs of who stands at the act's end, since nobody has been chosen (D197). *Recommendation:* add nothing unless a climax in play arrives from nowhere.
   - **Sameness.** One place and one motif may not be enough to keep an act's encounters apart. *Recommendation:* if the batch's rooms read alike, vary the situation (a wider motif list) before bringing back any image list.
1. **Quality checks.** *Recommendation:* the checks in `docs/spec/packet.md` produce warnings, not rejections, shown on the Forge for the designer, never sent to the sketch as rules (there's no review call to read them, D172). Add one: every route to the objective crossing three or more separate barriers in a row (the slog). Drop any that test triggers, meters or sense links, which packets don't have (D125).
2. **Clocks that aren't a person.** Routines belong to NPCs, so a tide or a bell tower has no home. *Recommendation:* a placed event for a one-off, and a routine on a thing for a cycle, when a generated packet first needs one.
3. **Waiting for the next packet.** A room is two calls, a `complex` sketch and a `default` encode, after the verdict (D173); on the Forge a room takes 75 to 130 seconds, and the act call adds its own at each act's start. *Recommendation:* measure the wait in play before optimizing; the verdict has to come first, since its rating moves the next room's ways on.

## Later

Acts 2–5, the open world after Gravenhold (Gravenhold's "open" mode), and the parked features (D24; photos are on the bench, not yet in play, D170).

- **Judge the pitch on the bench.** The pitch call is built (D151) and offered on the setup screen. Six worlds on the Forge all wrote the same heart and the same two player secrets as Gravenhold, so code now draws their kinds (D172); judge them in play. *Recommendation:* run it on a handful of vibes and companion pairs; read each world against Gravenhold for the frame (a living place much bigger than the party, a heart the factions want, tensions between them), for how well it fits the companions' needs, and for rerolls that really differ. Add a critique call only if the frame is missed.
