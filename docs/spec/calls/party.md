# Party call

**Job:** voice both companions at the table, over the rings, in one call (D127, D132), when they're spoken to (D175): when the player talks to the party, talks a plan over, or asks what the two of them think. The bench runs it on the huddle cases beside the two-call huddle.
**Runtime:** `sample.json`, replay off, `quick` (D58). A private word to one companion is still her companion call.
**Sees:** for each companion, exactly the brief and special cases her own companion call gets (`docs/spec/calls/companion.md`). Also the table as both of them see it: the room sheet the player reads (D174), the DM's last two narrations without the opening, the pair's dynamic, the table so far (each of the player's lines says who it was to; private words are left out), the draft and the card. `test/companions.test.js` checks for every pairing that the briefs equal the companion call's.
**Never sees:** anything the companion call never sees.

## Returns (`schemas/calls/party.js`)
- **What they say next** (D137): up to four lines, each by one of the two, in any order, each carrying any stance it takes, as in the companion call. No lines is both letting it go. If the player just said something to them, they answer it. When his line names one of them, code says so in the input, and she answers it herself.
- Optional **tagged reactions**, each naming whose it is.
- Every line and reaction must name one of the two companions. `speakerProblems` in `src/calls/party.js` checks this, with one retry.

## Thinking about plans
As in the companion call, each talks it over as a friend at the table would (D175), and her `hunch` and `reaches_for` show in what she notices and suggests. They are two people who usually come at a thing differently: when both speak, the second builds on the first, disagrees, or brings another angle. Playtests watch whether the voices blur or their catches move together (D132), and whether, saying one thing each time, they catch too much (D137).
