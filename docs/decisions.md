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
