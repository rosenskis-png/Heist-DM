# Act call

**Job:** when an act begins, look at what came before and what lies ahead, and decide what should come up during this act: its setting in general, its question and aim, who holds the region, each companion's thread, the places its calm rooms are set in, the live mysteries, and who or what stands at its climax (D164, D167, D169). It never designs a room.
**Runtime:** `sample.json`, replay off, `complex`. Budget 20 KB. Once per act, at its start: Act 1's as soon as the world is accepted, and each later act's during the previous act's sanctuary, so the player never waits on it. After Act 5, once per post-game act, with what the player says they want to do.
**Sees** (`actInput` in `src/context.js`): the world's stable core (place, heart, life, tensions, every faction with its ladder, the five regions in a line each); this act's job and its step on the rising curve (`content/setting.js`, `arc`) and its region whole; what the party has done, act by act, as facts: each earlier act's question, peak, what changed, and its rooms' premises and log lines (`camp.history`); the peaks already used; the companions (role, values, quest and the features their stories need); the worn-out props (`content/stale.js`); the world's mysteries (ids and truths); the people the party has met (`camp.memory`); and, after Act 5, the player's intent.

## The rule it writes by (D167)
Rooms are invented by the room call, D163-style (D169), so what reaches every room is general (the setting, the question, the aim), and whatever is particular is a list code deals out one item to one room, each used once in the act. Nothing it writes is a picture every room shares. The peak reaches only the climax, and its signs reach rooms one at a time.

## Returns (`schemas/calls/act.js`)
| Field | What it is | Who reads it |
|---|---|---|
| **goal** | the act's job, in this world's terms | the climax |
| **setting** | this part of the place in general: what it is and who's in it, never particular rooms or sights | every room |
| **question** | what the act is about, as a question it answers | every room |
| **aim** | what the party should come away knowing or holding | every room |
| **state** | what has changed in the region because of earlier acts | the climax, the next act call |
| **holders** | the factions that hold the region now | code, drawing each room's owner |
| **threads** | for each companion whose story comes up this act, what of it comes up | her room, once an act |
| **settings** | two or three places for each calm kind (`quiet`, `oddity`, `campfire`) | one calm room each, a different one from earlier in the act until they run out |
| **news** | what the party might hear of what earlier acts set in motion | one room each, as the room's one extra |
| **mysteries** | the one or two whose journal pages this act's rooms may hold | code, drawing pages |
| **returning** | people met before who might plausibly turn up here | code, drawing someone from before |
| **peak** | who or what stands at the climax: why them (whose design blocks the party), what they want, how they act in turns, where | the climax |
| **hints** | two or three visible signs of the peak | one room each, as the room's one extra |

The prompt also says the region's danger is never a rule about where anyone can stand or what can be seen from where.

## Validated by the engine
The schema. Code then tidies rather than rejects (`tidyAct`, D166, D167): holders, mysteries and returning names are kept to the world's factions, the world's mysteries and the people met (falling back to the region's holders and all the mysteries).

## Where it goes
The campaign keeps it as `camp.plan` and the peak in `camp.peaks`, never chosen again (`actBegun` in `src/campaign/run.js`; `beginAct` in `src/game/generate.js`). Each room's seed draws from it (`docs/spec/generation.md`). When the act ends, its question, peak, state, premises and log lines go into `camp.history` for the next act call. Campfires are guaranteed by code, not by this call: every leg ends at one, and the room before it has one way on, to it (`docs/spec/campaign.md` §2).
