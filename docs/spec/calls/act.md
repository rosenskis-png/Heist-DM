# Act call

**Job:** when an act begins, decide what it holds from what the party has actually done: what its region is like now, what it's busy with, who holds it, and who or what stands at its climax (D164).
**Runtime:** `sample.json`, replay off, `complex`. Budget 20 KB. Once per act, at its start: Act 1's as soon as the world is accepted, and each later act's during the previous act's sanctuary, so the player never waits on it. After Act 5, once per post-game act, with what the player says they want to do.
**Sees** (`actInput` in `src/context.js`): the world's stable core (place, heart, life, tensions, every faction with its ladder, the five regions in a line each); this act's job and its step on the rising curve (`content/setting.js`, `arc`) and its region whole; what the party has done, act by act, as facts: each earlier act's peak and its rooms' premises and log lines (`camp.history`); the peaks already used; and, after Act 5, the player's intent.
**Never sees:** the mysteries, the clues found, or any room's sketch or packet.

## Returns (`schemas/calls/act.js`)
- **goal:** the act's job, in this world's terms.
- **region:** what the region is like now, given what happened.
- **holders:** the factions that hold it now; code draws each room's owner from them.
- **busy:** at least four lines, each a kind of busy-ness from the seed's list (`BUSY` in `src/campaign/seed.js`) and what it looks like here; code draws one kind per room, never repeating in the act.
- **peak:** who or what stands at the climax (a faction leader from the rung that fits the act, or several designs at once at the heart), why them (whose design blocks the party, not who the party likes), what they want, how they act in turns, and where.
- **hints:** two or three visible signs of the peak, each on its own, that rooms show one at a time before the climax.

## Validated by the engine
The schema, holders that are the world's factions, and each kind of busy-ness once (`actProblems`). Failures go back for one retry.

## Where it goes
The campaign keeps it as `camp.plan` and the peak in `camp.peaks`, never chosen again (`actBegun` in `src/campaign/run.js`; `beginAct` in `src/game/generate.js`). Each room's seed draws from it, and a climax's sketch stands its peak at the centre (`docs/spec/generation.md`). When the act ends, its peak, premises and log lines go into `camp.history` for the next act call.
