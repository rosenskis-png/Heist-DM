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

### D65. Phase 4 plays the Cells' own party, with relationships held still
**Decided:** The playable Cells use the party the packet places: the player as the rogue, with Fern and Lyra. Setup asks only for a name. Companions talk, take stances and return tagged reactions; the reactions are recorded but not scored, and the relationship tracks stay at their starting values until Phase 5 ports the model.
**Why:** The Cells are built around these three characters' abilities (`fixtures/cells/walkthrough.md`, assumptions). Scoring without the caps, READY and configurations would be half a port. Phase 4 tests the loop, not the romance arc.
**Rules out:** Choosing a class or companions before Phase 5; scoring reactions with part of the model.

### D66. Time spent between plans catches up before a card is made
**Decided:** Checks and conversations add pending ticks. When the player asks for a card, those ticks pass first, one at a time: the world call responds and the narration call tells it. Only then is the plan turned into steps and priced, from that tick. A world turn also follows every executed card and every fight that ends.
**Why:** Pending ticks were applied "at the next world turn", which came after the next plan ran. A plan made after three checks would have started three ticks in the past.
**Rules out:** Pricing a plan from a tick that has already passed.

### D67. In a fight, every declared action gets a band, and the engine deals the damage
**Decided:** Supersedes the moment call's "a band for any unusual action". Each round, the Moment AI gives every action the player declares a kind (strike, ability or other), a target, a band, a reason and both outcomes, and gives each enemy an intent from its sheet, with `yields` when its sheet says it would flee, surrender or bargain. The engine rolls each action against its band; an ability whose conditions are met is automatic. A strike that lands deals 1 damage, or 2 with a real weapon; a strike that misses is hit back for 1. An ability that succeeds takes its target out of the fight. Every enemy nobody engaged hits its target for 1. Enemy HP comes from the sheet or its tier (`content/rules.js`); Gravenhold's DCs aren't used. The fight ends when no enemy is left in it, or when the whole party is down. Ticks accrue on even rounds. Shape: `schemas/calls/moment.js`.
**Why:** One way to roll everywhere (D33). How hard it is to stab a jailer with a bench nail while he swings a club is a judgment. A fixed table from enemy tier to band would make it a lookup.
**Rules out:** DC arithmetic; damage for strikes written by the AI.

### D68. Skill numbers inform the band, never the roll
**Decided:** A character's skill numbers (a class's `mods`, a companion's `skills`) are on the sheets the pricing and moment calls read when they choose a band. The engine never adds them to a roll.
**Why:** D33 made the band the judgment and keeps numbers away from the AI. Adding modifiers to a band's number would bring percentages back by the side door, and the band already has the skill in view.

### D69. A player checkpoint pauses the plan after its step
**Decided:** On the priced card, the player can mark any step except the last as "pause after this step". The plan stops after it as if it had ended there (`checkpoint` in the results), and the world turn runs. Shape: `schemas/card.js`.
**Why:** `docs/spec/ui.md` promised checkpoints, but nothing implemented them. It's the player's one tool against a plan running further than they trust it, and the choice is theirs, not the DM's.

### D70. The player chooses who they're talking to
**Decided:** The Moment tab has an addressee: the DM, or a person the party can see or hear. Questions to the DM cost no time. A conversation with a person costs one tick when it ends: when the player turns to someone else, when a check happens, or when a card is made. During a fight, the tab takes the round's actions instead.
**Why:** The time table charged a conversation "1 when it ends" without saying when that is. Asking the AI would be a judgment it has no information for; a choice the player makes is structure.

### D71. Speed and quality has three positions
**Decided:** Settles D48's map. Faster moves every call one tier down (never below `quick`), Balanced is D58's tiers, and Smarter moves every call one tier up (never above `complex`). Balanced is the default. The choice is kept per player, in their browser.
**Why:** One tier either way is the simplest map that makes the choice mean something. Playtests can move individual calls later.

### D72. The map, the clock and the layout
**Decided:** Settles roadmap Phase 4 questions 2 and 3, as recommended. The map is SVG drawn from the packet's geometry: walls between squares of different zones, each connection in its place (bars dashed, red while locked), the placed things the party can see, the party, and the people the party perceives. Zones the party doesn't know aren't drawn, and a connection into one is a labelled gap. Each level is drawn separately, with the others beside the main one at the same scale. The clock (the tick, each known routine's beat and cue, and known coming events) sits with the map, and its short form is always in the header. On a phone, Plan, Moment and Companions are tabs with unread markers, the map is one tap away, and the card opens as a sheet over Plan. On a wide screen, the map and clock hold a column beside the tabs.
**Why:** The roadmap's recommendations, built as written.

### D73. The Cells packet is content
**Decided:** The Cells packet moves from `fixtures/cells/packet.json` to `content/encounters/cells.json`, and gains a player-facing `name`. Its cards and expected results stay in `fixtures/cells/`. One correction comes with the move: the three party cells and Brannoc's cell see each other across the corridor (`sees`).
**Why:** The game loads it now, and game data lives in `content/`. The opening has the miner pressing his face to his bars across the corridor, but the packet gave no sightline, so the map couldn't show him and the Moment tab couldn't offer him as someone to talk to.

### D74. A save holds the table as well as the engine
**Decided:** Extends D11. A save also holds what the table said (the plan, moment, huddle and private feeds), the draft card with its stances, any open conversation, the exit-test counts and the recorded companion reactions. It doesn't store the packet or the character sheets; they come back from content by id. The replay log (D60) is kept in memory for the session and can be exported from the developer view, but it isn't saved. Saves are three slots per player in the artifact's db, under the player's own private path, falling back to the browser when the db isn't available, with JSON export and import.
**Why:** A reloaded game has to show what everyone said and what the player was drafting, and none of that is engine state, so the replay doesn't cover it. Storing content by id keeps a save well under the db's 256 KiB document limit.

### D75. Ruled mode: the DM rules, the engine keeps the books
**Decided:** A second way to run an encounter, chosen at setup, played against the engine's pipeline until playtests pick one. In ruled mode the DM makes the rulings and the engine keeps them consistent:
- **The card:** one call rules on the plan as a DM would. It sets each step's tick and how long it takes (0 for small things), asks for a roll only where failure is possible and interesting, and states each roll's band and what failure costs. It also writes the rulings the plan depends on, and those hold for the rest of the encounter. It prices from the routines and events the party knows, and the engine rejects a card that names something hidden.
- **The dice:** the engine rolls every roll on the card before anything is played out. The DM never sees the numbers, and a retry never rerolls.
- **Playing it out:** one call sees everything and plays the card against the world as it really is. It honours the dice and the card's stated costs, stops the plan where reality differs, has people act from their sheets, and records every change in the ledger.
- **The ledger:** positions, holdings, flags with any key, hp, moods, who's off their routine, and open facts ("Snag is drunk"). The engine checks only that a change names real things. A DM who moves a person with a routine takes them off it until a ruling puts them back.
- **The engine still owns** the clock, routines for the people following them, placed events (Uzga at 21), dice, and the objective.
- **The Moment** is one call per exchange that rules on questions, talk, quick actions and fight rounds, with checks the engine rolls and the time the exchange took.
- **Off in ruled mode:** triggers, meters, the engine's combat, perception and fit as rules, and one tick per step. A feature the packet doesn't have can be ruled into existence when the player assumes it, against the zone's purpose and fixed facts. This supersedes D29 in ruled mode only; it doesn't add zones or connections to the map.

Contracts: `schemas/calls/adjudicate.js`, `resolve.js`, `scene.js`, and `schemas/ledger.js`. Spec: `docs/spec/ruled.md`.
**Why:** The first two playtests (roadmap, Phase 4 findings) gave no room to play. The correct rat plan lost ticks to dice on trivial steps and one tick per step, and to a door the engine judged unworkable. The improvised game's ideas had no state they could change. Each engine rule was defensible on its own; together they were Gravenhold's competing rules, moved into code. Gravenhold felt like D&D because the DM ruled, and failed because nothing held it to its rulings and nothing made a plan resolve. Ruled mode keeps the plan card that fixed the stall, keeps a written record the DM must stay consistent with, and gives the judgment back.
**Rules out:** Deciding between the two modes without playtests of both.

### D76. Every ruled call has a size budget, and the ledger has limits
**Decided:** In ruled mode:
- **The ledger holds at most 20 facts,** each one line of at most 160 characters, and an output may add at most 6. A fact is how things are now and will matter later, with no other home. What happened is history: each step's account goes to the log. An output that would break a limit goes back for the one retry, with the active fact ids listed so it can retire or replace some.
- **A card's rulings** are at most three lasting truths, and they join the ledger when the plan runs. Its `notes` (why no roll, what the plan leaves out) are shown on the card and then dropped.
- **Calls get the latest,** not all of it: the last 16 log entries and the last 10 lines of texture.
- **Plain text, not JSON:** the encounter and the ledger reach the DM's calls as plain lines, with alike things sharing a line. The packet's reactions come as its prose `notes`, not its triggers and meters.
- **Each call gets its slice:** the card call gets no opening, companions get no log or texture (they get the DM's narration), and the scene call gets no perception table (the DM rules on sight from the map).
- **Every call has an input budget** (`src/ask.js`). A call that crosses its budget still runs, but the page records a warning in the save and shows it in the developer view. `test/budget.test.js` builds a late game with the ledger at its limits and fails if any ruled call goes over its budget.

**Why:** In the third playtest, every late-game call was about 45 KB, and 17 KB of it was 82 "facts". Most were the card's notes about itself ("Calling out needs no roll"), stored permanently, some stale and contradicting the state ("all four doors are still locked" after they were opened). The encounter block was another 16.6 KB of JSON. Calls at the same point are now about 20 KB, and at most 25 KB with everything at its limits. Without limits and a test, the next growth would only show up in someone's usage.
**Rules out:** Unbounded lists in any ruled call's input; storing a card's notes.

### D77. Time is the plan's, talk is free, and ruled deadlines are half as long again
**Decided:** In ruled mode:
- **The card gives each step the tick it happens on and one `ends_at` for the whole plan.** Steps no longer carry durations that add up. A tick is about a minute of real work; talk, small actions and things done on the way take none; crossing the block takes a tick or two.
- **Talk is free in the Moment:** questions, talk and social rolls take 0 ticks; only physical work takes time.
- **The card reads the plan the way the player means it:** if the words say or plainly imply something ("as we escape"), it's in the plan. It still adds no waits, safety steps or better ideas, and keeps mistakes (D35).
- **Every deadline is 1.5 times as far away** in ruled mode (`RULED_DEADLINE`), so Uzga arrives at tick 32, before slack (D41). A starting value.

**Why:** In the third playtest, the escape took 5 ticks: each small action (tying Snag, unlocking, a cut hand) was a step with its own tick, and the card left out the escape the player plainly meant. Cards were remade 20 times as the player cut plans down to fit the clock. Deadlines were sized for the engine's one tick per step (D37), not for a DM's time.

### D78. In ruled mode the account and its narration are one call
**Decided:** The resolve call records what happened first and then narrates it, in the same answer (`narration`, last in its schema). Its texture becomes canon as before. Ruled mode has no separate narration call.
**Why:** One fewer call of about 20 KB per plan. Principle 3's aim, prose that never invents state, is met by order: the record comes first, the prose is written from it, and only the record changes state. The scene call already worked this way, and the third playtest found it consistent.

### D79. In encounters, companions get a brief and where they stand
**Decided:** Supersedes D59's huddle allowlist and narrows D27. In encounters (huddle, private channel, and the DM's calls that voice them), a companion is her brief:
- name, race, role, voice, beliefs, rules, `pursuit`, her `planning` hunch and what she reaches for, skills and abilities;
- her standing with the player: a mood from a fixed list (warm, glad, steady, wary, grumpy, jealous) with why, and up to a few things she has learned.

Her look, fantasy, backstory, secrets and romance arc are for the campfire only. The campfire writes her standing and what she learned (`schemas/calls/campfire.js`); until it's built, every companion is steady.
**Why:** The designer's call (2026-10-30): secrets belong to camp, and in an encounter a companion only needs how she acts, plus a light read of how things stand. The mood list stops at grumpy and jealous, so a bad night at camp makes her prickly, not uncooperative. The brief is about a third of the profile, and it keeps one companion's secrets out of any call the other might share later.
**Rules out:** Secrets, the full fantasy or the payoff scene in any encounter call.

### D80. The relationship model's numbers are content, starting from Gravenhold's
**Decided:** Settles the Phase 5 question on caps. The relationship model is ported from Gravenhold (`newRel`, `computeReady`, `configOf`, `stageLabel`, `progress`, and the scoring in `applyResult`), with its numbers unchanged: per-turn clamps, the +4 per encounter cap on heat and intimacy gains, READY thresholds, reveal gates, stage thresholds and labels, configuration text. All of them live in `content/relationship.js`; the rules that read them are in `src/campaign/relationship.js`. The campfire may also move the pair value, by at most 1 a scene, as her side of how the two companions get on. Beats are reported only by the campfire; the huddle moves tracks through tagged reactions (D20), and hurt comes from those.
**Why:** Gravenhold's numbers are what made its relationships feel right, so they're the starting point, and playtests will tune them. Tuning a number shouldn't mean editing code. Nothing wrote the pair value once the DM stopped scoring every turn.
**Rules out:** Relationship numbers or labels in code.

### D81. Companion special cases are general mechanisms, declared in her file
**Decided:** Settles the Phase 5 question on shapes. Each of Gravenhold's hard-coded special cases becomes a mechanism any companion can declare, checked by `schemas/companion.js` (`docs/spec/companions.md` §6):
- `tie`: she exists in relation to another companion. Its `by` entries, keyed by the other's id, set or extend her fields; `toPartner` goes to the other's call; `triangle` can override the configuration when both are involved and rule out sharing; `required` keeps her out of a party with no matching entry. Lisa's variants and her sister note.
- `secondVoice`: a second character in her, heard only in private, relayed in company, and in her own body only in person once a declared flag is set or due. Nadia's Ember.
- `extraBeats`: a beat of her own with a cooldown in campaign turns. Ruby's storm.
- `stageLabels`: her wording for any stage. Serena's.
- `notes`: text sent only while a relationship gate holds. Fern waiting for interest.

The engine resolves each one for the current party and scene and sends only the result (D59).
**Why:** Gravenhold named Lisa, Nadia, Ruby, Serena and Fern in code (D8). A mechanism with one user still has to be general, or the next companion who needs it means code changes. The designer expects to change looks, personalities and the roster itself before release.
**Rules out:** A special case keyed to a companion id anywhere outside her own file.

### D82. Tests keep the roster open
**Decided:** `node --test` checks every companion file against `schemas/companion.js`, fails if engine code, schemas or prompts name any companion (her id, her name or her second voice's name), builds every allowed pairing's huddle and campfire inputs under the input limit with no engine or UI data in them, and plays a companion who isn't in the roster through a party with no code change. Tests of a declared mechanism find a companion who declares it, so removing her skips the test rather than breaking it.
**Why:** D8 was a rule in a document. Structure over instruction applies to the codebase too: a test fails the commit that breaks it.
**Rules out:** Engine code, schemas or prompts that use a companion as an example, even in comments.

### D83. Personal quests are placed in packets; unwritten pairs start at 0
**Decided:** Settles the Phase 5 questions on companion-driven events and unwritten pairs. A personal quest reaches play only as hidden things and an optional objective placed in a packet when it's written or generated; the companion knows about it through her `quest` field, gated by act. Nothing fires unless it was placed. A pair with no entry in `content/pairs.js` starts at 0, and each companion judges the dynamic from her own profile and the other's public profile.
**Why:** Principle 8: no improvised twists, and a quest that fires on its own is one. A missing pair entry has to be normal, or every new companion needs an entry with every old one (D8).

### D84. The fade comes just before anything explicit
**Decided:** A romantic scene, and above all a payoff, plays out its lead-up: the touch, clothes coming loose, insinuation rather than description. It fades just before it would become explicit, never at the first intimacy. After the fade, a cheeky line or two may wink at what happened without describing it. "Fade" in a companion's payoff scene means that point. The craft is in `docs/design/companion-craft.md` §5; the campfire prompt says it once.
**Why:** The designer's first campfire runs (Phase 5 bench): payoff scenes ended at the first kiss. Every payoff scene ends in "Fade.", and the craft said "write up to the threshold, cut", which the model read as the threshold of intimacy. The target is a non-explicit game romance, written.
**Rules out:** Explicit content; fading out at the first touch.

### D85. Camp with both companions: two calls, alternating, and one of them moves something
**Decided:** When the player sits with both companions, each exchange is two calls, and who answers first alternates by campaign turn. Every campfire answer says what it `advances` between the player and one of the companions (a question, a move, a dare, something pushed), or null. If the first answer moved nothing, the second must: her call is told so, and the engine sends her answer back once if it still moves nothing.
**Why:** The designer's call: these scenes cost two calls an exchange, so each exchange has to go somewhere in the relationships. Alternating keeps one companion from always reacting to the other. A rule in the prompt alone would compete with her fantasy and her waiting nature; telling the second speaker what the first did, and checking it, is structure.
**Rules out:** An exchange at camp with both companions in which nothing moves; a fixed first speaker.

### D86. Outfits are things a companion owns and wears
**Decided:** Each companion owns her usual outfit and any in her file's `wardrobe`, and wears one. She can be given more in play and change into any she owns, from the UI or on the page at the campfire. Every call describes her in what she has on. This state lives with the relationship state (`src/campaign/wardrobe.js`).
**Why:** The designer wants to change what a companion wears in the game and have her description follow. Her `outfit` was fixed text.
**Rules out:** Treating getting wet or torn as a change of outfit (that's texture); outfits as engine items with game effects, until something needs one.

### D87. A second voice may take her own body in any private scene
**Decided:** Refines D81. A companion's second voice may take her own body in any private scene in person, whenever the scene wants it; `manifestsAfter` becomes an optional gate. Her call is told she may, never that she's there. Nadia's file now says what the designer described: Nadia and Ember are perfectly in tune, nothing one does surprises the other, and there's no jealousy between them beyond playing coy. Nadia tells him what Ember likes and wants, in the third person, even when it makes her blush, because that's their deal.
**Why:** The designer's second campfire runs. Ember had been held back until the payoff, which made the payoff her first appearance, and the declared form forced her presence in every private scene after it. And Phase 5's first fix gave Ember tastes framed against Nadia ("anyone who tries to have Nadia without her", "often not what Nadia does"), which, with the profile's old "each secretly wants a little of him alone", produced a jealous push and pull that isn't the character.
**Rules out:** Writing the two as rivals for him, or as surprising each other.

### D88. Camp with both is about the two of them too; each has her own view of the other
**Decided:** Refines D85. When the player sits with both companions, the scene is as much about how the two of them get on as about him. The second picks up the first's thread rather than opening her own, and whatever is between them can come out: friendship, trust, romance, tension, anger over something recent, jealousy, a hint at a secret the other doesn't know, even a fight in camp. Each companion has her own view of the other (−10..10, starting from the pair's `start`), which the campfire moves by up to 2 a scene; the pair value is the two views' average. The campaign's hard limits on party dynamics: nobody dies, and nobody refuses to keep working together, however friendly, romantic, angry or toxic it gets. A fight in camp is narration with relationship consequences, not combat rounds.
**Why:** The designer's third campfire runs. Requiring each answer to move something made the second companion open a new, small question beside the first's instead of answering it, and nothing in the input invited the two to deal with each other. One shared pair value couldn't say that one adores the other while the other is annoyed.
**Rules out:** A scene with both that only talks to the player; a symmetric pair value as the only record of how they get on; a companion leaving the party or dying because of party dynamics.

### D89. A second voice waits for its gate, then chooses
**Decided:** Supersedes D87's first sentence for Nadia. Ember first takes her own body at the payoff (`manifestsAfter: "payoff"` again). After it, in private, she decides each time whether to be in her own body or stay in Nadia's, and may switch mid-scene; her call is told she may, never that she's there. Everything else in D87 stands.
**Why:** The designer's call: the payoff is Ember's first appearance, and afterwards it's her choice.

### D90. A pair can start lopsided, and a gate can read the other side
**Decided:** Refines D88. A pair's `start` in `content/pairs.js` may be one number or each companion's own starting view of the other, keyed by id. Relationship gates (reveal gates and `notes`) can read `fromOther`, how the other companion feels about her, as well as her own `towardOther`.
**Why:** The designer: one companion can like the other while the other dislikes her, from the start. And some character behaviour depends on trust running both ways (Ruby admitting she was wrong in front of everyone), which a gate on her own view alone can't express.

### D91. Gates read her perception of the other, not the truth
**Decided:** Supersedes D90's `fromOther`. Each companion holds her read of how the other feels about her (`readOfOther`). It starts equal to the other's real starting view; after that, only her own campfire output moves it (`read`, up to 2 a scene). Gates read her read, never the other's real feelings, and no call sees the other's real view. The pair can start lopsided as D90 says.
**Why:** The designer's pushback: nothing hits harder than believing trust is mutual when it isn't. A gate on the truth would hide exactly that betrayal; a gate on perception makes it possible.

### D92. Companions feel about each other on three axes
**Decided:** Supersedes D88's single view and the pair value. Each companion holds her view of the other on three axes, `affection` (hate to love), `respect` (contempt to admiration) and `trust` (expects betrayal to would trust with her life), each −10..10, and her read of the other's view on the same three (D91 otherwise unchanged). The campfire moves each by up to 2 an answer. A pair's `start` may give one number (affection) or the axes. A companion may declare `limits` on her view of anyone (a range per axis, a slower pace), and a tie may declare limits toward her partner that last until a named beat. There is no pair value.
**Why:** The designer's runs: one pair number made the companions' feelings about each other shallow, and the interesting dynamics are combinations (loving someone you don't respect, trusting someone you can't stand). Jealousy was considered as a third axis and rejected: it follows from affection plus her belief about him and the other (D96).
**Rules out:** A separate spiral mechanic. Natural friendships and feuds emerge from what each companion does and how the other judges it (`inOthers`, D94); the bench checks that they do.

### D93. Player tracks recover toward a baseline; heat stays fluid after the payoff
**Decided:** After a campfire answer with no change to heat, intimacy or regard, each that is below +2 rises by 1 toward it (`baseline` in `content/relationship.js`). It never pulls a value down. Hurt still needs a repair beat. Heat keeps moving after the payoff, within the same caps; for a companion with `leanFromHeat`, heat gained then also feeds lean.
**Why:** The designer: any history with the player should be recoverable with time and real effort, and each companion has a natural interest in him. Heat frozen at the payoff made a lover's desire unresponsive.

### D94. Her call reads her feelings as words, and judges others by her own standards
**Decided:** Every relationship number reaches her call with a stance sentence from bands in `content/relationship.js` (`stances`). The prompt says feelings decide how she plays her fantasy, that feelings have momentum until something real turns them, and that a contradicted read moves `read` hard. Each companion declares `inOthers` (what earns and wears down each axis in someone else) and `recalibrates` (whether she shows a wrong read or adjusts inside). While she dislikes or distrusts someone, plain niceness earns nothing or suspicion; acting on what she genuinely wants still lands.
**Why:** In the designer's runs, a companion at −10 regard, or at −10 toward the other companion, played as if neutral and warmed to anyone nice. The numbers reached the call bare, and her pursuit text outweighed them. And with feelings ignored, a wrong read could never be contradicted, so there was no surprise.

### D95. Asides
**Decided:** A campfire segment can be an `aside`, meant for the player alone, and the player can whisper to one companion at camp. The other companion's call never sees it. Each aside answer rolls once, seeded, against a small chance by the risk the speaker declares (1, 2 or 4 percent); a caught aside reaches the catcher's next call once, as something she saw that they don't know she saw. A catch is evidence, not confirmation: what she makes of it depends on her trust and beliefs.
**Why:** The designer wants Gravenhold's whispers back (Lisa stealing touches in front of her sister), with a real but rare risk: compounding over a campaign, a larger chance would make getting caught routine.

### D96. Triangles come from what each companion believes
**Decided:** Supersedes the party-level `knows` flag and the tie's `triangle.bothInvolved`. Each companion has `involved` (lovers now: the payoff starts it, a `breakup` beat ends it, `rekindle` restarts it) and believes, about him and the other, `past` (ever involved) and `current` (involved now). Her call can change her beliefs (`believes`), rightly or wrongly. The `in_the_open` beat, with all three present, sets `open` and makes every belief true; `shared` implies it. Her configuration comes from her own involvement and her beliefs: chosen, former, cheatedOn and affair (she knows and it's secret; which depends on who was first), rivals (open), shared, thirdwheel, secondfiddle, ignored, open.
**Why:** The designer: affairs shouldn't run one way, and both companions can be in the dark at once. Configurations computed from the truth told a companion she was being cheated on before she knew (D91's principle, applied to triangles).

### D97. A companion can declare an escalation
**Decided:** Replaces Ruby's storm beat. A companion may declare an `escalation`: a name, tiers from mild to worst, what calms it, and the tier from which she may act physically on the other companion. Her level is state; her call says where it stands after each answer, and it falls at most one level an answer. Her call sees the level and every tier. At that tier, her call may write the other companion being restrained, threatened or held hostage (an exception to "she never writes the other"); nobody dies or is maimed (D88).
**Why:** The designer: Ruby's storms ended after a message or two and were always knives into a tree. They should last, vary, and at their worst be genuinely dangerous: a knife at his throat, the other companion as a hostage.

### D98. A second voice can join a scene in company
**Decided:** Refines D89. A `secondVoice` may declare `inCompany`, a gate. In person, in company, once it holds (and after `manifestsAfter`), she may speak and take her own body. Nadia's gate: his intimacy with her, her trust in the other companion, and her read that the other likes her.
**Why:** The designer: Ember should be able to appear at the group campfire when she feels safe enough with him and the other companion.

### D99. A tie can start both views, mask hers, and hold a secret
**Decided:** A tie may declare `start` and `partnerStart` (both companions' starting views), `mask` (the view her partner believes she holds; the partner's read starts there instead of at the truth), `limits` toward her partner until a beat, `secret` (always in her call, never in the partner's), and `mirrorsWhenOpen` (once everything is in the open, her call gets her partner's pursuit to take up). Lisa now hates her sister and hides it: a per-sister grudge, sweet barbs and stolen asides in front of her, matchmaking out of cruelty with some sisters, and a reconciliation beat that waits for her real view to climb. She still genuinely adores the player.
**Why:** The designer's Lisa: a nearly unforgivable secret grudge, played as the perfect little sister; the hardest companion to truly reconcile with anyone; and when it comes out, half the hurt little sister and half her sister's own pursuit, done better.

### D100. A companion can fix tracks and gate her own fields
**Decided:** A companion may declare `fixed` tracks, which never move (no changes, caps or baseline), and `reveal`, her own gate for any gated profile field, replacing the default in `content/relationship.js`.
**Why:** The coming zealot's heat and regard start at 10 and never change, and her secret must wait far longer than the default hidden gate (intimacy 2).

### D101. Shapeshifting and impersonation
**Decided:** A companion may declare `shapeshift`: what she can do, and `impersonation` alternatives, each a chance and an optional gate. Her form is state: her campfire answer can set it (`form`), and the other companion's call sees her current look. When the player sits with the other companion alone, the engine rolls (seeded) whether the shapeshifter comes in her place; her call is told she's wearing that face and gets only the other's public profile and look, so she can make mistakes. Memories and changes are hers; the other companion's later calls know which turns she wasn't there, so she doesn't play along. Each companion knows whether the other can shift (`knowsShifter`), which only the `unmasked` beat in company sets, and two shapeshifters know each other. A tie entry can `grants` a special case with one partner. Impersonation happens only in scenes alone with him.
**Why:** The designer's shapeshifter: subtly adjusting her looks to learn his tastes, and taking the other companion's face to be close to him in her place or to make her look bad; paired with Lisa, both shift.
**Rules out:** Impersonation in scenes with both companions, where the real one is present.

### D102. The zealot's dark ending is a transformation
**Decided:** D7 stands. The coming zealot's prophecy names the player as the sacrifice that returns her god. Her dark ending is not his death: the ritual happens and he survives as the god's vessel, no longer quite himself, with her as its first priestess. Her light path is choosing the man over the prophecy, which makes her temple an antagonist (NPC agendas, D7). Lisa, as her sister, was raised in the cult and knows how the prophecy ends.
**Why:** The designer chose a dark ending in the ascended-Astarion mould over a betrayal or a backstory she never acts on.

### D103. Annalise, Sable and Celeste replace Serena, Morgana and Lyra
**Decided:** Three new companions, each one fantasy up front, a quick payoff, and depth beyond it (`docs/design/companion-craft.md` §4). **Annalise**, an exchange student from Sévrance: affectionate, giggly, broken English with a consistent Sévrançais glossary, and "misunderstandings" that are mostly deliberate. **Sable**, a changeling: she subtly reshapes herself to learn his tastes and may come in the other companion's place (D101); her name is one she gave herself. **Celeste**, a priestess of the Ordo Luminis, a small, legitimate-seeming order of the light: heat and regard fixed at 10 (D100), and the prophecy's ending held until she's truly close (D102). Lisa has an entry for each as her sister, with her own grudge; with Sable she shares the shapeshifting. Lyra's file moves to `fixtures/cells/` as the Cells encounter's party member, out of the roster.
**Why:** The designer judged Serena, Morgana and Lyra not interesting enough. Names had to work with voice-to-text.

### D104. Text to speech is back
**Decided:** Supersedes D24 for text to speech; photo prompts stay parked. Gravenhold's `Speech` is ported to `src/ui/speech.js`: the browser's own voices, English only, novelties dropped, ranked with downloaded Premium and Enhanced voices first (Apple marks them in the name and voice URI), a distinct voice per speaker, sentence-sized utterances. It's UI code: the engine stays pure (D12).
**Why:** The designer wants companions read aloud, with the iPhone's downloaded premium voices where the browser exposes them.
**Limits:** A web page only gets the voices the browser lists. Safari on iOS lists downloaded voices; an in-app web view may list fewer. Siri's own voices are never available to web pages.

### D105. Annaleise talks like a real native speaker learning English
**Decided:** Refines D103. Annalise is renamed Annaleise (the spelling the designer's voice-to-text produces). Her voice follows how a French native who is a novice in English really talks: present tense for ongoing states, literal phrasing from her language, "the" before general nouns, objects as he or she, a repeated subject, questions by intonation with "no?" or "eh?", false friends, and fillers ("euh", "bon", "alors", "enfin", "voilà", "how you say…"), with any other word from her language very rare. Her file carries the rules and a sample paragraph. Sévrance stands in for France, so its language is French in all but name; the invented glossary is gone.
**Why:** The designer: the broken English didn't sound like a real learner. She's friendly, cool, bubbly, unashamed about learning, très mignonne et très chic.

### D106. Annaleise's English improves with intimacy
**Decided:** Three gated notes in her file: a real beginner's English below intimacy 4, lighter mistakes from 4, and good English with him from 7, where she can still play the lost beginner in front of others. "Oh là là" is out as too cliché.
**Why:** The designer: her English should get better as they get closer. Gated notes (D81) already do this, so it needs no engine change.

### D107. Companions pursue what they want by their own means
**Decided:** Every companion declares `boundaries`, `honesty`, `means` and `whenRefused`: what she does with a no, when she lies, how she gets what she wants, and what she shows and resolves when refused. Fern is the honest baseline; the others disagree with being refused, openly or inside, and keep pursuing. Each campfire answer gives `inner` (what she actually thinks) and may set `agenda`, a private plan the engine carries into her later calls and no one else's. The prompt says her values are hers, not the narrator's, and that an honest boundary doesn't end her pursuit unless her file says so. The bench has the designer's boundary speech as a case for each companion with Fern.
**Why:** The designer: most companions had drifted into healthy, honest, boundary-respecting relationships, but the game is partly about exploring toxic and unhealthy dynamics. Causes: the model's pull toward gracious acceptance, Fern-like values spread across profiles, and no state to carry a private scheme past one answer.

### D108. Asides have kinds, and a catch is just part of the scene
**Decided:** Refines D95. A campfire segment's `aside` is "no" (the shared scene), "action" (something physical out of the other companion's sight, the only kind that can be caught), "ring" (words to the player over the telepathy rings, silent and never caught) or "to_other" (words to the other companion over the rings; the player sees only that something passed between them). At most one of each kind an answer. One catch roll an answer, only for an action, only in company. A caught action reaches the catcher's next call as ordinary scene text, unflagged; her call decides whether it's worth answering. The player's whispers go over the rings and are never caught. The bench marks a catch in orange, for testing only.
**Why:** The designer: telepathy is silent; a catch shouldn't be announced to the catcher; companions should be able to whisper to each other; and a response full of asides shouldn't mean many chances to be caught.

### D109. Storms start from rejection, cruelty has a threshold, and four characters refined
**Decided:** An escalation declares `rises`, what starts and raises it; Ruby's is feeling rejected by him without reassurance, not being upset in general. Every companion has a gated note for when she hates the other enough to be cruel, at her own threshold and in her own way (Fern: only with respect and trust gone, and only blunt truth and withdrawn warmth). Celeste: sweetly innocent and very willing not to be; keeping him sexually satisfied is a vital duty she trained for in a temple that teaches every preference and method of seduction; if he doesn't take her she stays serene outside and grows more desperate and inventive inside, by turns. Ruby gets the fun of her toxic highs: hypersexual play and raw, adoring need. Annaleise keeps the cute-foreigner act until her deep moment, even after the payoff.
**Why:** The designer's notes after playing them in Camp.

### D110. A campfire answer's empty parts are filled before it's checked
**Decided:** Before validation, `fillCampfire` treats an absent optional field as null, an absent list as empty, and a segment with no aside marked as ordinary scene text. Everything else still fails the check and gets the one retry (D13): a wrong value, a missing segment text, a missing inner thought, a beat that isn't allowed.
**Why:** The designer saw a retry on every message. The format reaches the model only as text, and with a dozen required fields, most of them usually null, nearly every first draft left one out, doubling the wait for nothing.

### D111. The latest Camp scene is saved for the design thread
**Decided:** Camp also writes its current scene to one document in the artifact's db (`camp/latest`), which each save overwrites: the scene's settings, the relationship state, and the transcript with every output, problem and retry. Full inputs are kept only for the last two answers. Changing who's at the fire clears the scene, so the document always holds the most recent one and nothing older accumulates.
**Why:** The designer wanted Claude to see the scene being troubleshot, without a pile of old saves.

### D112. The scene before the latest is kept too
**Decided:** Refines D111. Before Camp clears a scene (a new scene at the fire, or starting over), it copies it to `camp/previous`, one slot, overwritten each time. At most two scenes are ever saved.
**Why:** Switching from both companions to one alone cleared a scene the designer wanted Claude to read.

### D113. One continuous Camp chat, and any number of asides
**Decided:** Supersedes D108's limit of one aside of each kind and the scene clearing of D111 and D112. Switching who's at the fire continues the same chat; each entry records who was really present, and a companion's calls never see a private scene she wasn't in (a shapeshifter who came in another's place was there; the one whose face she wore wasn't). An answer may hold several asides; there's still one catch roll an answer, only for hidden actions. `camp/previous` is still written on Start over.
**Why:** The designer: a long scene with both, continued one-on-one, lost all its context; and the aside limit made long whispered exchanges fail outright.

### D114. In encounters a companion is her brief plus the special cases she acts on
**Decided:** Reconciles D79 with D81, which were made on separate branches. In encounter calls (the huddle, private channels, and the DM's calls that voice her), a companion gets her brief (D79) plus the declared special cases she acts on in the scene:
- what she has on;
- her second voice: relayed in company, speaking for itself over the rings in private;
- her shape, and how she looks if she has changed it;
- her tie, without its secret.

Gated fields, notes, her private agenda, a tie's secret and how the partner would take learning it stay at the campfire. Code: `encounterCases` in `src/context.js`.
**Why:** D79 keeps secrets at camp and encounter calls small. Phase 5's special cases were written for the huddle, and some of them are who she is in any scene: someone's sister, what she's wearing, a second voice that speaks for her. Without them she would play as a different person in encounters.
**Rules out:** Gated fields or notes in any encounter call.

### D115. Phases 4 and 5 close, and the generator is next, without hand-authoring Act 1
**Decided:** Supersedes D25. The designer's call (2026-11-03): Phases 4 and 5 are done, and their open questions stay open, answered in play rather than gating the next phase. Phase 6 folds into Phase 7: Act 1 is generated, not written by hand. The Cells stays the only hand-authored encounter. Hand-written material is limited to what the generator needs as worked examples: a few design sketches (D117), which Claude may draft for the designer to judge.
**Why:** The loop is proven on the Cells, and ruled mode (D75) removed most of the engine vocabulary Phase 6 was meant to stretch. Writing every Act 1 packet by hand costs the designer far more than reading generated sketches does. D25's concern, testing the loop and the generator at the same time, is smaller now that the loop has been played.
**Rules out:** Holding the generator until hand-authored packets pass.

### D116. Generated packets are written for ruled mode
**Decided:** A generated packet carries what ruled mode reads (`docs/spec/ruled.md`): the intent, people with sheets and routines, placed events, zones with purposes, connections, things with properties, fixed facts, hidden things, prose `notes` on how people react, and the opening. It writes no triggers, meters or sense-link tables. Engine mode keeps its hand-authored packet, the Cells.
**Why:** Ruled mode is the default (D75), and the third playtest preferred it by a lot. In ruled mode, triggers, meters, perception and fit don't run as rules, and they are exactly the parts a generated packet would most often get inconsistent. Leaving them out also keeps packets inside ruled mode's input budgets (D76).
**Rules out:** Generated encounters in engine mode, unless a later decision adds the formal parts.

### D117. The generator designs the whole encounter first, then encodes it in stages
**Decided:** Generation runs in this order (`docs/spec/generation.md`):
1. **seed:** code picks the ingredients (D118);
2. **sketch:** one call writes the whole design in plain English;
3. **critique:** one call tests the design (D120);
4. **revise:** the sketch call again, given the critique;
5. **encode:** calls that turn the sketch into packet data in stages, the engine validating after each;
6. **layout:** code puts it on the grid.

The sketch and the critique are the generator's own: they are on no play call's allowlist (D59), and the critique's plans are routes, so they are thrown away (`docs/spec/packet.md` §1). The calls are `sketch`, `critique` and `encode`; `encode` replaces the `generator` call name.
**Why:** Interlock needs forward references. The key ring is interesting only because of the jailer's cycle, and the drum only because of the gutter rats. The packet's stages (objective, places, things, clock) are the order to encode and validate in. As a design order they would let each stage connect only to earlier ones, which produces elements that touch nothing. Designing in prose and encoding separately also splits creative work from formal work, as principle 3 splits deciding from narrating.
**Rules out:** Designing an encounter stage by stage in packet order.

### D118. Code picks each encounter's ingredients
**Decided:** The engine draws each packet's seed with the campaign's seeded random generator:
- **the kind:** encounter, room or campfire (D121, D122);
- **for an encounter, its genre** (escape, infiltration, rescue, negotiation with a deadline, a mechanism, a fight with a setup, and the like) and **2–3 motifs** from the motif library (`content/motifs.js`);
- **one or two of the act's mechanics** (`content/setting.js`), and the faction's alarm;
- **whether a callback is allowed** (D123).

It avoids genres and motifs the act has already used. A motif is a short pattern of how a situation is built, such as a needed object that moves between a person and a fixture on a cycle, or an alarm that is a physical thing with a weakness. It describes the world, never the party's routes. The sketch must connect the motifs to each other and may invent at most one element that comes from no motif. The sketch call sees only the chosen genre's promise and motifs, and one worked example of another genre. The library starts from the Cells and the reference encounters in `docs/design/encounter-craft.md`, and grows from generated packets the designer approves.
**Why:** Asked for an encounter with no constraints, a model writes the average one, and the same one again next time: a locked door, a guard, a roll each. Models are good at combining, reskinning and connecting, and bad at inventing a good mechanism from nothing. The table picks the question and the AI answers it, so judgment stays where it matters: interlock, wants and properties. Slicing by genre keeps the prompt small as the range of encounters grows. Showing an example of a different genre teaches the quality bar without the shape to copy.
**Rules out:** An unseeded "write an encounter" call; one generator prompt holding every genre; worked examples of the genre being generated.

### D119. The sketch call's context comes in three tiers
**Decided:**
- **Must honour:** the hand-off (D21), including any attachment (D123), and the one-line stub for the next scene that the exit taken carries.
- **Background:** the act's goal and mechanics, and the encounter log, one line per finished encounter, written by the engine when each one ended.
- **The seed** (D118).

Every packet's exits each carry a one-line stub for the next scene they lead to, so each encounter foreshadows the next.
**Why:** The designer's idea: the generator should know the act's theme and what just happened, without anchoring on it. Telling a model not to anchor is a rule in a prompt, and it half-obeys. Structure does it instead: facts it must keep, colour it may use, and a seed that pushes it away from repeating itself. The log lines already exist and were written at the time. An AI-written "story so far" would be the rolling summary principle 4 rules out.
**Rules out:** A summary of the act written by an AI; an instruction not to anchor.

### D120. The critique plays a clever player, and a revision only cuts or connects
**Decided:** The critique call reads the sketch and the party's abilities. It plays three genuinely different approaches (force, guile, and something odd), each walked clean and messy, and reports:
- a clean run that produces nothing interesting;
- one roll deciding the encounter;
- an approach that hits a wall because nothing in its way has properties to work with;
- one approach that plainly beats the others;
- a party member with nothing only they can do;
- an element no approach touched.

Its plans also count ticks, which sizes the deadline: some exploring plus two recovered failures (D37), in ruled mode's time (D77). The revision may cut, connect or swap an element, never add one. Rooms and campfires skip the critique.
**Why:** `docs/design/encounter-craft.md` §8 asks for two private runs, a clean one and a messy one. That is where an encounter's quality is found, and it needs a separate call to do it honestly. Without the cut-or-connect limit, critique-and-revise loops bloat, which is "add a mechanic to fix it" in miniature; the craft guide found the good versions had fewer branches and more connections. This is not the banned referee AI: it runs before play, and its output never reaches a play call.
**Rules out:** A revision that adds elements; storing or sending the critique's plans.

### D121. Rooms have time when it matters, and one outfit each
**Decided:** Supersedes D22's "no ticks". A room has no objective, danger or deadline, and the party can leave at any time. Time passes with what the party does there (the Moment's time, D77), so a room can place events: at tick 5 the spring starts to glow, the sun sets. A room exists for something: a companion moment, a trade, a discovery, a hint about what's ahead. Mood and a companion moment are enough. Every room except a campfire holds exactly one outfit, themed on the room and placed in it as a thing. Taking it adds it to a companion's wardrobe (`addOutfit`, D86). The generator writes it for a companion in the party, from her file (D8). Outfits are cosmetic.
**Why:** The designer's call (2026-11-03). Gravenhold's rooms were dead air when nothing happened in them. An outfit found in a strange room makes the room memorable, because the outfit carries it.
**Rules out:** Outfits with mechanical effects, for now; rooms with an objective or a deadline.

### D122. A campfire is a room where the party rests
**Decided:** Campfires are rooms (D121) where the party rests. Resting recharges per-rest uses, the campfire scene plays (D45, D113), and relationships move. Each act's sanctuary (`content/setting.js`) is its main campfire, with one or two smaller rests in between. Code places them, never the AI.
**Why:** The designer's call (2026-11-03). One kind of space with one loop is simpler than a separate mode. Placing rests in code keeps the AI from choosing when the party gets relief, which would be pacing by mood.

### D123. What travels with the party lasts one encounter; what the world remembers comes back only through the seed
**Decided:** The hand-off splits in two.
- **Attachments** change who is in the party: an NPC travelling with it, a companion missing from it. An attachment carries into the next packet, which must say how it resolves. The NPC parts ways for reasons of their own; she rejoins when she's rescued, or after a failed rescue at a cost, never for good (D7). A packet that leaves one unresolved is rejected, and the engine drops every attachment when that encounter ends.
- **The world's memory** is NPC fates, who saw the party, grudges and the alert. It is stored, but an NPC from it reappears only when the seed allows a callback (D118).

**Why:** The designer's rule (2026-11-03): an NPC freed in the first room must not guide the party forever. Models keep whatever is in their context, so anything the hand-off carries tends to stay. A rule that nothing unique survives an encounter would also wipe out callbacks, which Act 5's mechanics promise ("allies freed earlier return and enemies spared come back"). Splitting the two keeps both.
**Rules out:** Permanent companions beyond the two; a packet that ignores an attachment it was handed.

### D124. No open spaces
**Decided:** Every encounter and room is bounded. A large cavern, or a field ringed by cliffs, is one large zone with its ways out at the edges.
**Why:** The designer's call (2026-11-03). It keeps every packet inside the size ceiling (D26) and the map's walls honest (D28), and it's where this game's decisions happen.
**Rules out:** Generated wilderness, towns and cities.

### D125. The DM rules: the engine's pipeline is retired
**Decided:** Supersedes D75's choice between two modes. The game is played one way: the DM rules and the engine keeps the books (`docs/spec/engine.md`, `docs/spec/architecture.md`). The engine's pipeline is gone:
- **calls:** step, pricing, world, narration, ruling, and the Moment call that the scene call replaced;
- **the engine as rule-keeper:** projecting and executing plans, routes and fit as rules, perception as a rule, plan conditions, interruptions, reaction triggers, meters and their ladders, the engine's combat rounds, and the table read;
- **in the packet:** triggers and meters. How people react, and anything that used to be a meter, is the packet's prose `notes`, which the DM applies. Sense links are optional, for the DM to read.

Deadlines are written in the DM's time, so the Cells' Uzga arrives at tick 32, and the 1.5 multiplier is gone (supersedes that part of D77).

These decisions now apply only as history: D16, D18, D19, D29, D34, D39, D42, D46, D47, D55, D57, D61, D62, D66 and D67. D51, D53, D54, D56, D63 and D64 now govern only the moves a packet's own rules make, such as a routine's beat or an event. D36's rule lives on in the DM's calls: the card is ruled from what the party knows, and the account plays it against the world as it really is.
**Why:** The designer's call (2026-11-03), after the third playtest preferred the DM ruling by a lot (Phase 4). Keeping both meant every new feature was built twice, and the pipeline's rules were the competing rules principle 1 warns about, moved into code. The engine still owns what code is good at: the clock, routines, placed events, dice, the ledger's consistency, the objective, slack, saves and the hand-off.
**Rules out:** Rebuilding a rule-running engine mode; engine checks that judge whether an action is possible.

### D126. The player chooses both companions, and a packet places them by slot
**Decided:** Supersedes D65 and the part of D103 that kept Lyra as the Cells' party member. Lyra is gone. At setup the player chooses two companions from the roster. A packet never names a companion: it places them by slot (`companion_a`, `companion_b`), and loading binds each slot to the party's companions in order (`bindParty` in `src/engine/load.js`). The Cells puts `companion_a` in the middle cell and `companion_b` in the near cell, and its fail-forward ending takes whoever is in the middle cell.
**Why:** The roster is open (D8), and a packet that names companions works only for that party. The generator needs the same mechanism for every packet it writes (D121).
**Rules out:** Companion ids in packets; a fixed party for any encounter.

### D127. The table: one talk tab, the rings for all party talk, and code decides which calls run
**Decided:** The designer's call (2026-11-03). The next screen build replaces the Plan, Moment and Companions tabs with two:
- **The table,** the main tab: narration, the DM's answers, people talking and the companions chiming in, as one running chat. The player picks who a message is for: the DM, a person in the encounter, or the party.
- **Plans:** the draft, the card, the dice and the outcome. Committing a plan stays a deliberate act with stakes, kept apart from talk.

**Party talk is always over the whisper rings,** as players at a real table talk without the enemies hearing. Only words the player addresses to a person in the encounter are said aloud in the world. Time stays paused while the party talks (the huddle's rule), so deliberation never moves the world.

**Code decides which calls a message runs,** from who it's for:

| The player | Calls |
|---|---|
| asks the DM | the DM's scene call only, on the cheapest tier, with the read-only slice |
| speaks to a person, or does something | the scene call, then the companions |
| talks to the party | the companions only |
| acts in a fight round | the scene call only; the player says what everyone does |
| drafts a plan | the companions react; the card and the account are the DM's calls |

**The companions share one call,** voicing both from their briefs (D79, D114), after the DM's answer, each free to pass. In an encounter both know the same things (the rings pool what the party knows, and secrets stay at camp), so a shared call leaks nothing. The wall that matters, between the DM who sees hidden things and the party who doesn't, stays. A private word to one companion calls her alone.

**A question to the DM gets a slice:** places, ways, things, fixed facts and the ledger, without people's sheets, reaction notes, the timeline or the companions. It changes nothing in the world, so it doesn't need the whole encounter. Anything that changes the world still sees it all (principle 4).

The specs change when this is built (`docs/roadmap.md`); until then they describe what's built.
**Why:** The three tabs split one conversation at the table, and sending every message through every call makes a small question cost as much as a scene. The platform offers no prompt caching (D2), so the levers are fewer calls, smaller inputs and cheaper tiers, chosen by structure rather than judgment. One companion call instead of two halves their cost and lets their lines answer each other.
**Rules out:** The DM writing companions' dialogue; a call that sees both hidden things and a companion's voice; talk at the table that enemies overhear.

### D128. The engine counts ability uses, and rest refills them
**Decided:** The DM's changes gain a `used` list (who, which ability). The engine counts each against the ability's `declared` uses (D30) and sends back one past its limit, for the retry. Every DM call and the character sheet show what's left ("Wild Shape: 0 of 1"). Per-encounter uses refill when an encounter ends, and per-rest uses at a campfire (D122). Whether an ability fits the situation stays the DM's judgment.
**Why:** With the engine's pipeline gone (D125), nothing counted a use, so a limited ability was unlimited, and campfires had nothing to refill. The count is bookkeeping, so it belongs in code (principle 2).

### D129. A packet runs seven operations, and its moves don't route
**Decided:** A packet's events, beats and start can move, give, place, set a flag, reveal, add canon and end the encounter (`schemas/defs.js`). A move puts a person straight into the zone it names. Gone: routes, fit and unlocking in passing for those moves, schedule edits, `until` and its undoing, and the other operations no packet used. D51, D54, D56, D63 and D64 now apply only as history; D53's second size stays, as a fact the DM reads.
**Why:** After D125 these ran only for a routine's or an event's own moves, where they did nothing a DM needs. Fewer shapes also leave the generator's encode call less to get wrong (D117).

### D130. A fight is a plan
**Decided:** The designer's call (2026-11-04). There's no combat mode, and no fight rounds. Violence is steps on a card, ruled, rolled and played out like any other plan (`docs/spec/architecture.md`):
- **The card is a beat of the fight:** what everyone does over the next few moments, with any "if" the player writes. Each blow, shove or trick that could go either way has a roll, and what failure costs is stated before the dice. A beat takes about a tick, so routines, reinforcements and the deadline keep moving, and running away is just a step.
- **The account ends on what's coming.** When anyone is still fighting the party, the resolve call (and the scene call, when a fight starts there) records `threats`: what each one is visibly about to do, as the party sees it. A threat happens unless the next plan stops it, and the card's notes say when a plan leaves one unanswered.
- **Once anyone is fighting the party, what the party does goes on the card.** The Moment still answers questions and talk, but the engine sends back a scene with a check or time in it (`checkScene`). A swing that starts a fight can still be a check there.
- **The party has no HP.** It's harmed only by a failed roll's stated cost, a threat it didn't stop, or a placed event that says so. Hurt is a **condition**: one line on what it stops someone doing, kept in the ledger, carried in the hand-off, and lasting until a campfire or until the DM rules it recovered. **Down** (a flag) is out of the fight: knocked cold, pinned or yielded. If the whole party is down, the encounter ends as **captured** (D131).
- **Enemies have toughness:** the telling blows they can take, from their tier (`content/rules.js`: civilian, minion and guard 1, elite 2, boss 3). The DM writes `wounds`; at none left the engine marks them down. Each sheet's `breaks` says when they stop fighting (yield, flee, bargain), and most fights end there first.
- **An ability used as its sheet says,** with what it needs in place, does what it says with no roll. The abilities themselves are redesigned before Act 1 is final (`docs/roadmap.md`).
- The companions take part through the calls they already have: stances in the huddle before the card, and their reactions to how the party fought (D20).
- The DM calls' size budgets rise from 25 KB to 28 KB, and the companion call's from 20 KB to 21 KB, to hold a fight at its limits (six conditions, a threat from everyone) on top of D76's.

Supersedes D127's "acts in a fight round" row: a fight runs as plans. Gravenhold's Strike, HP and combat rule leave `content/rules.js`, and `hp_below` leaves the condition language.
**Why:** A round in the Moment brought back the exchange-by-exchange loop the plan card was invented to end. Each round was a full-context call for one swing ("I hit him again"), so fights were slow, costly and short of decisions, and HP made them a trade of blows until someone ran out, which fails encounter-craft's test (§1). A fight as cards puts its decisions where the plan card put them for everything else: commit, see the stakes, roll once, play it out against the world as it really is. Telegraphed threats give the player consequences they can partly see, and "the cost you state is the cost the player gets" now covers enemy blows too, so an ambush is fair. Toughness stays in code so the DM can't keep a boss standing forever, but it's small, because fights should end in a few beats. A separate fight mode was rejected because it freezes the world (no reinforcements, no running off); a minigame (a deckbuilder, real-time combat) because the world's details can't get into it and the companions go quiet in it; and zero combat because violence then has nowhere to go in a setting full of enemies.
**Rules out:** Fight rounds; HP for the party; a combat mode or minigame; harm to the party that wasn't stated or shown first; flashbacks.

### D131. The party always moves on, and how it went is how they feel
**Decided:** The designer's call (2026-11-04). **Failing forward never sends the party back.** Reaching the next campfire is never in question; how they arrive is.
- **Every encounter can end as `captured`,** when the whole party is down (D130). The engine ends it, the hand-off says so, and slack rises as it does for a fail-forward ending. The next packet starts from it: taken on to somewhere new, never back to the cell. A packet's own fail-forward ending moves the story on too (`docs/spec/generation.md`).
- **The bill is paid in story, not in permanent loss:** conditions until camp, optional objectives missed, the world's memory, a companion separated. Nobody in the party dies or is maimed, and nothing about a character is lost for good.
- **How the encounter went moves the relationship model** when it ends (`endEncounter`, numbers in `content/relationship.js`): +1 for the objective, 0 for an alternate, −1 for the fail-forward ending, −2 for captured, plus 1 for each optional objective met, kept within ±2. Each point moves every companion's regard for the player, and her affection and trust toward the other companion, by one. Her read of the other's feelings stays hers to revise at camp (D91). The hand-off records the ending's kind and the optional objectives met and missed, as they stand at the end.

**Why:** The designer's aim: a party that wins and takes its chances arrives at camp happier and closer; one that fails every time still arrives, but angry and distrustful. Using the relationship numbers the campfire already reads makes that mood real at camp without a new mechanic or a prompt rule, and its words come from her stances (D94). Sending the party back to the start of something they failed is a treadmill, and losing a character for good breaks the romance pillar (D23).
**Rules out:** A game over; returning the party to an earlier place after a failure; permanent death, injury or penalty for anyone in the party.

### D132. The huddle keeps one shared companion call
**Decided:** The designer's call (2026-11-04), after the bench ran the same huddle cases as one party call and as two companion calls (`docs/spec/calls/party.md`). The party call voices both companions in the huddle, as D127 planned; a private word to one is still her companion call. Its input is about 42% smaller than two calls at the ledger's limits. The game switches to it with the table's tabs (`docs/roadmap.md`).
**Why:** On the bench the two stayed distinct people and still caught the flawed plan's holes some of the time. One hole (the walkout) was never in the line picked across five runs, but it turned up in lines not picked, so that's sample size, not a lost catch. Splitting back into two calls stays open if playtests show the voices blurring or their catches moving together.
**Rules out:** Nothing for good; two calls remain the fallback.
