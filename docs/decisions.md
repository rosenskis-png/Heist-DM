# Decisions

An append-only log of settled decisions. Each entry says what was decided, why, and what it rules out. Before reopening one, read its "why". To change a decision, add a new entry that supersedes it; never edit an old entry.

When a decision is made, the spec is updated in the same commit. Open questions live in `docs/roadmap.md`, never here.

The design as it stood before the restructure (specs v3 and v4, the engine brief, the original encounter design guide) is preserved on branch `design-archive` (commit `53a65be`).

---

## Index

Every entry, and whether it still holds as written: current, changed by a later entry (read both), or archived (only history now, moved word for word to `docs/decisions-archive.md`, D145). Add a line here with every new entry.

- **D1** A new game, built from Gravenhold: current
- **D2** Runtime: a claude.ai artifact, with every AI call through `sample`: current
- **D3** The v4 architecture is the basis: current
- **D4** Removed from v3, kept out: current
- **D5** Living docs with one home per fact: current
- **D6** Content lives in `content/`: current
- **D7** Companions never betray the party: current
- **D8** The roster is open: current
- **D9** The map shows the exact layout, or there is no map: current
- **D10** No telemetry: current
- **D11** Saves are state snapshots: changed by D74
- **D12** Code shape: current
- **D13** Structured output: current
- **D14** Replay cache by call type: current
- **D15** Starting model tiers: changed by D48, D58
- **D16** A step takes place in the tick it starts in: archived
- **D17** One condition language, one set of state changes: current
- **D18** Where engine reactions stop and the world call starts: archived
- **D19** Distance and senses, minimal: archived
- **D20** Relationship scoring through tagged reactions: current
- **D21** The campaign layer is a hand-off: changed by D141
- **D22** Rooms use the same packet: changed by D121
- **D23** Two pillars: current
- **D24** Parked features: changed by D104
- **D25** Hand-author Act 1 before building the generator: archived
- **D26** Encounter size ceiling: current
- **D27** The romance floor stays; the stall floors stay banned: changed by D79
- **D28** Geometry: exact where it's load-bearing, judged everywhere else: current
- **D29** The map is complete: no improvised structure: archived
- **D30** Abilities declare what the engine tracks: current
- **D31** Encounter clocks leave room for one recovered failure: archived
- **D32** Contracts are schema files, checked by `node --test`: current
- **D33** The AIs judge difficulty bands, not percentages: current
- **D34** A card shows problems instead of pricing the impossible: archived
- **D35** The player writes the plan, including its timing and conditions: current
- **D36** The card prices the plan the party expects; reality interrupts it: changed by D125
- **D37** Deadlines leave room for two recovered failures: archived
- **D38** Companions think about plans as biased characters, not reviewers: changed by D40, D50
- **D39** Someone in the party has to perceive a condition: archived
- **D40** Companions see what the player sees, and say one of three things: changed by D137
- **D41** Hidden slack moves deadlines between encounters: archived
- **D42** A step is priced as if its own preconditions hold: archived
- **D43** Slack runs from −10 to +10, in 2% steps: archived
- **D44** Moment records what the party learns, not only through checks: changed by D125
- **D45** The campfire is talk and action together, one call per companion: current
- **D46** An interruption happens when someone could first recognize it: archived
- **D47** An interruption needs a step the party can tell will fail: archived
- **D48** Speed against quality is a player setting: changed by D58
- **D49** Narration paints the scene; precision lives in the map and in answers: changed by D136
- **D50** A companion's bias is steered, not described: current
- **D51** A move's path names the zones it enters: archived
- **D52** State uses the packet's words; anything else is canon: archived
- **D53** A lockable connection has a second size for when it's unlocked: current
- **D54** The engine finds the way unless the player names it: archived
- **D55** When a named route doesn't fit, the DM rules on it: archived
- **D56** The engine opens doors with keys and splits long moves: archived
- **D57** The ruling call judges the physical situation, not the size categories: archived
- **D58** Model tiers: the middle position, and what's still untested: current
- **D59** Each call's context is an allowlist: changed by D79
- **D60** The engine is a reducer, and a replay log is its list of actions: current
- **D61** NPCs taking part in a plan don't watch it: archived
- **D62** Recognizing a broken plan takes something seen, not something foreseeable: archived
- **D63** A key opens a door in passing only when someone needs it open: archived
- **D64** Working a door takes hands, from a side it's worked from: archived
- **D65** Phase 4 plays the Cells' own party, with relationships held still: archived
- **D66** Time spent between plans catches up before a card is made: archived
- **D67** In a fight, every declared action gets a band, and the engine deals the damage: archived
- **D68** Skill numbers inform the band, never the roll: current
- **D69** A player checkpoint pauses the plan after its step: current
- **D70** The player chooses who they're talking to: archived
- **D71** Speed and quality has three positions: current
- **D72** The map, the clock and the layout: changed by D127
- **D73** The Cells packet is content: current
- **D74** A save holds the table as well as the engine: changed by D135
- **D75** Ruled mode: the DM rules, the engine keeps the books: changed by D125
- **D76** Every ruled call has a size budget, and the ledger has limits: changed by D130, D138
- **D77** Time is the plan's, talk is free, and ruled deadlines are half as long again: changed by D125
- **D78** In ruled mode the account and its narration are one call: current
- **D79** In encounters, companions get a brief and where they stand: changed by D114
- **D80** The relationship model's numbers are content, starting from Gravenhold's: current
- **D81** Companion special cases are general mechanisms, declared in her file: changed by D87, D114
- **D82** Tests keep the roster open: current
- **D83** Personal quests are placed in packets; unwritten pairs start at 0: current
- **D84** The fade comes just before anything explicit: current
- **D85** Camp with both companions: two calls, alternating, and one of them moves something: changed by D88
- **D86** Outfits are things a companion owns and wears: current
- **D87** A second voice may take her own body in any private scene: changed by D89
- **D88** Camp with both is about the two of them too; each has her own view of the other: changed by D90, D92
- **D89** A second voice waits for its gate, then chooses: changed by D98
- **D90** A pair can start lopsided, and a gate can read the other side: changed by D91
- **D91** Gates read her perception of the other, not the truth: current
- **D92** Companions feel about each other on three axes: current
- **D93** Player tracks recover toward a baseline; heat stays fluid after the payoff: current
- **D94** Her call reads her feelings as words, and judges others by her own standards: current
- **D95** Asides: changed by D108
- **D96** Triangles come from what each companion believes: current
- **D97** A companion can declare an escalation: current
- **D98** A second voice can join a scene in company: current
- **D99** A tie can start both views, mask hers, and hold a secret: current
- **D100** A companion can fix tracks and gate her own fields: current
- **D101** Shapeshifting and impersonation: current
- **D102** The zealot's dark ending is a transformation: current
- **D103** Annalise, Sable and Celeste replace Serena, Morgana and Lyra: changed by D105, D126
- **D104** Text to speech is back: current
- **D105** Annaleise talks like a real native speaker learning English: current
- **D106** Annaleise's English improves with intimacy: current
- **D107** Companions pursue what they want by their own means: current
- **D108** Asides have kinds, and a catch is just part of the scene: changed by D113
- **D109** Storms start from rejection, cruelty has a threshold, and four characters refined: current
- **D110** A campfire answer's empty parts are filled before it's checked: current
- **D111** The latest Camp scene is saved for the design thread: changed by D112, D113
- **D112** The scene before the latest is kept too: changed by D113
- **D113** One continuous Camp chat, and any number of asides: current
- **D114** In encounters a companion is her brief plus the special cases she acts on: current
- **D115** Phases 4 and 5 close, and the generator is next, without hand-authoring Act 1: current
- **D116** Generated packets are written for ruled mode: current
- **D117** The generator designs the whole encounter first, then encodes it in stages: current
- **D118** Code picks each encounter's ingredients: changed by D139
- **D119** The sketch call's context comes in three tiers: current
- **D120** The critique plays a clever player, and a revision only cuts or connects: changed by D141
- **D121** Rooms have time when it matters, and one outfit each: changed by D143
- **D122** A campfire is a room where the party rests: changed by D142
- **D123** What travels with the party lasts one encounter; what the world remembers comes back only through the seed: changed by D142
- **D124** No open spaces: current
- **D125** The DM rules: the engine's pipeline is retired: current
- **D126** The player chooses both companions, and a packet places them by slot: current
- **D127** The table: one talk tab, the rings for all party talk, and code decides which calls run: changed by D130
- **D128** The engine counts ability uses, and rest refills them: current
- **D129** A packet runs seven operations, and its moves don't route: current
- **D130** A fight is a plan: current
- **D131** The party always moves on, and how it went is how they feel: changed by D146
- **D132** The huddle keeps one shared companion call: current
- **D133** A question to the DM is its own cheap call, and what the answer settles is fact: current
- **D134** The plan is a list of actions, and it stays as written: current
- **D135** A save keeps the replay log and the last call outputs, for a post-mortem: current
- **D136** The opening names everything in sight, without measuring it: current
- **D137** A companion says one thing, and answers what she's asked: current
- **D138** Fixes from the table playtest: current
- **D139** The Cells, the heist and the cavern stop being the model, and encounter design is rethought first: current
- **D140** The campaign is acts of one-way legs, drawn as the party goes: changed by D144
- **D141** Slack, deadlines and the campaign clocks are retired: current
- **D142** Campfires end every leg, at night, with everyone there: current
- **D143** Rooms no longer hold one outfit each: current
- **D144** How the way ahead is drawn, and how a room's exits lead on: changed by D146
- **D145** The decision log has an index, and entries that are only history are archived: current
- **D146** A room's ending is judged by a verdict call, and the rating is a gradient: current
- **D147** Gold and relics: current
- **D148** The climax is always won; its verdict decides what carries into the next act: current

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
*Archived (history since D125): the entry is in `docs/decisions-archive.md`.*

### D17. One condition language, one set of state changes
**Decided:** Conditions are JSON predicate trees (`all`, `any`, `not`, plus a fixed list of atoms), used for objectives, preconditions, triggers, stance triggers and decay blockers. Every state change, whether from a trigger or from an AI's validated output, uses one fixed list of operations. Phase 1 settles the exact lists (drafts in `docs/spec/engine.md`).
**Why:** JSON needs no parser, the AIs already write JSON, and one list of operations means one validator.

### D18. Where engine reactions stop and the world call starts
*Archived (history since D125): the entry is in `docs/decisions-archive.md`.*

### D19. Distance and senses, minimal
*Archived (history since D125): the entry is in `docs/decisions-archive.md`.*

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
*Archived (superseded by D115): the entry is in `docs/decisions-archive.md`.*

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
*Archived (history since D125): the entry is in `docs/decisions-archive.md`.*

### D30. Abilities declare what the engine tracks
**Decided:** Each ability keeps its prose `effect` for the AIs and gains a `declared` block for the engine: uses per encounter and per rest (null for at will), the state-change operations it applies, whether it's one-way, and traits. So far: Fern, Lyra and the rogue. The rest come with the Phase 5 port.
**Why:** The engine can't check that a rat fits the gutter if Wild Shape is only prose.
**Expected to change** in playtesting. This goes beyond D6's mechanical extraction on purpose.

### D31. Encounter clocks leave room for one recovered failure
*Archived (superseded by D37, then D141): the entry is in `docs/decisions-archive.md`.*

### D32. Contracts are schema files, checked by `node --test`
**Decided:** Every contract is a JSON Schema in `schemas/`: the packet, the card, execution results, the shared condition language and operations, and one file per call in `schemas/calls/`. The same files go to `sample.json` and to the engine's validator (`src/validate.js`, dependency-free). `test/contracts.test.js` runs the Cells packet, both cards and their expected results through them. The narration call moves to `sample.json` so its texture comes back as a separate field.
**Why:** "No free-text escape hatches" is easy to fool yourself about in prose. Writing the contracts this way also caught a fixture error: card 2's step 5 happens on Snag's Pace beat, in the corridor he's watching, so he is an observer there, covered by step 4 (the drum is gnawed). The walkthrough and acceptance test now say so.

### D33. The AIs judge difficulty bands, not percentages
**Decided:** The pricing and moment calls return a difficulty band (easy, medium, hard, very hard, near impossible), a one-line reason and the stakes. They never return a number. The engine rolls a d100 against one fixed number per band (`docs/spec/engine.md` §7), and the card shows the band and the stakes, never a percentage.
**Why:** "Easy 80" against "Easy 85" is precision the AI can't honestly have; the judgment is the band, the reason and what failure costs. Percentages on every risk make the card read like a video game.
**Supersedes:** the odds ranges in the pricing call's band table.

### D34. A card shows problems instead of pricing the impossible
*Archived (history since D125): the entry is in `docs/decisions-archive.md`.*

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
*Archived (superseded by D141): the entry is in `docs/decisions-archive.md`.*

### D38. Companions think about plans as biased characters, not reviewers
**Decided:** The companion call no longer receives the draft card. Companions react to a plan only when it comes up in the huddle. Each companion file has a `planning` block: what she reliably sees, what she tends to miss, and the kind of plan she reaches for. Her ideas come quickly and through that bias: often imperfect, occasionally right, never an audit. The craft is in `docs/design/companion-craft.md` §6.
**Why:** A model given the draft card and the facts will catch nearly every hole, which makes the companions a filtered oracle and turns the huddle into a free plan-checker. The fun of the huddle is talking through imperfect plans together, with everyone pointing out flaws and improving them.
**Rules out:** Sending the draft card to companion calls; companions as advisors who always know best, and as foils who are always wrong.

### D39. Someone in the party has to perceive a condition
*Archived (history since D125): the entry is in `docs/decisions-archive.md`.*

### D40. Companions see what the player sees, and say one of three things
**Decided:** Supersedes the part of D38 that kept the draft card from companions. Companions see everything the player sees: the DM's narration, the draft card (the plan being written, with redirected steps and pending stances) and the card as shown once it's priced. In the huddle, the companion call returns three genuinely different things she might say, each with any stance it takes, and the engine picks one at random. A pass can be one of the three. Her `planning` block (D38) still shapes all three.
**Why:** Since D36 the shown card holds only what the party foresees, so seeing it no longer makes her an oracle. What made her too reliable was being asked for her single best answer. Picking one of three makes whether she catches a given hole a matter of chance, weighted by her biases, the way it is with a real friend at the table. The occasional perfect idea still turns up, as one of the three.
**Rules out:** Hiding from companions anything the player can see.

### D41. Hidden slack moves deadlines between encounters
*Archived (superseded by D141): the entry is in `docs/decisions-archive.md`.*

### D42. A step is priced as if its own preconditions hold
*Archived (history since D125): the entry is in `docs/decisions-archive.md`.*

### D43. Slack runs from −10 to +10, in 2% steps
*Archived (superseded by D141): the entry is in `docs/decisions-archive.md`.*

### D44. Moment records what the party learns, not only through checks
**Decided:** The moment call can return `reveals`: ids of hidden things, routines or coming events the party now knows from the exchange, outside any check ("he walks, sits and drinks, every time," says Brannoc). The engine marks them known.
**Why:** Plan timing (D35) and foreseen observers (D36) depend on what the party knows. Learning it in conversation has to update that state, not only a line of text.

### D45. The campfire is talk and action together, one call per companion
**Decided:** Camp is the one place where the player and a companion talk and act in the moment, with time passing and no world consequences, written as narration, her actions and her dialogue in one flow. A one-on-one scene is one call for her, and the other companion never sees it. When the player sits with both, each companion gets her own call per exchange, in turn, as in the huddle. Every campfire output is about the companion whose call it is. Contract: `docs/spec/calls/campfire.md`.
**Why:** The campfire schema let several companions speak in one call, which would put each one's secrets in the other's context. And camp is where Gravenhold's companions shone, because talk and touch and action happened together; that shape belongs here and nowhere else.

### D46. An interruption happens when someone could first recognize it
*Archived (history since D125): the entry is in `docs/decisions-archive.md`.*

### D47. An interruption needs a step the party can tell will fail
*Archived (history since D125): the entry is in `docs/decisions-archive.md`.*

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
*Archived (history since D129): the entry is in `docs/decisions-archive.md`.*

### D52. State uses the packet's words; anything else is canon
*Archived (superseded by D75 and D125): the entry is in `docs/decisions-archive.md`.*

### D53. A lockable connection has a second size for when it's unlocked
**Decided:** A connection with a `locked` flag can give `fits_unlocked`: the biggest size that passes once it's unlocked. While it's locked, `fits` applies. A barred cell door `fits` small (a rat slips between the bars) and `fits_unlocked` medium (a person walks out).
**Why:** The bench's fit check found that the Cells packet's cell doors let a rat through and never a person, even unlocked: one size can't describe both the gaps in a door and the doorway.
**Rules out:** Treating an unlocked door as having no size limit.

### D54. The engine finds the way unless the player names it
*Archived (history since D129): the entry is in `docs/decisions-archive.md`.*

### D55. When a named route doesn't fit, the DM rules on it
*Archived (history since D125): the entry is in `docs/decisions-archive.md`.*

### D56. The engine opens doors with keys and splits long moves
*Archived (history since D129): the entry is in `docs/decisions-archive.md`.*

### D57. The ruling call judges the physical situation, not the size categories
*Archived (history since D125): the entry is in `docs/decisions-archive.md`.*

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
*Archived (history since D125): the entry is in `docs/decisions-archive.md`.*

### D62. Recognizing a broken plan takes something seen, not something foreseeable
*Archived (history since D125): the entry is in `docs/decisions-archive.md`.*

### D63. A key opens a door in passing only when someone needs it open
*Archived (history since D129): the entry is in `docs/decisions-archive.md`.*

### D64. Working a door takes hands, from a side it's worked from
*Archived (history since D129): the entry is in `docs/decisions-archive.md`.*

### D65. Phase 4 plays the Cells' own party, with relationships held still
*Archived (superseded by D126): the entry is in `docs/decisions-archive.md`.*

### D66. Time spent between plans catches up before a card is made
*Archived (history since D125): the entry is in `docs/decisions-archive.md`.*

### D67. In a fight, every declared action gets a band, and the engine deals the damage
*Archived (history since D125): the entry is in `docs/decisions-archive.md`.*

### D68. Skill numbers inform the band, never the roll
**Decided:** A character's skill numbers (a class's `mods`, a companion's `skills`) are on the sheets the pricing and moment calls read when they choose a band. The engine never adds them to a roll.
**Why:** D33 made the band the judgment and keeps numbers away from the AI. Adding modifiers to a band's number would bring percentages back by the side door, and the band already has the skill in view.

### D69. A player checkpoint pauses the plan after its step
**Decided:** On the priced card, the player can mark any step except the last as "pause after this step". The plan stops after it as if it had ended there (`checkpoint` in the results), and the world turn runs. Shape: `schemas/card.js`.
**Why:** `docs/spec/ui.md` promised checkpoints, but nothing implemented them. It's the player's one tool against a plan running further than they trust it, and the choice is theirs, not the DM's.

### D70. The player chooses who they're talking to
*Archived (superseded by D127): the entry is in `docs/decisions-archive.md`.*

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

### D133. A question to the DM is its own cheap call, and what the answer settles is fact
**Decided:** The designer's call (2026-11-04), building D127's first row. A question is the `question` call (`docs/spec/calls/question.md`) on the `quick` tier, not the scene call. It sees the read-only slice: the places, ways, things and fixed facts, with hidden things so it never contradicts them; who's there and the routines the party knows, without their sheets or how they react; the party's abilities and what's left of them; the opening; the ledger without its event log; and the DM's recent answers. It returns the reply, `rulings` and `learned`, and nothing that moves the world: no checks, changes, threats or time. **Each ruling is a fact the party knows**, so it joins the ledger and every later call reads it as true, the card included. A question that needs a look or a roll gets what the party can tell from where they are; doing it is the player's move ("Do something"), which is the scene call. The engine rejects an answer or a ruling that names something the party hasn't found.
- The party's abilities are in the slice although D127 left the companions out: "could she fit through as a rat?" is the commonest question about a plan, and the DM can't answer it without them. Their voices and briefs stay out.
- The input is 19.9 KB with the ledger at its limits, against the scene call's 26.3 KB, under a budget of 21 KB. Most of the saving is the tier.
**Why:** The designer asked that whatever the DM answers becomes canon for that encounter, and that the card is priced on it. The ledger's facts are already what every call treats as true and what the card is priced from (principle 7), so making the answer's rulings facts gets that without a new store or a prompt rule. A separate call keeps the schema from offering a question the means to change the world.
**Rules out:** Answers that are canon only while they're still in the recent exchanges; a question that rolls, moves anyone or passes time.

### D134. The plan is a list of actions, and it stays as written
**Decided:** The designer's call (2026-11-04). The draft is an ordered list of actions, each in the player's words. Enter adds one; nothing is sent. On the Plans tab the player can reorder, edit or delete any action, clear the whole plan, talk it over (said over the rings, and both companions react), or make the card. Every call reads the list as one numbered plan (`planText` in `src/game/draft.js`). **The list stays as written** after the plan runs and across tabs, so it can be reused or cleared; only the stances on it go when it runs. A card made from a list that has changed since can't run until it's made again. A plan the DM sends back from the table, or one pasted as numbered lines, becomes one action per line.
**Why:** Writing a plan as one block of text made it hard to fix one step or reuse a plan that half worked. Code keeps the list, so editing it costs nothing, and the DM still reads the player's own words in their order (D35).
**Rules out:** A card priced from a plan the player has since changed; the draft clearing itself when a plan runs.

### D135. A save keeps the replay log and the last call outputs, for a post-mortem
**Decided:** The designer's call (2026-11-04), settling the roadmap's "call records for playtests". Supersedes D74's "the replay log isn't saved". A save keeps the replay log (D60) and the last 40 call outputs: for each, the call, tier, tick, size, time taken, output, any problems, and the first try when it was sent back. **It never keeps an input.** If the save would pass 200 KB, the oldest outputs are dropped first. The developer view exports the whole save for a post-mortem.
**Why:** The first playtests' post-mortems could see what happened but not what each call said, so a wrong ruling couldn't be traced to the call that made it. Outputs are small and inputs are large, and the input can be rebuilt from the replay log. D10 still holds: this is the player's own save, and nothing leaves it unless they export it.
**Rules out:** Keeping inputs in the save; sending call records anywhere.

### D136. The opening names everything in sight, without measuring it
**Decided:** The designer's call (2026-11-05), refining D49. The opening names everything the party can make out from where they start that a plan could use: every person in a zone they see, every thing in their own zones or one they see, and every barrier out of their own zones (`inSight` in `src/engine/perceive.js`). Each gets a phrase woven into the picture. Three limits keep it from becoming an inventory: it says a thing exists, never its measurements ("an iron grate in the floor", not its three-inch gaps); it says what's there, never what it's for ("something small scrabbles down there", not "rats that work for bread"; "a sack under the table", not "a sack that clinks like your gear"); and everything usable gets the same weight, so the opening doesn't point at one solution. Set dressing is optional; hidden things and what a person carries stay out. `openingMisses` checks it by name, and the Cells' opening is rewritten to pass.
**Why:** The table playtest's opening described Snag's routine and never mentioned the grate, the gutter, the buckets or the bench, so the plan that won rested on a guess. D49 moved two jobs to the map: precision, which belongs there, and existence, which doesn't, since players plan from the prose and the map is behind a tab on a phone. Gravenhold's problem was measurements and lists, not naming what's there.
**Rules out:** An opening that leaves out a usable thing the party can see; an opening that says what a thing is for.

### D137. A companion says one thing, and answers what she's asked
**Decided:** The designer's call (2026-11-05), after the table playtest. Supersedes D40's pick of one of three: the party call returns one exchange and the companion call one message (or a pass). If the player just said something to them, they answer it; a question gets an answer and a correction is taken on board. When the player's line names a companion, code says so in the party call's input, and she answers it herself. The rest of D40 stands: companions see everything the player sees. Whether she catches a hole in a plan now depends only on where her biases point (D50).
**Why:** In the playtest, every bad companion moment had a better answer in a candidate the pick threw away: a correction talked past ("Feed them first, I said," after the rats had eaten), a question to Nadia answered by Fern, a wrong fact from the one candidate of three that misread the routine. D40 made catching a hole a matter of chance, but when the player asks or corrects, chance decided whether she heard him at all. Writing three exchanges to show one also made the party call the slowest per use (18.5 s on `quick`, 185 of the session's 480 s of waiting). The recommendation was to keep chance in whether she raises a stance; it isn't kept, because a stance comes from her beliefs and limits, and she shouldn't hold them on a coin flip. If playtests show companions catching too much, chance comes back in a form that never drops an answer to the player.
**Rules out:** Picking among candidates at random; a companion talking past what the player just said to her.

### D138. Fixes from the table playtest
**Decided:** The designer's call (2026-11-05).
- **A message whose call failed** is marked failed. No later call reads it, and the page offers to send it again or remove it. Settles the roadmap's "a failed call left its message behind."
- **The resolve call reads the card's rulings as facts in the ledger,** not as part of the card, so it doesn't record them a second time.
- **Steps after a stop** may be listed as not having happened, with no changes; the engine drops them. Any other step after the stop goes back, with a message that says to leave it out.
- **A fact's text and a threat's line** may be 200 characters, up from 160 and 100.
- **Nadia passes on Ember now and then,** and most of what she says is her own; asked something, she answers it herself. Her file's `relayed` says so.
**Why:** In the playtest 9 of 32 calls needed a retry and 3 failed, wasting 28% of the input sent. The stop check rejected a correct answer (later steps marked "no") twice in a row; the caps were overrun by 7 to 57 characters, so the model's natural length was costing a whole call each time; the duplicate fact was the card's ruling written again by resolve in the same plan; a failed message was resent, so every later call read it twice. Nadia began 17 of her 22 drafted lines with "Ember says": her file said Nadia talks about Ember "freely," and the model made it every line.
**Rules out:** A check that rejects a correct account; a cap the model routinely overruns.

### D139. The Cells, the heist and the cavern stop being the model, and encounter design is rethought first
**Decided:** The designer's call (2026-11-05). Supersedes D118's "the library starts from the Cells and the reference encounters." Encounter design is rethought for a game where the DM rules, before the motif library is built: what makes a good encounter in this world, from first principles, with the heist and the cavern rethought too. The rethought design replaces the references the generator learns from, and its worked sketches become the standard Phase 7's exit judges against. The Cells stays playable as the test bed for the table and the calls until a generated encounter replaces it. Nothing is hand-built to replace it (D115).
**Why:** The Cells was built when the engine judged outcomes, as a stealth puzzle. Its properties are rulings that open routes ("several rats can carry it quietly"), each cell has one job, and it has one antagonist, one alarm and one deadline, so one bypass emptied the whole threat in the playtest. Its best moments (Snag haggling, then surrendering) came from a sheet and the DM's judgment, not from its structure. A library built from its motifs would reproduce it.
**Rules out:** Building the motif library or the worked sketches from the Cells, the heist or the cavern as they stand.


### D140. The campaign is acts of one-way legs, drawn as the party goes
**Decided:** The designer's call (2026-11-05), from the encounter rethink (D139). An act is a run of legs, then its climax, then its sanctuary. A leg is a run of rooms ending at a campfire. Each room leads on through one of its exits, and the party never goes back. No map is built in advance: when a room is written, code draws the kind of room each exit leads to (an encounter, a quiet room, a merchant, something odd, a campfire or the climax) from the act's weights, and counts the rooms left in the leg and the legs left in the act, so a campfire ends every leg and the climax ends the act. The player sees only the exits from where they are, each one feeling different in the fiction, and is told plainly what they lead to only when the party has earned a choice. Nothing two rooms ahead is shown. The act builds toward its climax by subtle foreshadowing, never by announcing it. How well a room went decides how much choice the party gets of the next one, and momentum may build either way within a leg. Every act is an escape from part of a much larger place with its own life, which starts small: a cell inside an enemy fortress. Spec: `docs/spec/campaign.md`.
**Why:** A whole node map built at the start would need its own checks to guarantee campfires and a climax, and the way ahead here is a tree that keeps branching rather than a few paths that cross, so a map would be mostly branches nobody takes. Counting does the guaranteeing, and drawing each exit's kind when its room is written keeps each room just in time, built from what actually happened. One-way is what makes "you can't have everything" bite: a room left behind is gone. The place having its own life keeps every room from being more guards looking for the party.
**Rules out:** A map of the act built in advance; showing the player more than the exits in front of them; going back to an earlier room; an act designed as a list of rooms.

### D141. Slack, deadlines and the campaign clocks are retired
**Decided:** The designer's call (2026-11-05). Supersedes D21's two campaign clocks (alert and days), D41 and D43 (slack), and the deadline sizing in D31, D37 and D120. The engine no longer has slack, and a packet's events no longer have a `deadline` flag; an event still happens at its tick. The hand-off no longer carries alert, days or the ticks to spare. Nothing counts against the party across rooms. Pressure lives inside each room, and anything hidden and gradual is a slow gradient the fiction shows, never a counter with a threshold.
**Why:** Slack tightened the next deadline after a good encounter, which is a rubber band, and works against the momentum the campaign now allows within a leg (D140). A deadline as a hard cliff felt unfair: the DM rules how long a plan takes, so the player can't know whether a plan crosses the line until it runs. An alert that rises and triggers when full is a failure counter hanging over the party, and when something raises it, it doesn't feel fair. Days were never used.
**Rules out:** A campaign-wide alert or failure counter; deadlines that move between encounters; sizing an encounter around a deadline the party has to beat.

### D142. Campfires end every leg, at night, with everyone there
**Decided:** The designer's call (2026-11-05). Refines D122 and supersedes D123 for a missing companion. A campfire ends every leg (D140), and the act's sanctuary is its main one. A campfire is a night: the party sleeps and wakes to morning. Every companion is present at every campfire: a separation (captured, split up, sent away) resolves before the leg's campfire, and code doesn't let one start where it couldn't. A campfire is downtime and a fresh start, never a trade-off between resting and something else. Hurts, per-rest uses and the leg's momentum reset there. How the companions feel, memories, commitments, companion goals, outfits and the world's memory carry for the whole game.
**Why:** The campfire is the breath of fresh air: the time to talk with the companions, and the reset that keeps a run of bad luck, or of good luck, from deciding the rest of the act. A companion missing from a campfire would lose the scene the romance pillar depends on (D23).
**Rules out:** Rest-or-upgrade choices at a campfire; a campfire with a companion still missing; resetting anything about the relationships.

### D143. Rooms no longer hold one outfit each
**Decided:** The designer's call (2026-11-05). Supersedes D121's rule that every room except a campfire holds exactly one outfit. An outfit is one kind of reward, placed where it fits. The rest of D121 stands.
**Why:** One outfit per room was too generous and too fixed for a reward meant to be scarce enough to matter.
**Rules out:** Requiring an outfit in any room.

### D144. How the way ahead is drawn, and how a room's exits lead on
**Decided:** Builds D140, with starting values in `content/setting.js` (`way`). A leg is three rooms. Each room that goes rough adds one more, at most two a leg, and only while the leg has rooms left: once a room's exits lead to the campfire, the campfire is in sight. Every act has at least two legs (Act 1: 2; Acts 2 and 3: 3; Acts 4 and 5: 2), so every path has a campfire before the climax as well as the sanctuary after it. Each act opens on an encounter. Each exit's kind is drawn by weight (encounter 6, quiet room 2, something odd 1, merchant 1): a calm room (quiet, odd or a merchant) never follows another, a leg has at most one merchant, and a room's exits differ in kind where they can. A packet's exits (`intent.exits`) each name the zone the party leaves from, the kind of room code drew for it, and its stub (D119). The hand-off names the exit the party left by when they all ended in its zone (`way_on`). Otherwise (captured, or the ending carried them off) code picks one of the room's exits and marks it forced. Whether a room went rough is an input that the judging of a room's ending will supply (roadmap). Code: `src/campaign/way.js`. Supersedes each act's minimum number of encounters.
**Why:** The designer asked for one or two campfires on every path and for a rough stretch to take longer. Counting gives both without a map. A rough room lengthening the leg is momentum running downhill, and the campfire resets it (D142). The kinds' rules keep tension in a leg (no two calm rooms in a row) and keep a merchant special. Choice of exit is earned in the fiction: the party leaves by an exit they managed to reach, and a room that ended without them reaching one has its way on chosen for them.
**Rules out:** A path through an act with no campfire before the climax; a rough room pushing back a campfire its exits already lead to; code choosing the way on when the party reached an exit.

### D145. The decision log has an index, and entries that are only history are archived
**Decided:** The designer's call (2026-11-05). `docs/decisions.md` opens with an index: every entry by number and title, marked current, refined (with the entries that change it) or archived. Entries that now apply only as history, because they were wholly superseded or describe the retired engine pipeline (D125, D129), move word for word to `docs/decisions-archive.md`, and each leaves its heading and a one-line pointer in the log. An archived entry still isn't edited; it's only moved. A test checks that the index lists every entry and that every pointer's entry is in the archive.
**Why:** Every thread reads the whole log, which had grown to about 740 lines, about 30 of its entries now only history. Moving them keeps their "why" (the lessons that stop old ideas coming back) without making every thread read them, and the index shows at a glance what still holds.
**Rules out:** Deleting a decision; editing an archived entry; an index that lists entries the log doesn't have.

### D146. A room's ending is judged by a verdict call, and the rating is a gradient
**Decided:** The designer's call (2026-11-05), settling the roadmap's question on how a room's ending is judged. Supersedes D131's ending kinds as what moves how the party feels, and refines D144's rough rooms. When a room ends, the verdict call (`docs/spec/calls/verdict.md`) reads the record (the encounter with what could be had and its ways on, the ledger and the log, how it ended), never the narration, and returns a rating from 1 to 10, why, and each companion's reactions to how it went, by her own values, as tagged reactions (D20). The prompt anchors 3, 6 and 9 so the rating uses the whole range. The rating's morale (`content/relationship.js`, `morale.byRating`) moves each companion's regard for the player and her affection and trust toward the other, as D131's ending did; her reactions then apply within the usual caps. The rating also moves the leg's strain by six minus the rating, never below nothing, and every four points of strain add a room to the leg, at most two a leg, only while it has rooms left (`content/setting.js`, `way`). A campfire clears the strain. The hand-off still records the ending's kind, as a fact the verdict reads. It runs on `default`, with a budget of 25 KB.
**Why:** The question is never whether the party gets through, but how well, and "how well" is a judgment, which is the AI's job (principle 2). Reading the record rather than the narration keeps it from rating the prose, and the anchors keep it from rating politely. It runs after the room is over and nothing inside the room depends on it, so it isn't the in-encounter judgment of progress principle 6 rules out. "Rough" was meant as a description, not a switch: strain lets two middling rooms add up to a longer leg, and a good room in between ease it.
**Rules out:** Authored tiers of success per room; a yes-or-no "rough"; the verdict reading the narration.

### D147. Gold and relics
**Decided:** The designer's call (2026-11-05), settling the roadmap's question. Gold is one number, carried through the whole game and spent at merchants. A relic is a name and one sentence, a passive edge the DM reads as a fact. Every DM call (adjudicate, resolve, scene, question) sees the party's gold and relics. The party holds at most six relics in an act (`content/setting.js`, `relics.max`). A room offers them as things: a thing's `reward` is gold or a relic, which the party gets if one of them holds it when the room ends, and the hand-off carries the gold and the relics out. A merchant's things carry a `price`: the party pays when one of them takes it through the DM's changes, and the engine refuses a change that spends more gold than the party has. Code: `src/engine/ledger.js`, `src/engine/handoff.js`, `src/campaign/run.js`.
**Why:** The designer wanted rewards like gold for a merchant and relics with passive effects, without an inventory system. A relic as one sentence the DM reads needs no engine rule, which keeps it judgment (principle 2). Rewards as things put them in the world, where the party has to reach them, so they're one of a room's levers rather than a prize table.
**Rules out:** An inventory beyond gold and relics; relics with engine-run effects, for now; buying what the party can't afford.

### D148. The climax is always won; its verdict decides what carries into the next act
**Decided:** The designer's call (2026-11-05), settling the roadmap's question. The climax is a room the party always gets through. What's at stake is how epic the escape is, decided by what the act built up; a choice at its peak, often between the companions' threads; and what comes away with them, all landing in the sanctuary scene. Its verdict's rating decides how many of the act's relics the party keeps into the next act (`content/setting.js`, `relics.keptByRating`: none for a rough climax, up to three for a great one), and the player picks which at the sanctuary. The next act starts fresh with those relics and the gold; how the companions feel and the rest of the campaign's memory carry as always (D142). Code: `src/campaign/run.js` (`endAct`).
**Why:** A climax that can't be lost needs stakes other than winning. Letting its quality decide what carries over rewards a great act without punishing a rough one beyond the act: the next act is still a fresh start (D140).
**Rules out:** A climax the party can lose; penalties carried into the next act.
