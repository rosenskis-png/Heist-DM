# Decisions archive

Entries from `docs/decisions.md` that now apply only as history: wholly superseded, or describing the engine pipeline the DM's rulings replaced (D125, D129). Each is moved word for word and never edited (D145). Its heading stays in the log with a pointer here. Read these to trace why something was tried and dropped, not to learn the current design.

---

### D16. A step takes place in the tick it starts in
**Decided:** A committed plan's first step happens on the current beat, and the tick advances when a step ends.
**Why:** The spec never said this, and the Cells walkthrough contradicted itself. Under this rule, Card 2 and Lyra's "right now it's the cask" are right. Card 1 has been corrected in `fixtures/cells/walkthrough.md`.

### D18. Where engine reactions stop and the world call starts
**Decided:** A reaction is an engine rule if it can be written as condition → operations with no "unless he decides". Anything that chooses between options (how Snag bargains, whether he fights) goes to the world call.

### D19. Distance and senses, minimal
**Decided:** Travel cost is in ticks (D9's geometry adds exact distances for the AIs as facts). Senses are see and hear per schedule beat, plus a light level per zone. Smell, and chase calibration by length, wait for the first encounter that needs them.

### D25. Hand-author Act 1 before building the generator
**Decided:** Act 1's packets are written by hand (with Claude's help) and serve as the quality bar for the generator in Phase 7.
**Why:** It keeps "does the loop work?" and "does the generator work?" from being tested at the same time.
**Not in conflict with "Remove the DM's judgment":** the runtime treats a packet the same whoever wrote it, and the judgment still happens in rulings and texture at play time. What that reflex rejects is replacing judgment with lookup tables.

### D29. The map is complete: no improvised structure
**Decided:** No AI call can add a zone, a connection or a hidden thing during play. A feature the packet doesn't have doesn't exist: the step call rules it out ("is there a coal chute?" "No."). A hidden feature the packet does have is used and revealed normally. Texture (a candelabra) and rulings about existing things ("one rat can drag the ring") are unchanged.
**Why:** The designer's call (2026-10-30): start with none, and loosen it later for player-initiated or DM-initiated features if playtests want it. It keeps the map fixed while the loop is proven.
**Rules out:** An `add_connection` or `add_zone` operation, for now.

### D31. Encounter clocks leave room for one recovered failure
**Decided:** An encounter's deadline should fit some exploring plus a plan in which one key roll fails and the recovery is handled well. Two careless failures shouldn't fit. The Cells start at tick 0 on Snag's Drink beat, and Uzga arrives at tick 18 (a starting value; playtests move it).
**Why:** Half of the heist fantasy is the mid-heist adjustment, or the smooth recovery from something that almost blew it. A deadline only perfect play can meet is a puzzle. The old numbers also implied the encounter started at tick 2 without saying so.

### D34. A card shows problems instead of pricing the impossible
**Decided:** The engine projects each step as if the earlier steps' problems were fixed, so one problem doesn't flag every later step. A step with a problem of its own (the keys aren't on the peg at that tick; a trigger fires first) shows the problem and isn't sent for pricing.
**Why:** Card 1 priced walking the party past Snag after the engine had already projected him going for the drum: odds on a step that can't happen as written. The card's job is to surface every timing problem at once (`fixtures/cells/walkthrough.md` §6), and a problem says that better than a long-shot price.

### D37. Deadlines leave room for two recovered failures
**Decided:** Supersedes the sizing in D31. An encounter's deadline should fit some exploring plus a plan in which two key rolls fail and both recoveries are handled well. Uzga now arrives at tick 21 (a starting value; playtests move it).
**Why:** With no warnings on the card (D36), more plans fail in the fiction, so recovery needs more room. A failure must still leave a new situation, never a dead end.

### D39. Someone in the party has to perceive a condition
**Decided:** A plan's `when` or `if` is checked only if a party member can see or hear what it's about at that moment. The whisper rings make sharing free, so it can be anyone in the party. If no one can, the plan is interrupted there (`cant_perceive`): "I can't see into the vault. Can anyone?" The player can prevent that by asking the Moment AI first ("from the doorway, could she see into the vault?"), which answers from the map's sight facts, free and without a roll. Plan conditions can't name things no one could ever perceive (meters, the engine's own bookkeeping); the schema rules them out (`plan_condition`). Party perception rules: `docs/spec/engine.md` §2.
**Why:** Evaluating conditions against the true state let characters act on things nobody could see. Settles the Phase 3 question raised with D35.

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

### D46. An interruption happens when someone could first recognize it
**Decided:** The plan stops at the first instant anyone in the party could see or hear that things aren't as the plan expects, not when a character runs into it: the moment the empty peg is in view, not the moment Fern reaches for it. The engine checks before each step and as the actors enter each zone of its route, using the party's pooled perception. The narration gives that moment a few sentences: what they see, how it lands, and where everyone is. Zones can list other zones they see beyond their neighbours (`sees`), so long sightlines are authored, not computed.
**Why:** Noticing the problem only on contact makes characters look oblivious, and wastes moves nobody would have made.

### D47. An interruption needs a step the party can tell will fail
**Decided:** Clarifies D46. The plan stops only when what the party perceives, plus what it knows (learned routines, known events), shows that a *remaining step* won't work. Seeing something different from a snapshot isn't enough. If the plan takes the keys on Snag's Drink and Lyra sees the peg empty during his Pace, nothing stops: the party knows the keys go back on the peg before then. If the step takes them during that Pace, it stops. If the party doesn't know the routine, an empty peg does stop a plan that needs those keys, because from what they know, the plan is broken.
**Why:** D46's wording ("isn't as the plan expects") could stop a well-timed plan at a moment the party fully expected. Recognition means recognizing the plan is in trouble, using everything the party knows.

### D51. A move's path names the zones it enters
**Decided:** Each entry in a `move` or `give` path is one crossing, named by the zone it enters, or by the connection crossed where two connections join the same zones. The last entry is the destination. The engine resolves each crossing to its connection and checks that it exists and that everything crossing it fits (`docs/spec/engine.md` §2). A path has at most two entries; without a path, the destination must be the current zone or next to it.
**Why:** On the bench, all five step calls wrote paths as the zones Fern passed through ("gutter", "guardroom"), never as connection ids. The contract said "id" without saying which kind. The AI's judgment is which way to go; finding the door between two zones is the engine's job (principle 2).
**Rules out:** Requiring connection ids where the zones already say which way.

### D52. State uses the packet's words; anything else is canon
**Decided:** A `set_flag` from any call must use a flag key the packet or a character sheet already uses (in a thing's or connection's flags, a condition, a rule, or a declared ability). The engine rejects any other key and sends it back. A new fact the engine has no word for ("the bars are bent apart") is written as canon with `add_canon`, where the AIs read it. An NPC action that changes nothing the engine tracks (he calls out an offer) has empty `ops`; its `because` says what he does.
**Why:** On the bench, the world call invented flags in every run (`offering_deal`, `with_party`, `wants_deal`) to give an action something to change. Nothing in the engine reads them, so they're invisible state that looks meaningful. Flags only mean something when a condition reads them.
**Rules out:** Free-form flag keys; empty-looking state written to make an action feel concrete.

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

### D70. The player chooses who they're talking to
**Decided:** The Moment tab has an addressee: the DM, or a person the party can see or hear. Questions to the DM cost no time. A conversation with a person costs one tick when it ends: when the player turns to someone else, when a check happens, or when a card is made. During a fight, the tab takes the round's actions instead.
**Why:** The time table charged a conversation "1 when it ends" without saying when that is. Asking the AI would be a judgment it has no information for; a choice the player makes is structure.
