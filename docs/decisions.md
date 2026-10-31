# Decisions

An append-only log of settled decisions. Each entry says what was decided, why, and what it rules out. Before reopening one, read its "why". To change a decision, add a new entry that supersedes it; never edit an old entry.

When a decision is made, the spec is updated in the same commit. Open questions live in `docs/roadmap.md`, never here.

The design as it stood before the restructure (specs v3 and v4, the engine brief, the original encounter design guide) is preserved on branch `design-archive` (commit `53a65be`).

---

### D1. A new game, built from Gravenhold
**Decided:** We are building a new game on Gravenhold's companions, setting and lessons, with the v4 gameplay. Gravenhold stays untouched and playable in `legacy/`.
**Why:** Gravenhold was the prototype for the companion system, and that system succeeded. The gameplay around it didn't.
**Rules out:** Patching Gravenhold in place.

### D2. Runtime: a claude.ai artifact, with every AI call through `sample`
**Decided:** The game runs as a claude.ai artifact, as Gravenhold did, and makes every AI call through the runtime's `sample` capability.
**Why:** Players don't need an API key, and the platform already works for this game.
**Consequences:** There is no system prompt and no prompt-caching control. `sample`'s `cache` option only replays an identical request's answer for five minutes, so cost is roughly input size × number of calls, charged to the player's own usage. Input is capped at 256 KiB per call. AI judgment can only be tested inside the artifact. See `docs/spec/context.md`.
**Rules out:** A server, the Anthropic API, and v4's claim that turning Gravenhold's `cache` flag on would enable prompt caching.

### D3. The v4 architecture is the basis
**Decided:** The plan card, the three separate interfaces (Plan, Moment, Companions), the encounter packet, and "code computes, AI judges" are the foundation. See `docs/spec/architecture.md`.
**Why:** These answer the root causes listed in `docs/principles.md`.

### D4. Removed from v3, kept out
**Decided:** These are gone and stay gone: the risk budget, phases, overtime caps and floor, the escalation curve and budget extensions, the improvisation allowance, world vs. introduced risk, the odds ledger as a separate structure (rulings and canon cover it), per-risk pause flags (replaced by `stops_plan` on consequences), the reference route as a sizing tool, and the reveal follow-up call.
**Why:** Together they reproduced Gravenhold's competing-rules problem one level up. Pacing and difficulty now come from the intent, the table read and worked examples, judged by the world and pricing calls.

### D5. Living docs with one home per fact
**Decided:** Specs describe only the current design. There are no version numbers in filenames and no "previously" text. Questions go in `docs/roadmap.md`, decisions here, and contracts in `docs/spec/`.
**Why:** Keeping v3 and v4 side by side let stale designs compete with the current one, which is the prompt problem again in document form.
**Rules out:** New `spec-vN` files and briefs that restate the spec.

### D6. Content lives in `content/`
**Decided:** Gravenhold's game data (companions, abilities, pairs, classes, rules, setting) was extracted mechanically into ES modules in `content/`. A script checked the result against the original: every value matches except the betrayal fields (D7). `content/` is now the source of truth for game data.
**Why:** The content is the asset that worked. Locked inside a minified file, it couldn't be read, edited or loaded.

### D7. Companions never betray the party
**Decided:** Betrayal is removed as a mechanic. This removes the betrayal fields (Vesper, Serena), the `betrayal` and `resisted` beats, the "Betrayed" stage, the betrayal odds and the betrayal prompt thread.
**Why:** A product decision (2026-10-30).
**Does not remove:** NPCs acting against the party because of agendas stated on their sheets (`docs/design/encounter-craft.md` §3.5), and relationship damage from a breach of trust (ruptures, hurt).

### D8. The roster is open
**Decided:** Companions can be added or removed. Each companion is one self-contained file plus one line in the registry. Engine code and prompts never name a companion id; companion-specific behaviour is declared as data in her file. See `docs/spec/companions.md`.
**Why:** Gravenhold hard-coded special cases for Lisa, Nadia/Ember, Ruby, Serena and Fern, and kept data tables that grow with every new companion.

### D9. The map shows the exact layout, or there is no map
**Decided:** The packet's structure includes an exact layout (geometry). The engine validates it against the relationships and derives facts from it. The UI draws it, and the AIs receive the derived facts, never coordinates. We never draw a map that is wrong.
**Why:** Gravenhold's map was readable but so far from the real layout that it was useless. Its root cause: the prose was the real layout and the map was a side output.
**Consequence:** If the generator can't produce exact geometry reliably (Phase 7), generated encounters ship without a map rather than with a wrong one.

### D10. No telemetry
**Decided:** Playtest feedback comes from the people playing. The game stores nothing beyond saves.
**Why:** Simpler, and nothing to bloat.

### D11. Saves are state snapshots
**Decided:** A save holds campaign state and the current encounter's state, including its event log. Saves are stored per player in the artifact's `db`, with JSON export and import. Replaying from recorded AI outputs is a test tool kept in fixtures, not the save format.
**Why:** This keeps saves small and loading simple.

### D12. Code shape
**Decided:** Plain ES modules with no build step, published as a multi-file artifact. The engine is pure: no DOM and no `sample`, so the same files run in the browser and in Node tests (`node --test`, no dependencies). The UI is React 18.3.1 UMD (as in Gravenhold) with `htm` for templates. A single-file bundle is the fallback only if multi-file artifacts fail the Phase 0 check.
**Why:** One copy of the code runs everywhere, with no toolchain to maintain.

### D13. Structured output
**Decided:** Calls that return structure use `sample.json`. The engine validates the result, and a failure gets one retry with the errors listed. No `tools` in v1.
**Why:** The engine computes every fact a call needs before the call. Tool rounds add latency and let the AI go looking for things it wasn't given.

### D14. Replay cache by call type
**Decided:** The `sample` replay cache is on for the step, pricing and world calls, and off for the moment, companion, narration, generator and campfire calls. Prompts are still ordered campaign → encounter → live.
**Why:** On the structural calls, identical state and an identical plan should give an identical ruling, and a replay is free. Conversation and prose must not repeat. The ordering costs nothing and helps if the platform caches prefixes on its own.

### D15. Starting model tiers
**Decided:** The generator and campfire start on `complex`; everything else on `default`. Phase 2 compares tiers for pricing and world, and a call moves up only where it measurably fixes misses.

### D16. A step takes place in the tick it starts in
**Decided:** A committed plan's first step happens on the current beat, and the tick advances when a step ends.
**Why:** The spec never said this, and the Cells walkthrough contradicted itself. Under this rule, Card 2 and Lyra's "right now it's the cask" are right. Card 1 has been corrected in `fixtures/cells/walkthrough.md`.

### D17. One condition language, one set of state changes
**Decided:** Conditions are JSON predicate trees (`all`, `any`, `not`, plus a fixed list of atoms), used for objectives, preconditions, triggers, stance triggers and decay blockers. Every state change, whether from a trigger or from an AI's validated output, uses one fixed list of operations. Phase 1 settles the exact lists (drafts in `docs/spec/engine.md`).
**Why:** JSON needs no parser, the AIs already write JSON, and one list of operations means one validator.

### D18. Where engine reactions stop and the world call starts
**Decided:** A reaction is an engine rule if it can be written as condition → operations with no "unless he decides". Anything that chooses between options (how Snag bargains, whether he fights) goes to the world call.

### D19. Distance and senses, minimal
**Decided:** Travel cost is in ticks (D9's geometry adds exact distances for the AIs as facts). Senses are see and hear per schedule beat, plus a light level per zone. Smell, and chase calibration by length, wait for the first encounter that needs them.

### D20. Relationship scoring through tagged reactions
**Decided:** A companion call may return reactions tagged with the profile field they touch, which item, a sign, and an intensity. The engine maps those to track changes within caps. Payoff and beat gating stay in code. See `docs/spec/companions.md`.
**Why:** The companion judges what she feels; the engine does the arithmetic. This keeps Gravenhold's scoring meaning while moving it out of a single overloaded DM call.

### D21. The campaign layer is a hand-off
**Decided:** At the end of each encounter, the engine writes a hand-off object for the next one: alert, days, gear, conditions, NPC fates, companions present, exit used, and the one-line log entry. There are at most two campaign clocks: alert and days.
**Why:** Mirrors "few clock sources" from encounter design.

### D22. Rooms use the same packet
**Decided:** Exploration, social and respite rooms use the encounter packet with `mode: "room"`: no objective, no ticks, no cards. Only the Moment AI and the companions run there.

### D23. Two pillars
**Decided:** The vision names both pillars: companion romance, and tabletop play with a great DM.
**Why:** Gravenhold's stated purpose led with the romance. The new design docs barely mentioned it, and future threads weigh only what's written down.

### D24. Parked features
**Decided:** Photo prompts and text-to-speech are parked; their code and data stay in `legacy/`. Gravenhold's companion special cases come back in Phase 5 as declared data (D8).

### D25. Hand-author Act 1 before building the generator
**Decided:** Act 1's packets are written by hand (with Claude's help) and serve as the quality bar for the generator in Phase 7.
**Why:** It keeps "does the loop work?" and "does the generator work?" from being tested at the same time.
**Not in conflict with "Remove the DM's judgment":** the runtime treats a packet the same whoever wrote it, and the judgment still happens in rulings and texture at play time. What that reflex rejects is replacing judgment with lookup tables.

### D26. Encounter size ceiling
**Decided:** The engine measures each serialized packet and warns above twice the size of the Cells. An encounter that big is split at a doorway.

### D27. The romance floor stays; the stall floors stay banned
**Decided:** A companion always plays her fantasy, per her `pursuit`, in every scene, and a dominant companion leads the conversation and the romance. This governs how she talks and pursues, never the plan or the world. "Push the scene forward", "sometimes just act" and "never hand him the floor" stay banned. The craft lives in `docs/design/companion-craft.md`.
**Why:** Gravenhold's prompt put both kinds under the word "floor", and the restructure banned them together. Only the second kind caused the stalls; the first is part of why the companions worked (D23).
**Rules out:** Companions acting outside the card or pushing the party to act, and companions who wait passively for the player to start every romantic beat (unless waiting is her declared nature, as with Fern).

### D28. Geometry: exact where it's load-bearing, judged everywhere else
**Decided:** The map has three layers of exactness.
- **Topology is exact:** zones, connections and their attributes, which side a barrier is operated from, sense links, travel ticks. The engine's rules run on this.
- **Footprints are exact on a 5-ft grid:** each zone is a list of rectangles, each connection a segment on the wall two zones share (or one square, between levels). This exists so the map is never wrong and the sizes stay consistent. The engine derives sizes and distances from it as facts; nothing is decided from coordinates.
- **Placement inside a zone is exact only where it matters** (the peg 5 ft behind the stool) or where the map should show it. Everything else just sits in its zone, and the AI DM owns the rest as texture and rulings.

Seeing and hearing stay authored per observer and beat. There is no ray casting. The AIs never read or write coordinates: the generator will write topology and approximate sizes, and code lays them out on the grid (roadmap, Phase 7). Sizes and distances reach the player through the same derived facts the AIs get. Format: `docs/spec/packet.md` §3.
**Why:** Gravenhold's map failed because the prose was the layout, not for lack of precision. A grid keeps the map honest and gives the DM fair distances to judge with. Computing perception from it would turn the game into a stealth video game.
**Rules out:** Engine-computed line of sight; coordinates in any AI context or AI output.

### D29. The map is complete: no improvised structure
**Decided:** No AI call can add a zone, a connection or a hidden thing during play. A feature the packet doesn't have doesn't exist: the step call rules it out ("is there a coal chute?" "No."). A hidden feature the packet does have is used and revealed normally. Texture (a candelabra) and rulings about existing things ("one rat can drag the ring") are unchanged.
**Why:** The designer's call (2026-10-30): start with none, and loosen it later for player-initiated or DM-initiated features if playtests want it. It keeps the map fixed while the loop is proven.
**Rules out:** An `add_connection` or `add_zone` operation, for now.

### D30. Abilities declare what the engine tracks
**Decided:** Each ability keeps its prose `effect` for the AIs and gains a `declared` block for the engine: uses per encounter and per rest (null for at will), the state-change operations it applies, whether it's one-way, and traits. So far: Fern, Lyra and the rogue. The rest come with the Phase 5 port.
**Why:** The engine can't check that a rat fits the gutter if Wild Shape is only prose.
**Expected to change** in playtesting. This goes beyond D6's mechanical extraction on purpose.

### D31. Encounter clocks leave room for one recovered failure
**Decided:** An encounter's deadline should fit some exploring plus a plan in which one key roll fails and the recovery is handled well. Two careless failures shouldn't fit. The Cells start at tick 0 on Snag's Drink beat, and Uzga arrives at tick 18 (a starting value; playtests move it).
**Why:** Half of the heist fantasy is the mid-heist adjustment, or the smooth recovery from something that almost blew it. A deadline only perfect play can meet is a puzzle. The old numbers also implied the encounter started at tick 2 without saying so.

### D32. Contracts are schema files, checked by `node --test`
**Decided:** Every contract is a JSON Schema in `schemas/`: the packet, the card, execution results, the shared condition language and operations, and one file per call in `schemas/calls/`. The same files go to `sample.json` and to the engine's validator (`src/validate.js`, dependency-free). `test/contracts.test.js` runs the Cells packet, both cards and their expected results through them. The narration call moves to `sample.json` so its texture comes back as a separate field.
**Why:** "No free-text escape hatches" is easy to fool yourself about in prose. Writing the contracts this way also caught a fixture error: card 2's step 5 happens on Snag's Pace beat, in the corridor he's watching, so he is an observer there, covered by step 4 (the drum is gnawed). The walkthrough and acceptance test now say so.

### D33. The AIs judge difficulty bands, not percentages
**Decided:** The pricing and moment calls return a difficulty band (easy, medium, hard, very hard, near impossible), a one-line reason and the stakes. They never return a number. The engine rolls a d100 against one fixed number per band (`docs/spec/engine.md` §7), and the card shows the band and the stakes, never a percentage.
**Why:** "Easy 80" against "Easy 85" is precision the AI can't honestly have; the judgment is the band, the reason and what failure costs. Percentages on every risk make the card read like a video game.
**Supersedes:** the odds ranges in the pricing call's band table.

### D34. A card shows problems instead of pricing the impossible
**Decided:** The engine projects each step as if the earlier steps' problems were fixed, so one problem doesn't flag every later step. A step with a problem of its own (the keys aren't on the peg at that tick; a trigger fires first) shows the problem and isn't sent for pricing.
**Why:** Card 1 priced walking the party past Snag after the engine had already projected him going for the drum: odds on a step that can't happen as written. The card's job is to surface every timing problem at once (`fixtures/cells/walkthrough.md` §6), and a problem says that better than a long-shot price.

### D35. The player writes the plan, including its timing and conditions
**Decided:** The player writes the plan in prose, usually as numbered steps, and can include timing ("when he sits down, Fern grabs the keys") and conditions ("if the cask is unguarded, she takes the sack; if not, she leaves it"). The step call turns those words into steps with `when` (wait until a condition holds, up to a limit) and `if` / `otherwise` (skip, stop, or do something else). It never adds timing or conditions the player didn't write. A step with no `when` happens right after the previous one. A `when` or `if` may refer only to things the party knows, including routines it has learned. Shape: `schemas/calls/step.js`.
**Why:** When the AI fills in timing, a plan that goes wrong feels like the DM fumbled it; when the player chose it, the mistake and the success are both theirs. Literal steps with no way to say "wait" made plans fail for not being choreographed to the beat.
**Rules out:** The step call inferring "sensible" timing on the player's behalf.

### D36. The card prices the plan the party expects; reality interrupts it
**Decided:** Supersedes D34.
- **The card warns about nothing.** It shows no problems, and never says a step can't happen.
- **Every step is priced at its own honest odds, as the party expects the world to be:** only the observers, barriers and hazards the party foresees, and as if each step's preconditions hold. "She picks the vault lock" is priced as picking the lock, even if a guard the party doesn't know about is about to walk in. Bands stay as in D33.
- **Timing is shown only in terms the party knows** (the beats of a routine it has learned).
- **During execution, the plan stops where reality differs from what the card expected,** before that thing happens: an NPC the party didn't foresee would perceive the step, an effect can't happen (the peg is empty), a hidden fact defeats it, a trigger fires first, or a wait runs out. The earlier steps stand.
- **An unforeseen arrival gets a warning roll.** The pricing call judges its band in advance, unseen. On a success the party hears it coming, and the first step of their next plan happens before it lands. On a failure it lands as the scene opens.
**Why:** The card was an oracle. Reviewing it costs nothing, so a player could probe a schedule the party had never learned by editing plans and reading the problems. Failing in the fiction is play; failing on the card is paperwork. Fairness belongs in the world: anything a plan depends on must be perceivable or learnable before the player commits (`docs/design/encounter-craft.md` §4.3).
**Rules out:** Problems shown on the card; pricing that reflects things the party can't know; hidden rolls for unforeseen observers (they interrupt instead).

### D37. Deadlines leave room for two recovered failures
**Decided:** Supersedes the sizing in D31. An encounter's deadline should fit some exploring plus a plan in which two key rolls fail and both recoveries are handled well. Uzga now arrives at tick 21 (a starting value; playtests move it).
**Why:** With no warnings on the card (D36), more plans fail in the fiction, so recovery needs more room. A failure must still leave a new situation, never a dead end.

### D38. Companions think about plans as biased characters, not reviewers
**Decided:** The companion call no longer receives the draft card. Companions react to a plan only when it comes up in the huddle. Each companion file has a `planning` block: what she reliably sees, what she tends to miss, and the kind of plan she reaches for. Her ideas come quickly and through that bias: often imperfect, occasionally right, never an audit. The craft is in `docs/design/companion-craft.md` §6.
**Why:** A model given the draft card and the facts will catch nearly every hole, which makes the companions a filtered oracle and turns the huddle into a free plan-checker. The fun of the huddle is talking through imperfect plans together, with everyone pointing out flaws and improving them.
**Rules out:** Sending the draft card to companion calls; companions as advisors who always know best, and as foils who are always wrong.

### D39. Someone in the party has to perceive a condition
**Decided:** A plan's `when` or `if` is checked only if a party member can see or hear what it's about at that moment. The whisper rings make sharing free, so it can be anyone in the party. If no one can, the plan is interrupted there (`cant_perceive`): "I can't see into the vault. Can anyone?" The player can prevent that by asking the Moment AI first ("from the doorway, could she see into the vault?"), which answers from the map's sight facts, free and without a roll. Plan conditions can't name things no one could ever perceive (meters, the engine's own bookkeeping); the schema rules them out (`plan_condition`). Party perception rules: `docs/spec/engine.md` §2.
**Why:** Evaluating conditions against the true state let characters act on things nobody could see. Settles the Phase 3 question raised with D35.

### D40. Companions see what the player sees, and say one of three things
**Decided:** Supersedes the part of D38 that kept the draft card from companions. Companions see everything the player sees: the DM's narration, the draft card (the plan being written, with redirected steps and pending stances) and the card as shown once it's priced. In the huddle, the companion call returns three genuinely different things she might say, each with any stance it takes, and the engine picks one at random. A pass can be one of the three. Her `planning` block (D38) still shapes all three.
**Why:** Since D36 the shown card holds only what the party foresees, so seeing it no longer makes her an oracle. What made her too reliable was being asked for her single best answer. Picking one of three makes whether she catches a given hole a matter of chance, weighted by her biases, the way it is with a real friend at the table. The occasional perfect idea still turns up, as one of the three.
**Rules out:** Hiding from companions anything the player can see.

### D41. Hidden slack moves deadlines between encounters
**Decided:** The campaign keeps a hidden `slack` value from −2 (tight) to +2 (loose), starting at 0. When an encounter with a deadline ends, the engine compares the ticks to spare with the deadline:
- the fail-forward ending, or 15% or less to spare: slack +1;
- 50% or more to spare: slack −1;
- anything in between: no change.

When the next packet is loaded, each event marked `deadline` moves by 10% of its tick per point of slack, rounded to the nearest tick. Nothing moves once an encounter has started. All thresholds are starting values.
**Why:** A well-run heist earns a tighter next one, and a rough one a little more room, without either running away. It's applied before play, so every deadline is still written down before the encounter starts (`docs/design/encounter-craft.md` §4.5). It's code computing a number between encounters, not a pacing rule inside one.
**Rules out:** Moving a deadline during an encounter; showing slack to the player.

### D42. A step is priced as if its own preconditions hold
**Decided:** When a step's preconditions won't hold at its tick (the key ring is on Snag's belt, not the peg), the engine tells the pricing call to price the action as if they did ("as if: the key ring is on the peg"), in an internal `as_if` list on the step's facts. "Fern, as a rat, pulls the key ring off the peg" is priced as exactly that. The impossibility shows up only in execution, as an interruption (D36).
**Why:** The price is for the action. A band that says "impossible" because of something the card doesn't otherwise mention would be a warning in disguise.

### D43. Slack runs from −10 to +10, in 2% steps
**Decided:** Supersedes the numbers in D41 (its rules stay). Slack runs from −10 to +10, each point moves a deadline by 2% of its tick (at most ±20%), and the total is rounded once to the nearest tick. It still changes by 1 per encounter, so reaching either end takes many encounters.
**Why:** Finer steps and a slower drift, so one good or bad heist nudges the next without a visible swing.

### D44. Moment records what the party learns, not only through checks
**Decided:** The moment call can return `reveals`: ids of hidden things, routines or coming events the party now knows from the exchange, outside any check ("he walks, sits and drinks, every time," says Brannoc). The engine marks them known.
**Why:** Plan timing (D35) and foreseen observers (D36) depend on what the party knows. Learning it in conversation has to update that state, not only a line of text.

### D45. The campfire is talk and action together, one call per companion
**Decided:** Camp is the one place where the player and a companion talk and act in the moment, with time passing and no world consequences, written as narration, her actions and her dialogue in one flow. A one-on-one scene is one call for her, and the other companion never sees it. When the player sits with both, each companion gets her own call per exchange, in turn, as in the huddle. Every campfire output is about the companion whose call it is. Contract: `docs/spec/calls/campfire.md`.
**Why:** The campfire schema let several companions speak in one call, which would put each one's secrets in the other's context. And camp is where Gravenhold's companions shone, because talk and touch and action happened together; that shape belongs here and nowhere else.

### D46. An interruption happens when someone could first recognize it
**Decided:** The plan stops at the first instant anyone in the party could see or hear that things aren't as the plan expects, not when a character runs into it: the moment the empty peg is in view, not the moment Fern reaches for it. The engine checks before each step and as the actors enter each zone of its route, using the party's pooled perception. The narration gives that moment a few sentences: what they see, how it lands, and where everyone is. Zones can list other zones they see beyond their neighbours (`sees`), so long sightlines are authored, not computed.
**Why:** Noticing the problem only on contact makes characters look oblivious, and wastes moves nobody would have made.

### D47. An interruption needs a step the party can tell will fail
**Decided:** Clarifies D46. The plan stops only when what the party perceives, plus what it knows (learned routines, known events), shows that a *remaining step* won't work. Seeing something different from a snapshot isn't enough. If the plan takes the keys on Snag's Drink and Lyra sees the peg empty during his Pace, nothing stops: the party knows the keys go back on the peg before then. If the step takes them during that Pace, it stops. If the party doesn't know the routine, an empty peg does stop a plan that needs those keys, because from what they know, the plan is broken.
**Why:** D46's wording ("isn't as the plan expects") could stop a well-timed plan at a moment the party fully expected. Recognition means recognizing the plan is in trouble, using everything the party knows.

### D48. Speed against quality is a player setting
**Decided:** Partly supersedes D15. The player chooses, in the game's settings, how to trade speed and cost against quality. Each position of the setting maps every call to one of the runtime's tiers (`quick`, `default`, `complex`). Phase 2 picks that map, call by call, from measured misses on the bench; D15's starting tiers are the middle position until then.
**Why:** Every call is charged to the player's own usage (D2), so how much a smarter DM is worth is their call, not ours. A fixed tier per call would make that choice for every player at once.
**Rules out:** One fixed tier per call for every player.

### D49. Narration paints the scene; precision lives in the map and in answers
**Decided:** Narration, the opening description included, gives the player an intuitive picture of the scene: who is where, what they're doing, what draws the eye, the rhythm of the place. It doesn't inventory it (dimensions, exact placements, every object). Exact details live in the structure: the map shows the layout (D9), and the Moment call answers any question about it straight (`docs/spec/calls/moment.md`).
**Why:** Gravenhold's narration surveyed rooms in feet and lists to stay consistent, and the scene became hard to picture. That consistency now comes from structure, not prose, so the prose is free to do what prose is good at. A detail the narration leaves out is still there, and the player can ask about it.
**Rules out:** Narration as the record of the layout; measurements and inventories in narration.

### D50. A companion's bias is steered, not described
**Decided:** Refines D38. Each companion's `planning` block gains a `hunch`: a belief about the situation, written the way a hint would be ("the way through usually runs through something alive"). Her call is given her `hunch` and `reaches_for`. It is never given `misses` or `sees`: those stay in her file as the designer's description of her bias, and the bench measures her against them. She is asked for her first instinct, not an analysis.
**Why:** Telling a model what a character tends to miss points its attention straight at that thing, so a described blind spot defeats itself. Steering what the model attends to makes it actually miss things in the way she would, rather than acting out a bias it can see past. The aim is to bias the AI's response the way the character is biased, not to have it simulate a biased character.
**Rules out:** Sending `misses` (or any description of her blind spots) to any call; numbers or rolls for how often she is right.

### D51. A move's path names the zones it enters
**Decided:** Each entry in a `move` or `give` path is one crossing, named by the zone it enters, or by the connection crossed where two connections join the same zones. The last entry is the destination. The engine resolves each crossing to its connection and checks that it exists and that everything crossing it fits (`docs/spec/engine.md` §2). A path has at most two entries; without a path, the destination must be the current zone or next to it.
**Why:** On the bench, all five step calls wrote paths as the zones Fern passed through ("gutter", "guardroom"), never as connection ids. The contract said "id" without saying which kind. The AI's judgment is which way to go; finding the door between two zones is the engine's job (principle 2).
**Rules out:** Requiring connection ids where the zones already say which way.

### D52. State uses the packet's words; anything else is canon
**Decided:** A `set_flag` from any call must use a flag key the packet or a character sheet already uses (in a thing's or connection's flags, a condition, a rule, or a declared ability). The engine rejects any other key and sends it back. A new fact the engine has no word for ("the bars are bent apart") is written as canon with `add_canon`, where the AIs read it. An NPC action that changes nothing the engine tracks (he calls out an offer) has empty `ops`; its `because` says what he does.
**Why:** On the bench, the world call invented flags in every run (`offering_deal`, `with_party`, `wants_deal`) to give an action something to change. Nothing in the engine reads them, so they're invisible state that looks meaningful. Flags only mean something when a condition reads them.
**Rules out:** Free-form flag keys; empty-looking state written to make an action feel concrete.

### D53. A lockable connection has a second size for when it's unlocked
**Decided:** A connection with a `locked` flag can give `fits_unlocked`: the biggest size that passes once it's unlocked. While it's locked, `fits` applies. A barred cell door `fits` small (a rat slips between the bars) and `fits_unlocked` medium (a person walks out).
**Why:** The bench's fit check found that the Cells packet's cell doors let a rat through and never a person, even unlocked: one size can't describe both the gaps in a door and the doorway.
**Rules out:** Treating an unlocked door as having no size limit.

### D54. The engine finds the way unless the player names it
**Decided:** Refines D51. A step's move or hand-off carries a `path` only when the player said which way ("down the gutter"). Otherwise the step call leaves it out, and the engine takes the shortest route that everyone moving, and everything they carry, fits through. A route longer than two crossings is more than one step, and goes back to the step call.
**Why:** On the bench, when the plan didn't say which way, the step call routed the iron key ring through the rat-sized gutter in most runs, and its retries split the plan into eleven steps. Finding a route that fits is computation (principle 2); which way to go is the player's call (D35).
**Rules out:** The step call choosing routes the player didn't.

### D55. When a named route doesn't fit, the DM rules on it
**Decided:** When a route the player named fails the engine's size check, the engine asks the ruling call one neutral question: can this thing pass through that connection, in this case? It sees the two descriptions, the sizes, who is doing it and the canon so far, and nothing about the plan. A yes becomes a canon ruling, and the engine lets that thing through that connection from then on. A no leaves the step as written, and reality interrupts it when it's reached (D36).
**Why:** Sizes are four coarse categories, and the fiction is finer (a sack of gear can be passed through bars an item at a time). Asking the plan's own calls invites motivated reasoning; a question with no plan attached doesn't. The thing's own description still wins: the Cells' key ring is written as too big for the gutter.
**Rules out:** Treating the size categories as the last word; letting the step or pricing call overrule them.

### D56. The engine opens doors with keys and splits long moves
**Decided:** Someone carrying a connection's `key` unlocks it as they pass through, without a separate effect. A move longer than two crossings is split by the engine into consecutive steps, each inheriting the step's actors, noise and timing, instead of going back to the step call.
**Why:** On the bench, every card 1 run went back for a retry over one of these: "the rogue unlocks the doors" written without the unlock, and "we go" spanning three crossings. Both are bookkeeping, and a retry costs a whole second call.
**Rules out:** Sending mechanical gaps back to the AI when code can close them.

### D57. The ruling call judges the physical situation, not the size categories
**Decided:** Refines D55. The ruling call gets the objects' descriptions and rough real dimensions (a rat-sized grate is about three inches across; cell bars are about five inches apart), never the size categories or "fits" labels, and returns how it would be done when the answer is yes.
**Why:** Given the categories, it repeated them: in three of three runs it ruled the gear sack "too large for bars that only admit small items." The question is whether it would really work, which the categories can't answer.

### D58. Model tiers: the middle position, and what's still untested
**Decided:** Supersedes D15 for the companion call and settles the middle position of the speed and quality setting (D48). Rulings and the companion huddle run on `quick`. Steps, pricing, world and narration run on `default`. The generator and campfire keep `complex` (D15). The faster and smarter positions move every call one tier down or one tier up from this; Phase 4 tunes them from playtests.
**Why:** On the bench the huddle on `quick` kept the companions' voices, said nothing about game mechanics, and offered the timing hole among a companion's three candidates in every run, so deliberating longer buys nothing a first instinct doesn't (D50). A ruling is one small question. Nothing in the step, pricing, world or narration runs showed a miss that a higher tier was needed for, so none moves up (D15's rule). Pricing, world and narration were not compared against `complex`, and the generator and campfire weren't run at all.
**Rules out:** Moving a call up a tier without a measured miss it fixes.

### D59. Each call's context is an allowlist
**Decided:** Every call is built from an explicit list of what it gets, never by removing a few fields and sending the rest.
- **Companion profiles:** each channel names the profile fields it sends (`docs/spec/companions.md` §3). Fields not on the list never reach a prompt: UI and engine data (`color`, `rate`, `leanFromHeat`) and special cases not yet declared (Lisa's `variants`, Nadia's Ember fields), until Phase 5 resolves the active variant in the engine.
- **Abilities** go to every call as their effect text, without the engine's `declared` blocks (D30).
- **The party's map** has no size categories, which players never see (D57).
- **The world call** gets only the people present, routines as labels, and the ids of the reactions the engine runs, not their rules, senses or beat rules, which the engine has already applied. It returns structure only, so it gets no prose style guide.

The huddle keeps everything a player at the table has, including the map, her look and outfit, and the other companions' abilities (D40).
**Why:** Building by exclusion sent Lisa's full variant text (about 12 KB) on every call, and would send any field added later. The world call was paying for rules that had already run.
**Rules out:** Sending a profile or packet slice "minus a few fields".

### D60. The engine is a reducer, and a replay log is its list of actions
**Decided:** The engine is one pure function, `apply(state, action) → state`. Everything that changes encounter state comes in as an action: loading a packet, a validated AI output, a committed card, ticks passing. State is plain data and includes the random generator's position, so no roll depends on anything outside it. A replay log is what started the encounter (packet, party, campaign values, seed) plus the ordered actions. Applying them again gives deep-equal state, with no AI call. Fixtures may force rolls instead of using the seed.
**Why:** It's how a playtest bug gets diagnosed: a replay shows whether an AI made a bad call or the engine's bookkeeping went wrong, without calling an AI again. The event log (`docs/spec/state.md`) is one line per result, written for the AIs, and can't be replayed. D11 already keeps replays out of saves; this defines what they are.
**Rules out:** State held outside the state object (module variables, the system clock, `Math.random`); a replay that calls an AI.

### D61. NPCs taking part in a plan don't watch it
**Decided:** A step's observers are the NPCs who would see or hear it, except NPCs who act in any step of the same plan. They're with the party for this plan, so they aren't risks the card prices. An NPC the plan leaves out is an observer like any other, and the pricing call judges whether he's a risk.
**Why:** The Cells fixtures never list Brannoc as an observer, though from his cell he sees the corridor Fern runs down. Both cards give him a step (the crusts, walking out). Leaving him off by tier or disposition would be a rule about people; this is a fact about the plan.
**Rules out:** Pricing a plan's own participants as watchers; a packet field that marks NPCs as harmless.

### D62. Recognizing a broken plan takes something seen, not something foreseeable
**Decided:** Clarifies D46 and D47. Before each step and each effect, the engine checks every remaining step that takes an item from where the party last saw it. The plan stops there only if all three hold: the party can see the spot where the item should be; it isn't there; and the routines and events the party knows don't put it back by that step's tick. A problem that's only foreseeable doesn't stop the plan before anyone sees it. Card 1 runs Fern's change on the Drink, even though the party knows the keys go on Snag's belt on his Pace. A problem nobody can see stops the plan at the effect itself.
**Why:** Read literally, D47 would stop card 1 before step 1, because the party knows the routine. But the player committed the plan knowing it too, and D35 keeps a plan's mistakes. The fixture's moment (`card1.results.json`) is when the peg is seen empty. Seeing is what turns a mistake into a recognized one.
**Rules out:** Interrupting a plan for a mistake the party could have deduced but hasn't yet seen; the engine catching a player's mistakes at commit time.

### D63. A key opens a door in passing only when someone needs it open
**Decided:** Refines D56. Someone carrying a connection's key unlocks it as they pass only if something moving with them doesn't fit through it while it's locked. A rat dragging the key ring between the bars leaves the door locked.
**Why:** Unlocking on every pass let Fern unlock the far cell's door while delivering the ring, which set off Snag's `prisoner_loose` trigger a step early. An unlock nobody wrote, and nobody needed, is the step call's job to write, not the engine's.

### D64. Working a door takes hands, from a side it's worked from
**Decided:** Locking, unlocking or otherwise setting a flag on a connection needs one of the step's actors to have hands and stand on a side it can be worked from (`operated_from`, or either side if `reachable_from_other_side`). The same goes for unlocking in passing (D56, D63): whoever carries the key needs hands and must come at it from a workable side. Everyone has hands unless a flag says otherwise; Wild Shape's `declared` block sets `hands: false`, and the packet's rule that ends it gives them back. A step that breaks this isn't sent back to the step call. It's the plan's mistake (D35), and reality interrupts it at that effect (`cant_work`, D36).
**Why:** The designer's ruling: a rat can't turn a key. The engine also wasn't checking `operated_from` at all, though the packet records it for every barrier.
**Rules out:** A rat, or anyone else without hands, unlocking a door; working a barrier from a side it can't be reached from.

### D65. The relationship model's numbers are content, starting from Gravenhold's
**Decided:** Settles the Phase 5 question on caps. The relationship model is ported from Gravenhold (`newRel`, `computeReady`, `configOf`, `stageLabel`, `progress`, and the scoring in `applyResult`), with its numbers unchanged: per-turn clamps, the +4 per encounter cap on heat and intimacy gains, READY thresholds, reveal gates, stage thresholds and labels, configuration text. All of them live in `content/relationship.js`; the rules that read them are in `src/campaign/relationship.js`. The campfire may also move the pair value, by at most 1 a scene, as her side of how the two companions get on. Beats are reported only by the campfire; the huddle moves tracks through tagged reactions (D20), and hurt comes from those.
**Why:** Gravenhold's numbers are what made its relationships feel right, so they're the starting point, and playtests will tune them. Tuning a number shouldn't mean editing code. Nothing wrote the pair value once the DM stopped scoring every turn.
**Rules out:** Relationship numbers or labels in code.

### D66. Companion special cases are general mechanisms, declared in her file
**Decided:** Settles the Phase 5 question on shapes. Each of Gravenhold's hard-coded special cases becomes a mechanism any companion can declare, checked by `schemas/companion.js` (`docs/spec/companions.md` §6):
- `tie`: she exists in relation to another companion. Its `by` entries, keyed by the other's id, set or extend her fields; `toPartner` goes to the other's call; `triangle` can override the configuration when both are involved and rule out sharing; `required` keeps her out of a party with no matching entry. Lisa's variants and her sister note.
- `secondVoice`: a second character in her, heard only in private, relayed in company, and in her own body only in person once a declared flag is set or due. Nadia's Ember.
- `extraBeats`: a beat of her own with a cooldown in campaign turns. Ruby's storm.
- `stageLabels`: her wording for any stage. Serena's.
- `notes`: text sent only while a relationship gate holds. Fern waiting for interest.

The engine resolves each one for the current party and scene and sends only the result (D59).
**Why:** Gravenhold named Lisa, Nadia, Ruby, Serena and Fern in code (D8). A mechanism with one user still has to be general, or the next companion who needs it means code changes. The designer expects to change looks, personalities and the roster itself before release.
**Rules out:** A special case keyed to a companion id anywhere outside her own file.

### D67. Tests keep the roster open
**Decided:** `node --test` checks every companion file against `schemas/companion.js`, fails if engine code, schemas or prompts name any companion (her id, her name or her second voice's name), builds every allowed pairing's huddle and campfire inputs under the input limit with no engine or UI data in them, and plays a companion who isn't in the roster through a party with no code change. Tests of a declared mechanism find a companion who declares it, so removing her skips the test rather than breaking it.
**Why:** D8 was a rule in a document. Structure over instruction applies to the codebase too: a test fails the commit that breaks it.
**Rules out:** Engine code, schemas or prompts that use a companion as an example, even in comments.

### D68. Personal quests are placed in packets; unwritten pairs start at 0
**Decided:** Settles the Phase 5 questions on companion-driven events and unwritten pairs. A personal quest reaches play only as hidden things and an optional objective placed in a packet when it's written or generated; the companion knows about it through her `quest` field, gated by act. Nothing fires unless it was placed. A pair with no entry in `content/pairs.js` starts at 0, and each companion judges the dynamic from her own profile and the other's public profile.
**Why:** Principle 8: no improvised twists, and a quest that fires on its own is one. A missing pair entry has to be normal, or every new companion needs an entry with every old one (D8).
