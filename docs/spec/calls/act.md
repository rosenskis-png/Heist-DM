# Act call

**Job:** when an act begins, decide what it holds from what the party has actually done: the act's question and aim, who holds the region, the pools its rooms are dealt from, the live mysteries, and who or what stands at its climax (D164, D167).
**Runtime:** `sample.json`, replay off, `complex`. Budget 20 KB. Once per act, at its start: Act 1's as soon as the world is accepted, and each later act's during the previous act's sanctuary, so the player never waits on it. After Act 5, once per post-game act, with what the player says they want to do.
**Sees** (`actInput` in `src/context.js`): the world's stable core (place, heart, life, tensions, every faction with its ladder, the five regions in a line each); this act's job and its step on the rising curve (`content/setting.js`, `arc`) and its region whole; what the party has done, act by act, as facts: each earlier act's question, peak, what changed, and its rooms' premises and log lines (`camp.history`); the peaks already used; the kinds of busy-ness to name; the world's mysteries (ids and truths); the people the party has met (`camp.memory`); and, after Act 5, the player's intent.

## The rule it writes by (D167)
Rooms must stay original and different from each other, so whatever reaches more than one room is abstract (the question, the aim), and whatever is concrete is a pool code deals out one item to one room, each used once in the act. Nothing it writes is a picture every room shares. The peak reaches only the climax, and its signs reach rooms one at a time.

## Returns (`schemas/calls/act.js`)
| Field | What it is | Who reads it |
|---|---|---|
| **goal** | the act's job, in this world's terms | the climax |
| **question** | what the act is about, as a question it answers | every room |
| **aim** | what the party should come away knowing or holding | every room |
| **state** | what has changed in the region because of earlier acts | the climax, the next act call |
| **holders** | the factions that hold the region now | code, drawing each room's owner |
| **busy** | four or more lines, each a kind from the seed's list, the ordinary business of the place, each different people in a different kind of place | one room each |
| **settings** | two or three places for each calm kind (`quiet`, `oddity`, `campfire`) | one calm room each, a different one from earlier in the act until they run out |
| **news** | what the party might hear of what earlier acts set in motion | one room each, as the room's one extra |
| **mysteries** | the one or two whose journal pages this act's rooms may hold | code, drawing pages |
| **returning** | people met before who might plausibly turn up here | code, drawing someone from before |
| **peak** | who or what stands at the climax: why them (whose design blocks the party), what they want, how they act in turns, where | the climax |
| **hints** | two or three visible signs of the peak | one room each, as the room's one extra |

The prompt also says the region's danger is never a rule about where anyone can stand or what can be seen from where.

## Validated by the engine
The schema. Code then tidies rather than rejects (`tidyAct`, D166, D167): busy kinds are matched to the seed's list even when worded loosely, duplicates and unmatched kinds dropped; holders, mysteries and returning names are kept to the world's factions, the world's mysteries and the people met (falling back to the region's holders and all the mysteries). Only an act with fewer than two usable busy lines goes back for one retry (`actProblems`).

## Where it goes
The campaign keeps it as `camp.plan` and the peak in `camp.peaks`, never chosen again (`actBegun` in `src/campaign/run.js`; `beginAct` in `src/game/generate.js`). Each room's seed draws from it (`docs/spec/generation.md`). When the act ends, its question, peak, state, premises and log lines go into `camp.history` for the next act call.
