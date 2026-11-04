# Party call

**Job:** voice both companions in the huddle, in one call (D127).
**Status:** bench only, as the "Huddle, one call" tab, judged against the two companion calls on the same cases (`docs/roadmap.md`, the table's step 1). The game's huddle still runs the companion call once per companion.
**Runtime:** `sample.json`, replay off, `quick` (D58). One call per huddle message. A private word to one companion is still her companion call.
**Sees:** for each companion, exactly the brief and special cases her own companion call gets (`docs/spec/calls/companion.md`). Also the table as both of them see it: the party's view of the encounter and the ledger, the DM's last two narrations, the pair's dynamic, the huddle, the draft and the card. `test/companions.test.js` checks for every pairing that the briefs equal the companion call's.
**Never sees:** anything the companion call never sees.

## Returns (`schemas/calls/party.js`)
- **Three exchanges:** three genuinely different ways the next moment at the table could go. Each has up to four lines. Each line is by one of the two, in any order, and carries any stance it takes, as in the companion call. An exchange with no lines is both letting it go. **The engine picks one at random** (D40), and only that one is shown and applied.
- Optional **tagged reactions**, each naming whose it is.
- Every line and reaction must name one of the two companions. `speakerProblems` in `src/calls/party.js` checks this, with one retry.

## Thinking about plans
As in the companion call, each reasons from her own `hunch` and `reaches_for`, as a first instinct. The prompt asks for two people, not one voice: write each from her own entry, then have them react to each other. The bench question is whether one shared call keeps them distinct, and keeps their catches a matter of chance.
